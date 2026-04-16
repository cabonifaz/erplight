'use server'

import { pool } from "@/lib/db"; 
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";


// --- INTERFACES ---
export interface ActionState {
  success: boolean;
  message: string;
}

export interface Branch {
  id: number;
  name: string;
}

export interface Quotation {
  id: number;
  file_name: string;
  file_path: string;
  is_selected: boolean;
}

// ==============================================================================
// 1. LECTURA DE DATOS
// ==============================================================================

export async function getRequestDetails(requestId: number) {
    try {
        // 🔥 1. Agregamos el (?) que faltaba en la llamada
        const [results]: any = await pool.query("CALL sp_obtener_detalle_solicitud(?)", [requestId]);
        
        return { 
            // Si este SP no trae cotizaciones, lo dejamos como arreglo vacío para no romper el frontend
            quotations: [], 
            // 🔥 2. Leemos results[0][0] porque el SP solo tiene un SELECT principal
            request: results[0] ? results[0][0] : null 
        };
    } catch (error) {
        console.error("Error fetching details:", error);
        return { quotations: [], request: null };
    }
}

export async function getExecutionDetails(requestId: number) {
    try {
        const [results]: any = await pool.query("CALL sp_obtener_ejecucion_solicitud(?)", [requestId]);
        const invoices = results[0] || [];
        const payments = results[1] || [];

        const invoicesWithVouchers = invoices.map((inv: any) => ({
            ...inv,
            vouchers: payments.filter((p: any) => p.invoice_id === inv.id)
        }));
        return JSON.parse(JSON.stringify(invoicesWithVouchers));
    } catch (error) { return []; }
}

export async function getBranches(): Promise<Branch[]> {
  try {
    // Volvemos a la consulta directa ya que es un catálogo muy simple
    const [rows]: any = await pool.query(
        "SELECT id, name FROM branches WHERE status = 1 AND deleted_at IS NULL ORDER BY name ASC"
    );
    return rows as Branch[];
  } catch (error) { 
    console.error("Error obteniendo sucursales:", error);
    return []; 
  }
}

export async function getCurrencies() {
    return [{code: 'PEN', name: 'Soles'}, {code: 'USD', name: 'Dólares'}];
}

export async function getPurchaseRequests(filters: {
    branch_id?: string | number;
    code?: string;
    description?: string;
    status_id?: string | number;
    start_date?: string;
    end_date?: string;
} = {}) {
    const session = await auth();
    if (!session?.user?.id) return [];
    
    try {
        let targetBranchId = filters.branch_id ? Number(filters.branch_id) : null;
        const role = session.user.role?.toUpperCase() || '';

       // 🛡️ LÓGICA DE SEGURIDAD ESTRICTA POR SUCURSAL 🛡️
        // Solo el GERENTE GENERAL se salva de este filtro
        // 🛡️ LÓGICA DE SEGURIDAD ESTRICTA POR SUCURSAL 🛡️
// Devolvemos el acceso global al rol de logística
if (role !== 'GERENTE GENERAL' && role !== 'GERENTE DE LOGISTICA') {
            
            // Vamos a la BD a buscar la sucursal principal de este usuario
            const [userBranch]: any = await pool.query(
                "SELECT branch_id FROM user_branches WHERE user_id = ? AND is_main = 1 LIMIT 1",
                [session.user.id]
            );

            if (userBranch.length > 0) {
                // 🔒 Forzamos a que solo vea su sucursal asignada
                targetBranchId = userBranch[0].branch_id; 
            } else {
                // Si por error el usuario no tiene sucursal en la BD, lo bloqueamos
                return []; 
            }
        }

        const [rows]: any = await pool.query(
            "CALL sp_listar_solicitudes(?, ?, ?, ?, ?, ?, ?)", 
            [
                session.user.id,
                targetBranchId, // <-- Ahora pasamos el ID 100% seguro
                filters.code || null,
                filters.description || null,
                filters.status_id ? Number(filters.status_id) : null,
                filters.start_date || null,
                filters.end_date || null
            ]
        );
        return rows[0] || []; 
    } catch (error) {
        console.error("Error al listar solicitudes filtradas:", error);
        return [];
    }
}

export async function getProductsSearch(query: string = ""): Promise<{id: number, name: string, code: string, unit_measure: string}[]> {
    try {
        const [rows]: any = await pool.query("CALL sp_buscar_productos(?)", [query]);
        return rows[0];
    } catch (error) { return []; }
}

export async function getRequestInvoices(requestId: number) {
    try {
        // Usamos SQL directo para que funcione sin crear más SPs
        const [rows]: any = await pool.query(
            "SELECT id, invoice_number FROM purchase_invoices WHERE request_id = ?", 
            [requestId]
        );
        return rows as { id: number, invoice_number: string }[];
    } catch (error) { 
        console.error("Error al obtener facturas:", error);
        return []; 
    }
}

export async function getUnitMeasures() {
    try {
        const [rows]: any = await pool.query("CALL sp_listar_catalogo(?)", ['UNIT_MEASURE']);
        return rows[0] as { code: string, description: string }[];
    } catch (error) { return []; }
}

// ==============================================================================
// 2. GESTIÓN DE SOLICITUDES (CRUD)
// ==============================================================================

export async function createPurchaseRequest(prevState: ActionState | null, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: "Sesión expirada" };
  const userId = session.user.id;
  
  const branch_id = formData.get("branch_id");
  const description = formData.get("description");
  const estimated_total = formData.get("estimated_total");
  const currency = formData.get("currency") || 'PEN';
  const issue_date = formData.get("issue_date") || new Date().toISOString().split('T')[0];
  const files = formData.getAll("quotations") as File[];

  if (!branch_id || !description || !estimated_total) return { success: false, message: "Faltan campos" };

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("SET @new_id = 0");
    await connection.query("CALL sp_crear_solicitud(?, ?, ?, ?, ?, ?, @new_id)", [branch_id, userId, issue_date, description, estimated_total, currency]);
    const [rows]: any = await connection.query("SELECT @new_id as id");
    const newRequestId = rows[0]?.id;
    if (!newRequestId) throw new Error("Error ID solicitud");

    if (files && files.length > 0) {
        const uploadDir = join(process.cwd(), "public/uploads");
        try { await mkdir(uploadDir, { recursive: true }); } catch (err) {}

        for (const file of files) {
            if (file.size > 0) {
                const bytes = await file.arrayBuffer();
                const fileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
                const filePath = join(uploadDir, fileName);
                await writeFile(filePath, Buffer.from(bytes));
                const publicUrl = `/uploads/${fileName}`;
                await connection.query("CALL sp_insertar_cotizacion(?, ?, ?)", [newRequestId, file.name, publicUrl]);
            }
        }
    }

    await connection.commit();
    revalidatePath("/compras/solicitudes");
    return { success: true, message: "Solicitud registrada" };
  } catch (error: any) {
    await connection.rollback();
    return { success: false, message: error.message };
  } finally { connection.release(); }
}

export async function updatePurchaseRequest(prevState: ActionState | null, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: "No autorizado" };

  const requestId = formData.get("request_id");
  const branch_id = formData.get("branch_id");
  const description = formData.get("description");
  const estimated_total = formData.get("estimated_total");
  const currency = formData.get("currency");
  const newFiles = formData.getAll("quotations") as File[];
  const deletedFileIds = formData.getAll("deleted_file_ids").map(id => Number(id));

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // SP Valida si es editable y la actualiza
    await connection.query("CALL sp_actualizar_solicitud(?, ?, ?, ?, ?)", [requestId, branch_id, description, estimated_total, currency]);

    if (deletedFileIds.length > 0) {
        const placeholders = deletedFileIds.map(() => '?').join(',');
        const [filesToDelete]: any = await connection.query(`CALL sp_obtener_rutas_cotizaciones(?)`, [deletedFileIds.join(',')]);
        await connection.query(`CALL sp_eliminar_cotizaciones(?)`, [deletedFileIds.join(',')]);
        
        for (const f of filesToDelete[0]) {
            try { await unlink(join(process.cwd(), "public", f.file_path)); } catch (e) {}
        }
    }

    if (newFiles.length > 0) {
        const uploadDir = join(process.cwd(), "public/uploads");
        try { await mkdir(uploadDir, { recursive: true }); } catch (e) {}
        for (const file of newFiles) {
            if (file.size > 0) {
                const bytes = await file.arrayBuffer();
                const fileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
                const filePath = join(uploadDir, fileName);
                await writeFile(filePath, Buffer.from(bytes));
                const publicUrl = `/uploads/${fileName}`;
                await connection.query("CALL sp_insertar_cotizacion(?, ?, ?)", [requestId, file.name, publicUrl]);
            }
        }
    }

    await connection.commit();
    revalidatePath("/compras/solicitudes");
    return { success: true, message: "Solicitud actualizada" };
  } catch (error: any) {
    await connection.rollback();
    return { success: false, message: error.sqlMessage || error.message };
  } finally { connection.release(); }
}

export async function approveRequestWithDetails(requestId: number, comment: string, selectedQuotationId: number | null): Promise<ActionState> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: "No autorizado" };
    
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // =========================================================================
        // 🛡️ LÓGICA DE LÍMITES DE APROBACIÓN POR TRABAJADOR
        // =========================================================================
        const role = session.user.role?.toUpperCase() || "";

        // Como GERENTE GENERAL tienes pase libre, los demás pasan por revisión
        if (role !== 'GERENTE GENERAL') {
            
            // 1. Obtenemos cuánto cuesta esta solicitud
            const [reqInfo]: any = await connection.query(
                "SELECT estimated_total FROM purchase_requests WHERE id = ?", [requestId]
            );
            const montoTotal = parseFloat(reqInfo[0]?.estimated_total || 0);

            // 2. Buscamos el límite de este usuario específico (Usamos 'category' y 'num_1')
            const [limitData]: any = await connection.query(
                "SELECT num_1 FROM master_catalogs WHERE category = 'LIMITE_APROBACION' AND code = ? AND status = 1",
                [session.user.id.toString()]
            );

            // Si no tiene registro, su límite es 0
            const limitePermitido = parseFloat(limitData[0]?.num_1 || 0);

            // 3. Verificamos si se pasa de la raya
            if (montoTotal > limitePermitido) {
                await connection.rollback();
                return { 
                    success: false, 
                    message: `⛔ Permiso denegado. Tu límite es S/ ${limitePermitido}, pero la solicitud es de S/ ${montoTotal}. Requiere aprobación superior.` 
                };
            }
        }
        // =========================================================================
        
        // 1. Llamamos a tu procedimiento original para cambiar el estado
        await connection.query("CALL sp_aprobar_solicitud(?, ?, @success, @msg)", [requestId, session.user.id]);
        const [rows]: any = await connection.query("SELECT @success as s, @msg as m");
        
        if (rows[0].s !== 1) { 
            await connection.rollback(); 
            return { success: false, message: rows[0].m }; 
        }

        // 2. Guardamos el comentario de aprobación si existe
        if (comment && comment.trim() !== "") {
            await connection.query("UPDATE purchase_requests SET approval_comment = ? WHERE id = ?", [comment, requestId]);
        }
        
        // 3. Marcamos la cotización seleccionada (si eligen una)
        if (selectedQuotationId) {
            await connection.query("UPDATE purchase_quotations SET is_selected = 0 WHERE request_id = ?", [requestId]);
            await connection.query("UPDATE purchase_quotations SET is_selected = 1 WHERE id = ?", [selectedQuotationId]);
        }
        
        await connection.commit();
        revalidatePath("/compras/solicitudes");
        return { success: true, message: rows[0].m || "Solicitud aprobada correctamente" };
        
    } catch (error: any) {
        await connection.rollback();
        return { success: false, message: error.message };
    } finally { 
        connection.release(); 
    }
}

export async function rejectRequest(requestId: number, reason: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: "No autorizado" };
  if (!reason || reason.trim().length < 5) return { success: false, message: "Motivo requerido" };
  try {
    await pool.query("CALL sp_rechazar_solicitud(?, ?, ?)", [requestId, session.user.id, reason]);
    revalidatePath("/compras/solicitudes");
    return { success: true, message: "Solicitud rechazada" };
  } catch (error: any) { return { success: false, message: error.sqlMessage || error.message }; }
}

// ==============================================================================
// 3. EJECUCIÓN Y PAGOS
// ==============================================================================

// ==============================================================================
// 3. EJECUCIÓN Y PAGOS (ACTUALIZADO CON MONEDA)
// ==============================================================================

export async function registerPurchasePaymentComplex(formData: FormData): Promise<ActionState> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: "No autorizado" };

    const requestId = formData.get("request_id");
    const dataString = formData.get("data") as string; 
    if (!requestId || !dataString) return { success: false, message: "Datos incompletos" };

    const invoicesData = JSON.parse(dataString);
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const uploadDir = join(process.cwd(), "public/uploads/executions");
        try { await mkdir(uploadDir, { recursive: true }); } catch (e) {}

        for (const inv of invoicesData) {
            // A. PROVEEDOR
            if (!inv.providerRuc || !inv.providerName) throw new Error(`Faltan datos proveedor en ${inv.number}`);
            const cleanRuc = inv.providerRuc.trim();
            const cleanInvNum = inv.number.trim();

            const [provRes]: any = await connection.query("CALL sp_registrar_proveedor(?, ?, ?)", [cleanRuc, inv.providerName, inv.providerBranch || '']);
            const providerId = provRes[0][0].id;

            // B. FACTURA (Incluyendo Moneda)
            let currentInvoiceId = 0;
            const [existInv]: any = await connection.query("SELECT id FROM purchase_invoices WHERE invoice_number = ? AND provider_id = ?", [cleanInvNum, providerId]);

            if (existInv.length > 0) {
                currentInvoiceId = existInv[0].id;
                // Opcional: Podrías actualizar la moneda aquí si permites edición
            } else {
                const invFile = formData.get(`file_invoice_${inv.tempId}`) as File;
                if (!invFile || invFile.size === 0) throw new Error(`Falta archivo factura ${cleanInvNum}`);

                const invFileName = `INV-${requestId}-${cleanRuc}-${Date.now()}.pdf`;
                const invPath = join(uploadDir, invFileName);
                await writeFile(invPath, Buffer.from(await invFile.arrayBuffer()));
                const publicInvPath = `/uploads/executions/${invFileName}`;
                
                const totalAmount = parseFloat(inv.amount) || 0; 
                const currency = inv.currency || 'PEN'; // <--- CAPTURAMOS LA MONEDA

                // IMPORTANTE: Asegúrate de que tu SP 'sp_registrar_factura_compra' 
                // acepte este nuevo 7mo parámetro para la moneda.
                const [invRes]: any = await connection.query(
                    "CALL sp_registrar_factura_compra(?, ?, ?, ?, ?, ?, ?)", 
                    [requestId, session.user.id, cleanInvNum, totalAmount, publicInvPath, providerId, currency]
                );
                currentInvoiceId = invRes[0][0].id;
            }

            // C. VOUCHERS
            for (const v of inv.vouchers) {
                const cleanVoucherNum = v.number.trim();
                const voucherFile = formData.get(`file_voucher_${inv.tempId}_${v.tempId}`) as File;
                
                // Si el voucher es nuevo y no tiene URL existente, procesamos el archivo
                if (voucherFile && voucherFile.size > 0) {
                    const vFileName = `PAY-${currentInvoiceId}-${cleanVoucherNum}-${Date.now()}.jpg`;
                    const vPath = join(uploadDir, vFileName);
                    await writeFile(vPath, Buffer.from(await voucherFile.arrayBuffer()));
                    const publicVPath = `/uploads/executions/${vFileName}`;

                    await connection.query("CALL sp_registrar_pago_compra(?, ?, ?, ?, ?)", [
                        currentInvoiceId, 
                        cleanVoucherNum, 
                        publicVPath, 
                        v.date,
                        parseFloat(v.amount) // Asegúrate de pasar el monto del voucher también
                    ]);
                }
            }
        }

        await connection.commit();
        revalidatePath("/compras/solicitudes");
        return { success: true, message: "Información registrada correctamente." };

    } catch (error: any) {
        await connection.rollback();
        console.error("Error en BD:", error);
        return { success: false, message: error.sqlMessage || error.message };
    } finally { connection.release(); }
}

export async function completePurchaseRequest(requestId: number): Promise<ActionState> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: "No autorizado" };
    try {
        await pool.query("CALL sp_finalizar_compra_manual(?)", [requestId]);
        revalidatePath("/compras/solicitudes");
        return { success: true, message: "Compra finalizada correctamente." };
    } catch (error: any) { return { success: false, message: error.message }; }
}

export async function validateDocument(type: 'INVOICE' | 'VOUCHER', id: number, status: 'VALIDADO' | 'RECHAZADO', observation: string): Promise<ActionState> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: "No autorizado" };
    try {
        await pool.query("CALL sp_validar_documento_compra(?, ?, ?, ?, ?)", [type, id, session.user.id, status, observation]);
        revalidatePath("/compras/solicitudes");
        return { success: true, message: `Documento ${status.toLowerCase()}.` };
    } catch (error: any) { return { success: false, message: error.message }; }
}

export async function deleteDocument(type: 'INVOICE' | 'VOUCHER', id: number): Promise<ActionState> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: "No autorizado" };
    return { success: true, message: "Documento eliminado." };
}

// ==============================================================================
// 4. RECEPCIÓN Y CIERRE (FINAL)
// ==============================================================================

export async function validatePurchaseOrder(requestId: number): Promise<ActionState> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: "No autorizado" };
    const role = session.user.role?.toUpperCase() || "";
    if (!['CEO', 'ADMINISTRADOR GENERAL', 'LOGISTICA', 'CONTADOR'].includes(role)) {
        return { success: false, message: "No tienes permiso para Validar la compra." };
    }
    try {
        await pool.query("CALL sp_validar_expediente_compra(?, ?)", [requestId, session.user.id]);
        revalidatePath("/compras/solicitudes");
        return { success: true, message: "✅ Compra VALIDADA. Expediente cerrado." };
    } catch (error: any) { return { success: false, message: error.sqlMessage || error.message }; }
}

export async function registerReception(formData: FormData): Promise<ActionState> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: "No autorizado" };

    const role = session.user.role?.toUpperCase() || "";
    if (!['ADMIN_SUC', 'ALMACEN', 'LOGISTICA', 'ADMINISTRADOR GENERAL', 'CEO'].includes(role)) {
        return { success: false, message: "Sin permisos de Almacén." };
    }

    // 1. Atrapamos los datos del formulario (Aquí está el guide_number que faltaba)
    const requestId = formData.get("request_id");
    const guideNumber = formData.get("guide_number") as string || "SIN-GUIA"; 
    const file = formData.get("file_guide") as File; 
    const itemsData = formData.get("items_json") as string; 

    if (!requestId || !itemsData) return { success: false, message: "Datos incompletos." };
    const items = JSON.parse(itemsData);

    try {
        let publicPath = null;
        if (file && file.size > 0) {
            const uploadDir = join(process.cwd(), "public/uploads/receptions");
            try { await mkdir(uploadDir, { recursive: true }); } catch (e) {}
            const fileName = `GUIA-${requestId}-${Date.now()}.pdf`; 
            const filePath = join(uploadDir, fileName);
            await writeFile(filePath, Buffer.from(await file.arrayBuffer()));
            publicPath = `/uploads/receptions/${fileName}`;
        }

        for (const item of items) {
            const rawName = (item.product_name || item.name || "Producto").trim();
            const qty = parseFloat(item.quantity);
            const uom = item.unit_measure || item.uom || 'UND'; 

            if (qty <= 0) continue;

            // Enviamos los 8 parámetros al SP
            await pool.query(
                "CALL sp_procesar_recepcion_item(?, ?, ?, ?, ?, ?, ?, ?)", 
                [
                    requestId, 
                    session.user.id, 
                    item.product_id || null, 
                    rawName, 
                    qty, 
                    uom, 
                    publicPath, 
                    guideNumber // <--- Ahora ya no saldrá rojo porque está definido arriba
                ]
            );
        }

        revalidatePath("/compras/solicitudes");
        return { success: true, message: "Recepción registrada correctamente." };
    } catch (error: any) { 
        console.error("Error:", error);
        return { success: false, message: error.message }; 
    }
}

export async function getRequestReceptions(requestId: number) {
    try {
        const [rows]: any = await pool.query("CALL sp_obtener_recepciones_solicitud(?)", [requestId]);
        return rows[0];
    } catch (error) { return []; }
}

// ==============================================================================
// 5. GESTIÓN DE ORDEN DE COMPRA (SQL SEGURO RESTAURADO)
// ==============================================================================

export async function createPurchaseOrderAction(data: any) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result]: any = await connection.query(
      `INSERT INTO orden_compra 
      (solicitud_id, comprador_ruc, comprador_razon, comprador_direccion, solicitante,
       proveedor_ruc, proveedor_razon_social, proveedor_direccion, proveedor_contacto,
       fecha_emision, fecha_recepcion_esperada, lugar_entrega, condiciones_pago, condiciones_venta, 
       garantias, incoterm, incluye_instalacion, moneda, tipo_cambio, incluye_igv,
       tiene_detraccion, tipo_detraccion, porcentaje_detraccion, monto_detraccion, numero_cuenta_operacion, 
       subtotal, total, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'GENERADA')`,
      [
        data.requestId, data.comprador_ruc, data.comprador_razon, data.comprador_direccion, data.solicitante,
        data.proveedor_ruc, data.proveedor_razon, data.proveedor_direccion, data.proveedor_contacto,
        data.fecha_emision, data.fecha_entrega, data.lugar_entrega, data.forma_pago, data.condiciones_venta, 
        data.garantias, data.incoterm, data.incluye_instalacion ? 1 : 0, data.moneda, data.tipo_cambio, data.incluye_igv ? 1 : 0,
        data.tiene_detraccion ? 1 : 0, data.tipo_detraccion, data.porcentaje_detraccion || 0, data.monto_detraccion || 0, data.numero_cuenta_operacion,
        data.subtotal, data.total
      ]
    );

    const ordenId = result.insertId;

    for (const item of data.items) {
      await connection.query(
        `INSERT INTO orden_compra_detalle (orden_compra_id, codigo, descripcion, cantidad, precio_unitario, precio_total) VALUES (?, ?, ?, ?, ?, ?)`,
        [ordenId, item.codigo || '', item.descripcion || 'Item', item.cantidad, item.precio_unitario, item.cantidad * item.precio_unitario]
      );
    }

    await connection.query("UPDATE purchase_requests SET orden_compra_id = ? WHERE id = ?", [ordenId, data.requestId]);
    
    await connection.commit();
    revalidatePath("/compras/solicitudes"); 
    return { success: true, message: "Orden creada con éxito", ordenId };

  } catch (error: any) {
    await connection.rollback();
    return { success: false, message: "Error en BD: " + error.message };
  } finally { connection.release(); }
}

export async function getPurchaseOrders(requestId: number) {
  try {
    const [rows]: any = await pool.query(
      "SELECT * FROM orden_compra WHERE solicitud_id = ? ORDER BY id ASC", 
      [requestId]
    );
    
    if (rows.length === 0) return [];
    
    // Mapeo seguro con SQL directo
    const ordersList = await Promise.all(rows.map(async (orden: any) => {
        const [items]: any = await pool.query(
          "SELECT * FROM orden_compra_detalle WHERE orden_compra_id = ?", 
          [orden.id]
        );
        
        return { 
            ...orden, 
            proveedor_razon: orden.proveedor_razon_social,
            items: items.map((i: any) => ({
                ...i,
                codigo: i.codigo || "" 
            }))
        };
    }));
    
    return ordersList;
  } catch (error) { 
    console.error("Error al obtener las órdenes:", error);
    return []; 
  }
}

export async function updatePurchaseOrderAction(data: any) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `UPDATE orden_compra SET 
       comprador_ruc=?, comprador_razon=?, comprador_direccion=?, solicitante=?,
       proveedor_ruc=?, proveedor_razon_social=?, proveedor_direccion=?, proveedor_contacto=?,
       fecha_recepcion_esperada=?, lugar_entrega=?, condiciones_pago=?, condiciones_venta=?,
       garantias=?, incoterm=?, incluye_instalacion=?, moneda=?, tipo_cambio=?, incluye_igv=?,
       tiene_detraccion=?, tipo_detraccion=?, porcentaje_detraccion=?, monto_detraccion=?, numero_cuenta_operacion=?,
       subtotal=?, total=? WHERE id=?`,
      [
        data.comprador_ruc, data.comprador_razon, data.comprador_direccion, data.solicitante,
        data.proveedor_ruc, data.proveedor_razon, data.proveedor_direccion, data.proveedor_contacto,
        data.fecha_entrega, data.lugar_entrega, data.forma_pago, data.condiciones_venta,
        data.garantias, data.incoterm, data.incluye_instalacion ? 1 : 0, data.moneda, data.tipo_cambio, data.incluye_igv ? 1 : 0,
        data.tiene_detraccion ? 1 : 0, data.tipo_detraccion, data.porcentaje_detraccion || 0, data.monto_detraccion || 0, data.numero_cuenta_operacion,
        data.subtotal, data.total, data.ordenId
      ]
    );

    await connection.query("DELETE FROM orden_compra_detalle WHERE orden_compra_id = ?", [data.ordenId]);
    
    for (const item of data.items) {
      await connection.query(
        `INSERT INTO orden_compra_detalle (orden_compra_id, codigo, descripcion, cantidad, precio_unitario, precio_total) VALUES (?, ?, ?, ?, ?, ?)`,
        [data.ordenId, item.codigo || '', item.descripcion, item.cantidad, item.precio_unitario, item.cantidad * item.precio_unitario]
      );
    }

    await connection.commit();
    revalidatePath("/compras/solicitudes");
    return { success: true, message: "Orden Actualizada Correctamente", ordenId: data.ordenId };
  } catch (error: any) {
    await connection.rollback();
    return { success: false, message: error.message };
  } finally { connection.release(); }
}

export async function deletePurchaseOrderAction(ordenId: number) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("DELETE FROM orden_compra_detalle WHERE orden_compra_id = ?", [ordenId]);
    await connection.query("DELETE FROM orden_compra WHERE id = ?", [ordenId]);
    await connection.query("UPDATE purchase_requests SET orden_compra_id = NULL WHERE orden_compra_id = ?", [ordenId]);
    await connection.commit();
    
    revalidatePath("/compras/solicitudes");
    return { success: true, message: "Orden eliminada correctamente" };
  } catch (error: any) { 
    await connection.rollback();
    return { success: false, message: "Error al eliminar: " + error.message }; 
  } finally { connection.release(); }
}

export async function getProviderByRuc(ruc: string) {
    try {
        const [rows]: any = await pool.query("SELECT name, address FROM providers WHERE ruc = ? AND estado = 1 LIMIT 1", [ruc]);
        return rows[0] || null;
    } catch (error) { return null; }
}

export async function getProductByCode(code: string) {
    try {
        const [rows]: any = await pool.query("SELECT name, unit_measure FROM products WHERE code = ? AND status = 1 LIMIT 1", [code]);
        return rows[0] || null;
    } catch (error) { return null; }
}

export async function searchProvidersAction(term: string) {
  if (!term || term.length < 3) return [];
  try {
    const query = `SELECT id, ruc, name as razon_social, address as direccion FROM providers WHERE (ruc LIKE ? OR name LIKE ?) AND estado = 1 LIMIT 5`;
    const [rows]: any = await pool.query(query, [`%${term}%`, `%${term}%`]);
    return rows;
  } catch (error) { return []; }
}

export async function getEmisorData(requestId: number) {
    try {
        const [rows]: any = await pool.query("CALL sp_obtener_datos_emisor_oc(?)", [requestId]);
        // rows[0][0] contiene el primer registro del primer conjunto de resultados
        return rows[0][0] || null;
    } catch (error) {
        console.error("Error al obtener emisor:", error);
        return null;
    }
}

// En purchase-actions.ts (Ejemplo de cómo debería quedar)
export async function registerPurchaseInvoice(formData: FormData) {
    const totalAmount = formData.get("total_amount");
    // ... tu lógica de validación
    
    // Al ejecutar el procedimiento almacenado, agrega el nuevo parámetro
    await pool.query("CALL sp_registrar_factura_compra(?, ?, ?, ...)", [
        // ... otros campos
        totalAmount, 
    ]);
}

// OBTENER REPORTE HISTÓRICO DE COMPRAS
export async function obtenerReporteCompras(branchId: number, fechaInicio: string, fechaFin: string) {
    const connection = await pool.getConnection();
    try {
        const [rows]: any = await connection.query("CALL sp_compras_reporte_general(?, ?, ?)", [branchId, fechaInicio, fechaFin]);
        return { success: true, data: rows[0] };
    } catch (error: any) {
        console.error("Error Reporte Compras:", error);
        return { success: false, data: [] };
    } finally {
        connection.release();
    }
}

// OBTENER PREDICCIÓN INTELIGENTE DE ABASTECIMIENTO
export async function obtenerPrediccionCompras(branchId: number) {
    const connection = await pool.getConnection();
    try {
        const [rows]: any = await connection.query("CALL sp_compras_prediccion(?)", [branchId]);
        return { success: true, data: rows[0] };
    } catch (error: any) {
        console.error("Error Predicción Compras:", error);
        return { success: false, data: [] };
    } finally {
        connection.release();
    }
}