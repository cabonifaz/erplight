'use server'

import { pool } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

// --- 1. FUNCIÓN DE VALIDACIÓN ---
export async function validateExcelSales(payload: { data: any[], branchId: number }) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: "No autorizado", issues: [], canProceed: false };
    
    const ventasData = payload.data;
    const branchId = payload.branchId;

    const issues: { producto: string; mensaje: string; tipo: 'error' | 'warning' }[] = [];
    let canProceed = true;
    const connection = await pool.getConnection();

    try {
        const ventasAgrupadas = new Map();
        const productosTotalesReales: Record<string, number> = {};

        for (const fila of ventasData) {
            const ticketId = fila['Serie y correlativo'] || fila['Serie y Correlativo'] || 'SIN_TICKET_' + Math.random();
            const nombreProducto = fila['Producto / Descripción'] || fila['Producto'] || fila['producto'];
            const cantidad = Number(fila['Cantidad']) || 1;

            if (!ventasAgrupadas.has(ticketId)) {
                ventasAgrupadas.set(ticketId, new Set()); 
            }

            const productosEnEsteTicket = ventasAgrupadas.get(ticketId);

            if (nombreProducto) {
                if (!productosEnEsteTicket.has(nombreProducto)) {
                    productosTotalesReales[nombreProducto] = (productosTotalesReales[nombreProducto] || 0) + cantidad;
                    productosEnEsteTicket.add(nombreProducto);
                }
            }
        }

        for (const [nombreItem, cantidadRequerida] of Object.entries(productosTotalesReales)) {
            // ✨ NUEVO: Usamos el buscador inteligente universal
            const [itemResult]: any = await connection.query("CALL sp_buscar_item_venta(?)", [nombreItem]);
            const itemRow = itemResult[0]?.[0];

            if (!itemRow || itemRow.tipo === 'NONE') {
                issues.push({ producto: nombreItem, mensaje: "No existe en Menús ni en Insumos.", tipo: 'error' });
                canProceed = false;
                continue;
            }

            const itemId = itemRow.item_id;

            // Si es un MENÚ, verificamos su receta. Si es un PRODUCTO directo (ej. Gaseosa), verificamos su stock directo.
            if (itemRow.tipo === 'MENU') {
                // Nota: Asegúrate de que sp_obtener_receta_producto funcione también con los IDs de los menús
               const [recetaResult]: any = await connection.query("CALL sp_obtener_receta_menu(?)", [itemId]);
                const recetaRows = recetaResult[0];

                if (!recetaRows || recetaRows.length === 0) {
                    issues.push({ producto: nombreItem, mensaje: "El menú no tiene receta configurada.", tipo: 'warning' });
                } else {
                    for (const ingrediente of recetaRows) {
                        const cantNecesaria = ingrediente.quantity * cantidadRequerida;
                        const [stockResult]: any = await connection.query("CALL sp_obtener_stock_actual(?, ?)", [ingrediente.component_id, branchId]);
                        const stockRow = stockResult[0];
                        const stockActual = stockRow.length > 0 ? Number(Object.values(stockRow[0])[0]) : 0;
                        
                        if (stockActual < cantNecesaria) {
                            issues.push({ 
                                producto: nombreItem, 
                                mensaje: `Stock insuficiente (ID Insumo: ${ingrediente.component_id}). Necesitas ${cantNecesaria}, pero tienes ${stockActual}.`, 
                                tipo: 'error' 
                            });
                            canProceed = false;
                        }
                    }
                }
            } else if (itemRow.tipo === 'PRODUCTO') {
                // Validación para productos de venta directa
                const [stockResult]: any = await connection.query("CALL sp_obtener_stock_actual(?, ?)", [itemId, branchId]);
                const stockRow = stockResult[0];
                const stockActual = stockRow.length > 0 ? Number(Object.values(stockRow[0])[0]) : 0;
                
                if (stockActual < cantidadRequerida) {
                    issues.push({ 
                        producto: nombreItem, 
                        mensaje: `Stock insuficiente del producto. Necesitas ${cantidadRequerida}, pero tienes ${stockActual}.`, 
                        tipo: 'error' 
                    });
                    canProceed = false;
                }
            }
        }
        return { success: true, issues, canProceed };
    } catch (error: any) {
        console.error("Error validando:", error);
        return { success: false, message: `Error BD: ${error.message}`, issues: [], canProceed: false };
    } finally {
        connection.release();
    }
}


// --- 2. FUNCIÓN DE PROCESAMIENTO (VERSIÓN ULTRA RÁPIDA CON JSON) ---
export async function processExcelSales(payload: { data: any[], branchId: number }) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: "No autorizado" };
    
    const userId = session.user.id;
    const ventasData = payload.data;
    const branchId = payload.branchId;

    const connection = await pool.getConnection();

    try {
        const ventasAgrupadas = new Map();
        const nombresUnicos = new Set<string>(); // Guardaremos los nombres para buscarlos de golpe

        // --- BUCLE 1: TU LÓGICA ORIGINAL (Se queda intacta) ---
        for (const fila of ventasData) {
            const findValue = (keywords: string[]) => {
                const exactKey = Object.keys(fila).find(k => 
                    keywords.some(word => k.toLowerCase().trim() === word.toLowerCase())
                );
                return exactKey ? fila[exactKey] : undefined;
            };

            const ticketId = findValue(['serie y correlativo']) || 'SIN_TICKET_' + Math.random();
            const nombreProducto = findValue(['producto / descripción', 'producto']);
            const cantidad = Number(findValue(['cantidad'])) || 1;
            
            const rawPrecioVenta = findValue(['precio de venta', 'valor de venta', 'total']);
            const rawPrecioUnitario = findValue(['precio unitario']);
            const parsePrecio = (val: any) => Number(String(val || '0').trim().replace(',', '.')) || 0;
            
            const precioVentaParsed = parsePrecio(rawPrecioVenta);
            const precioUnitarioParsed = parsePrecio(rawPrecioUnitario);
            const valorFila = precioVentaParsed > 0 ? precioVentaParsed : (precioUnitarioParsed * cantidad);
            
            const metodo = findValue(['metodo de pago', 'método de pago']) || 'Efectivo';
            const docType = findValue(['tipo de documento']) || 'Ticket';
            const clientDoc = String(findValue(['cliente / ruc / dni']) || '');

            let rawFecha = findValue(['fecha']);
            let fechaExcelFormateada = null;

            if (rawFecha) {
                if (rawFecha instanceof Date) {
                    const tzOffset = rawFecha.getTimezoneOffset() * 60000;
                    fechaExcelFormateada = new Date(rawFecha.getTime() - tzOffset).toISOString().slice(0, 19).replace('T', ' ');
                } else {
                    let strFecha = String(rawFecha).trim();
                    if (strFecha.includes('T') && strFecha.includes('Z')) {
                        const dateObj = new Date(strFecha);
                        const tzOffset = dateObj.getTimezoneOffset() * 60000;
                        fechaExcelFormateada = new Date(dateObj.getTime() - tzOffset).toISOString().slice(0, 19).replace('T', ' ');
                    } else if (strFecha.includes('/')) {
                        const [fechaStr, horaStr = '00:00:00'] = strFecha.split(' ');
                        const partes = fechaStr.split('/');
                        if (partes.length === 3) {
                            let p1 = Number(partes[0]);
                            let p2 = Number(partes[1]);
                            let anio = partes[2];
                            let dia, mes;

                            if (p1 === 4 && p2 === 10) { mes = '04'; dia = '10'; }
                            else if (p1 === 10 && p2 === 4) { mes = '04'; dia = '10'; }
                            else { dia = String(p1).padStart(2, '0'); mes = String(p2).padStart(2, '0'); }

                            const horaF = horaStr.length === 5 ? `${horaStr}:00` : horaStr;
                            fechaExcelFormateada = `${anio}-${mes}-${dia} ${horaF}`;
                        }
                    } else if (!isNaN(Number(strFecha))) {
                        const numFecha = Number(strFecha);
                        const dias = numFecha - 25569;
                        const fechaLocal = new Date((dias * 86400 * 1000) + (new Date().getTimezoneOffset() * 60000));
                        fechaExcelFormateada = fechaLocal.toISOString().slice(0, 19).replace('T', ' ');
                    }
                }
            }

            if (!fechaExcelFormateada) {
                const now = new Date();
                const tzOffset = now.getTimezoneOffset() * 60000; 
                fechaExcelFormateada = new Date(now.getTime() - tzOffset).toISOString().slice(0, 19).replace('T', ' ');
            }

            if (!ventasAgrupadas.has(ticketId)) {
                ventasAgrupadas.set(ticketId, {
                    fecha: fechaExcelFormateada,
                    docType: docType,        
                    clientDoc: clientDoc,    
                    ticketId: ticketId,      
                    metodos: new Set([metodo]), 
                    desglosePagos: {} as Record<string, number>, 
                    totalVenta: 0,
                    detalles: []
                });
            }

            const grupo = ventasAgrupadas.get(ticketId);
            grupo.metodos.add(metodo);
            grupo.desglosePagos[metodo] = (grupo.desglosePagos[metodo] || 0) + valorFila;

            if (nombreProducto) {
                const productoYaExiste = grupo.detalles.find((d: any) => d.nombre === nombreProducto);
                nombresUnicos.add(nombreProducto); // Guardamos para buscar su ID luego
                
                if (!productoYaExiste) {
                    grupo.detalles.push({ nombre: nombreProducto, cantidad: cantidad, valorTotal: valorFila });
                } else {
                    productoYaExiste.valorTotal += valorFila;
                }
                grupo.totalVenta += valorFila;
            }
        }

        // --- BUCLE 2 OPTIMIZADO: Mapeo de IDs y Creación de JSON ---
        await connection.beginTransaction();

        // 2.1: Buscamos los IDs de los 5 o 10 productos una sola vez, en lugar de 1500 veces
        const catalogo = new Map();
        for (const nombre of Array.from(nombresUnicos)) {
            const [itemResult]: any = await connection.query("CALL sp_buscar_item_venta(?)", [nombre]);
            const itemRow = itemResult[0]?.[0];
            if (!itemRow || itemRow.tipo === 'NONE') throw new Error(`El ítem "${nombre}" no existe.`);
            catalogo.set(nombre, { id: itemRow.item_id, tipo: itemRow.tipo });
        }

        // 2.2: Construimos un Array plano con toda la información
        const jsonFilas = [];
        for (const [ticketId, data] of ventasAgrupadas.entries()) {
            const metodoPagoFinal = Array.from(data.metodos).join(" + ");

            for (const detalle of data.detalles) {
                const itemDb = catalogo.get(detalle.nombre);
                jsonFilas.push({
                    ticket_id: ticketId,
                    fecha: data.fecha,
                    doc_type: data.docType,
                    client_doc: data.clientDoc,
                    metodo_pago: metodoPagoFinal,
                    total_cabecera: data.totalVenta,
                    tipo_item: itemDb.tipo, // 'MENU' o 'PRODUCTO'
                    item_id: itemDb.id,
                    cantidad: detalle.cantidad,
                    precio_uni: detalle.valorTotal / detalle.cantidad,
                    subtotal: detalle.valorTotal
                });
            }
        }

        // 2.3: Mandamos los 1500 registros en 1 SOLA LLAMADA a la base de datos
        const datosVentasJson = JSON.stringify(jsonFilas);
        await connection.query("CALL sp_procesar_excel_masivo(?, ?, ?)", [branchId, userId, datosVentasJson]);

        await connection.commit();
        revalidatePath('/inventario'); 
        return { success: true, message: `Excel procesado en segundos: ${ventasData.length} registros ingresados correctamente.` };

    } catch (error: any) {
        await connection.rollback();
        console.error("Error procesando Excel de ventas:", error);
        return { success: false, message: error.message || "Error interno al procesar el archivo." };
    } finally {
        connection.release();
    }
}

// --- 3. REPORTE DE VENTAS ---
export async function getReporteVentas(filtros: {
    branchId?: number | null;
    fechaInicio?: string | null;
    fechaFin?: string | null;
    metodoPago?: string | null;
}) {
    const connection = await pool.getConnection();
    try {
        const bId = filtros.branchId || null;
        const fInicio = filtros.fechaInicio || null;
        const fFin = filtros.fechaFin || null;
        const mPago = filtros.metodoPago || null;

        const [rows]: any = await connection.query("CALL sp_reporte_ventas(?, ?, ?, ?)", [bId, fInicio, fFin, mPago]);
        return { success: true, data: rows[0] || [] };
    } catch (error: any) {
        console.error("Error obteniendo reporte:", error);
        return { success: false, message: error.message, data: [] };
    } finally {
        connection.release();
    }
}