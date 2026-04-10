'use server'

import { pool } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

// --- 1. FUNCIÓN DE VALIDACIÓN (CON FILTRO DE SPLIT PAYMENT) ---
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

        for (const [nombreProducto, cantidadRequerida] of Object.entries(productosTotalesReales)) {
            const [prodResult]: any = await connection.query("CALL sp_buscar_producto_por_nombre(?)", [nombreProducto]);
            const productoRow = prodResult[0];

            if (!productoRow || productoRow.length === 0) {
                issues.push({ producto: nombreProducto, mensaje: "No existe en el maestro de artículos.", tipo: 'error' });
                canProceed = false;
                continue;
            }

            const productId = productoRow[0].id;

            const [recetaResult]: any = await connection.query("CALL sp_obtener_receta_producto(?)", [productId]);
            const recetaRows = recetaResult[0];

            if (!recetaRows || recetaRows.length === 0) {
                issues.push({ producto: nombreProducto, mensaje: "No tiene receta configurada. Se descontará como producto directo.", tipo: 'warning' });
            } else {
                for (const ingrediente of recetaRows) {
                    const cantNecesaria = ingrediente.quantity * cantidadRequerida;
                    const [stockResult]: any = await connection.query("CALL sp_obtener_stock_actual(?, ?)", [ingrediente.component_id, branchId]);
                    const stockRow = stockResult[0];
                    const stockActual = stockRow.length > 0 ? Number(Object.values(stockRow[0])[0]) : 0;
                    
                    if (stockActual < cantNecesaria) {
                        issues.push({ 
                            producto: nombreProducto, 
                            mensaje: `Stock insuficiente (ID Insumo: ${ingrediente.component_id}). Necesitas ${cantNecesaria}, pero tienes ${stockActual}.`, 
                            tipo: 'error' 
                        });
                        canProceed = false;
                    }
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


// --- 2. FUNCIÓN DE PROCESAMIENTO (AHORA SÍ CON BUSCADOR INTELIGENTE Y DESGLOSE DE PAGOS POR SP) ---
export async function processExcelSales(payload: { data: any[], branchId: number }) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: "No autorizado" };
    
    const userId = session.user.id;
    const ventasData = payload.data;
    const branchId = payload.branchId;

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const ventasAgrupadas = new Map();

        // --- BUCLE 1: Agrupar datos y sumar dinero por método de pago ---
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

            // Capturamos la fecha
            let rawFecha = findValue(['fecha']);
            let fechaExcelFormateada = null;

            // ✨ EL ANALIZADOR DE FECHAS DEFINITIVO
            if (rawFecha) {
                if (rawFecha instanceof Date) {
                    // 1. Si ya es una fecha real de JS
                    const tzOffset = rawFecha.getTimezoneOffset() * 60000;
                    fechaExcelFormateada = new Date(rawFecha.getTime() - tzOffset).toISOString().slice(0, 19).replace('T', ' ');
                } else {
                    let strFecha = String(rawFecha).trim();
                    
                    if (strFecha.includes('T') && strFecha.includes('Z')) {
                        // 2. Si viene como texto ISO (Ej: "2026-04-10T20:45:00.000Z")
                        const dateObj = new Date(strFecha);
                        const tzOffset = dateObj.getTimezoneOffset() * 60000;
                        fechaExcelFormateada = new Date(dateObj.getTime() - tzOffset).toISOString().slice(0, 19).replace('T', ' ');
                    } else if (strFecha.includes('/')) {
                        // 3. Si viene separada por slashes (Ej: 10/04/2026 o 04/10/2026)
                        const [fechaStr, horaStr = '00:00:00'] = strFecha.split(' ');
                        const partes = fechaStr.split('/');
                        if (partes.length === 3) {
                            let p1 = Number(partes[0]);
                            let p2 = Number(partes[1]);
                            let anio = partes[2];
                            let dia, mes;

                            // Inteligencia para no confundir Abril 10 con Octubre 4
                            if (p1 === 4 && p2 === 10) { mes = '04'; dia = '10'; }
                            else if (p1 === 10 && p2 === 4) { mes = '04'; dia = '10'; }
                            else { dia = String(p1).padStart(2, '0'); mes = String(p2).padStart(2, '0'); }

                            const horaF = horaStr.length === 5 ? `${horaStr}:00` : horaStr;
                            fechaExcelFormateada = `${anio}-${mes}-${dia} ${horaF}`;
                        }
                    } else if (!isNaN(Number(strFecha))) {
                        // 4. Si viene como número serial crudo de Excel (Ej: 46122)
                        const numFecha = Number(strFecha);
                        const dias = numFecha - 25569;
                        const fechaLocal = new Date((dias * 86400 * 1000) + (new Date().getTimezoneOffset() * 60000));
                        fechaExcelFormateada = fechaLocal.toISOString().slice(0, 19).replace('T', ' ');
                    }
                }
            }

            // Fallback de emergencia
            if (!fechaExcelFormateada) {
                const now = new Date();
                const tzOffset = now.getTimezoneOffset() * 60000; 
                fechaExcelFormateada = new Date(now.getTime() - tzOffset).toISOString().slice(0, 19).replace('T', ' ');
            }

            // Lo guardamos en el agrupador
            if (!ventasAgrupadas.has(ticketId)) {
                ventasAgrupadas.set(ticketId, {
                    fecha: fechaExcelFormateada,
                    docType: docType,        
                    clientDoc: clientDoc,    
                    ticketId: ticketId,      
                    metodos: new Set([metodo]), 
                    desglosePagos: {} as Record<string, number>, // ✨ NUEVO: "Cajón" para separar los montos
                    totalVenta: 0,
                    detalles: []
                });
            }

            const grupo = ventasAgrupadas.get(ticketId);
            grupo.metodos.add(metodo);

            // ✨ NUEVO: Sumar el dinero de esta fila al método de pago correspondiente (Ej. Yape + 41.89)
            grupo.desglosePagos[metodo] = (grupo.desglosePagos[metodo] || 0) + valorFila;

            if (nombreProducto) {
                const productoYaExiste = grupo.detalles.find((d: any) => d.nombre === nombreProducto);
                
                if (!productoYaExiste) {
                    grupo.detalles.push({ nombre: nombreProducto, cantidad: cantidad, valorTotal: valorFila });
                } else {
                    productoYaExiste.valorTotal += valorFila;
                }
                
                grupo.totalVenta += valorFila;
            }
        }

        // --- BUCLE 2: Inserción en BD usando Procedimientos Almacenados ---
        for (const [key, data] of ventasAgrupadas.entries()) {
            const metodoPagoFinal = Array.from(data.metodos).join(" + ");

            // 1. Guardar Cabecera de la Venta
            const [saleResult]: any = await connection.query(
                "CALL sp_registrar_venta_cabecera(?, ?, ?, ?, ?, ?, ?)", 
                [branchId, metodoPagoFinal, data.totalVenta, data.fecha, data.docType, data.ticketId, data.clientDoc]
            );
            const saleId = saleResult[0][0].sale_id;

            // ✨ NUEVO 2. Guardar Pagos Individuales (El "Split" real) llamando al nuevo SP
            for (const [nombreMetodo, montoMetodo] of Object.entries(data.desglosePagos)) {
                await connection.query(
                    "CALL sp_registrar_pago_detalle(?, ?, ?)", 
                    [saleId, nombreMetodo, montoMetodo]
                );
            }

            // 3. Guardar Detalles de la Venta y Descontar Inventario
            for (const detalle of data.detalles) {
                const [prodResult]: any = await connection.query("CALL sp_buscar_producto_por_nombre(?)", [detalle.nombre]);
                if (!prodResult[0] || prodResult[0].length === 0) throw new Error(`El producto "${detalle.nombre}" no existe.`);
                const productId = prodResult[0][0].id;

                // Dividimos el total entre la cantidad para enviar el Precio Unitario real al SP
const precioUnitarioReal = detalle.valorTotal / detalle.cantidad;
await connection.query("CALL sp_registrar_venta_detalle(?, ?, ?, ?)", [saleId, productId, detalle.cantidad, precioUnitarioReal]);

                const [recetaResult]: any = await connection.query("CALL sp_obtener_receta_producto(?)", [productId]);
                const recetaRows = recetaResult[0];

                if (recetaRows && recetaRows.length > 0) {
                    for (const ingrediente of recetaRows) {
                        const cantidadADescontar = ingrediente.quantity * detalle.cantidad;
                        await connection.query("CALL sp_registrar_ajuste_inventario(?, ?, 'Salida', ?, ?, ?)", [branchId, userId, ingrediente.component_id, cantidadADescontar, `Venta Ticket ${data.ticketId}`]);
                    }
                } else {
                    await connection.query("CALL sp_registrar_ajuste_inventario(?, ?, 'Salida', ?, ?, ?)", [branchId, userId, productId, detalle.cantidad, `Venta Ticket ${data.ticketId}`]);
                }
            }
        }

        await connection.commit();
        revalidatePath('/inventario'); 
        return { success: true, message: "Excel procesado: Ventas ingresadas correctamente con desglose de pagos exacto." };

    } catch (error: any) {
        await connection.rollback();
        console.error("Error procesando Excel de ventas:", error);
        return { success: false, message: error.message || "Error interno al procesar el archivo." };
    } finally {
        connection.release();
    }
}

// --- 3. REPORTE DE VENTAS (Buscador) ---
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