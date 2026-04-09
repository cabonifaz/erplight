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
        // ✨ LÓGICA: Filtramos duplicados por ticket antes de sumar las cantidades
        const ventasAgrupadas = new Map();
        const productosTotalesReales: Record<string, number> = {};

        for (const fila of ventasData) {
            const ticketId = fila['Serie y correlativo'] || fila['Serie y Correlativo'] || 'SIN_TICKET_' + Math.random();
            const nombreProducto = fila['Producto / Descripción'] || fila['Producto'] || fila['producto'];
            const cantidad = Number(fila['Cantidad']) || 1;

            if (!ventasAgrupadas.has(ticketId)) {
                ventasAgrupadas.set(ticketId, new Set()); // Usamos un Set para recordar qué productos ya vimos
            }

            const productosEnEsteTicket = ventasAgrupadas.get(ticketId);

            if (nombreProducto) {
                if (!productosEnEsteTicket.has(nombreProducto)) {
                    // Es la primera vez que vemos este producto en este ticket. Sumamos la cantidad.
                    productosTotalesReales[nombreProducto] = (productosTotalesReales[nombreProducto] || 0) + cantidad;
                    productosEnEsteTicket.add(nombreProducto);
                }
                // Si ya lo vimos (Split Payment), ignoramos la cantidad extra para no pedir doble stock
            }
        }

        // Ahora validamos usando las cantidades reales
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


// --- 2. FUNCIÓN DE PROCESAMIENTO (SPLIT PAYMENT + INVENTARIO EXACTO + LIMPIEZA DE PRECIOS) ---
// --- 2. FUNCIÓN DE PROCESAMIENTO (AHORA SÍ CON BUSCADOR INTELIGENTE) ---
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

        for (const fila of ventasData) {
            // ✨ EL MISMO BUSCADOR INTELIGENTE DEL FRONTEND, AHORA EN EL BACKEND
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
            
            // Priorizamos Precio de Venta. Si falla, Unitario * Cantidad
            const valorFila = precioVentaParsed > 0 ? precioVentaParsed : (precioUnitarioParsed * cantidad);
            
            const metodo = findValue(['metodo de pago', 'método de pago']) || 'Efectivo';
            const docType = findValue(['tipo de documento']) || 'Ticket';
            const clientDoc = String(findValue(['cliente / ruc / dni']) || '');
            let fechaExcel = findValue(['fecha']);

            if (!ventasAgrupadas.has(ticketId)) {
                if (!fechaExcel) {
                    const now = new Date();
                    const tzOffset = now.getTimezoneOffset() * 60000; 
                    fechaExcel = (new Date(now.getTime() - tzOffset)).toISOString().slice(0, 19).replace('T', ' ');
                }

                ventasAgrupadas.set(ticketId, {
                    fecha: fechaExcel,
                    docType: docType,         
                    clientDoc: clientDoc,     
                    ticketId: ticketId,       
                    metodos: new Set([metodo]), 
                    totalVenta: 0,
                    detalles: []
                });
            }

            const grupo = ventasAgrupadas.get(ticketId);
            grupo.metodos.add(metodo);

            if (nombreProducto) {
                const productoYaExiste = grupo.detalles.find((d: any) => d.nombre === nombreProducto);
                
                if (!productoYaExiste) {
                    // Es la primera vez: Guardamos cantidad original (1) y el dinero (41.89)
                    grupo.detalles.push({ nombre: nombreProducto, cantidad: cantidad, valorTotal: valorFila });
                } else {
                    // Ya existía (Split Payment): NO sumamos cantidad, SÍ sumamos dinero (+41.89)
                    productoYaExiste.valorTotal += valorFila;
                }
                
                grupo.totalVenta += valorFila;
            }
        }

        // --- Inserción en BD ---
        for (const [key, data] of ventasAgrupadas.entries()) {
            const metodoPagoFinal = Array.from(data.metodos).join(" + ");

            const [saleResult]: any = await connection.query(
                "CALL sp_registrar_venta_cabecera(?, ?, ?, ?, ?, ?, ?)", 
                [branchId, metodoPagoFinal, data.totalVenta, data.fecha, data.docType, data.ticketId, data.clientDoc]
            );
            const saleId = saleResult[0][0].sale_id;

            for (const detalle of data.detalles) {
                const [prodResult]: any = await connection.query("CALL sp_buscar_producto_por_nombre(?)", [detalle.nombre]);
                if (!prodResult[0] || prodResult[0].length === 0) throw new Error(`El producto "${detalle.nombre}" no existe.`);
                const productId = prodResult[0][0].id;

                await connection.query("CALL sp_registrar_venta_detalle(?, ?, ?, ?)", [saleId, productId, detalle.cantidad, detalle.valorTotal]);

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
        return { success: true, message: "Excel procesado: Ventas ingresadas correctamente con precios exactos." };

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