import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const generatePurchaseOrderPDF = (data: any, orderId?: number) => {
    const doc = new jsPDF();
    const ocNumber = orderId ? orderId.toString().padStart(6, '0') : "BORRADOR";
    const symbol = data.moneda === 'USD' ? '$' : 'S/';

    // ==========================================
    // 1. CABECERA (LOGOS Y TÍTULOS)
    // ==========================================
    
    // Título Superior Derecho
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(150, 150, 150); // Gris claro como en la imagen
    doc.text("ORDEN DE", 196, 20, { align: "right" });
    doc.text("COMPRA", 196, 29, { align: "right" });

    // Datos de TU Empresa (Izquierda)
    doc.setTextColor(0, 0, 0); // Texto negro
    doc.setFontSize(16);
    doc.text(data.comprador_razon || "Nombre de la Compañía", 14, 20);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text("Tu socio tecnológico confiable", 14, 25); // Puedes cambiar este eslogan
    
    doc.setFont("helvetica", "normal");
    doc.text(data.comprador_direccion || "Dirección de Sede Principal", 14, 32);
    doc.text(`RUC: ${data.comprador_ruc || "20000000000"}`, 14, 37);
    doc.text("Teléfono: (01) 123-4567   Email: logistica@empresa.com", 14, 42); // Cambiar por tus datos

    // Texto introductorio
    doc.setFontSize(8);
    doc.text("El siguiente número debe figurar en toda la", 14, 52);
    doc.text("correspondencia, papeles de envío y facturas relacionadas:", 14, 56);

    // Número de OC
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`NÚMERO DE O/C: ${ocNumber}`, 14, 64);

    // ==========================================
    // 2. BLOQUES "PARA" Y "ENVIAR A"
    // ==========================================
    
    // Títulos
    doc.setFontSize(11);
    doc.text("Para:", 14, 76);
    doc.text("Enviar a:", 105, 76);

    // Contenido
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    
    // Proveedor
    doc.text(`Proveedor: ${data.proveedor_razon || '-'}`, 14, 82);
    doc.text(`RUC: ${data.proveedor_ruc || '-'}`, 14, 87);
    doc.text(`Dirección: ${data.proveedor_direccion || '-'}`, 14, 92);
    doc.text(`Contacto: ${data.proveedor_contacto || '-'}`, 14, 97);

    // Nosotros (Comprador)
    doc.text(data.comprador_razon || "Empresa Principal", 105, 82);
    doc.text(`Dirección: ${data.comprador_direccion || '-'}`, 105, 87);
    doc.text(`Lugar de Entrega: ${data.lugar_entrega || 'Sede Principal'}`, 105, 92);

    // ==========================================
    // 3. TABLA DE CONDICIONES (META DATOS)
    // ==========================================
    
    autoTable(doc, {
        startY: 105,
        theme: 'grid', // Bordeado tipo Excel
        headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', halign: 'center', fontSize: 8, lineColor: 0, lineWidth: 0.1 },
        bodyStyles: { halign: 'center', fontSize: 8, textColor: 0, lineColor: 0, lineWidth: 0.1 },
        head: [['FECHA DE O/C', 'SOLICITANTE', 'MONEDA', 'TÉRMINOS Y CONDICIONES']],
        body: [[
            data.fecha_emision || '-',
            data.solicitante || '-',
            data.moneda === 'USD' ? 'Dólares' : 'Soles',
            data.forma_pago || '-'
        ]]
    });

    let currentY = (doc as any).lastAutoTable.finalY + 10;

    // ==========================================
    // 4. TABLA PRINCIPAL DE PRODUCTOS
    // ==========================================
    
    const tableColumn = ["CANTIDAD", "U.M.", "DESCRIPCIÓN", "PRECIO UNIT.", "TOTAL"];
    const tableRows = data.items.map((item: any) => [
        item.cantidad || 0,
        item.unidad || "UND",
        item.descripcion || "-",
        `${symbol} ${Number(item.precio_unitario || 0).toFixed(2)}`,
        `${symbol} ${(Number(item.cantidad || 0) * Number(item.precio_unitario || 0)).toFixed(2)}`
    ]);

    autoTable(doc, {
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', halign: 'center', fontSize: 8, lineColor: 0, lineWidth: 0.1 },
        bodyStyles: { fontSize: 8, textColor: 0, lineColor: 0, lineWidth: 0.1, minCellHeight: 10 },
        columnStyles: {
            0: { cellWidth: 25, halign: 'center' },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 80 },
            3: { cellWidth: 30, halign: 'right' },
            4: { cellWidth: 30, halign: 'right' }
        },
        head: [tableColumn],
        body: tableRows,
    });

    currentY = (doc as any).lastAutoTable.finalY;

    // ==========================================
    // 5. CÁLCULO DE TOTALES (Estilo Formulario)
    // ==========================================
    
    const subtotalBruto = data.items.reduce((acc: number, item: any) => acc + ((item.cantidad || 0) * (item.precio_unitario || 0)), 0);
    const descuento = Number(data.descuento_global) || 0;
    const subtotal = subtotalBruto - descuento;
    
    let baseImponible = 0;
    let igv = 0;
    let total = 0;

    if (data.incluye_igv) {
        total = subtotal;
        baseImponible = total / 1.18;
        igv = total - baseImponible;
    } else {
        baseImponible = subtotal;
        igv = baseImponible * 0.18;
        total = baseImponible + igv;
    }

    // Dibujar bloque de totales a la derecha
    doc.setFontSize(8);
    const startX = 120;
    const valueX = 196;

    // Subtotal
    doc.text("SUBTOTAL", startX, currentY + 6);
    doc.rect(165, currentY + 2, 31, 6); // Cajita
    doc.text(`${symbol} ${baseImponible.toFixed(2)}`, valueX - 2, currentY + 6, { align: 'right' });

    // IGV
    doc.text("IGV (18%)", startX, currentY + 12);
    doc.rect(165, currentY + 8, 31, 6);
    doc.text(`${symbol} ${igv.toFixed(2)}`, valueX - 2, currentY + 12, { align: 'right' });

    // Detracción (Opcional si aplica)
    if (data.tiene_detraccion) {
        const montoDetraccion = total * ((data.porcentaje_detraccion || 0) / 100);
        doc.text(`DETRACCIÓN (${data.porcentaje_detraccion}%)`, startX, currentY + 18);
        doc.rect(165, currentY + 14, 31, 6);
        doc.text(`- ${symbol} ${montoDetraccion.toFixed(2)}`, valueX - 2, currentY + 18, { align: 'right' });
        currentY += 6;
    }

    // Total Final
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL", startX, currentY + 18);
    doc.rect(165, currentY + 14, 31, 6);
    doc.text(`${symbol} ${total.toFixed(2)}`, valueX - 2, currentY + 18, { align: 'right' });

    // ==========================================
    // 6. INSTRUCCIONES Y AUTORIZACIÓN
    // ==========================================
    
    // Instrucciones (Izquierda)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    let termY = (doc as any).lastAutoTable.finalY + 8;
    
    doc.text("INSTRUCCIONES:", 14, termY);
    doc.text("1. Envíe sus facturas electrónicas al correo de contabilidad.", 14, termY + 4);
    doc.text("2. Ingrese este pedido de acuerdo con los precios y condiciones.", 14, termY + 8);
    
    if (data.condiciones_venta) doc.text(`3. Condición Extra: ${data.condiciones_venta}`, 14, termY + 12);
    if (data.garantias) doc.text(`4. Garantía: ${data.garantias}`, 14, termY + 16);

    // Cuadro de Autorización (Derecha)
    const authY = (doc as any).lastAutoTable.finalY + 25;
    doc.rect(105, authY, 91, 20); // Caja grande
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("AUTORIZACIÓN", 107, authY + 4);
    
    // Línea de firma
    doc.setDrawColor(0);
    doc.setLineWidth(0.1);
    doc.line(105, authY + 16, 196, authY + 16);
    
    doc.setFont("helvetica", "normal");
    doc.text("Firma Autorizada", 115, authY + 19);
    doc.text("Fecha", 170, authY + 19);

    // 7. Descargar archivo
    const safeProviderName = (data.proveedor_razon || 'Proveedor').replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`OC-${ocNumber}-${safeProviderName}.pdf`);
};