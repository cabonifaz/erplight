'use server'

import { signIn, auth } from "@/auth";
import { AuthError } from "next-auth";
import { pool } from "@/lib/db";
import bcrypt from "bcryptjs"; // ✨ Asegúrate de tener instalado bcryptjs
import { revalidatePath } from "next/cache";

// --- 1. ACCIÓN PARA INICIAR SESIÓN (LOGIN) ---
export async function authenticate(prevState: string | undefined, formData: FormData) {
  try {
    const email = formData.get('email') as string; 
    let rutaDestino = '/dashboard'; // Ruta por defecto
    
    // VERIFICAR EL ROL ANTES DEL LOGIN PARA REDIRECCIÓN
    if (email) {
        const connection = await pool.getConnection();
        try {
            const [results]: any = await connection.query(
                "CALL sp_obtener_rol_usuario(?)", 
                [email]
            );
            
            const users = results[0];
            
            // Si el usuario es el MARCADOR, lo mandamos a su pantalla especial
            if (users && users.length > 0 && users[0].role === 'MARCADOR') {
                rutaDestino = '/marcador';
            }
        } catch (dbError) {
            console.error("Error verificando el rol:", dbError);
        } finally {
            connection.release();
        }
    }

    // Inyectamos la ruta de destino en el formData para NextAuth
    formData.append('redirectTo', rutaDestino);

    // Intentar inicio de sesión
    await signIn('credentials', formData);

  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Credenciales inválidas. Revisa tu correo o contraseña.';
        default:
          return 'Ocurrió un error inesperado. Intenta de nuevo.';
      }
    }
    throw error; 
  }
}

// --- 2. NUEVA: ACCIÓN PARA CAMBIAR CONTRASEÑA (DESDE EL PERFIL) ---
export async function cambiarPasswordUsuario(passwordActual: string, nuevaPassword: string) {
    const session = await auth();
    
    // Verificación de seguridad básica
    if (!session?.user?.id) {
        return { success: false, message: "No autorizado. Inicia sesión nuevamente." };
    }

    const userId = session.user.id;
    const connection = await pool.getConnection();

    try {
        // 1. Obtener la contraseña actual encriptada de la base de datos
        const [rows]: any = await connection.query(
            "SELECT password FROM users WHERE id = ?", 
            [userId]
        );

        if (rows.length === 0) {
            return { success: false, message: "Usuario no encontrado." };
        }

        const passwordDB = rows[0].password;

        // 2. Comparar la contraseña ingresada con la de la BD usando bcrypt
        const esCorrecta = await bcrypt.compare(passwordActual, passwordDB);

        if (!esCorrecta) {
            return { success: false, message: "La contraseña actual es incorrecta." };
        }

        // 3. Encriptar la NUEVA contraseña
        const salt = await bcrypt.genSalt(10);
        const nuevaPasswordHasheada = await bcrypt.hash(nuevaPassword, salt);

        // 4. Guardar en la base de datos usando tu Procedimiento Almacenado
        await connection.query(
            "CALL sp_actualizar_password(?, ?)", 
            [userId, nuevaPasswordHasheada]
        );

        return { success: true, message: "¡Tu contraseña ha sido actualizada con éxito!" };

    } catch (error: any) {
        console.error("Error al cambiar contraseña:", error);
        return { success: false, message: "Error interno al procesar el cambio." };
    } finally {
        connection.release();
    }
}