'use server'

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { pool } from "@/lib/db"; // ✨ Importamos la conexión a tu base de datos

export async function authenticate(prevState: string | undefined, formData: FormData) {
  try {
    const remember = formData.get('remember') === 'on';
    
    // Asumimos que el input de tu formulario se llama 'email'. 
    // Si se llama diferente, cámbialo aquí.
    const email = formData.get('email') as string; 
    
    let rutaDestino = '/dashboard'; // Ruta por defecto para Gerentes, Admins, etc.

    // ✨ 1. VERIFICAR EL ROL ANTES DEL LOGIN
    if (email) {
        const connection = await pool.getConnection();
        try {
            const [users]: any = await connection.query(
                "SELECT role FROM users WHERE email = ? LIMIT 1", 
                [email]
            );
            
            // Si el usuario existe y es el MARCADOR, cambiamos su destino
            if (users.length > 0 && users[0].role === 'MARCADOR') {
                rutaDestino = '/marcador';
            }
        } catch (dbError) {
            console.error("Error verificando el rol:", dbError);
        } finally {
            connection.release();
        }
    }

    // ✨ 2. INYECTAR LA REDIRECCIÓN A NEXTAUTH
    // NextAuth v5 detecta automáticamente este parámetro en el formData
    formData.append('redirectTo', rutaDestino);

    // 3. INICIAR SESIÓN
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
    // Importante: Next.js usa un error de tipo "Redirect" para navegar al dashboard.
    // Debemos relanzar el error si no es de tipo AuthError.
    throw error; 
  }
}