'use server'

import { pool } from "@/lib/db";

export async function getPermisosMenu(roleCode: string) {
    if (!roleCode) return { success: false, data: [] };
    
    const connection = await pool.getConnection();
    try {
        const [rows]: any = await connection.query(`
            SELECT m.code AS path
            FROM master_catalogs r
            JOIN sys_permisos_menu p ON r.id = p.rol_id
            JOIN master_catalogs m ON p.menu_id = m.id AND m.category = 'MENU_SISTEMA'
            WHERE r.category = 'ROL_SISTEMA' AND r.code = ?
        `, [roleCode]);
        
        const allowedPaths = rows.map((row: any) => row.path);
        
        return { success: true, data: allowedPaths };
    } catch (error: any) {
        console.error("Error obteniendo permisos de menú:", error);
        return { success: false, data: [] };
    } finally {
        connection.release();
    }
}

export async function createMenuAction(data: { name: string }) {
    const connection = await pool.getConnection();
    try {
        const [result]: any = await connection.query(
            `CALL sp_crear_menu(?)`,
            [data.name]
        );
        return { success: true, message: "Menú creado exitosamente", id: result[0][0].id };
    } catch (error: any) {
        console.error("Error al crear menú:", error);
        return { success: false, message: "Error interno al crear el menú" };
    } finally {
        connection.release();
    }
}

export async function updateMenuAction(data: { id: number; name: string }) {
    const connection = await pool.getConnection();
    try {
        await connection.query(
            `CALL sp_editar_menu(?, ?)`,
            [data.id, data.name]
        );
        return { success: true, message: "Menú actualizado correctamente" };
    } catch (error: any) {
        console.error("Error al actualizar menú:", error);
        return { success: false, message: "Error interno al actualizar el menú" };
    } finally {
        connection.release();
    }
}

export async function toggleMenuAction(id: number, status: number) {
    const connection = await pool.getConnection();
    try {
        await connection.query(`CALL sp_toggle_estado_menu(?, ?)`, [id, status]);
        return { success: true, message: status === 1 ? "Menú activado" : "Menú desactivado" };
    } catch (error: any) {
        console.error("Error al cambiar estado del menú:", error);
        return { success: false, message: "Error interno en el servidor" };
    } finally {
        connection.release();
    }
}