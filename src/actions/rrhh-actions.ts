'use server'

import { pool } from "@/lib/db";

// 1. OBTENER LISTA DE EMPLEADOS
export async function getEmpleadosPorSucursal(branchId: number) {
    const connection = await pool.getConnection();
    try {
        const [rows]: any = await connection.query("CALL sp_rrhh_listar_empleados(?)", [branchId]);
        return { success: true, data: rows[0] };
    } catch (error: any) {
        console.error("Error al listar empleados:", error);
        return { success: false, message: error.message };
    } finally {
        connection.release();
    }
}

// 2. CREAR NUEVO EMPLEADO
export async function crearEmpleado(data: any) {
    const connection = await pool.getConnection();
    try {
        await connection.query(
            "CALL sp_rrhh_crear_empleado(?, ?, ?, ?, ?, ?, ?)",
            [
                data.branch_id, 
                data.nombres, 
                data.apellidos, 
                data.tipo_documento_id, 
                data.numero_documento, 
                data.cargo_id, 
                data.salario_hora
            ]
        );
        return { success: true, message: "Empleado registrado correctamente" };
    } catch (error: any) {
        console.error("Error al crear empleado:", error);
        return { success: false, message: error.message };
    } finally {
        connection.release();
    }
}

// 3. REGISTRAR ASISTENCIA (Entrada o Salida)
export async function registrarAsistencia(employeeId: number, estadoId: number) {
    const connection = await pool.getConnection();
    try {
        const [rows]: any = await connection.query("CALL sp_rrhh_marcar_asistencia(?, ?)", [employeeId, estadoId]);
        const resultado = rows[0][0].resultado;
        return { 
            success: true, 
            message: resultado === 'ENTRADA_REGISTRADA' ? '¡Entrada registrada con éxito!' : '¡Salida registrada con éxito!',
            tipo: resultado
        };
    } catch (error: any) {
        console.error("Error al marcar asistencia:", error);
        return { success: false, message: error.message };
    } finally {
        connection.release();
    }
}
// 4. OBTENER MATRIZ DE HORARIOS POR SEMANA EXACTA
export async function obtenerHorariosSemana(branchId: number, fechaInicio: string, fechaFin: string) {
    const connection = await pool.getConnection();
    try {
        const [rows]: any = await connection.query("CALL sp_rrhh_obtener_horarios_semana(?, ?, ?)", [branchId, fechaInicio, fechaFin]);
        return { success: true, data: rows[0] };
    } catch (error: any) {
        console.error("Error al obtener horarios:", error);
        return { success: false, message: error.message };
    } finally {
        connection.release();
    }
}

// 5. GUARDAR UN TURNO EN UNA FECHA EXACTA (CON VALIDACIÓN DE DISPONIBILIDAD)
export async function guardarHorarioEmpleado(employeeId: number, fecha: string, horaInicio: string, horaFin: string, horasTotales: number) {
    const connection = await pool.getConnection();
    try {
        // ✨ --- INICIO DEL GUARDIÁN DE DISPONIBILIDAD --- ✨
        
        // 1. Averiguamos qué día de la semana es la fecha enviada (1=Lunes, 7=Domingo)
        const [year, month, day] = fecha.split('-');
        const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
        let dayOfWeek = dateObj.getDay();
        dayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek; // Convertimos el Domingo (0) a 7

        // 2. Traemos las reglas de disponibilidad del empleado desde la BD
        const [dispRows]: any = await connection.query("CALL sp_rrhh_obtener_disponibilidad(?)", [employeeId]);
        const disponibilidad = dispRows[0];

        // 3. Si el empleado tiene reglas configuradas, las aplicamos de forma estricta
        if (disponibilidad && disponibilidad.length > 0) {
            const reglaDelDia = disponibilidad.find((d: any) => d.dia_semana === dayOfWeek);
            
            // Regla A: Intentan ponerle turno un día que NO marcó como disponible (Ej: Martes)
            if (!reglaDelDia) {
                return { 
                    success: false, 
                    message: "⛔ DÍA RESTRINGIDO: El empleado no tiene disponibilidad para trabajar este día." 
                };
            }

            // Regla B: Intentan ponerle un turno fuera de su rango (Ej: 07:10 am cuando entra a las 08:00 am)
            if (horaInicio < reglaDelDia.hora_inicio || horaFin > reglaDelDia.hora_fin) {
                return { 
                    success: false, 
                    message: `⛔ HORARIO FUERA DE RANGO: Solo puede ser asignado entre las ${reglaDelDia.hora_inicio} y las ${reglaDelDia.hora_fin}.` 
                };
            }
        }
        // ✨ --- FIN DEL GUARDIÁN --- ✨

        // Si sobrevive al guardián, recién procedemos a guardar en la base de datos
        await connection.query(
            "CALL sp_rrhh_guardar_horario(?, ?, ?, ?, ?)",
            [employeeId, fecha, horaInicio, horaFin, horasTotales]
        );
        return { success: true, message: "Horario guardado correctamente." };
        
    } catch (error: any) {
        console.error("Error al guardar horario:", error);
        return { success: false, message: "Error interno del servidor al guardar el horario." };
    } finally {
        connection.release();
    }
}
// 6. EDITAR EMPLEADO
export async function editarEmpleado(data: any) {
    const connection = await pool.getConnection();
    try {
        await connection.query(
            "CALL sp_rrhh_editar_empleado(?, ?, ?, ?, ?, ?, ?)",
            [
                data.id,
                data.nombres,
                data.apellidos,
                data.tipo_documento_id,
                data.numero_documento,
                data.cargo_id,
                data.salario_hora
            ]
        );
        return { success: true, message: "Empleado actualizado correctamente" };
    } catch (error: any) {
        console.error("Error al editar empleado:", error);
        return { success: false, message: error.message };
    } finally {
        connection.release();
    }
}

// 7. OBTENER CATÁLOGOS PARA LOS DESPLEGABLES DEL FORMULARIO
export async function obtenerCatalogosRRHH() {
    const connection = await pool.getConnection();
    try {
        const [rows]: any = await connection.query("CALL sp_rrhh_obtener_catalogos()");
        
        // MySQL devuelve múltiples resultados en orden. 
        // rows[0] son los documentos, rows[1] son los cargos
        return { 
            success: true, 
            documentos: rows[0] || [], 
            cargos: rows[1] || [] 
        };
    } catch (error: any) {
        console.error("Error al obtener catálogos:", error);
        return { success: false, message: error.message };
    } finally {
        connection.release();
    }
}

// 8. OBTENER ESTADO DE ASISTENCIA ACTUAL
export async function obtenerEstadoAsistencia(employeeId: number) {
    const connection = await pool.getConnection();
    try {
        const [rows]: any = await connection.query("CALL sp_rrhh_estado_asistencia_hoy(?)", [employeeId]);
        return { success: true, estado: rows[0][0].estado };
    } catch (error: any) {
        console.error("Error al obtener estado:", error);
        return { success: false, estado: 'ERROR' };
    } finally {
        connection.release();
    }
}

// 9. MARCAR ASISTENCIA MEDIANTE DOCUMENTO (KIOSKO)
export async function marcarAsistenciaPorDocumento(numeroDocumento: string) {
    const connection = await pool.getConnection();
    try {
        const [rows]: any = await connection.query("CALL sp_rrhh_marcar_asistencia_por_doc(?)", [numeroDocumento]);
        
        const data = rows[0][0]; // El SP devuelve la respuesta estructurada
        
        return { 
            success: data.resultado !== 'ERROR', 
            resultado: data.resultado,
            message: data.mensaje 
        };
    } catch (error: any) {
        console.error("Error en Kiosko:", error);
        return { success: false, message: "Error interno del servidor", resultado: 'ERROR' };
    } finally {
        connection.release();
    }
}

// 10. VERIFICAR ESTADO EN VIVO POR DOCUMENTO
export async function verificarEstadoKiosko(documento: string) {
    const connection = await pool.getConnection();
    try {
        const [rows]: any = await connection.query("CALL sp_rrhh_estado_por_doc(?)", [documento]);
        return { success: true, estado: rows[0][0].estado };
    } catch (error) {
        console.error("Error al verificar estado kiosko:", error);
        return { success: false, estado: 'ERROR' };
    } finally {
        connection.release();
    }
}

// 11. OBTENER LISTA DE SUCURSALES
export async function obtenerSucursales() {
    const connection = await pool.getConnection();
    try {
        const [rows]: any = await connection.query("CALL sp_rrhh_obtener_sucursales()");
        return { success: true, data: rows[0] };
    } catch (error) {
        console.error("Error al obtener sucursales:", error);
        return { success: false, data: [] };
    } finally {
        connection.release();
    }
}

// 12. OBTENER HORARIOS DE TODA LA SUCURSAL (MATRIZ)
export async function obtenerHorariosSucursal(branchId: number) {
    const connection = await pool.getConnection();
    try {
        const [rows]: any = await connection.query("CALL sp_rrhh_obtener_horarios_sucursal(?)", [branchId]);
        return { success: true, data: rows[0] };
    } catch (error: any) {
        console.error("Error al obtener matriz de horarios:", error);
        return { success: false, message: error.message };
    } finally {
        connection.release();
    }
}

// 13. OBTENER DISPONIBILIDAD DE UN EMPLEADO
export async function obtenerDisponibilidad(employeeId: number) {
    const connection = await pool.getConnection();
    try {
        const [rows]: any = await connection.query("CALL sp_rrhh_obtener_disponibilidad(?)", [employeeId]);
        return { success: true, data: rows[0] };
    } catch (error: any) {
        return { success: false, data: [] };
    } finally {
        connection.release();
    }
}

// 14. GUARDAR DISPONIBILIDAD COMPLETA
export async function guardarDisponibilidad(employeeId: number, diasDisponibles: any[]) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // Primero limpiamos la disponibilidad anterior
        await connection.query("CALL sp_rrhh_limpiar_disponibilidad(?)", [employeeId]);
        
        // Guardamos los nuevos rangos
        for (const dia of diasDisponibles) {
            await connection.query("CALL sp_rrhh_guardar_disponibilidad(?, ?, ?, ?)", 
                [employeeId, dia.dia_semana, dia.hora_inicio, dia.hora_fin]
            );
        }
        
        await connection.commit();
        return { success: true, message: "Disponibilidad actualizada." };
    } catch (error: any) {
        await connection.rollback();
        return { success: false, message: "Error al guardar disponibilidad." };
    } finally {
        connection.release();
    }
}