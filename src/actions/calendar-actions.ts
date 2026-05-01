'use server'

import { pool } from "@/lib/db";
import { revalidatePath } from "next/cache";

// 1. Obtener todos los feriados
export async function getHolidays() {
    const connection = await pool.getConnection();
    try {
        const [rows]: any = await connection.query("CALL sp_listar_feriados()");
        return { success: true, data: rows[0] || [] };
    } catch (error: any) {
        console.error("Error obteniendo calendario:", error);
        return { success: false, message: error.message, data: [] };
    } finally {
        connection.release();
    }
}

// 2. Agregar un nuevo feriado o día especial
export async function addHoliday(fecha: string, descripcion: string, multiplicador: number) {
    const connection = await pool.getConnection();
    try {
        await connection.query("CALL sp_agregar_feriado(?, ?, ?)", [fecha, descripcion, multiplicador]);
        revalidatePath('/configuracion/calendario');
        return { success: true, message: "Día festivo agregado correctamente." };
    } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY') {
            return { success: false, message: "Ya existe un evento registrado para esta fecha." };
        }
        return { success: false, message: error.message };
    } finally {
        connection.release();
    }
}

// 3. Eliminar un feriado
export async function deleteHoliday(id: number) {
    const connection = await pool.getConnection();
    try {
        await connection.query("CALL sp_eliminar_feriado(?)", [id]);
        revalidatePath('/configuracion/calendario');
        return { success: true, message: "Día festivo eliminado." };
    } catch (error: any) {
        return { success: false, message: error.message };
    } finally {
        connection.release();
    }
}

// 4. Importar Feriados desde el Excel
export async function importarCalendarioExcel(payload: { data: any[], year: number }) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const feriadosData = payload.data;
        const anio = payload.year || new Date().getFullYear();

        const mesesMapeo: Record<string, string> = {
            'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
            'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
            'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
        };

        let insertados = 0;

        for (const fila of feriadosData) {
            const fechaRaw = fila['Fecha'] || fila['fecha'];
            const descripcion = fila['Días feriados'] || fila['días feriados'] || fila['festividad'];
            
            if (!fechaRaw || !descripcion) continue;

            let fechaSql = null;
            const partesFecha = String(fechaRaw).toLowerCase().split(' de ');
            if (partesFecha.length === 2) {
                const dia = partesFecha[0].padStart(2, '0');
                const mesTxt = partesFecha[1].trim();
                const mesNum = mesesMapeo[mesTxt];
                if (mesNum) {
                    fechaSql = `${anio}-${mesNum}-${dia}`;
                }
            }

            if (!fechaSql) continue;

            let multiplicador = 1.30;
            const descLower = descripcion.toLowerCase();
            if (descLower.includes('madre')) multiplicador = 2.00;
            else if (descLower.includes('padre') || descLower.includes('navidad') || descLower.includes('año nuevo')) multiplicador = 1.80;
            else if (descLower.includes('independencia') || descLower.includes('patrias')) multiplicador = 1.50;

            // ✅ CORRECCIÓN SEGURIDAD: SP para Upsert (Insert or Update)
            await connection.query("CALL sp_upsert_feriado(?, ?, ?)", [fechaSql, descripcion, multiplicador]);
            insertados++;
        }

        await connection.commit();
        revalidatePath('/configuracion/calendario');
        return { success: true, message: `¡Se importaron ${insertados} días festivos correctamente!` };
    } catch (error: any) {
        await connection.rollback();
        console.error("Error importando Excel de calendario:", error);
        return { success: false, message: error.message || "Error al procesar el Excel." };
    } finally {
        connection.release();
    }
}

// 5. Actualizar el multiplicador
export async function updateHolidayMultiplier(id: number, newMultiplier: number) {
    const connection = await pool.getConnection();
    try {
        await connection.query("CALL sp_actualizar_multiplicador_feriado(?, ?)", [id, newMultiplier]);
        revalidatePath('/configuracion/calendario');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    } finally {
        connection.release();
    }
}