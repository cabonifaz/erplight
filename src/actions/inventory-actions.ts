'use server'

import { pool } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

// --- OBTENER HISTORIAL CON PAGINACIÓN Y FILTROS ---
export async function getProductHistory(
    branchId: number, 
    productId: number, 
    page: number = 1, 
    limit: number = 5,
    startDate?: string,
    endDate?: string
) {
    try {
        const limitNum = Number(limit) || 5;
        const pageNum = Number(page) || 1;
        
        // Llamada al Stored Procedure que devuelve los datos y el total en una sola ejecución
        const [results]: any = await pool.query(
            "CALL sp_obtener_historial_producto(?, ?, ?, ?, ?, ?)", 
            [Number(branchId), Number(productId), pageNum, limitNum, startDate || null, endDate || null]
        );

        // results[0] trae las filas del historial
        // results[1] trae el count(*) para la paginación
        const data = results[0] || [];
        const countRows = results[1] || [];
        const total = countRows[0]?.total || 0;

        return {
            data: data,
            total: total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum)
        };

    } catch (error) {
        console.error("🔥 ERROR CRÍTICO EN KARDEX:", error);
        return { data: [], total: 0, page: 1, limit: 5, totalPages: 0 };
    }
}

// --- REGISTRAR AJUSTE MANUAL ---
export async function registerManualAdjustment(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: "No autorizado" };
    
    const role = session.user.role?.toUpperCase() || "";
    // @ts-ignore
    const sessionBranchId = session.user.branch_id; 
    
    const PRIVILEGED_ROLES = ['GERENTE GENERAL', 'GERENTE DE LOGISTICA', 'ADMINISTRADOR GENERAL'];
    const STORE_ROLES = ['ADMIN_SUC', 'ALMACEN'];

    // 1. Validación de Roles
    if (![...PRIVILEGED_ROLES, ...STORE_ROLES].includes(role)) {
        return { success: false, message: "⛔ Sin permisos para realizar ajustes." };
    }

    // 2. Extracción de Datos
    const product_id = formData.get("product_id");
    const quantity = parseFloat(formData.get("quantity") as string);
    const type = formData.get("type") as string;
    const reason = formData.get("reason") as string;
    const formBranchId = formData.get("branch_id");

    if (!product_id || isNaN(quantity) || !type || !reason) {
        return { success: false, message: "Todos los campos son obligatorios." };
    }

    // 3. Determinar la Sucursal Correcta
    let targetBranchId: any = null;

    if (PRIVILEGED_ROLES.includes(role)) {
        if (!formBranchId) return { success: false, message: "Debes seleccionar una sucursal." };
        targetBranchId = formBranchId;
    } else {
        if (!sessionBranchId) return { success: false, message: "⛔ No tienes una sucursal asignada en tu sesión." };
        targetBranchId = sessionBranchId;
    }

    // 4. Ejecutar Stored Procedure (La Base de Datos maneja la transacción y validaciones)
    try {
        await pool.query(
            "CALL sp_registrar_ajuste_inventario(?, ?, ?, ?, ?, ?)",
            [targetBranchId, session.user.id, type, product_id, quantity, reason]
        );

        revalidatePath("/inventario");
        return { success: true, message: "Ajuste registrado correctamente." };

    } catch (error: any) {
        // Captura los errores enviados por SIGNAL SQLSTATE desde MySQL (Ej: "Stock insuficiente")
        return { success: false, message: error.sqlMessage || error.message };
    }
}

// --- OBTENER INVENTARIO PRINCIPAL CON FILTROS (VERSION SEGURA) ---
export async function getInventoryStocks(filters: {
    branch_id?: number | null;
    search?: string | null;
    min_stock?: number | null;
    max_stock?: number | null;
    updated_from?: string | null;
} = {}) {
    const session = await auth(); // 1. Obtenemos la sesión
    if (!session?.user?.id) return [];

    try {
        const role = session.user.role?.toUpperCase() || "";
        // @ts-ignore
        const sessionBranchId = session.user.branch_id; 

        // 2. Lógica de Blindaje:
        let targetBranchId = filters.branch_id || null;

        // 🛡️ RESTRICCIÓN: Solo el GERENTE GENERAL y ADMINISTRADOR GENERAL pueden saltarse el filtro
        const PRIVILEGED_ROLES = ['GERENTE GENERAL', 'GERENTE DE LOGISTICA', 'ADMINISTRADOR GENERAL'];
        
        if (!PRIVILEGED_ROLES.includes(role)) {
            // Si el rol NO está en la lista de arriba (como María o Lucas)...
            // Usamos el branch_id de la sesión obligatoriamente
            if (!sessionBranchId) return []; 
            
            // 🔒 SOBRESCRIBIMOS: No importa qué elija en el filtro, mandamos su ID de sesión
            targetBranchId = sessionBranchId; 
        }
        // 3. Ejecutamos el SP con el ID de sucursal ya validado
        const [rows]: any = await pool.query(
            "CALL sp_filtrar_inventario(?, ?, ?, ?, ?)",
            [
                targetBranchId, // <--- Aquí ya va el ID blindado
                filters.search || null,
                filters.min_stock !== undefined && filters.min_stock !== null && String(filters.min_stock).trim() !== "" ? Number(filters.min_stock) : null,
                filters.max_stock !== undefined && filters.max_stock !== null && String(filters.max_stock).trim() !== "" ? Number(filters.max_stock) : null,
                filters.updated_from || null
            ]
        );
        return rows[0] || [];
    } catch (error) {
        console.error("Error obteniendo inventario filtrado:", error);
        return [];
    }
}

// ============================================================================
// ✨ NUEVO: CARGA MASIVA DE AJUSTE (EXCEL)
// ============================================================================
export async function procesarAjusteInventarioExcel(payload: { branchId: number, data: any[] }) {
    const session = await auth();
    if (!session?.user) return { success: false, message: "No autorizado." };

    // 1. VALIDACIÓN DE ROLES (Los mismos de arriba)
    const role = session.user.role?.toUpperCase() || "";
    const PRIVILEGED_ROLES = ['GERENTE GENERAL', 'GERENTE DE LOGISTICA', 'ADMINISTRADOR GENERAL'];
    
    if (!PRIVILEGED_ROLES.includes(role)) {
        return { 
            success: false, 
            message: "Acceso denegado. Solo la Gerencia o Logística pueden hacer cargas masivas por Excel." 
        };
    }

    const inventarioData = payload.data;
    const branchId = payload.branchId;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const productosNoEncontrados: string[] = [];
        const actualizaciones: { productId: number, nuevoStock: number }[] = [];

        // 2. LECTURA Y VALIDACIÓN ESTRICTA DEL EXCEL
        for (const fila of inventarioData) {
            const getCol = (keys: string[]) => {
                const exactKey = Object.keys(fila).find(k => keys.includes(k.toLowerCase().trim()));
                return exactKey ? fila[exactKey] : undefined;
            };

            const nombreProducto = getCol(['producto', 'productos', 'item', 'insumo']);
            const stockNuevo = Number(getCol(['stock', 'cantidad', 'stock actual']));

            if (!nombreProducto) continue; // Ignoramos filas vacías

            if (isNaN(stockNuevo)) {
                throw new Error(`La cantidad de stock para "${nombreProducto}" no es un número válido.`);
            }

            // 3. VERIFICACIÓN CONTRA LA TABLA MAESTRA (products)
            const [rows]: any = await connection.query(
                "SELECT id FROM products WHERE name = ? AND status = 1", 
                [nombreProducto.trim()]
            );

            if (rows.length === 0) {
                productosNoEncontrados.push(nombreProducto);
            } else {
                actualizaciones.push({ productId: rows[0].id, nuevoStock: stockNuevo });
            }
        }

        // 4. REGLA DE NEGOCIO (CRIS): RECHAZO TOTAL SI HAY INTRUSOS
        if (productosNoEncontrados.length > 0) {
            await connection.rollback();
            return { 
                success: false, 
                message: "Carga rechazada. El Excel contiene productos que no existen en la base de datos maestra.",
                errores: productosNoEncontrados 
            };
        }

        // 5. ACTUALIZACIÓN MASIVA DE STOCK
        for (const act of actualizaciones) {
            // Intentamos actualizar primero (recordemos que tu columna se llama stock_current)
            const [updateResult]: any = await connection.query(
                "UPDATE product_stocks SET stock_current = ?, last_update = NOW() WHERE branch_id = ? AND product_id = ?",
                [act.nuevoStock, branchId, act.productId]
            );

            // Si no existía el registro de stock para esa sucursal, lo insertamos
            if (updateResult.affectedRows === 0) {
                await connection.query(
                    `INSERT INTO product_stocks (branch_id, product_id, stock_current, min_stock, max_stock, reorder_point, last_update) 
                     VALUES (?, ?, ?, 5, 100, 10, NOW())`,
                    [branchId, act.productId, act.nuevoStock]
                );
            }
        }

        await connection.commit();
        revalidatePath('/inventario'); 
        return { 
            success: true, 
            message: `¡Ajuste masivo exitoso! Se actualizaron ${actualizaciones.length} productos en el inventario.` 
        };

    } catch (error: any) {
        await connection.rollback();
        console.error("Error en ajuste masivo de inventario:", error);
        return { success: false, message: error.message || "Error al procesar el archivo en la base de datos." };
    } finally {
        connection.release();
    }
}