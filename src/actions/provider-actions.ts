'use server'

import { pool } from "@/lib/db";
import { revalidatePath } from "next/cache";

// 1. Obtener todos los proveedores
export async function getProviders() {
    try {
        const [rows] = await pool.query(
            "SELECT id, ruc, name, address, estado FROM providers ORDER BY id DESC"
        );
        return { success: true, data: rows as any[] };
    } catch (error: any) {
        console.error("Error obteniendo proveedores:", error);
        return { success: false, data: [], message: error.message };
    }
}

// 2. Crear proveedor
export async function createProvider(data: { ruc: string; name: string; address: string }) {
    try {
        await pool.query(
            "INSERT INTO providers (ruc, name, address, estado) VALUES (?, ?, ?, 1)",
            [data.ruc, data.name, data.address]
        );
        revalidatePath("/clientes"); // Recarga la vista principal
        return { success: true, message: "Proveedor creado exitosamente." };
    } catch (error: any) {
        return { success: false, message: "Error al crear proveedor: " + error.message };
    }
}

// 3. Actualizar proveedor
export async function updateProvider(id: number, data: { ruc: string; name: string; address: string }) {
    try {
        await pool.query(
            "UPDATE providers SET ruc = ?, name = ?, address = ? WHERE id = ?",
            [data.ruc, data.name, data.address, id]
        );
        revalidatePath("/clientes");
        return { success: true, message: "Proveedor actualizado correctamente." };
    } catch (error: any) {
        return { success: false, message: "Error al actualizar: " + error.message };
    }
}

// 4. Cambiar estado (Activar/Desactivar)
export async function toggleProviderStatus(id: number, currentStatus: number) {
    try {
        const newStatus = currentStatus === 1 ? 0 : 1;
        await pool.query(
            "UPDATE providers SET estado = ? WHERE id = ?",
            [newStatus, id]
        );
        revalidatePath("/clientes");
        return { success: true, message: newStatus === 1 ? "Proveedor activado." : "Proveedor desactivado." };
    } catch (error: any) {
        return { success: false, message: "Error al cambiar estado: " + error.message };
    }
}