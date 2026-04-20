'use server'
import { pool } from "@/lib/db";

// (Mantén tus imports de arriba intactos, especialmente el de tu base de datos)

export async function generarProyeccion(branchId: number, fechaTarget: string, tipoVista: string) {
    // 1. Obtenemos una conexión específica del pool
    const connection = await pool.getConnection(); 
    
    try {
        // 2. Usamos esa conexión
        const [rows]: any = await connection.query(
            'CALL sp_generar_proyecciones(?, ?, ?)', 
            [branchId, fechaTarget, tipoVista]
        );

        return {
            success: true,
            menus: rows[0] || [],
            horas: rows[1] || [],
            stock: rows[2] || []
        };
        
    } catch (error) {
        console.error("❌ Error CRÍTICO en la Proyección:", error);
        return { 
            success: false, 
            message: "Error interno al calcular proyecciones",
            menus: [], horas: [], stock: [] 
        };
    } finally {
        // 3. ¡VITAL! Liberamos la conexión pase lo que pase
        connection.release(); 
    }
}