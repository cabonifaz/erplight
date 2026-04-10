'use server'

import { pool } from "@/lib/db";

export async function obtenerResumenVentasDiarias(branchId: number, fecha: string) {
    const connection = await pool.getConnection();
    try {
        // Ejecutamos los procedimientos principales
        const [resPagos]: any = await connection.query("CALL sp_cierre_diario_pagos(?, ?)", [branchId, fecha]);
        const [resArticulos]: any = await connection.query("CALL sp_cierre_diario_articulos(?, ?)", [branchId, fecha]);
        const [resKpis]: any = await connection.query("CALL sp_cierre_diario_kpis(?, ?)", [branchId, fecha]);
        
        // Llamamos al reporte de turnos agrupados (Gráfica)
        const [resTurnos]: any = await connection.query("CALL sp_cierre_diario_turnos(?, ?)", [branchId, fecha]);
        
        // ✨ NUEVO: Llamamos al SP de detalles por turno (Acordeón) ¡Sin SQL directo!
        const [detallesTurnos]: any = await connection.query("CALL sp_cierre_diario_detalles_turnos(?, ?)", [branchId, fecha]);

        return { 
            success: true, 
            pagos: resPagos[0], 
            articulos: resArticulos[0],
            kpis: resKpis[0][0],
            turnos: resTurnos[0],
            // ✨ OJO: Al ser un SP ahora, le agregamos el [0] para sacar los datos del wrapper
            detallesTurnos: detallesTurnos[0] 
        };
    } catch (error: any) {
        return { success: false, message: error.message };
    } finally {
        connection.release();
    }
}