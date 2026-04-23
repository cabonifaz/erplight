'use server'

import { pool } from "@/lib/db";
import { revalidatePath } from "next/cache";

// 1. Obtener todos los feriados
export async function getHolidays() {
    const connection = await pool.getConnection();
    try {
        const [rows]: any = await connection.query(
            "SELECT * FROM calendar_holidays ORDER BY holiday_date ASC"
        );
        return { success: true, data: rows || [] };
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
        await connection.query(
            "INSERT INTO calendar_holidays (holiday_date, description, multiplier) VALUES (?, ?, ?)",
            [fecha, descripcion, multiplicador]
        );
        revalidatePath('/configuracion/calendario'); // Ajusta esta ruta según tu estructura
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
        await connection.query("DELETE FROM calendar_holidays WHERE id = ?", [id]);
        revalidatePath('/configuracion/calendario');
        return { success: true, message: "Día festivo eliminado." };
    } catch (error: any) {
        return { success: false, message: error.message };
    } finally {
        connection.release();
    }
}

// --- AGREGAR AL FINAL DE src/actions/calendar-actions.ts ---

// 4. Importar Feriados desde el Excel (Formato: "1 de enero", "Día", "Días feriados")
export async function importarCalendarioExcel(payload: { data: any[], year: number }) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const feriadosData = payload.data;
        const anio = payload.year || new Date().getFullYear();

        // Diccionario para traducir meses en texto a números
        const mesesMapeo: Record<string, string> = {
            'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
            'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
            'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
        };

        let insertados = 0;

        for (const fila of feriadosData) {
            // Buscamos las columnas según la imagen que me pasaste
            const fechaRaw = fila['Fecha'] || fila['fecha'];
            const descripcion = fila['Días feriados'] || fila['días feriados'] || fila['festividad'];
            
            if (!fechaRaw || !descripcion) continue;

            // 1. Parsear "1 de enero" -> "2026-01-01"
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

            if (!fechaSql) continue; // Si no pudo convertir la fecha, salta a la siguiente

            // 2. Asignar Multiplicador Automático Inteligente
            let multiplicador = 1.30; // Por defecto 30% más
            const descLower = descripcion.toLowerCase();
            if (descLower.includes('madre')) multiplicador = 2.00; // Día de la madre = x2
            else if (descLower.includes('padre') || descLower.includes('navidad') || descLower.includes('año nuevo')) multiplicador = 1.80;
            else if (descLower.includes('independencia') || descLower.includes('patrias')) multiplicador = 1.50;

            // 3. Insertar o Actualizar en Base de Datos
            await connection.query(
                `INSERT INTO calendar_holidays (holiday_date, description, multiplier) 
                 VALUES (?, ?, ?) 
                 ON DUPLICATE KEY UPDATE description = VALUES(description), multiplier = VALUES(multiplier)`,
                [fechaSql, descripcion, multiplicador]
            );
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

// 5. Actualizar el multiplicador rápidamente desde la tabla
export async function updateHolidayMultiplier(id: number, newMultiplier: number) {
    const connection = await pool.getConnection();
    try {
        await connection.query("UPDATE calendar_holidays SET multiplier = ? WHERE id = ?", [newMultiplier, id]);
        revalidatePath('/configuracion/calendario');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    } finally {
        connection.release();
    }
}