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
        if (['GERENTE GENERAL', 'ADMINISTRADOR GENERAL', 'GERENTE DE LOGISTICA', 'ADMIN_SUCURSAL'].includes(role)) {
            const [rows]: any = await connection.query("SELECT id, name FROM warehouses WHERE branch_id = ? AND status = 1", [branchId]);
            return { success: true, data: rows };
        }

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
// 2. FUNCIONES DE GESTIÓN DE ALMACENES Y ASIGNACIONES
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

// ============================================================================
// 3. ✨ NUEVA FUNCIÓN: PUENTE PARA EL CIERRE FINANCIERO (CON CONSUMO DE VENTAS)
// ============================================================================
export async function obtenerResumenCierreAlmacenParaFinanzas(branchId: number, fecha: string) {
    const connection = await pool.getConnection();
    try {
        const [warehouses]: any = await connection.query("SELECT id FROM warehouses WHERE branch_id = ? AND status = 1", [branchId]);
        const totalAlmacenes = warehouses.length;

        // Aseguramos que la fecha coincida exactamente usando DATE()
        const [closures]: any = await connection.query(`
            SELECT DISTINCT warehouse_id 
            FROM warehouse_closures 
            WHERE warehouse_id IN (SELECT id FROM warehouses WHERE branch_id = ?) 
            AND DATE(closure_date) = ? AND status = 1
        `, [branchId, fecha]);
        const almacenesCerrados = closures.length;

        const isInventarioCerrado = totalAlmacenes > 0 && almacenesCerrados === totalAlmacenes;

        // 1. Traemos la lista base
        const [detalles]: any = await connection.query(`
            SELECT 
                w.name as almacen_nombre,
                p.id as real_product_id,
                p.name as producto,
                p.unit_measure as unidad,
                wcd.system_stock,
                wcd.physical_stock,
                wcd.difference,
                0 AS consumido_ventas
            FROM warehouse_closures wc
            JOIN warehouse_closure_details wcd ON wc.id = wcd.closure_id
            JOIN warehouses w ON wc.warehouse_id = w.id
            JOIN products p ON wcd.product_id = p.id
            WHERE w.branch_id = ? AND DATE(wc.closure_date) = ?
            ORDER BY w.name ASC, p.name ASC
        `, [branchId, fecha]);

        // 2. Calculamos las ventas de forma separada (AHORA CON id_sale)
        for (let i = 0; i < detalles.length; i++) {
            const row = detalles[i];
            
            // Consumo por recetas (Makis, Platos)
            const [consumoMenu]: any = await connection.query(`
                SELECT IFNULL(SUM(sd.quantity * pr.quantity), 0) as total
                FROM sales s
                JOIN sale_details sd ON s.id_sale = sd.sale_id -- ✨ CORREGIDO AQUÍ
                JOIN product_recipes pr ON sd.menu_id = pr.menu_id
                WHERE s.branch_id = ? AND DATE(s.sale_date) = ? AND pr.component_id = ? AND s.status = 1
            `, [branchId, fecha, row.real_product_id]);

            // Consumo directo (Gaseosas, Cajas, Extras)
            const [consumoDirecto]: any = await connection.query(`
                SELECT IFNULL(SUM(sd.quantity), 0) as total
                FROM sales s
                JOIN sale_details sd ON s.id_sale = sd.sale_id -- ✨ CORREGIDO AQUÍ
                WHERE s.branch_id = ? AND DATE(s.sale_date) = ? AND sd.product_id = ? AND s.status = 1
            `, [branchId, fecha, row.real_product_id]);

            // Sumamos ambos consumos
            row.consumido_ventas = Number(consumoMenu[0].total) + Number(consumoDirecto[0].total);
        }

        return { 
            success: true, 
            isInventarioCerrado, 
            totalAlmacenes,
            almacenesCerrados,
            data: detalles 
        };
    } catch (error: any) {
        console.error("Error obteniendo resumen de almacenes:", error);
        return { success: false, message: error.message, data: [], isInventarioCerrado: false, totalAlmacenes: 0, almacenesCerrados: 0 };
    } finally {
        connection.release();
    }
}

export async function obtenerAlmacenesPermitidosGlobal() {
    const session = await auth();
    if (!session?.user?.id) return { success: false, data: [] };

    const userId = session.user.id;
    const role = session.user.role?.toUpperCase().trim() || "";

    const connection = await pool.getConnection();
    try {
        // 1. GERENTES: Ven absolutamente todos los almacenes del ERP (que pertenezcan a sucursales activas)
        if (['GERENTE GENERAL', 'ADMINISTRADOR GENERAL', 'GERENTE DE LOGISTICA', 'CEO'].includes(role)) {
            const [rows]: any = await connection.query(`
                SELECT w.id, w.name, b.name as branch_name, w.branch_id
                FROM warehouses w
                JOIN branches b ON w.branch_id = b.id
                WHERE w.status = 1 AND b.status = 1
                ORDER BY b.name ASC, w.name ASC
            `);
            return { success: true, data: rows };
        }

        // 2. ADMIN SUCURSAL: Ve todos los almacenes de su(s) sucursal(es) asignada(s) (siempre que sigan activas)
        if (['ADMIN_SUCURSAL'].includes(role)) {
            const [rows]: any = await connection.query(`
                SELECT w.id, w.name, b.name as branch_name, w.branch_id
                FROM warehouses w
                JOIN branches b ON w.branch_id = b.id
                JOIN user_branches ub ON b.id = ub.branch_id
                WHERE ub.user_id = ? AND w.status = 1 AND b.status = 1
                ORDER BY b.name ASC, w.name ASC
            `, [userId]);
            return { success: true, data: rows };
        }

        // 3. ALMACENEROS: Ven SOLO los almacenes físicos asignados (que pertenezcan a sucursales activas)
        const [rows]: any = await connection.query(`
            SELECT w.id, w.name, b.name as branch_name, w.branch_id
            FROM warehouses w
            JOIN branches b ON w.branch_id = b.id
            JOIN user_warehouses uw ON w.id = uw.warehouse_id
            WHERE uw.user_id = ? AND w.status = 1 AND b.status = 1
            ORDER BY b.name ASC, w.name ASC
        `, [userId]);
        
        return { success: true, data: rows };
    } catch (error: any) {
        return { success: false, message: error.message };
    } finally {
        connection.release();
    }
}