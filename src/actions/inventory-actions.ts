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
    
    const PRIVILEGED_ROLES = ['CEO', 'LOGISTICA', 'ADMINISTRADOR GENERAL'];
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

// --- OBTENER INVENTARIO PRINCIPAL CON FILTROS ---
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
        // Quitamos a 'GERENTE DE LOGISTICA' de aquí
        const PRIVILEGED_ROLES = ['GERENTE GENERAL', 'ADMINISTRADOR GENERAL'];
        
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