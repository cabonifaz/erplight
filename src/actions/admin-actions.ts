'use server'

import { pool } from "@/lib/db";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs"; 

// ==========================================
// 1. GESTIÓN DE SUCURSALES (LOCALES)
// ==========================================

export async function getBranches() {
    try {
        const [rows]: any = await pool.query("CALL sp_listar_sucursales()");
        return rows[0] || [];
    } catch (error) {
        console.error("Error obteniendo sucursales:", error);
        return [];
    }
}

export async function createBranch(formData: FormData) {
    const name = formData.get("name")?.toString();
    const ruc = formData.get("ruc")?.toString();
    const razon_social = formData.get("razon_social")?.toString();

    if (!name || !ruc || !razon_social) {
        return { success: false, message: "Faltan datos obligatorios." };
    }

    try {
        await pool.query("CALL sp_crear_sucursal(?, ?, ?)", [name, ruc, razon_social]);
        revalidatePath("/dashboard/sucursales"); 
        return { success: true, message: "Sucursal creada correctamente." };
    } catch (error: any) {
        return { success: false, message: error.sqlMessage || error.message };
    }
}

// ==========================================
// 2. GESTIÓN DE USUARIOS Y ROLES
// ==========================================

export async function getUsers() {
    try {
        const [rows]: any = await pool.query("CALL sp_listar_usuarios_con_sucursales()");
        return rows[0] || [];
    } catch (error) {
        console.error("Error obteniendo usuarios:", error);
        return [];
    }
}

export async function createUser(selectedBranchIds: number[], formData: FormData) {
    const name = formData.get("name")?.toString();
    const email = formData.get("email")?.toString();
    // 🔑 1. Quitamos la lectura del password del formData
    const role = formData.get("role")?.toString(); 

    // 🔑 2. Ya no validamos que el password venga en el formulario
    if (!name || !email || !role) {
        return { success: false, message: "Nombre, email y rol son obligatorios." };
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 🔑 3. Generar contraseña aleatoria (8 caracteres: números y letras minúsculas)
        const generatedPassword = Math.random().toString(36).slice(-8);

        // 🔑 4. Encriptar la contraseña generada
        const hashedPassword = await bcrypt.hash(generatedPassword, 10);

        // Crear usuario y capturar el nuevo ID
        await connection.query("SET @new_id = 0");
        await connection.query(
            "CALL sp_crear_usuario(?, ?, ?, ?, @new_id)", 
            [name, email, hashedPassword, role] // Mandamos el hashedPassword
        );
        const [idResult]: any = await connection.query("SELECT @new_id as id");
        const newUserId = idResult[0]?.id;

        if (!newUserId) throw new Error("Error al obtener el ID del usuario creado.");

        // Lógica de asignación usando SPs
        if (role === 'GERENTE GENERAL' ) {
            await connection.query("CALL sp_asignar_sucursales_gerente(?)", [newUserId]);
        } else {
            if (selectedBranchIds.length === 0) {
                throw new Error("Debes asignar al menos una sucursal para este rol.");
            }
            for (let i = 0; i < selectedBranchIds.length; i++) {
                const branchId = selectedBranchIds[i];
                const isMain = i === 0 ? 1 : 0; 
                await connection.query(
                    "CALL sp_asignar_sucursal_usuario(?, ?, ?)", 
                    [newUserId, branchId, isMain]
                );
            }
        }

        await connection.commit();
        revalidatePath("/dashboard/usuarios"); 
        
        // 🔑 5. Retornamos la contraseña en el mensaje de éxito para que el sistema la muestre en la alerta
        return { 
            success: true, 
            message: `Usuario creado. Contraseña generada: ${generatedPassword}` 
        };

    } catch (error: any) {
        await connection.rollback();
        return { success: false, message: error.sqlMessage || error.message };
    } finally {
        connection.release();
    }
}

// ==========================================
// 3. GESTIÓN DE LÍMITES DE APROBACIÓN
// ==========================================

export async function getApprovalLimits() {
    try {
        const [rows]: any = await pool.query(
            "SELECT code as user_id, num_1 as limit_amount FROM master_catalogs WHERE category = 'LIMITE_APROBACION' AND status = 1"
        );
        return rows;
    } catch (error) {
        console.error("Error obteniendo límites:", error);
        return [];
    }
}

export async function saveApprovalLimit(userId: number, userName: string, limitAmount: string) {
    const connection = await pool.getConnection();
    try {
        // Buscamos si el usuario ya tiene un límite registrado
        const [existing]: any = await connection.query(
            "SELECT id FROM master_catalogs WHERE category = 'LIMITE_APROBACION' AND code = ?",
            [userId.toString()]
        );

        if (existing.length > 0) {
            // Si ya existe, lo actualizamos
            await connection.query(
                "UPDATE master_catalogs SET num_1 = ? WHERE category = 'LIMITE_APROBACION' AND code = ?",
                [limitAmount, userId.toString()]
            );
        } else {
            // Si es nuevo, lo insertamos
            await connection.query(
                "INSERT INTO master_catalogs (category, code, description, num_1, status) VALUES ('LIMITE_APROBACION', ?, ?, ?, 1)",
                [userId.toString(), `Límite de ${userName}`, limitAmount]
            );
        }
        revalidatePath("/dashboard/configuracion");
        return { success: true, message: "Límite guardado exitosamente" };
    } catch (error: any) {
        return { success: false, message: error.message };
    } finally {
        connection.release();
    }
}