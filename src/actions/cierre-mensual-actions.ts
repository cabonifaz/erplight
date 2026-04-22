'use server'

import { pool } from "@/lib/db";

export async function obtenerCierreMensual(branchId: number, periodo: string) {
    const connection = await pool.getConnection();
    try {
        // ✨ CORTAMOS EL STRING "2026-04" EN AÑO Y MES
        const [anioStr, mesStr] = periodo.split('-');
        const anio = Number(anioStr);
        const mes = Number(mesStr);

        // Llamamos al SP maestro enviando los 3 parámetros exactos
        const [resultsMaestro]: any = await connection.query(
            "CALL sp_cierre_mensual_completo(?, ?, ?)", 
            [branchId, mes, anio]
        );

        // Llamamos al SP secundario para la tabla de platillos
        const [resultsPlatillos]: any = await connection.query(
            "CALL sp_cierre_mensual_platillos(?, ?, ?)", 
            [branchId, mes, anio]
        );

        return { 
            success: true, 
            // El SP Maestro devuelve 3 bloques de resultados (KPIs, Pagos, Turnos)
            kpis: resultsMaestro[0][0] || { total_operaciones: 0, total_dinero: 0, ticket_promedio: 0 },
            pagos: resultsMaestro[1] || [], 
            turnos: resultsMaestro[2] || [],
            // El SP Secundario devuelve la lista de platillos
            articulos: resultsPlatillos[0] || []
        };
    } catch (error: any) {
        console.error("Error en cierre mensual:", error);
        return { success: false, message: error.message };
    } finally {
        connection.release();
    }
}