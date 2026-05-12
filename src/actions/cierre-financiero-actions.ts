'use server'

import { pool } from "@/lib/db";
import { auth } from "@/auth";   // Ajusta tu ruta de autenticación

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


// Verifica si el candado está puesto
export async function verificarEstadoCierre(branchId: number, fecha: string) {
    const connection = await pool.getConnection();
    try {
        const [rows]: any = await connection.query("CALL sp_verificar_estado_cierre(?, ?)", [branchId, fecha]);
        const isClosed = rows[0] && rows[0].length > 0 && rows[0][0].status === 1;
        return { success: true, isClosed };
    } catch (error: any) {
        return { success: false, isClosed: false };
    } finally {
        connection.release();
    }
}

// Ejecuta el cierre definitivo
export async function enviarCierreDiario(branchId: number, fecha: string, cashBreakdown?: any) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: "No autorizado" };

    const connection = await pool.getConnection();
    try {
        // ✨ Convertimos el objeto a un string JSON seguro para MySQL
        const breakdownString = cashBreakdown ? JSON.stringify(cashBreakdown) : null;

        // ✨ Agregamos el cuarto parámetro a la llamada del SP
        const [rows]: any = await connection.query(
            "CALL sp_enviar_cierre_diario(?, ?, ?, ?)", 
            [branchId, fecha, session.user.id, breakdownString]
        );
        const result = rows[0][0];
        
        return { success: result.success === 1, message: result.message };
    } catch (error: any) {
        return { success: false, message: "Error al enviar cierre: " + error.message };
    } finally {
        connection.release();
    }
}