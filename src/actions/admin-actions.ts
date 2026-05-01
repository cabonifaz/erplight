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

export async function createBranch(userRole: string, formData: FormData) {
    // 1. Validar Permisos por Rol
    const rol = userRole.toUpperCase();
    if (rol !== 'GERENTE GENERAL' && rol !== 'GERENTE DE LOGISTICA' && rol !== 'JEFE DE RRHH') {
        return { success: false, message: "No tienes permisos para crear sucursales. Solo Gerencia y Jefaturas." };
    }

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
        // Capturará el error "Límite de sucursales alcanzado" si el SP lo dispara
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
    const role = formData.get("role")?.toString(); 

    if (!name || !email || !role) {
        return { success: false, message: "Nombre, email y rol son obligatorios." };
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Generar contraseña aleatoria
        const generatedPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(generatedPassword, 10);

        // ✅ CORRECCIÓN SEGURIDAD: Llamada 100% limpia. 
        // El SP ahora debe devolver el ID directamente como resultado.
        const [result]: any = await connection.query(
            "CALL sp_crear_usuario(?, ?, ?, ?)", 
            [name, email, hashedPassword, role]
        );
        
        // Capturamos el ID que el SP nos devuelve (depende de cómo armes el SELECT en tu SP)
        const newUserId = result[0][0]?.id;

        if (!newUserId) throw new Error("Error al obtener el ID del usuario creado.");

        // Lógica de asignación usando SPs
        const rolesGlobales = ['GERENTE GENERAL', 'GERENTE DE LOGISTICA', 'JEFE DE RRHH'];

        if (rolesGlobales.includes(role || "")) {
            await connection.query("CALL sp_asignar_sucursales_gerente(?)", [newUserId]);
        } else {
            if (selectedBranchIds.length === 0) {
                throw new Error("Debes asignar al menos una sucursal para este rol.");
            }
            // ✅ CORRECCIÓN BUG: Bucle duplicado eliminado. Ahora solo se ejecuta una vez.
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
// 3. GESTIÓN DE LÍMITES DE APROBACIÓN (CORREGIDO)
// ==========================================

export async function getApprovalLimits() {
    try {
        const [rows]: any = await pool.query("CALL sp_listar_limites_aprobacion()");
        return rows[0] || [];
    } catch (error) {
        console.error("Error obteniendo límites:", error);
        return [];
    }
}

export async function saveApprovalLimit(userId: number, userName: string, limitAmount: string) {
    try {
        await pool.query(
            "CALL sp_guardar_limite_aprobacion(?, ?, ?)", 
            [userId.toString(), userName, limitAmount]
        );
        revalidatePath("/dashboard/configuracion");
        return { success: true, message: "Límite guardado exitosamente" };
    } catch (error: any) {
        return { success: false, message: error.sqlMessage || error.message };
    }
}

// Añade bcrypt a tus imports arriba si no lo tienes:
// import bcrypt from "bcryptjs";
// import { pool } from "@/lib/db";
// import { revalidatePath } from "next/cache";

// --- CAMBIAR CONTRASEÑA DE CUALQUIER USUARIO (SOLO ADMIN/GERENTE) ---
export async function adminCambiarPassword(userId: number, nuevaPassword: string) {
    const connection = await pool.getConnection();
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(nuevaPassword, salt);

        await connection.query("CALL sp_admin_cambiar_password_usuario(?, ?)", [userId, hashedPassword]);
        revalidatePath('/usuarios');
        return { success: true, message: "Contraseña actualizada correctamente." };
    } catch (error: any) {
        console.error("Error al cambiar contraseña de usuario:", error);
        return { success: false, message: "Error al actualizar la contraseña." };
    } finally {
        connection.release();
    }
}

// --- HABILITAR / DESHABILITAR USUARIO ---
export async function adminToggleEstadoUsuario(userId: number, nuevoEstado: number) {
    const connection = await pool.getConnection();
    try {
        await connection.query("CALL sp_admin_toggle_estado_usuario(?, ?)", [userId, nuevoEstado]);
        revalidatePath('/usuarios');
        const estadoTexto = nuevoEstado === 1 ? 'habilitado' : 'deshabilitado';
        return { success: true, message: `Usuario ${estadoTexto} correctamente.` };
    } catch (error: any) {
        console.error("Error al cambiar estado de usuario:", error);
        return { success: false, message: "Error al cambiar el estado." };
    } finally {
        connection.release();
    }
}

// --- HABILITAR / DESHABILITAR SUCURSAL ---
export async function toggleBranchStatus(branchId: number, currentStatus: number) {
    const newStatus = currentStatus === 1 ? 0 : 1;
    try {
        await pool.query("CALL sp_toggle_sucursal(?, ?)", [branchId, newStatus]);
        revalidatePath('/dashboard/sucursales');
        const estadoTexto = newStatus === 1 ? 'habilitada' : 'deshabilitada';
        return { success: true, message: `Sucursal ${estadoTexto} correctamente.` };
    } catch (error: any) {
        console.error("Error al cambiar estado de sucursal:", error);
        return { success: false, message: "Error al cambiar el estado." };
    }
}
