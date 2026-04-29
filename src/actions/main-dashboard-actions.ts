'use server'

import { pool } from "@/lib/db";
import { auth } from "@/auth";

export async function getDashboardInteligente() {
    const session = await auth();
    if (!session?.user) return null;

    const role = session.user.role?.toUpperCase() || "";
    // @ts-ignore
    const branchId = session.user.branch_id || 1;
    
    // Obtenemos la fecha de hoy en formato YYYY-MM-DD (Ajustado a hora de Perú)
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' }).split('/').reverse().join('-');

    const connection = await pool.getConnection();
    
    try {
        if (role === 'ALMACENERO') {
            const [results]: any = await connection.query("CALL sp_dashboard_almacen(?)", [branchId]);
            return {
                role: 'ALMACENERO',
                stockCritico: results[0] || [],
                comprasAprobadas: results[1] || [],
                comprasPendientes: results[2] || []
            };
        } 
        
        else if (role === 'GERENTE GENERAL' || role === 'GERENTE DE LOGISTICA') {
            const [results]: any = await connection.query("CALL sp_dashboard_gerencia(?)", [hoy]);
            return {
                role: 'GERENTE',
                kpis: results[0][0] || { venta_real_global: 0, venta_proyectada_global: 0, compras_pendientes: 0, compras_aprobadas: 0 },
                topProyectados: results[1] || [],
                topVendidos: results[2] || []
            };
        } 
        
        else {
            // Por defecto para Administradores de Sucursal o roles estándar
            const [results]: any = await connection.query("CALL sp_dashboard_admin(?, ?)", [branchId, hoy]);
            return {
                role: 'ADMIN_SUCURSAL',
                kpis: results[0][0] || { venta_real: 0, venta_proyectada: 0, items_criticos: 0 },
                topProyectados: results[1] || [],
                turnos: results[2] || []
            };
        }
    } catch (error) {
        console.error("Error cargando dashboard principal:", error);
        return null;
    } finally {
        connection.release();
    }
}