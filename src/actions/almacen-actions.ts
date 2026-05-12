'use server'

import { pool } from "@/lib/db";
import { auth } from "@/auth";

// ============================================================================
// 1. FUNCIONES DE CIERRE Y OPERACIÓN DIARIA
// ============================================================================
export async function obtenerMisAlmacenes(branchId: number) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, data: [] };
    
    const userId = session.user.id;
    const role = session.user.role?.toUpperCase().trim() || "";

    const connection = await pool.getConnection();
    try {
        // ✨ CORRECCIÓN: Gerentes ven TODOS los de TODAS las sucursales. Admin Sucursal ve TODOS los de SU sucursal.
        if (['GERENTE GENERAL', 'ADMINISTRADOR GENERAL', 'GERENTE DE LOGISTICA', 'ADMIN_SUCURSAL'].includes(role)) {
            const [rows]: any = await connection.query("SELECT id, name FROM warehouses WHERE branch_id = ? AND status = 1", [branchId]);
            return { success: true, data: rows };
        }

        // Los almaceneros ven SOLO los que se les ha asignado físicamente
        const [rows]: any = await connection.query(
            `SELECT w.id, w.name 
             FROM warehouses w
             JOIN user_warehouses uw ON w.id = uw.warehouse_id
             WHERE w.branch_id = ? AND uw.user_id = ? AND w.status = 1`,
            [branchId, userId]
        );
        return { success: true, data: rows };
    } catch (error: any) {
        return { success: false, message: error.message };
    } finally {
        connection.release();
    }
}

export async function obtenerStockParaCierre(warehouseId: number) {
    const connection = await pool.getConnection();
    try {
        const [rows]: any = await connection.query(
            `SELECT ps.product_id, p.name as producto, p.unit_measure as unidad, ps.stock_current as stock_teorico
             FROM product_stocks ps
             JOIN products p ON ps.product_id = p.id
             WHERE ps.warehouse_id = ? ORDER BY p.name ASC`,
            [warehouseId]
        );
        return { success: true, data: rows };
    } catch (error: any) {
        return { success: false, message: error.message };
    } finally {
        connection.release();
    }
}

export async function guardarCierreAlmacenDiario(data: {
    warehouseId: number; fechaCierre: string;
    detalles: Array<{ productId: number; systemStock: number; physicalStock: number; difference: number; }>
}) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: "No autorizado" };

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [existing]: any = await connection.query("SELECT id FROM warehouse_closures WHERE warehouse_id = ? AND closure_date = ?", [data.warehouseId, data.fechaCierre]);
        if (existing.length > 0) {
            await connection.rollback();
            return { success: false, message: "Este almacén ya fue cerrado en esta fecha." };
        }

        const [headerResult]: any = await connection.query(
            "INSERT INTO warehouse_closures (warehouse_id, closure_date, closed_by, status) VALUES (?, ?, ?, 1)",
            [data.warehouseId, data.fechaCierre, session.user.id]
        );
        const closureId = headerResult.insertId;

        for (const item of data.detalles) {
            await connection.query(
                `INSERT INTO warehouse_closure_details (closure_id, product_id, system_stock, physical_stock, difference) VALUES (?, ?, ?, ?, ?)`,
                [closureId, item.productId, item.systemStock, item.physicalStock, item.difference]
            );
            await connection.query(
                "UPDATE product_stocks SET stock_current = ?, last_update = NOW() WHERE warehouse_id = ? AND product_id = ?", 
                [item.physicalStock, data.warehouseId, item.productId]
            );
        }

        await connection.commit();
        return { success: true, message: "Cierre de almacén registrado. El inventario ha sido cuadrado." };
    } catch (error: any) {
        await connection.rollback();
        return { success: false, message: "Error al procesar el cierre." };
    } finally {
        connection.release();
    }
}

// ============================================================================
// 2. ✨ NUEVAS FUNCIONES: GESTIÓN DE ALMACENES Y ASIGNACIONES
// ============================================================================
export async function crearNuevoAlmacen(branchId: number, nombre: string) {
    const connection = await pool.getConnection();
    try {
        await connection.query("INSERT INTO warehouses (branch_id, name, status) VALUES (?, ?, 1)", [branchId, nombre]);
        return { success: true, message: "Almacén creado correctamente." };
    } catch (error: any) {
        return { success: false, message: error.message };
    } finally { connection.release(); }
}

export async function obtenerUsuariosPorAlmacen(warehouseId: number) {
    const connection = await pool.getConnection();
    try {
        const [rows]: any = await connection.query(
            `SELECT u.id, u.name, u.email, u.role 
             FROM users u
             JOIN user_warehouses uw ON u.id = uw.user_id
             WHERE uw.warehouse_id = ?`,
            [warehouseId]
        );
        return { success: true, data: rows };
    } catch (error: any) {
        return { success: false, message: error.message };
    } finally { connection.release(); }
}

export async function asignarUsuarioAlmacen(warehouseId: number, userId: number) {
    const connection = await pool.getConnection();
    try {
        await connection.query("INSERT IGNORE INTO user_warehouses (user_id, warehouse_id) VALUES (?, ?)", [userId, warehouseId]);
        return { success: true, message: "Usuario asignado correctamente." };
    } catch (error: any) {
        return { success: false, message: error.message };
    } finally { connection.release(); }
}

export async function removerUsuarioAlmacen(warehouseId: number, userId: number) {
    const connection = await pool.getConnection();
    try {
        await connection.query("DELETE FROM user_warehouses WHERE user_id = ? AND warehouse_id = ?", [userId, warehouseId]);
        return { success: true, message: "Usuario removido del almacén." };
    } catch (error: any) {
        return { success: false, message: error.message };
    } finally { connection.release(); }
}

export async function obtenerUsuariosDisponiblesParaAsignar() {
    const connection = await pool.getConnection();
    try {
        // ✨ Agregamos branch_ids para poder filtrar en el Frontend
        const [rows]: any = await connection.query(`
            SELECT 
                u.id, 
                u.name, 
                u.email, 
                u.role,
                CAST(GROUP_CONCAT(DISTINCT b.id SEPARATOR ',') AS CHAR) as branch_ids,
                CAST(GROUP_CONCAT(DISTINCT b.name SEPARATOR ' / ') AS CHAR) as branch_names
            FROM users u
            LEFT JOIN user_branches ub ON u.id = ub.user_id
            LEFT JOIN branches b ON ub.branch_id = b.id
            WHERE u.status = 1 
            GROUP BY u.id
            ORDER BY u.name ASC
        `);
        return { success: true, data: rows };
    } catch (error: any) {
        return { success: false, message: error.message };
    } finally { 
        connection.release(); 
    }
}