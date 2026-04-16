'use server'

import { pool } from "@/lib/db";
import { revalidatePath } from "next/cache";

// 1. TRAER LOS PLATOS/COMBOS PARA EL DESPLEGABLE PRINCIPAL
export async function obtenerMenusParaRecetas() {
  try {
    const [rows]: any = await pool.query("SELECT id, name FROM menus WHERE status = 1 ORDER BY name ASC");
    return rows;
  } catch (error) {
    return [];
  }
}

// 2. LECTURA DE LA RECETA DE UN MENÚ
export async function getRecetaDelMenu(menuId: number) {
  try {
    const [rows]: any = await pool.query("CALL sp_obtener_receta_menu(?)", [menuId]);
    return rows[0] || []; 
  } catch (error) {
    console.error("Error al obtener la receta:", error);
    return [];
  }
}

// 3. AGREGAR COMPONENTE AL MENÚ
export async function agregarComponenteRecetaMenu(menuId: number, componentId: number, quantity: number) {
  try {
    await pool.query("CALL sp_agregar_componente_receta_menu(?, ?, ?)", [menuId, componentId, quantity]);
    revalidatePath('/recetas'); 
    return { success: true, message: 'Ingrediente agregado a la receta' };
  } catch (error: any) {
    console.error("Error al agregar componente:", error);
    return { success: false, message: error.sqlMessage || 'Error al guardar el componente' };
  }
}

// 4. ELIMINACIÓN (Se queda igual, elimina por el ID de la fila)
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