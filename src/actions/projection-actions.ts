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
        // Traemos Platillos
        const [articulos]: any = await connection.query(
            "SELECT product_name AS producto, projected_qty AS cantidad, projected_revenue AS ingresos FROM sales_projection_details WHERE projection_id = ? ORDER BY ingresos DESC", 
            [projectionId]
        );
        // Traemos Horas
        const [horas]: any = await connection.query(
            "SELECT hour_of_day AS hora, projected_sales AS cantidad FROM sales_projection_hourly WHERE projection_id = ? ORDER BY CAST(hora AS UNSIGNED) ASC", 
            [projectionId]
        );
        // Traemos Stock
        const [stock]: any = await connection.query(
            "SELECT ingredient_name AS insumo, required_qty AS cantidad, unit AS unidad FROM sales_projection_stock WHERE projection_id = ?", 
            [projectionId]
        );

        return { 
            success: true, 
            data: {
                articulos: articulos || [],
                horas: horas || [],
                stock: stock || []
            }
        };
    } catch (error: any) {
        return { success: false, data: { articulos: [], horas: [], stock: [] } };
    } finally {
        connection.release();
    }
}