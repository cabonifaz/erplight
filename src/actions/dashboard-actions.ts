'use server'

import { pool } from "@/lib/db";

export async function obtenerDashboardCorporativo(fechaInicio: string, fechaFin: string) {
    const connection = await pool.getConnection();
    try {
        const [results]: any = await connection.query("CALL sp_dashboard_corporativo(?, ?)", [fechaInicio, fechaFin]);

        return { 
            success: true, 
            kpis: results[0][0] || { total_operaciones: 0, total_ingresos: 0 }, 
            rankingSedes: results[1] || [],
            horarios: results[2] || [],
            topProductos: results[3] || []
        };
    } catch (error: any) {
        console.error("Error en dashboard corporativo:", error);
        return { success: false, message: error.message };
    } finally {
        connection.release();
    }
}