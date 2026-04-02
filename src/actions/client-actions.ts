'use server'

import { pool } from "@/lib/db";
import { auth } from "@/auth"; 
import { revalidatePath } from "next/cache";

// --- HELPERS ---
async function getCatalog(category: string) {
  try {
    const [rows]: any = await pool.query("CALL sp_listar_catalogo(?)", [category]);
    return rows[0] || []; 
  } catch (error) {
    console.error(`Error catalogo ${category}:`, error);
    return [];
  }
}

// ==========================================
// 1. LECTURA DE MAESTROS (Combos)
// ==========================================

export async function getClientTypes() {
  const data = await getCatalog('CLIENT_TYPE');
  return data.map((item: any) => ({
    id: item.id,
    description: item.description,
    internal_code: item.code, // 'NAT' o 'JUR'
    sunat_code: item.num_1    // Código numérico SUNAT
  }));
}

export async function getDocumentTypes() {
  const data = await getCatalog('DOC_TYPE');
  return data.map((item: any) => ({
    id: item.id,
    description: item.description || "Sin nombre",
    internal_code: item.code || item.description, 
    sunat_code: item.num_1
  }));
}

export async function getCountries() {
  const data = await getCatalog('COUNTRY');
  return data.map((item: any) => ({
    id: item.id,
    label: item.description,
    value: item.description  // Guardamos el nombre del país para el select
  }));
}

// ==========================================
// 2. LECTURA DE CLIENTES
// ==========================================

// Listado general para la tabla
export async function getClients() {
  try {
    const [rows]: any = await pool.query("CALL sp_listar_clientes()");
    return rows[0] || [];
  } catch (error) {
    console.error("Error al listar clientes:", error);
    return [];
  }
}

// Obtener un solo cliente (Para Edición)
export async function getClientById(id: number) {
  try {
    const [rows]: any = await pool.query("CALL sp_obtener_cliente(?)", [id]);
    return rows[0] ? rows[0][0] : null; // Retorna el objeto cliente limpio o null si no existe
  } catch (error) {
    console.error("Error al obtener cliente:", error);
    return null;
  }
}

// ==========================================
// 3. CREACIÓN (Create)
// ==========================================

export async function createClient(prevState: any, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: "Sesión expirada" };

  const userId = session.user.id;
  
  // Datos de control
  const client_type_id = formData.get("client_type_id"); 
  const client_code = formData.get("client_code"); // 'NAT' o 'JUR'
  
  // Datos comunes
  const doc_type_id = formData.get("doc_type_id");
  const doc_number = formData.get("doc_number");
  const email = formData.get("email");
  const phone = formData.get("phone");
  const address = formData.get("address");

  // Datos de Ubicación
  const country = formData.get("country");
  const department = formData.get("department");
  const province = formData.get("province");
  const district = formData.get("district");
  const zip_code = formData.get("zip_code");

  try {
    if (client_code === 'NAT') { 
      // PERSONA NATURAL (15 Parámetros exactos)
      await pool.query(
        "CALL sp_crear_persona(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
        [
            userId, client_type_id, doc_type_id, doc_number, 
            formData.get("first_name"), formData.get("paternal_surname"), formData.get("maternal_surname"), 
            email, phone, address,
            country, department, province, district, zip_code
        ]
      );
    } else { 
      // EMPRESA JURÍDICA (14 Parámetros exactos)
      await pool.query(
        "CALL sp_crear_empresa(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
        [
            userId, client_type_id, doc_type_id, doc_number, 
            formData.get("business_name"), formData.get("trade_name"), 
            email, phone, address, 
            country, department, province, district, zip_code
        ]
      );
    }
    
    revalidatePath("/clientes");
    return { success: true, message: "Cliente registrado correctamente" };

  } catch (error: any) {
    const msg = error.sqlMessage || "Error al crear cliente";
    if (msg.includes("Duplicate entry")) return { success: false, message: "El número de documento ya existe." };
    return { success: false, message: msg };
  }
}

// ==========================================
// 4. ACTUALIZACIÓN (Update)
// ==========================================

export async function updateClient(prevState: any, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: "No autorizado" };
  
  const userId = session.user.id;
  const client_id = formData.get("client_id");
  const client_code = formData.get("client_code");

  // Datos comunes
  const email = formData.get("email");
  const phone = formData.get("phone");
  const address = formData.get("address");
  
  // Ubicación
  const country = formData.get("country");
  const department = formData.get("department");
  const province = formData.get("province");
  const district = formData.get("district");
  const zip_code = formData.get("zip_code");

  try {
    if (client_code === 'NAT') {
      // PERSONA NATURAL (13 Parámetros exactos)
      await pool.query(
        "CALL sp_editar_persona(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
        [
            client_id, userId, 
            formData.get("first_name"), formData.get("paternal_surname"), formData.get("maternal_surname"), 
            email, phone, address, 
            country, department, province, district, zip_code
        ]
      );
    } else {
      // EMPRESA JURÍDICA (12 Parámetros exactos)
      await pool.query(
        "CALL sp_editar_empresa(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
        [
            client_id, userId, 
            formData.get("business_name"), formData.get("trade_name"), 
            email, phone, address, 
            country, department, province, district, zip_code
        ]
      );
    }

    revalidatePath("/clientes");
    return { success: true, message: "Cliente actualizado correctamente" };
  } catch (error: any) {
    return { success: false, message: error.sqlMessage || "Error al actualizar" };
  }
}

// ==========================================
// 5. ELIMINACIÓN (Delete)
// ==========================================

export async function deleteClient(clientId: number) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: "No autorizado" };

  try {
    // Eliminación lógica usando Stored Procedure
    await pool.query("CALL sp_eliminar_cliente(?, ?)", [clientId, session.user.id]);
    
    revalidatePath("/clientes");
    return { success: true, message: "Cliente eliminado correctamente" };
  } catch (error: any) {
    console.error("Error al eliminar el cliente:", error);
    return { success: false, message: "Error al eliminar el cliente" };
  }
}