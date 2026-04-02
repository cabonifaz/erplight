'use server'

import { pool } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

// --- CREAR NUEVO PRODUCTO ---
export async function createProduct(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: "No autorizado" };

    const role = session.user.role?.toUpperCase() || "";
    // Validación de roles permitidos
    const ALLOWED_ROLES = ['LOGISTICA', 'ADMINISTRADOR GENERAL', 'CEO'];

    if (!ALLOWED_ROLES.includes(role)) {
        return { success: false, message: "⛔ No tienes permisos para crear productos." };
    }

    // Recibimos datos del formulario
    const name = formData.get("name") as string;
    const unit_measure = formData.get("unit_measure") as string;
    const description = formData.get("description") as string;
    
    if (!name || !unit_measure) {
        return { success: false, message: "El nombre y la unidad son obligatorios." };
    }

    try {
        // Ejecutamos el Stored Procedure que genera el código y hace el INSERT
        const [results]: any = await pool.query(
            "CALL sp_crear_producto(?, ?, ?, ?)",
            [name.toUpperCase(), description || null, unit_measure, session.user.id]
        );

        // El SP devuelve el ID generado y el código (Ej: PROD-000052) en el primer set de resultados
        const newProductData = results[0] ? results[0][0] : null;

        if (!newProductData) {
            throw new Error("No se devolvieron datos del producto creado.");
        }

        // Revalidamos las rutas para que la lista se actualice en la UI
        revalidatePath("/admin/productos");
        revalidatePath("/inventario"); 
        
        // Devolvemos el producto creado para usarlo en el frontend
        return { 
            success: true, 
            message: `Producto creado: ${newProductData.code}`,
            product: {
                id: newProductData.id,
                name: name.toUpperCase(),
                code: newProductData.code,
                unit_measure: unit_measure
            }
        };

    } catch (error: any) {
        console.error("Error creando producto:", error);
        // Capturamos mensajes nativos de MySQL si los hay (sqlMessage)
        return { success: false, message: error.sqlMessage || error.message || "Error en base de datos" };
    }
}

// --- LISTAR PRODUCTOS ---
export async function getProductsList() {
    try {
        // Llamada limpia al Stored Procedure
        const [results]: any = await pool.query("CALL sp_listar_productos()");
        return results[0] || [];
    } catch (error) {
        console.error("Error al listar productos:", error);
        return [];
    }
}