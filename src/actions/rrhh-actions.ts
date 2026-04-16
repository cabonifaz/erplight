'use server'

import { pool } from "@/lib/db";

// 1. OBTENER EMPLEADOS POR SUCURSAL (SOLO LLAMA AL SP)
export async function getEmpleadosPorSucursal(branchId: number) {
    const connection = await pool.getConnection();
    try {
        // ✨ Cero SQL directo, pura llamada al Procedimiento Almacenado
        const [rows]: any = await connection.query("CALL sp_listar_empleados_sucursal(?)", [branchId]);
        
        // rows[0] porque los CALL devuelven la data dentro del primer elemento del array
        return { success: true, data: rows[0] };
    } catch (error: any) {
        console.error("Error al obtener empleados:", error);
        return { success: false, data: [] };
    } finally {
        connection.release();
    }
}

// CREAR EMPLEADO
export async function crearEmpleado(data: any) {
    const connection = await pool.getConnection();
    try {
        // Formateamos la fecha a nulo si viene vacía
        const fechaNac = data.fecha_nacimiento ? data.fecha_nacimiento : null;
        
        await connection.query(
            "CALL sp_crear_empleado(?, ?, ?, ?, ?, ?, ?, ?)",
            [data.branch_id, data.nombres, data.apellidos, data.tipo_documento_id, data.numero_documento, data.cargo_id, data.salario_hora, fechaNac]
        );
        return { success: true, message: "Empleado creado correctamente." };
    } catch (error: any) {
        return { success: false, message: "Error al crear empleado." };
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

// 5. GUARDAR UN TURNO (AHORA CON "FORCE" PARA SALTAR LA ALERTA SI EL JEFE LO DESEA)
export async function guardarHorarioEmpleado(employeeId: number, fecha: string, horaInicio: string, horaFin: string, horasTotales: number, force: boolean = false, estado: number = 0) {
    const connection = await pool.getConnection();
    try {
        const [year, month, day] = fecha.split('-');
        const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
        let dayOfWeek = dateObj.getDay();
        dayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

        const [dispRows]: any = await connection.query("CALL sp_rrhh_obtener_disponibilidad(?)", [employeeId]);
        const disponibilidad = dispRows[0];

        // ✨ GUARDIÁN FLEXIBLE (Solo alerta si "force" es falso)
        if (!force && disponibilidad && disponibilidad.length > 0) {
            const reglaDelDia = disponibilidad.find((d: any) => d.dia_semana === dayOfWeek);
            
            if (!reglaDelDia) {
                return { success: false, requiresConfirm: true, message: "⚠️ DÍA RESTRINGIDO: El empleado no está disponible este día. ¿Deseas asignarle el turno de todos modos?" };
            }
            if (horaInicio < reglaDelDia.hora_inicio || horaFin > reglaDelDia.hora_fin) {
                return { success: false, requiresConfirm: true, message: `⚠️ FUERA DE RANGO: Su horario base es de ${reglaDelDia.hora_inicio} a ${reglaDelDia.hora_fin}. ¿Deseas forzar este nuevo horario de todos modos?` };
            }
        }

        // Guardamos (0 = Borrador, 1 = Aplicado)
        await connection.query("CALL sp_rrhh_guardar_horario(?, ?, ?, ?, ?, ?)", [employeeId, fecha, horaInicio, horaFin, horasTotales, estado]);
        return { success: true, message: "Turno guardado en borrador." };
    } catch (error: any) {
        return { success: false, message: "Error al guardar el horario." };
    } finally {
        connection.release();
    }
}

// EDITAR EMPLEADO
export async function editarEmpleado(data: any) {
    const connection = await pool.getConnection();
    try {
        const fechaNac = data.fecha_nacimiento ? data.fecha_nacimiento : null;

        await connection.query(
            "CALL sp_editar_empleado(?, ?, ?, ?, ?, ?, ?, ?)",
            [data.id, data.nombres, data.apellidos, data.tipo_documento_id, data.numero_documento, data.cargo_id, data.salario_hora, fechaNac]
        );
        return { success: true, message: "Empleado actualizado correctamente." };
    } catch (error: any) {
        return { success: false, message: "Error al editar empleado." };
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

// 16. AUTOGENERAR HORARIO SEMANAL
export async function autogenerarHorarioSemana(branchId: number, fechaInicio: string, fechaFin: string) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [emps]: any = await connection.query("SELECT id FROM employees WHERE branch_id = ? AND estado = 1", [branchId]);
        const dInicio = new Date(fechaInicio + 'T00:00:00');
        const dFin = new Date(fechaFin + 'T00:00:00');

        for (let d = new Date(dInicio); d <= dFin; d.setDate(d.getDate() + 1)) {
            let dayOfWeek = d.getDay();
            dayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
            const fechaStr = d.toISOString().split('T')[0];

            for (const emp of emps) {
                const [dispRows]: any = await connection.query("CALL sp_rrhh_obtener_disponibilidad(?)", [emp.id]);
                const disponibilidad = dispRows[0];

                if (disponibilidad && disponibilidad.length > 0) {
                    const regla = disponibilidad.find((r: any) => r.dia_semana === dayOfWeek);
                    if (regla) {
                        const [hInicio, mInicio] = regla.hora_inicio.split(':').map(Number);
                        const [hFin, mFin] = regla.hora_fin.split(':').map(Number);
                        let diff = (hFin + mFin / 60) - (hInicio + mInicio / 60);
                        if (diff < 0) diff += 24;

                        // Lo guarda como borrador (estado 0)
                        await connection.query("CALL sp_rrhh_guardar_horario(?, ?, ?, ?, ?, 0)", [emp.id, fechaStr, regla.hora_inicio, regla.hora_fin, diff]);
                    }
                }
            }
        }
        await connection.commit();
        return { success: true, message: "Horarios autogenerados en Borrador." };
    } catch (error) {
        await connection.rollback();
        return { success: false, message: "Error al autogenerar." };
    } finally {
        connection.release();
    }
}

// 17. APLICAR / PUBLICAR HORARIOS
export async function publicarHorariosSemana(branchId: number, fechaInicio: string, fechaFin: string) {
    const connection = await pool.getConnection();
    try {
        await connection.query("CALL sp_rrhh_publicar_horarios_semana(?, ?, ?)", [branchId, fechaInicio, fechaFin]);
        return { success: true, message: "Horarios publicados y activos." };
    } catch (error) {
        return { success: false, message: "Error al publicar horarios." };
    } finally {
        connection.release();
    }
}

// 18. ELIMINAR UN TURNO ESPECÍFICO (SOLO LLAMA AL SP)
export async function eliminarHorarioEmpleado(employeeId: number, fecha: string) {
    const connection = await pool.getConnection();
    try {
        // ✨ Cero SQL directo, pura llamada al Procedimiento Almacenado
        await connection.query("CALL sp_rrhh_eliminar_horario(?, ?)", [employeeId, fecha]);
        
        return { success: true, message: "Turno eliminado correctamente." };
    } catch (error: any) {
        console.error("Error al eliminar horario:", error);
        return { success: false, message: "Error al eliminar el turno." };
    } finally {
        connection.release();
    }
}

// 19. OBTENER NOTIFICACIONES DE CUMPLEAÑOS
export async function obtenerNotificacionesCumpleanos(branchId: number, rol: string) {
    const connection = await pool.getConnection();
    try {
        const [rows]: any = await connection.query("CALL sp_obtener_notificaciones_cumpleanos(?, ?)", [branchId, rol]);
        return { success: true, data: rows[0] };
    } catch (error: any) {
        console.error("Error al obtener cumpleaños:", error);
        return { success: false, data: [] };
    } finally {
        connection.release();
    }
}

// 20. OBTENER REPORTE DE HORAS TRABAJADAS
export async function obtenerReporteHoras(branchId: number, fechaInicio: string, fechaFin: string) {
    const connection = await pool.getConnection();
    try {
        const [rows]: any = await connection.query("CALL sp_rrhh_reporte_horas(?, ?, ?)", [branchId, fechaInicio, fechaFin]);
        return { success: true, data: rows[0] };
    } catch (error: any) {
        console.error("Error al obtener reporte de horas:", error);
        return { success: false, data: [] };
    } finally {
        connection.release();
    }
}