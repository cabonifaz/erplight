'use server'

import { pool } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

// ✨ NUEVA FUNCIÓN RESCATISTA PARA ENTENDER FECHAS LATINAS (DD/MM/YYYY) ✨
function parseExcelDateHelper(fechaRaw: any): Date | null {
    if (!fechaRaw) return null;
    
    // 1. Si Excel lo pasa como número de serie puro
    if (typeof fechaRaw === 'number') {
        const dias = fechaRaw - 25569;
        return new Date((dias * 86400 * 1000) + (new Date().getTimezoneOffset() * 60000));
    }

    // 2. Si lo pasa como texto (ej: "26/05/2026" o "26-05-2026")
    let dateStr = String(fechaRaw).trim();
    let dateObj = new Date(dateStr);

    // Si JS dice "Invalid Date" (porque espera MM/DD/YYYY), lo forzamos a DD/MM/YYYY
    if (isNaN(dateObj.getTime())) {
        const partsSpace = dateStr.split(' ');
        const datePart = partsSpace[0];
        const timePart = partsSpace[1] || "00:00:00";
        
        const parts = datePart.split(/[\/\-]/); // Divide por "/" o "-"
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // JS cuenta los meses de 0 a 11
            let year = parseInt(parts[2], 10);
            if (year < 100) year += 2000; // Convierte "26" a "2026"

            dateObj = new Date(year, month, day);

            // Rescata la hora si es que venía
            const timeParts = timePart.split(':');
            if (timeParts.length >= 2 && !isNaN(dateObj.getTime())) {
                dateObj.setHours(parseInt(timeParts[0], 10));
                dateObj.setMinutes(parseInt(timeParts[1], 10));
                if (timeParts[2]) dateObj.setSeconds(parseInt(timeParts[2], 10));
            }
        }
    }

    return isNaN(dateObj.getTime()) ? null : dateObj;
}

// --- 1. FUNCIÓN DE VALIDACIÓN ---
// --- 1. FUNCIÓN DE VALIDACIÓN CORREGIDA ---
export async function validateExcelSales(payload: { data: any[], branchId: number }) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: "No autorizado", issues: [], canProceed: false };
    
    const ventasData = payload.data;
    const branchId = payload.branchId;

    const issues: { producto: string; mensaje: string; tipo: 'error' | 'warning' }[] = [];
    let canProceed = true;
    const connection = await pool.getConnection();

    try {
        // ... (Aquí se mantiene tu código intacto para validar fechas y duplicados) ...
        const fechasEnExcel = [...new Set(ventasData.map(fila => {
            const dateKey = Object.keys(fila).find(k => ['fecha', 'fecha de emisión', 'fecha de emision', 'fecha venta', 'date', 'f. emision'].some(word => k.toLowerCase().trim() === word.toLowerCase()));
            return parseExcelDateHelper(dateKey ? fila[dateKey] : null)?.toISOString().split('T')[0];
        }).filter(Boolean))];

        const ticketsEnExcel = [...new Set(ventasData.map(fila => fila['Serie y correlativo'] || fila['Serie y Correlativo']).filter(Boolean))];

        if (fechasEnExcel.length > 0) {
            const [cierreResult]: any = await connection.query("CALL sp_verificar_cierres_diarios(?, ?)", [branchId, JSON.stringify(fechasEnExcel)]);
            if (cierreResult[0] && cierreResult[0].length > 0) {
                issues.push({ producto: "🚫 DÍA CERRADO", mensaje: `El Excel contiene ventas de un día que ya tiene el CIERRE DIARIO ENVIADO.`, tipo: 'error' });
                return { success: true, issues, canProceed: false }; 
            }
        }

        if (ticketsEnExcel.length > 0) {
            const [spResult]: any = await connection.query("CALL sp_verificar_tickets_duplicados(?, ?)", [branchId, JSON.stringify(ticketsEnExcel)]);
            if (spResult[0] && spResult[0].length > 0) {
                issues.push({ producto: "⚠️ CORRECCIÓN", mensaje: `Se detectaron boletas existentes. Se reemplazarán con los datos de este Excel.`, tipo: 'warning' });
            }
        }

        // 1. AGRUPAR PLATILLOS
        const ventasAgrupadas = new Map();
        const productosTotalesReales: Record<string, number> = {};

        for (const fila of ventasData) {
            const ticketId = fila['Serie y correlativo'] || fila['Serie y Correlativo'] || 'SIN_TICKET_' + Math.random();
            const nombreProducto = fila['Producto / Descripción'] || fila['Producto'] || fila['producto'];
            const cantidad = Number(fila['Cantidad']) || 1;

            if (!ventasAgrupadas.has(ticketId)) ventasAgrupadas.set(ticketId, new Set()); 
            const productosEnEsteTicket = ventasAgrupadas.get(ticketId);

            if (nombreProducto && !productosEnEsteTicket.has(nombreProducto)) {
                productosTotalesReales[nombreProducto] = (productosTotalesReales[nombreProducto] || 0) + cantidad;
                productosEnEsteTicket.add(nombreProducto);
            }
        }

        // ✨ 2. LA MAGIA AQUÍ: ACUMULADORES GLOBALES DE INSUMOS ✨
        const insumosGlobalesNecesarios: Record<number, number> = {};
        const productosDirectosNecesarios: Record<number, number> = {};

        for (const [nombreItem, cantidadRequerida] of Object.entries(productosTotalesReales)) {
            const [itemResult]: any = await connection.query("CALL sp_buscar_item_venta(?)", [nombreItem]);
            const itemRow = itemResult[0]?.[0];

            if (!itemRow || itemRow.tipo === 'NONE') {
                issues.push({ producto: nombreItem, mensaje: "No existe en Menús ni en Insumos.", tipo: 'error' });
                canProceed = false;
                continue;
            }

            const itemId = itemRow.item_id;

            if (itemRow.tipo === 'MENU') {
                const [recetaResult]: any = await connection.query("CALL sp_obtener_receta_menu(?)", [itemId]);
                const recetaRows = recetaResult[0];

                if (!recetaRows || recetaRows.length === 0) {
                    issues.push({ producto: nombreItem, mensaje: "El menú no tiene receta configurada.", tipo: 'warning' });
                } else {
                    // SUMAMOS LOS INSUMOS A LA "BOLSA GIGANTE" EN LUGAR DE REVISARLOS AÚN
                    for (const ingrediente of recetaRows) {
                        const cantNecesaria = ingrediente.quantity * cantidadRequerida;
                        insumosGlobalesNecesarios[ingrediente.component_id] = (insumosGlobalesNecesarios[ingrediente.component_id] || 0) + cantNecesaria;
                    }
                }
            } else if (itemRow.tipo === 'PRODUCTO') {
                productosDirectosNecesarios[itemId] = (productosDirectosNecesarios[itemId] || 0) + cantidadRequerida;
            }
        }

        // ✨ 3. REVISIÓN FINAL GLOBAL DE INSUMOS CONTRA STOCK ✨
        for (const [componentId, totalNecesario] of Object.entries(insumosGlobalesNecesarios)) {
            const [stockResult]: any = await connection.query("CALL sp_obtener_stock_actual(?, ?)", [componentId, branchId]);
            const stockActual = stockResult[0]?.length > 0 ? Number(Object.values(stockResult[0][0])[0]) : 0;
            
            if (stockActual < totalNecesario) {
                issues.push({ 
                    producto: `Insumo ID: ${componentId}`, 
                    mensaje: `Stock GLOBAL insuficiente. Necesitas ${totalNecesario} para todo el Excel, pero solo tienes ${stockActual}.`, 
                    tipo: 'error' 
                });
                canProceed = false;
            }
        }

        for (const [productId, totalNecesario] of Object.entries(productosDirectosNecesarios)) {
            const [stockResult]: any = await connection.query("CALL sp_obtener_stock_actual(?, ?)", [productId, branchId]);
            const stockActual = stockResult[0]?.length > 0 ? Number(Object.values(stockResult[0][0])[0]) : 0;
            
            if (stockActual < totalNecesario) {
                issues.push({ 
                    producto: `Producto ID: ${productId}`, 
                    mensaje: `Stock GLOBAL insuficiente. Necesitas ${totalNecesario}, pero tienes ${stockActual}.`, 
                    tipo: 'error' 
                });
                canProceed = false;
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
        const nombresUnicos = new Set<string>(); 

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

            let fechaExcelFormateada = null;
            const fechaRaw = findValue(['fecha', 'fecha de emisión', 'fecha de emision', 'fecha venta', 'date', 'f. emision']);

            // Usamos nuestra función rescatista
            const parsedDate = parseExcelDateHelper(fechaRaw);

            if (parsedDate) {
                const yyyy = parsedDate.getFullYear();
                const mm = String(parsedDate.getMonth() + 1).padStart(2, '0');
                const dd = String(parsedDate.getDate()).padStart(2, '0');
                const hh = String(parsedDate.getHours()).padStart(2, '0');
                const min = String(parsedDate.getMinutes()).padStart(2, '0');
                const ss = String(parsedDate.getSeconds()).padStart(2, '0');
                fechaExcelFormateada = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`; 
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
                nombresUnicos.add(nombreProducto); 
                
                if (!productoYaExiste) {
                    grupo.detalles.push({ nombre: nombreProducto, cantidad: cantidad, valorTotal: valorFila });
                } else {
                    productoYaExiste.valorTotal += valorFila;
                }
                grupo.totalVenta += valorFila;
            }
        }

        await connection.beginTransaction();

        const catalogo = new Map();
        for (const nombre of Array.from(nombresUnicos)) {
            const [itemResult]: any = await connection.query("CALL sp_buscar_item_venta(?)", [nombre]);
            const itemRow = itemResult[0]?.[0];
            if (!itemRow || itemRow.tipo === 'NONE') throw new Error(`El ítem "${nombre}" no existe.`);
            catalogo.set(nombre, { id: itemRow.item_id, tipo: itemRow.tipo });
        }

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
                    tipo_item: itemDb.tipo, 
                    item_id: itemDb.id,
                    cantidad: detalle.cantidad,
                    precio_uni: detalle.valorTotal / detalle.cantidad,
                    subtotal: detalle.valorTotal
                });
            }
        }

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

export async function getReporteVentas(filtros: {
    branchId?: number | null;
    fechaInicio?: string | null;
    fechaFin?: string | null;
    metodoPago?: string | null;
}) {
    const session = await auth();
    if (!session?.user) return { success: false, message: "No autorizado", data: [] };

    const sessionUser = session.user as any;
    const role = sessionUser.role?.toUpperCase().trim() || "";
    const userId = sessionUser.id || sessionUser.sub || sessionUser.userId || sessionUser.id_usuario;

    const connection = await pool.getConnection();
    
    try {
        const bId = filtros.branchId || null;
        const fInicio = filtros.fechaInicio || null;
        const fFin = filtros.fechaFin || null;
        const mPago = filtros.metodoPago || null;

        const isGerente = role === 'GERENTE GENERAL' || role === 'CEO' || role === 'ADMINISTRADOR GENERAL';

        if (bId !== null || isGerente) {
            const [rows]: any = await connection.query("CALL sp_reporte_ventas(?, ?, ?, ?)", [bId, fInicio, fFin, mPago]);
            return { success: true, data: rows[0] || [] };
        } 
        else {
            const [sedesResult]: any = await connection.query("CALL sp_obtener_sedes_usuario(?)", [userId]);
            const sedesAsignadas = sedesResult[0];

            if (!sedesAsignadas || sedesAsignadas.length === 0) {
                return { success: true, data: [] }; 
            }

            let ventasCombinadas: any[] = [];
            
            for (const sede of sedesAsignadas) {
                const [rows]: any = await connection.query(
                    "CALL sp_reporte_ventas(?, ?, ?, ?)", 
                    [sede.branch_id, fInicio, fFin, mPago]
                );
                
                if (rows[0] && rows[0].length > 0) {
                    ventasCombinadas = [...ventasCombinadas, ...rows[0]];
                }
            }

            ventasCombinadas.sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());

            return { success: true, data: ventasCombinadas };
        }
    } catch (error: any) {
        console.error("Error obteniendo reporte:", error);
        return { success: false, message: error.message, data: [] };
    } finally {
        connection.release();
    }
}

export async function obtenerHistorialCargas() {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: "No autorizado", data: [] };

    const userId = session.user.id;
    const role = session.user.role?.toUpperCase() || "";

    const connection = await pool.getConnection();
    try {
        const [rows]: any = await connection.query("CALL sp_obtener_historial_cargas()");
        const todoElHistorial = rows[0] || [];

        const PRIVILEGED_ROLES = ["GERENTE GENERAL", "ADMINISTRADOR GENERAL", "LOGISTICA", "CEO"];
        
        if (PRIVILEGED_ROLES.includes(role)) {
            return { success: true, data: todoElHistorial };
        } 
        
        const [branchRowsResult]: any = await connection.query("CALL sp_obtener_nombres_sedes_usuario(?)", [userId]);
        const branchRows = branchRowsResult[0];
        
        if (branchRows && branchRows.length > 0) {
            const nombresPermitidos = branchRows.map((r: any) => String(r.name).trim().toLowerCase());

            const historialFiltrado = todoElHistorial.filter((log: any) => {
                const logSucursal = String(log.sucursal || "").trim().toLowerCase();
                return nombresPermitidos.includes(logSucursal);
            });

            return { success: true, data: historialFiltrado };
        }
        
        return { success: true, data: [] };

    } catch (error: any) {
        console.error("Error obteniendo historial filtrado:", error);
        return { success: false, message: error.message, data: [] };
    } finally {
        connection.release();
    }
}

export async function obtenerLimiteDiasReporte() {
    const connection = await pool.getConnection();
    try {
        const [rows]: any = await connection.query("CALL sp_obtener_configuracion_numerica('MAX_DIAS_REPORTE')");
        const limite = rows[0][0]?.valor || 31; 
        
        return { success: true, maxDias: limite };
    } catch (error: any) {
        console.error("Error obteniendo configuración:", error);
        return { success: false, maxDias: 31 };
    } finally {
        connection.release();
    }
}

export async function analizarInventarioCompras(branchId: number) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: "No autorizado", data: [] };

    const connection = await pool.getConnection();
    try {
        const [rows]: any = await connection.query("CALL sp_analizar_inventario_compras(?)", [branchId]);
        return { success: true, data: rows[0] || [] };
    } catch (error: any) {
        console.error("Error analizando inventario para compras:", error);
        return { success: false, message: error.message, data: [] };
    } finally {
        connection.release();
    }
}

export async function getMenuPOS(requestedBranchId?: number) {
    const session = await auth();
    if (!session?.user) return { success: false, data: [] };

    // @ts-ignore
    const userRole = session.user.role;
    // @ts-ignore
    const userBranchId = session.user.branch_id || 1; 

    let targetBranchId = userBranchId;
    if (userRole === 'GERENTE GENERAL' && requestedBranchId) {
        targetBranchId = requestedBranchId;
    }

    const connection = await pool.getConnection();
    try {
        const [rows]: any = await connection.query("CALL sp_obtener_menu_pos(?)", [targetBranchId]);
        const menuItems = rows[0] || [];
        return { success: true, data: menuItems, branch_id: targetBranchId };
    } catch (error) {
        console.error("Error obteniendo el menú POS:", error);
        return { success: false, data: [] };
    } finally {
        connection.release();
    }
}

export async function processSalePOS(branchId: number, total: number, cart: any[], clientDocument: string = "", paymentMethod: string = "EFECTIVO") {
    const session = await auth();
    if (!session?.user) return { success: false, message: "No autorizado" };

    // @ts-ignore
    const userId = session.user.id || 1;
    const cartJson = JSON.stringify(cart);

    const connection = await pool.getConnection();
    try {
        await connection.query("CALL sp_procesar_venta_pos(?, ?, ?, ?, ?, ?)", [branchId, userId, total, cartJson, clientDocument, paymentMethod]);
        return { success: true, message: "¡Venta procesada exitosamente! Stock actualizado." };
    } catch (error: any) {
        console.error("Error al procesar la venta POS:", error);
        return { success: false, message: `Error SQL: ${error.message}` };
    } finally {
        connection.release();
    }
}