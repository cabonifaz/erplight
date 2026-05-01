'use server'
import { pool } from "@/lib/db";
import { auth } from "@/auth";
// (Mantén tus imports de arriba intactos, especialmente el de tu base de datos)

// En src/actions/projection-actions.ts
export async function generarProyeccion(branchId: number, targetDate: string) {
    // ... tu código de sesión ...
    const userId = 1; // o session?.user?.id
    const connection = await pool.getConnection();
    try {
        const [rows]: any = await connection.query("CALL sp_generar_proyeccion_dinamica(?, ?, ?)", [branchId, targetDate, userId]);
        return { 
            success: true, 
            message: rows[0][0].message,
            // ✨ AÑADIMOS ESTO PARA QUE EL FRONTEND SEPA QUÉ ID CONSULTAR
            projectionId: rows[0][0].new_projection_id 
        };
    } catch (error: any) {
        return { success: false, message: error.message };
    } finally {
        connection.release();
    }
}

export async function obtenerHistorialProyecciones(branchId: number) {
    const connection = await pool.getConnection();
    try {
        const [rows]: any = await connection.query("CALL sp_listar_historial_proyecciones(?)", [branchId]);
        return { success: true, data: rows[0] || [] };
    } catch (error: any) {
        return { success: false, data: [] };
    } finally {
        connection.release();
    }
}

export async function obtenerDetalleProyeccion(projectionId: number) {
    const connection = await pool.getConnection();
    try {
        // ✨ Cero SQL crudo. Un solo viaje a la base de datos para traer los 3 bloques.
        const [results]: any = await connection.query(
            "CALL sp_obtener_detalle_proyeccion(?)", 
            [projectionId]
        );

        return { 
            success: true, 
            data: {
                articulos: results[0] || [], // Primer SELECT (Platillos)
                horas: results[1] || [],     // Segundo SELECT (Horas)
                stock: results[2] || []      // Tercer SELECT (Stock/Insumos)
            }
        };
    } catch (error: any) {
        console.error("Error obteniendo detalles de proyección:", error);
        return { success: false, data: { articulos: [], horas: [], stock: [] } };
    } finally {
        connection.release();
    }
}