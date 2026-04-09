'use server'

import { pool } from "@/lib/db";
import { revalidatePath } from "next/cache";

// ==========================================
// 1. LECTURA (Obtener Receta)
// ==========================================

// Obtiene la lista de ingredientes/componentes de un producto específico
export async function getRecetaDelProducto(productId: number) {
  try {
    const [rows]: any = await pool.query("CALL sp_listar_receta(?)", [productId]);
    // Dependiendo de tu BD, los SP devuelven los datos dentro del primer índice del arreglo
    return rows[0] || []; 
  } catch (error) {
    console.error("Error al obtener la receta:", error);
    return [];
  }
}

// ==========================================
// 2. CREACIÓN / ACTUALIZACIÓN
// ==========================================

// Agrega un componente a la receta de un producto
export async function agregarComponenteReceta(productId: number, componentId: number, quantity: number) {
  try {
    await pool.query("CALL sp_agregar_componente_receta(?, ?, ?)", [
      productId, 
      componentId, 
      quantity
    ]);
    
    revalidatePath('/recetas'); // Refrescamos la vista
    return { success: true, message: 'Componente agregado a la receta' };
  } catch (error: any) {
    console.error("Error al agregar componente:", error);
    return { success: false, message: error.sqlMessage || 'Error al guardar el componente' };
  }
}

// ==========================================
// 3. ELIMINACIÓN
// ==========================================

export async function eliminarComponenteReceta(recipeId: number) {
  try {
    await pool.query("CALL sp_eliminar_componente_receta(?)", [recipeId]);
    
    revalidatePath('/recetas');
    return { success: true, message: 'Componente removido' };
  } catch (error: any) {
    console.error("Error al eliminar componente:", error);
    return { success: false, message: 'Error al eliminar el componente' };
  }
}