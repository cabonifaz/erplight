'use server'

import { pool } from "@/lib/db"; 
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";

export interface ActionState { success: boolean; message: string; }
export interface Branch { id: number; name: string; }
export interface Quotation { id: number; file_name: string; file_path: string; is_selected: boolean; }

// ==============================================================================
// 1. LECTURA DE DATOS
// ==============================================================================

export async function getRequestDetails(requestId: number) {
    try {
        const [results]: any = await pool.query("CALL sp_obtener_detalle_solicitud(?)", [requestId]);
        const [cotizacionesResult]: any = await pool.query("CALL sp_obtener_cotizaciones_solicitud(?)", [requestId]);
        
        return { 
            quotations: cotizacionesResult[0] || [], 
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
    // ✨ LIMPIO: SP para sucursales
    const [rows]: any = await pool.query("CALL sp_listar_sucursales_activas()");
    return rows[0] as Branch[];
  } catch (error) { 
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

        if (role !== 'GERENTE GENERAL' && role !== 'GERENTE DE LOGISTICA') {
            // ✨ LIMPIO: SP para obtener la sucursal principal
            const [userBranch]: any = await pool.query("CALL sp_obtener_sucursal_principal_usuario(?)", [session.user.id]);

            if (userBranch[0] && userBranch[0].length > 0) {
                targetBranchId = userBranch[0][0].branch_id; 
            } else {
                return []; 
            }
        }

        const [rows]: any = await pool.query(
            "CALL sp_listar_solicitudes(?, ?, ?, ?, ?, ?, ?)", 
            [
                session.user.id, targetBranchId, filters.code || null, filters.description || null,
                filters.status_id ? Number(filters.status_id) : null, filters.start_date || null, filters.end_date || null
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
        // ✨ LIMPIO: SP para facturas
        const [rows]: any = await pool.query("CALL sp_obtener_facturas_solicitud(?)", [requestId]);
        return rows[0] as { id: number, invoice_number: string }[];
    } catch (error) { 
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
    
    // ✨ LIMPIO: Sin variables SQL, el SP devuelve el ID directamente
    const [rows]: any = await connection.query(
        "CALL sp_crear_solicitud(?, ?, ?, ?, ?, ?)", 
        [branch_id, userId, issue_date, description, estimated_total, currency]
    );
    const newRequestId = rows[0][0]?.id;
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
    await connection.query("CALL sp_actualizar_solicitud(?, ?, ?, ?, ?)", [requestId, branch_id, description, estimated_total, currency]);

    if (deletedFileIds.length > 0) {
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
        const role = session.user.role?.toUpperCase() || "";

        if (role !== 'GERENTE GENERAL') {
            // ✨ LIMPIO: SPs en lugar de SELECTs crudos
            const [reqInfo]: any = await connection.query("CALL sp_obtener_total_solicitud(?)", [requestId]);
            const montoTotal = parseFloat(reqInfo[0][0]?.estimated_total || 0);

            const [limitData]: any = await connection.query("CALL sp_obtener_limite_aprobacion(?)", [session.user.id.toString()]);
            const limitePermitido = parseFloat(limitData[0][0]?.num_1 || 0);

            if (montoTotal > limitePermitido) {
                await connection.rollback();
                return { success: false, message: `⛔ Permiso denegado. Tu límite es S/ ${limitePermitido}, pero la solicitud es de S/ ${montoTotal}. Requiere aprobación superior.` };
            }
        }
        
        // ✨ LIMPIO: Sin variables @success ni @msg, devuelve directo
        const [rows]: any = await connection.query("CALL sp_aprobar_solicitud(?, ?)", [requestId, session.user.id]);
        const result = rows[0][0];
        
        if (result.success !== 1) { 
            await connection.rollback(); 
            return { success: false, message: result.message }; 
        }

        // ✨ LIMPIO: SPs en lugar de UPDATEs
        if (comment && comment.trim() !== "") {
            await connection.query("CALL sp_actualizar_comentario_solicitud(?, ?)", [requestId, comment]);
        }
        
        if (selectedQuotationId) {
            await connection.query("CALL sp_marcar_cotizacion_seleccionada(?, ?)", [requestId, selectedQuotationId]);
        }
        
        await connection.commit();
        revalidatePath("/compras/solicitudes");
        return { success: true, message: result.message || "Solicitud aprobada correctamente" };
        
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
            if (!inv.providerRuc || !inv.providerName) throw new Error(`Faltan datos proveedor en ${inv.number}`);
            const cleanRuc = inv.providerRuc.trim();
            const cleanInvNum = inv.number.trim();

            const [provRes]: any = await connection.query("CALL sp_registrar_proveedor(?, ?, ?)", [cleanRuc, inv.providerName, inv.providerBranch || '']);
            const providerId = provRes[0][0].id;

            let currentInvoiceId = 0;
            // ✨ LIMPIO: SP para verificar si la factura existe
            const [existInv]: any = await connection.query("CALL sp_verificar_factura_compra(?, ?)", [cleanInvNum, providerId]);

            if (existInv[0] && existInv[0].length > 0) {
                currentInvoiceId = existInv[0][0].id;
            } else {
                const invFile = formData.get(`file_invoice_${inv.tempId}`) as File;
                if (!invFile || invFile.size === 0) throw new Error(`Falta archivo factura ${cleanInvNum}`);

                const invFileName = `INV-${requestId}-${cleanRuc}-${Date.now()}.pdf`;
                const invPath = join(uploadDir, invFileName);
                await writeFile(invPath, Buffer.from(await invFile.arrayBuffer()));
                const publicInvPath = `/uploads/executions/${invFileName}`;
                
                const totalAmount = parseFloat(inv.amount) || 0; 
                const currency = inv.currency || 'PEN'; 

                const [invRes]: any = await connection.query(
                    "CALL sp_registrar_factura_compra(?, ?, ?, ?, ?, ?, ?)", 
                    [requestId, session.user.id, cleanInvNum, totalAmount, publicInvPath, providerId, currency]
                );
                currentInvoiceId = invRes[0][0].id;
            }

            for (const v of inv.vouchers) {
                const cleanVoucherNum = v.number.trim();
                const voucherFile = formData.get(`file_voucher_${inv.tempId}_${v.tempId}`) as File;
                
                if (voucherFile && voucherFile.size > 0) {
                    const vFileName = `PAY-${currentInvoiceId}-${cleanVoucherNum}-${Date.now()}.jpg`;
                    const vPath = join(uploadDir, vFileName);
                    await writeFile(vPath, Buffer.from(await voucherFile.arrayBuffer()));
                    const publicVPath = `/uploads/executions/${vFileName}`;

                    await connection.query("CALL sp_registrar_pago_compra(?, ?, ?, ?, ?)", [
                        currentInvoiceId, cleanVoucherNum, publicVPath, v.date, parseFloat(v.amount)
                    ]);
                }
            }
        }

        await connection.commit();
        revalidatePath("/compras/solicitudes");
        return { success: true, message: "Información registrada correctamente." };

    } catch (error: any) {
        await connection.rollback();
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
    return { success: true, message: "Documento eliminado." };
}

// ==============================================================================
// 4. RECEPCIÓN Y CIERRE (FINAL)
// ==============================================================================

export async function validatePurchaseOrder(requestId: number): Promise<ActionState> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: "No autorizado" };
    try {
        await pool.query("CALL sp_validar_expediente_compra(?, ?)", [requestId, session.user.id]);
        revalidatePath("/compras/solicitudes");
        return { success: true, message: "✅ Compra VALIDADA. Expediente cerrado." };
    } catch (error: any) { return { success: false, message: error.sqlMessage || error.message }; }
}

export async function registerReception(formData: FormData): Promise<ActionState> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: "No autorizado" };

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

            await pool.query(
                "CALL sp_procesar_recepcion_item(?, ?, ?, ?, ?, ?, ?, ?)", 
                [requestId, session.user.id, item.product_id || null, rawName, qty, uom, publicPath, guideNumber]
            );
        }

        revalidatePath("/compras/solicitudes");
        return { success: true, message: "Recepción registrada correctamente." };
    } catch (error: any) { return { success: false, message: error.message }; }
}

export async function getRequestReceptions(requestId: number) {
    try {
        const [rows]: any = await pool.query("CALL sp_obtener_recepciones_solicitud(?)", [requestId]);
        return rows[0];
    } catch (error) { return []; }
}

// ==============================================================================
// 5. GESTIÓN DE ORDEN DE COMPRA
// ==============================================================================

export async function createPurchaseOrderAction(data: any) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // ✨ LIMPIO: Sin SET @new_id. El SP devuelve el ID
    const [rows]: any = await connection.query(
      "CALL sp_crear_orden_cabecera(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        data.requestId, data.comprador_ruc, data.comprador_razon, data.comprador_direccion, data.solicitante,
        data.proveedor_ruc, data.proveedor_razon, data.proveedor_direccion, data.proveedor_contacto,
        data.fecha_emision, data.fecha_entrega, data.lugar_entrega, data.forma_pago, data.condiciones_venta, 
        data.garantias, data.incoterm, data.incluye_instalacion ? 1 : 0, data.moneda, data.tipo_cambio, data.incluye_igv ? 1 : 0,
        data.tiene_detraccion ? 1 : 0, data.tipo_detraccion, data.porcentaje_detraccion || 0, data.monto_detraccion || 0, data.numero_cuenta_operacion, 
        data.subtotal, data.total
      ]
    );
    
    const ordenId = rows[0][0]?.id;
    if (!ordenId) throw new Error("No se pudo obtener el ID de la orden generada.");

    for (const item of data.items) {
      await connection.query(
        "CALL sp_insertar_orden_detalle(?, ?, ?, ?, ?, ?)",
        [ordenId, item.codigo || '', item.descripcion || 'Item', item.cantidad, item.precio_unitario, item.cantidad * item.precio_unitario]
      );
    }

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
    const [rows]: any = await pool.query("CALL sp_listar_ordenes_solicitud(?)", [requestId]);
    if (!rows[0] || rows[0].length === 0) return [];
    
    const ordersList = await Promise.all(rows[0].map(async (orden: any) => {
        const [items]: any = await pool.query("CALL sp_listar_detalles_orden(?)", [orden.id]);
        return { 
            ...orden, 
            proveedor_razon: orden.proveedor_razon_social,
            items: items[0].map((i: any) => ({ ...i, codigo: i.codigo || "" }))
        };
    }));
    return ordersList;
  } catch (error) { return []; }
}

export async function updatePurchaseOrderAction(data: any) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      "CALL sp_actualizar_orden_cabecera(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        data.ordenId, data.comprador_ruc, data.comprador_razon, data.comprador_direccion, data.solicitante,
        data.proveedor_ruc, data.proveedor_razon, data.proveedor_direccion, data.proveedor_contacto,
        data.fecha_entrega, data.lugar_entrega, data.forma_pago, data.condiciones_venta,
        data.garantias, data.incoterm, data.incluye_instalacion ? 1 : 0, data.moneda, data.tipo_cambio, data.incluye_igv ? 1 : 0,
        data.tiene_detraccion ? 1 : 0, data.tipo_detraccion, data.porcentaje_detraccion || 0, data.monto_detraccion || 0, data.numero_cuenta_operacion,
        data.subtotal, data.total
      ]
    );

    await connection.query("CALL sp_eliminar_detalles_orden(?)", [data.ordenId]);
    
    for (const item of data.items) {
      await connection.query(
        "CALL sp_insertar_orden_detalle(?, ?, ?, ?, ?, ?)",
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
    await connection.query("CALL sp_eliminar_orden_completa(?)", [ordenId]);
    await connection.commit();
    revalidatePath("/compras/solicitudes");
    return { success: true, message: "Orden eliminada correctamente" };
  } catch (error: any) { 
    await connection.rollback();
    return { success: false, message: "Error al eliminar: " + error.message }; 
  } finally { connection.release(); }
}

// ==============================================================================
// 6. REPORTES Y PREDICCIONES
// ==============================================================================

export async function obtenerReporteCompras(branchId: number, fechaInicio: string, fechaFin: string) {
    const connection = await pool.getConnection();
    try {
        const [rows]: any = await connection.query("CALL sp_compras_reporte_general(?, ?, ?)", [branchId, fechaInicio, fechaFin]);
        return { success: true, data: rows[0] };
    } catch (error: any) { return { success: false, data: [] }; } finally { connection.release(); }
}

export async function obtenerPrediccionCompras(branchId: number) {
    const connection = await pool.getConnection();
    try {
        const [rows]: any = await connection.query("CALL sp_compras_prediccion(?)", [branchId]);
        return { success: true, data: rows[0] };
    } catch (error: any) { return { success: false, data: [] }; } finally { connection.release(); }
}

// ==============================================================================
// 7. BÚSQUEDA DE PROVEEDORES
// ==============================================================================

export async function searchProvidersAction(query: string) {
    if (!query || query.trim() === "") return [];
    try {
        // ✨ LIMPIO: SP de búsqueda
        const [rows]: any = await pool.query("CALL sp_buscar_proveedores(?)", [query]);
        return rows[0];
    } catch (error) { return []; }
}