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
        
        // Extraemos solo las rutas/nombres permitidos en un arreglo simple
        const allowedPaths = rows.map((row: any) => row.path);
        
        return { success: true, data: allowedPaths };
    } catch (error: any) {
        console.error("Error obteniendo permisos de menú:", error);
        return { success: false, data: [] };
    } finally {
        connection.release();
    }
}