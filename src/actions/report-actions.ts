'use server'

import { pool } from "@/lib/db";
import { auth } from "@/auth";

export async function getCierreInventario(filtros: {
    branchId: number;
    fechaInicio: string;
    fechaFin: string;
}) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: "No autorizado", data: [] };

    const connection = await pool.getConnection();
    try {
        const [rows]: any = await connection.query(
            "CALL sp_reporte_cierre_inventario(?, ?, ?)", 
            [filtros.branchId, filtros.fechaInicio, filtros.fechaFin]
        );
        return { success: true, data: rows[0] || [] };
    } catch (error: any) {
        console.error("Error obteniendo cierre:", error);
        return { success: false, message: error.message, data: [] };
    } finally {
        connection.release();
    }
}