'use server'

import { pool } from "@/lib/db";
import { auth } from "@/auth";

export async function generarProyeccion(branchId: number, targetDate: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: "No autorizado" };
    const userId = session.user.id;

    const connection = await pool.getConnection();
    try {
        // 1. Ejecutamos tu Stored Procedure principal (Genera la data y devuelve el ID)
        const [resultProj]: any = await connection.query(
            "CALL sp_generar_proyeccion(?, ?, ?)", 
            [branchId, userId, targetDate]
        );
        const projectionId = resultProj[0][0].projection_id;

        // 2. Leemos los picos por hora llamando al nuevo SP
        const [resultHoras]: any = await connection.query(
            "CALL sp_obtener_proyeccion_horas(?)", 
            [projectionId]
        );
        const horas = resultHoras[0]; // La data siempre viene en el índice 0 del resultado del SP

        // 3. Leemos el stock necesario llamando al otro nuevo SP
        const [resultStock]: any = await connection.query(
            "CALL sp_obtener_proyeccion_stock(?)", 
            [projectionId]
        );
        const stock = resultStock[0];

        return { success: true, horas, stock, message: "Proyección generada con éxito" };

    } catch (error: any) {
        console.error("Error generando proyección:", error);
        return { success: false, message: `Error BD: ${error.message}` };
    } finally {
        connection.release();
    }
}