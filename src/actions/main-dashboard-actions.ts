'use server'

import { pool } from "@/lib/db";
import { auth } from "@/auth";

export async function getDashboardInteligente(sucursalSeleccionada?: string) {
    const session = await auth();
    if (!session?.user) return null;

    const role = session.user.role?.toUpperCase().trim() || "";
    const sessionUser = session.user as any;
    
    // Obtenemos el ID del usuario (NextAuth suele guardarlo en .id, .sub o .userId)
    const userId = sessionUser.id || sessionUser.sub || sessionUser.userId || sessionUser.id_usuario;

    // Generación de fecha
    const formatter = new Intl.DateTimeFormat('es-PE', {
        timeZone: 'America/Lima',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    
    const [dia, mes, anio] = formatter.format(new Date()).split('/');
    const hoy = `${anio}-${mes}-${dia}`;

    const connection = await pool.getConnection();
    
    try {
        // ✨ CORRECCIÓN: Buscamos la sucursal REAL en la Base de Datos
        let branchId = 1; // Lima por defecto (ID 1)
        
        const [userBranchRows]: any = await connection.query(
            "SELECT branch_id FROM user_branches WHERE user_id = ? LIMIT 1", 
            [userId]
        );
        
        // Si el usuario tiene una sucursal asignada en la BD, sobreescribimos el '1'
        if (userBranchRows && userBranchRows.length > 0) {
            branchId = parseInt(userBranchRows[0].branch_id);
        }

        if (role === 'ALMACENERO') {
            const [results]: any = await connection.query("CALL sp_dashboard_almacen(?)", [branchId]);
            return {
                role: 'ALMACENERO',
                stockCritico: results[0] || [],
                comprasAprobadas: results[1] || [],
                comprasPendientes: results[2] || []
            };
        } 
        
        else if (role === 'GERENTE GENERAL' || role === 'GERENTE DE LOGISTICA' || role === 'CEO') {
            const [results]: any = await connection.query("CALL sp_dashboard_gerencia(?)", [hoy]);
            return {
                role: 'GERENTE',
                kpis: results[0][0] || { venta_real_global: 0, venta_proyectada_global: 0, compras_pendientes: 0, compras_aprobadas: 0 },
                topProyectados: results[1] || [],
                topVendidos: results[2] || []
            };
        } 

        // ✨ BLOQUE DEL JEFE DE RRHH
        else if (role === 'JEFE DE RRHH' || role === 'JEFE_RRHH') {
            const [results]: any = await connection.query("CALL sp_dashboard_rrhh(?)", [hoy]);
            return {
                role: 'JEFE_RRHH',
                kpis: results[0][0] || { total_empleados: 0, turnos_hoy: 0 },
                turnosGlobales: results[1] || []
            };
        }
        
        // ✨ BLOQUE DEL ZONAL CORREGIDO: Consulta en VIVO a tu tabla user_branches
        else if (role === 'ADMINISTRADOR_ZONAL' || role === 'ADMINISTRADOR ZONAL') {
            
            // 🌟 CORRECCIÓN: Agregamos DISTINCT para eliminar los duplicados mágicamente
            const [sedesAsignadas]: any = await connection.query(
                `SELECT DISTINCT b.id, b.name 
                 FROM user_branches ub 
                 JOIN branches b ON ub.branch_id = b.id 
                 WHERE ub.user_id = ?`, 
                [userId]
            );

            // 2. Extraemos los IDs encontrados y los unimos con comas (Ej: "4,5,6")
            let assignedBranchesString = "1"; // Default por si acaso
            if (sedesAsignadas && sedesAsignadas.length > 0) {
                assignedBranchesString = sedesAsignadas.map((s: any) => s.id).join(',');
            }

            // 3. Ejecutamos la lógica según lo que seleccionó
            if (sucursalSeleccionada && sucursalSeleccionada !== "") {
                const [results]: any = await connection.query("CALL sp_dashboard_admin(?, ?)", [parseInt(sucursalSeleccionada), hoy]);
                return {
                    role: 'ADMIN_SUCURSAL', 
                    isZonal: true,          
                    listaSedes: sedesAsignadas, // Pasamos la lista real extraída de la BD
                    kpis: results[0][0] || { venta_real: 0, venta_proyectada: 0, items_criticos: 0 },
                    topProyectados: results[1] || [],
                    turnos: results[2] || []
                };
            } 
            else {
                // Pasamos el string de IDs dinámico (ej: "4,5,6") a tu Procedimiento Almacenado Zonal
                const [results]: any = await connection.query("CALL sp_dashboard_zonal(?, ?)", [assignedBranchesString, hoy]);
                return {
                    role: 'ADMIN_SUCURSAL', 
                    isZonal: true,
                    listaSedes: sedesAsignadas, // Pasamos la lista real extraída de la BD
                    kpis: results[0][0] || { venta_real: 0, venta_proyectada: 0, items_criticos: 0 },
                    topProyectados: results[1] || [],
                    turnos: results[2] || []
                };
            }
        }
        
        else {
            const [results]: any = await connection.query("CALL sp_dashboard_admin(?, ?)", [branchId, hoy]);
            return {
                role: 'ADMIN_SUCURSAL',
                isZonal: false,
                kpis: results[0][0] || { venta_real: 0, venta_proyectada: 0, items_criticos: 0 },
                topProyectados: results[1] || [],
                turnos: results[2] || []
            };
        }
    } catch (error: any) {
        console.error("Error SQL:", error.message);
        return {
            role: 'ERROR',
            message: error.message || "Error desconocido en la BD"
        };
    } finally {
        connection.release();
    }
}