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
// --- OBTENER INVENTARIO PRINCIPAL CON FILTROS (VERSION SEGURA Y CORREGIDA) ---
export async function getInventoryStocks(filters: {
    branch_id?: number | null;
    search?: string | null;
    min_stock?: number | null;
    max_stock?: number | null;
    updated_from?: string | null;
} = {}) {
    const session = await auth();
    if (!session?.user?.id) return [];

    try {
        const role = session.user.role?.toUpperCase() || "";
        let targetBranchId = filters.branch_id || null;

        const PRIVILEGED_ROLES = [
            'GERENTE GENERAL', 
            'GERENTE DE LOGISTICA', 
            'ADMINISTRADOR GENERAL'
        ];
        
        // Si no es un usuario VIP (Ej: Almacenero, Admin Sucursal)
        if (!PRIVILEGED_ROLES.includes(role)) {
            // ✨ Cero SQL Crudo: Extraemos su sucursal de la BD de forma segura
            const [userBranch]: any = await pool.query("CALL sp_obtener_sucursal_principal_usuario(?)", [session.user.id]);
            
            if (userBranch[0] && userBranch[0].length > 0) {
                targetBranchId = userBranch[0][0].branch_id; 
            } else {
                return []; // Si por algún motivo no tiene sucursal, devolvemos vacío
            }
        }

        // Ejecutamos el SP
        const [rows]: any = await pool.query(
            "CALL sp_filtrar_inventario(?, ?, ?, ?, ?)",
            [
                targetBranchId, 
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
// ============================================================================
// ✨ ACTUALIZADO: CARGA MASIVA DE AJUSTE (EXCEL) 100% CON PROCEDIMIENTOS
// ============================================================================
export async function procesarAjusteInventarioExcel(payload: { branchId: number, data: any[], justificacion: string }) {
    const session = await auth();
    if (!session?.user) return { success: false, message: "No autorizado." };

    const role = session.user.role?.toUpperCase() || "";
    const PRIVILEGED_ROLES = ['GERENTE GENERAL', 'GERENTE DE LOGISTICA', 'ADMINISTRADOR GENERAL'];
    
    if (!PRIVILEGED_ROLES.includes(role)) {
        return { success: false, message: "Acceso denegado. Solo la Gerencia o Logística pueden hacer cargas masivas." };
    }

    const inventarioData = payload.data;
    const branchId = payload.branchId;
    const justificacion = payload.justificacion;
    const userId = session.user.id;

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const productosNoEncontrados: string[] = [];
        const actualizaciones: { productId: number, nuevoStock: number }[] = [];

        // 1. LECTURA Y VALIDACIÓN ESTRICTA DEL EXCEL
        for (const fila of inventarioData) {
            const getCol = (keys: string[]) => {
                const exactKey = Object.keys(fila).find(k => keys.includes(k.toLowerCase().trim()));
                return exactKey ? fila[exactKey] : undefined;
            };

            const nombreProducto = getCol(['producto', 'productos', 'item', 'insumo']);
            const stockNuevo = Number(getCol(['stock', 'cantidad', 'stock actual']));

            if (!nombreProducto) continue; 

            if (isNaN(stockNuevo)) {
                throw new Error(`La cantidad de stock para "${nombreProducto}" no es un número válido.`);
            }

            // ✨ Cero SQL Directo: Usamos el SP de búsqueda
            const [rows]: any = await connection.query("CALL sp_buscar_producto_exacto(?)", [nombreProducto.trim()]);
            const resultadoBusqueda = rows[0];

            if (!resultadoBusqueda || resultadoBusqueda.length === 0) {
                productosNoEncontrados.push(nombreProducto);
            } else {
                actualizaciones.push({ productId: resultadoBusqueda[0].id, nuevoStock: stockNuevo });
            }
        }

        // 2. REGLA DE RECHAZO TOTAL
        if (productosNoEncontrados.length > 0) {
            await connection.rollback();
            return { 
                success: false, 
                message: "Carga rechazada. El Excel contiene productos que no existen en la base de datos.",
                errores: productosNoEncontrados 
            };
        }

        // 3. ENVÍO MASIVO AL PROCEDIMIENTO ALMACENADO
        const jsonAjustes = JSON.stringify(actualizaciones);
        await connection.query(
            "CALL sp_procesar_excel_inventario(?, ?, ?, ?)", 
            [branchId, userId, jsonAjustes, justificacion]
        );

        await connection.commit();
        revalidatePath('/inventario'); 
        return { success: true, message: `¡Ajuste masivo exitoso! Se actualizaron ${actualizaciones.length} productos con la justificación guardada.` };

    } catch (error: any) {
        await connection.rollback();
        console.error("Error en ajuste masivo de inventario:", error);
        return { success: false, message: error.message || "Error al procesar el archivo en la base de datos." };
    } finally {
        connection.release();
    }
}

// ✨ NUEVA ACCIÓN: TRASLADO ENTRE SUCURSALES
export async function transferirStockSucursal(data: {
    fromBranch: number;
    toBranch: number;
    productId: number;
    quantity: number;
    reason: string;
}) {
    const session = await auth();
    if (!session?.user) return { success: false, message: "No autorizado" };
    
    const sessionUser = session.user as any;
    const userId = sessionUser.id || sessionUser.sub || sessionUser.userId || sessionUser.id_usuario;

    const connection = await pool.getConnection();
    try {
        await connection.query(
            "CALL sp_inventario_traslado_sucursal(?, ?, ?, ?, ?, ?)",
            [data.fromBranch, data.toBranch, data.productId, data.quantity, userId, data.reason]
        );
        
        return { success: true, message: "Traslado realizado con éxito. Los Kárdex han sido actualizados." };
    } catch (error: any) {
        console.error("Error en traslado:", error);
        return { 
            success: false, 
            // Si el error viene de nuestro SIGNAL SQLSTATE, lo mostramos limpio
            message: error.sqlMessage || "Error al realizar el traslado." 
        };
    } finally {
        connection.release();
    }
}