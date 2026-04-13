'use server'
import { pool } from "@/lib/db";

export async function generarProyeccion(branchId: number, targetDate: string, tipoVista: string) {
    const connection = await pool.getConnection();
    try {
        // ✨ Añadimos el 3er parámetro (tipoVista: 'DIA' o 'MES')
        const [results]: any = await connection.query("CALL sp_generar_proyeccion_completa(?, ?, ?)", [branchId, targetDate, tipoVista]);
        
        return { 
            success: true, 
            horas: results[0] || [], 
            stock: results[1] || [],
            menus: results[2] || [] // ✨ Devolvemos el reporte de Menús y Dinero
        };
    } catch (error: any) {
        console.error("Error generando proyecciones:", error);
        return { success: false, message: error.message, horas: [], stock: [], menus: [] };
    } finally {
        connection.release();
    }
}