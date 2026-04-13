'use server'

import { pool } from "@/lib/db";

export async function obtenerCierreMensual(branchId: number, periodo: string) {
    const connection = await pool.getConnection();
    try {
        // Llamamos al SP maestro que creamos
        const [results]: any = await connection.query("CALL sp_cierre_mensual_completo(?, ?)", [branchId, periodo]);

        return { 
            success: true, 
            pagos: results[0] || [], 
            articulos: results[1] || [],
            // Extraemos el primer (y único) registro de los KPIs
            kpis: results[2][0] || { total_operaciones: 0, total_dinero: 0, ticket_promedio: 0 },
            turnos: results[3] || []
        };
    } catch (error: any) {
        console.error("Error en cierre mensual:", error);
        return { success: false, message: error.message };
    } finally {
        connection.release();
    }
}