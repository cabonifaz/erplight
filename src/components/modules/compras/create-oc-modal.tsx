"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Loader2,
  Save,
  Printer,
  Edit,
  Building2,
  Wallet,
  Plus,
  Trash2,
  MapPin,
  Wrench,
  Search,
  ArrowRightLeft,
} from "lucide-react";
import { toast } from "sonner";
import {
  createPurchaseOrderAction,
  updatePurchaseOrderAction,
  searchProvidersAction,
} from "@/actions/purchase-actions";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
// --- LISTA DE DETRACCIONES ---
const TIPOS_DETRACCION = [
  { codigo: "037", label: "Demás servicios gravados con el IGV", tasa: 12 },
  {
    codigo: "022",
    label: "Otros Servicios Empresariales (Jurídico, Contable, Publicidad)",
    tasa: 12,
  },
  {
    codigo: "020",
    label: "Mantenimiento y reparación de bienes muebles",
    tasa: 12,
  },
  { codigo: "012", label: "Intermediación laboral y tercerización", tasa: 12 },
  { codigo: "027", label: "Transporte de carga", tasa: 4 },
  { codigo: "009", label: "Contratos de Construcción", tasa: 4 },
  { codigo: "025", label: "Fabricación de bienes por encargo", tasa: 10 },
  { codigo: "019", label: "Arrendamiento de bienes", tasa: 10 },
  { codigo: "001", label: "Azúcar y melaza de caña", tasa: 10 },
  { codigo: "004", label: "Recursos Hidrobiológicos", tasa: 4 },
  { codigo: "013", label: "Arena y piedra", tasa: 10 },
  { codigo: "010", label: "Residuos y subproductos", tasa: 15 },
];

export function CreateOCModal({
  request,
  existingOrder,
  onSuccess,
}: {
  request: any;
  existingOrder?: any;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [providerSearch, setProviderSearch] = useState("");
  const [providersFound, setProvidersFound] = useState<any[]>([]);
  const [isSearchingProvider, setIsSearchingProvider] = useState(false);
  const [showProviderResults, setShowProviderResults] = useState(false);

  const isEditing = !!existingOrder;

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    trigger,
    formState: { errors },
  } = useForm({
    defaultValues: {
      codigo_oc: "---",
      fecha_emision: new Date().toISOString().split("T")[0],
      estado: "BORRADOR",
      comprador_razon: "",
      comprador_ruc: "",
      comprador_direccion: "",
      solicitante: "",
      proveedor_id: "",
      proveedor_ruc: "",
      proveedor_razon: "",
      proveedor_direccion: "",
      proveedor_contacto: "",
      fecha_entrega: "",
      lugar_entrega: "",
      condiciones_venta: "",
      garantias: "",
      incluye_instalacion: false,
      incoterm: "",
      moneda: "PEN",
      tipo_cambio: 3.8,
      forma_pago: "",
      incluye_igv: false,
      descuento_global: 0,
      tiene_detraccion: false,
      tipo_detraccion: "",
      porcentaje_detraccion: 0,
      numero_cuenta_operacion: "",
      items: [
        {
          codigo: "",
          descripcion: "",
          unidad: "UND",
          cantidad: 1,
          precio_unitario: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const handleSearchProvider = async (term: string) => {
    setProviderSearch(term);
    if (term.length < 3) {
      setProvidersFound([]);
      setShowProviderResults(false);
      return;
    }

    setIsSearchingProvider(true);
    try {
      const results = await searchProvidersAction(term);
      setProvidersFound(results || []);
      setShowProviderResults(true);
    } catch (error) {
      console.error("Error buscando:", error);
    } finally {
      setIsSearchingProvider(false);
    }
  };

  const selectProvider = (provider: any) => {
    setValue("proveedor_id", provider.id);
    setValue("proveedor_ruc", provider.ruc);
    setValue("proveedor_razon", provider.razon_social);
    setValue("proveedor_direccion", provider.direccion || "");
    setValue("proveedor_contacto", provider.contacto || "");
    if (provider.cuenta_bn)
      setValue("numero_cuenta_operacion", provider.cuenta_bn);

    setProviderSearch("");
    setShowProviderResults(false);
    toast.success("Proveedor seleccionado");
  };

  useEffect(() => {
    if (open) {
      if (isEditing && existingOrder) {
        console.log("OBJETO QUE LLEGA DE LA DB:", existingOrder);
       reset({
          ...existingOrder,
          // RE-MAPEAMOS CAMPOS CRÍTICOS
          comprador_ruc: existingOrder.comprador_ruc || "",
          comprador_razon: existingOrder.comprador_razon || "",
          comprador_direccion: existingOrder.comprador_direccion || "",
          solicitante: existingOrder.solicitante || "",

          fecha_emision: existingOrder.fecha_emision
            ? new Date(existingOrder.fecha_emision).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          
          items: existingOrder.items?.map((i: any) => ({
            codigo: i.codigo || "", // <--- Aquí es donde se carga el código
            descripcion: i.descripcion || "",
            unidad: i.unidad || "UND",
            cantidad: Number(i.cantidad),
            precio_unitario: Number(i.precio_unitario),
          })) || [],
        });
      } else {
        reset({
          codigo_oc: "AUTOGENERADO",
          fecha_emision: new Date().toISOString().split("T")[0],
          comprador_razon: "", // Vacío para el trabajador
          comprador_ruc: "", // Vacío para el trabajador

          // --- CAMBIO AQUÍ: Autocompletado de Sede ---
          solicitante: request.requester_name || "",
          comprador_direccion: request.branch_name || "",
          lugar_entrega: request.branch_name || "",

          moneda: request.currency || "PEN",
          // ... resto de campos
        });
      }
    }
  }, [open, isEditing, existingOrder, request, reset]);

  const itemsValues = watch("items");
  const descuento = watch("descuento_global") || 0;
  const incluyeIgv = watch("incluye_igv");
  const tieneDetraccion = watch("tiene_detraccion");
  const tipoDetraccionWatch = watch("tipo_detraccion");
  const porcDetraccion = watch("porcentaje_detraccion");
  const moneda = watch("moneda");
  const tipoCambio = watch("tipo_cambio") || 1;

  useEffect(() => {
    const tipo = TIPOS_DETRACCION.find((t) => t.codigo === tipoDetraccionWatch);
    if (tipo) setValue("porcentaje_detraccion", tipo.tasa);
  }, [tipoDetraccionWatch, setValue]);

  // Agregamos (itemsValues || []) entre paréntesis
  const subtotalBruto = (itemsValues || []).reduce(
    (acc, item) => acc + (item.cantidad || 0) * (item.precio_unitario || 0),
    0,
  );
  const subtotalBase = subtotalBruto - descuento;
  let totalNeto = incluyeIgv ? subtotalBase : subtotalBase * 1.18;
  const totalEnSoles = moneda === "PEN" ? totalNeto : totalNeto * tipoCambio;
  const superaMinimoDetraccion = totalEnSoles > 700;

  const baseImponible = incluyeIgv ? subtotalBase / 1.18 : subtotalBase;
  const montoIgv = totalNeto - baseImponible;
  const montoDetraccionSoles =
    superaMinimoDetraccion && tieneDetraccion
      ? totalEnSoles * (porcDetraccion / 100)
      : 0;
  const saldoPagarSoles = totalEnSoles - montoDetraccionSoles;

  const onSubmit = async (data: any) => {
    if (!confirm("¿Generar Orden de Compra?")) return;
    setLoading(true);
    const payload = {
      requestId: request.id,
      ordenId: existingOrder?.id,
      ...data,
      subtotal: baseImponible,
      impuestos: montoIgv,
      total: totalNeto,
      monto_detraccion: montoDetraccionSoles,
      tipo_cambio: tipoCambio,
      total_soles_referencial: totalEnSoles,
    };
    const res = isEditing
      ? await updatePurchaseOrderAction(payload)
      : await createPurchaseOrderAction(payload);
    setLoading(false);
    if (res.success) {
      toast.success(res.message);
      setOpen(false);
      onSuccess();
    } else {
      toast.error(res.message);
    }
  };

  const handleDownloadPDF = (e: React.MouseEvent) => {
    e.preventDefault();
    const data = watch();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // --- 1. ENCABEZADO ESTILO CLASSIC ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(data.comprador_razon || "NOMBRE DE LA COMPAÑÍA", 14, 20);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text("Eslogan de su compañía", 14, 24);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      [
        data.comprador_direccion || "Dirección de la empresa",
        "Teléfono: 123.456.7890  Fax: 123.456.7891",
      ],
      14,
      30,
    );

    // Título Grande Derecha
    doc.setFontSize(24);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "bold");
    doc.text("ORDEN DE", pageWidth - 14, 22, { align: "right" });
    doc.text("COMPRA", pageWidth - 14, 30, { align: "right" });

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(
      `NÚMERO DE O/C: ${existingOrder ? existingOrder.id : "100"}`,
      14,
      50,
    );

    // --- 2. SECCIÓN DE DIRECCIONES (Dos columnas) ---
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Para:", 14, 60);
    doc.text("Enviar a:", 110, 60);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    // Columna Proveedor (Para)
    doc.text(
      [
        data.proveedor_razon || "Nombre del Proveedor",
        `RUC: ${data.proveedor_ruc || ""}`,
        data.proveedor_direccion || "Dirección del proveedor",
        `Teléfono: ${data.proveedor_contacto || ""}`,
      ],
      14,
      65,
    );

    // Columna Envío (Enviar a)
    doc.text(
      [
        data.solicitante || "Nombre del Solicitante",
        data.comprador_razon || "Nombre de la Compañía",
        data.lugar_entrega || "Dirección de entrega",
        "Teléfono: 123.456.7890",
      ],
      110,
      65,
    );

    // --- 3. TABLA DE LOGÍSTICA (Barra horizontal) ---
    autoTable(doc, {
      startY: 85,
      head: [
        [
          "FECHA DE O/C",
          "SOLICITANTE",
          "ENVIADO MEDIANTE",
          "PUNTO F.O.B.",
          "TÉRMINOS Y CONDICIONES",
        ],
      ],
      body: [
        [
          data.fecha_emision,
          data.solicitante.split(" ")[0], // Solo primer nombre para que quepa
          "TERRESTRE",
          "PLANTA",
          data.forma_pago || "Vencidos luego de la recepción",
        ],
      ],
      theme: "grid",
      styles: { fontSize: 7, halign: "center", textColor: [0, 0, 0] },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
    });

    // --- 4. TABLA PRINCIPAL DE ITEMS ---
    const tableData = data.items.map((item: any) => [
      item.cantidad,
      "---", // Peso por (Placeholder del formato)
      item.descripcion,
      Number(item.precio_unitario).toFixed(2),
      (item.cantidad * item.precio_unitario).toFixed(2),
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 5,
      head: [
        ["CANTIDAD", "PESO POR", "DESCRIPCIÓN", "PRECIO UNITARIO", "TOTAL"],
      ],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { halign: "center", cellWidth: 25 },
        1: { halign: "center", cellWidth: 25 },
        3: { halign: "right", cellWidth: 35 },
        4: { halign: "right", cellWidth: 30 },
      },
    });

    // --- 5. TOTALES ---
    const finalY = (doc as any).lastAutoTable.finalY + 5;
    const footerWidth = 65;
    const footerX = pageWidth - 14 - footerWidth;

    const rowH = 6;
    doc.setFontSize(9);

    const totals = [
      ["SUBTOTAL", subtotalBase.toFixed(2)],
      ["TASA DE IMPUESTO", "18.00%"],
      ["IGV", montoIgv.toFixed(2)],
      ["ENVÍO Y GESTIÓN", "0.00"],
      [
        "TOTAL",
        `${data.moneda === "PEN" ? "S/" : "$"} ${totalNeto.toFixed(2)}`,
      ],
    ];

    totals.forEach((row, i) => {
      doc.rect(footerX, finalY + i * rowH, 35, rowH); // Etiqueta
      doc.rect(footerX + 35, finalY + i * rowH, 30, rowH); // Valor
      doc.setFont("helvetica", i === 4 ? "bold" : "normal");
      doc.text(row[0], footerX + 2, finalY + i * rowH + 4);
      doc.text(row[1], pageWidth - 16, finalY + i * rowH + 4, {
        align: "right",
      });
    });

    // --- 6. NOTAS Y AUTORIZACIÓN ---
    const notesY = finalY + 10;
    doc.setFontSize(7);
    doc.text(
      [
        "1. Envíe dos copias de su factura.",
        "2. Ingrese este pedido de acuerdo con los precios, condiciones y especificaciones mencionados.",
        "3. Notifíquenos inmediatamente si no puede enviarlo como se especificó.",
      ],
      14,
      notesY,
    );

    // Cuadro de Autorización
    const authY = notesY + 20;
    doc.rect(100, authY, 96, 25);
    doc.setFont("helvetica", "bold");
    doc.text("AUTORIZACIÓN", 102, authY + 5);
    doc.line(100, authY + 18, 196, authY + 18);
    doc.setFont("helvetica", "normal");
    doc.text("Autorizado por", 102, authY + 22);
    doc.text("Fecha", 160, authY + 22);

    doc.save(`OC_${existingOrder ? existingOrder.id : "Nueva"}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditing ? (
          <Button
            variant="outline"
            className="h-9 text-sm border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            <Edit className="w-4 h-4 mr-2" /> Editar
          </Button>
        ) : (
          <Button className="bg-[#2a4365] hover:bg-[#1e3048] text-white shadow-md">
            <Plus className="w-4 h-4 mr-2" /> Nueva Orden
          </Button>
        )}
      </DialogTrigger>

      {/* CORRECCIÓN 1: Fondo 100% sólido (bg-gray-50) en lugar de transparente */}
      <DialogContent className="sm:max-w-5xl w-full max-h-[95vh] overflow-y-auto p-0 gap-0 bg-gray-50">
        <div className="bg-white p-6 border-b shadow-sm">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="flex items-center gap-3 text-xl font-bold text-gray-800">
              <div className="bg-blue-50 p-2 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex flex-col">
                <span>
                  {isEditing
                    ? `Editar Orden #${existingOrder.id}`
                    : "Nueva Orden de Compra"}
                </span>
                <span className="text-xs font-normal text-gray-500">
                  Documento de logística y compras
                </span>
              </div>
            </DialogTitle>
            <div className="flex gap-3 items-center">
              <div className="flex flex-col items-end mr-2">
                <Label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                  Fecha Emisión
                </Label>
                <Input
                  type="date"
                  className="h-8 w-36 text-xs bg-white"
                  {...register("fecha_emision", { required: true })}
                />
              </div>
              {isEditing && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleDownloadPDF}
                  className="h-8 bg-green-500 hover:bg-green-600 text-white border-0 shadow-lg"
                >
                  <Printer className="w-3 h-3 mr-2" /> PDF
                </Button>
              )}
            </div>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* SECCIÓN 1: DATOS DE LAS EMPRESAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-visible">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                <div className="flex items-center gap-2 text-gray-700">
                  <Building2 className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    Datos del Proveedor
                  </h4>
                </div>
                <div className="relative w-56">
                  <div className="absolute left-2 top-1.5 text-gray-400">
                    <Search className="w-3 h-3" />
                  </div>
                  <Input
                    placeholder="Buscar RUC o Nombre..."
                    className="h-7 text-xs pl-7 bg-gray-50 border-gray-200 focus:bg-white transition-all"
                    value={providerSearch}
                    onChange={(e) => handleSearchProvider(e.target.value)}
                    onFocus={() =>
                      providerSearch.length >= 3 && setShowProviderResults(true)
                    }
                    onBlur={() =>
                      setTimeout(() => setShowProviderResults(false), 200)
                    }
                  />
                  {isSearchingProvider && (
                    <Loader2 className="w-3 h-3 absolute right-2 top-2 animate-spin text-blue-500" />
                  )}
                  {showProviderResults && providersFound.length > 0 && (
                    <div className="absolute top-8 right-0 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                      {providersFound.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => selectProvider(p)}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-50 text-xs"
                        >
                          <div className="font-bold text-gray-800">
                            {p.razon_social}
                          </div>
                          <div className="text-gray-500 text-[10px]">
                            {p.ruc}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <Label className="text-[10px] font-bold text-gray-700">
                      RUC *
                    </Label>
                    <Input
                      className={cn(
                        "bg-white h-9",
                        errors.proveedor_ruc && "border-red-500 bg-red-50",
                      )}
                      {...register("proveedor_ruc", {
                        required: "RUC obligatorio",
                      })}
                      placeholder="Ej: 20..."
                    />
                    {errors.proveedor_ruc && (
                      <span className="text-[10px] text-red-500 font-medium">
                        {String(errors.proveedor_ruc.message)}
                      </span>
                    )}
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[10px] font-bold text-gray-700">
                      Razón Social *
                    </Label>
                    <Input
                      className={cn(
                        "bg-white h-9",
                        errors.proveedor_razon && "border-red-500 bg-red-50",
                      )}
                      {...register("proveedor_razon", {
                        required: "Obligatorio",
                      })}
                    />
                    {errors.proveedor_razon && (
                      <span className="text-[10px] text-red-500 font-medium">
                        {String(errors.proveedor_razon.message)}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-gray-700">
                    Dirección
                  </Label>
                  <Input
                    className="bg-white h-9"
                    {...register("proveedor_direccion")}
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-gray-700">
                    Contacto / Teléfono
                  </Label>
                  <Input
                    className="bg-white h-9"
                    {...register("proveedor_contacto")}
                    placeholder="Ej: Juan Perez..."
                  />
                </div>
              </div>
            </div>

            {/* CORRECCIÓN 2: bg-blue-50 en lugar de bg-blue-50/30 */}
            <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 shadow-sm">
              <div className="flex items-center gap-2 border-b border-blue-100 pb-3 mb-3 text-blue-700">
                <Building2 className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  Facturar A (Mis Datos)
                </h4>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <Label className="text-[10px] font-bold text-gray-600">
                      Mi RUC
                    </Label>
                    <Input
                      className="bg-white h-9 text-xs border-gray-200 text-gray-600 font-medium"
                      {...register("comprador_ruc")}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[10px] font-bold text-gray-600">
                      Mi Razón Social
                    </Label>
                    <Input
                      className="bg-white h-9 text-xs border-gray-200 text-gray-600 font-medium"
                      {...register("comprador_razon")}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-gray-600">
                    Solicitante / Área
                  </Label>
                  <Input
                    className="bg-white h-9"
                    {...register("solicitante")}
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-gray-600">
                    Dirección Comercial (Sucursal)
                  </Label>
                  <Input
                    className="bg-white h-9"
                    {...register("comprador_direccion")}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: LOGÍSTICA & FINANZAS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Logística */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-2 text-gray-700">
                <MapPin className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase">Logística</h4>
              </div>
              <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-gray-200">
                <div>
                  <Label className="text-[10px] font-bold text-gray-700 block mb-1">
                    Fecha Entrega *
                  </Label>
                  <Input
                    type="date"
                    className={cn(
                      "h-9",
                      errors.fecha_entrega && "border-red-500",
                    )}
                    {...register("fecha_entrega", { required: true })}
                  />
                  {errors.fecha_entrega && (
                    <span className="text-[10px] text-red-500 font-medium">
                      Requerido
                    </span>
                  )}
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-gray-700 block mb-1">
                    Lugar de Entrega *
                  </Label>
                  <Input
                    className={cn(
                      "h-9",
                      errors.lugar_entrega && "border-red-500",
                    )}
                    {...register("lugar_entrega", { required: true })}
                  />
                  {errors.lugar_entrega && (
                    <span className="text-[10px] text-red-500 font-medium">
                      Requerido
                    </span>
                  )}
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[10px] font-bold text-gray-700 block mb-1">
                      Condiciones
                    </Label>
                    <Input
                      className="h-9"
                      {...register("condiciones_venta")}
                      placeholder="Ej: 50% adelanto..."
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold text-gray-700 block mb-1">
                      Garantías
                    </Label>
                    <Input className="h-9" {...register("garantias")} />
                  </div>
                </div>

                <div className="col-span-2 space-y-3 mt-1">
                  <div>
                    <Label className="text-[10px] font-bold text-gray-700 block mb-1">
                      Incoterm / Detalles de Entrega
                    </Label>
                    <Textarea
                      className="min-h-[80px] text-xs resize-y border-gray-200 focus-visible:ring-blue-500"
                      placeholder="Escriba aquí los detalles del incoterm o condiciones especiales de entrega..."
                      {...register("incoterm")}
                    />
                  </div>
                  {/* CORRECCIÓN 3: bg-gray-50 en lugar de bg-gray-50/50 */}
                  <div className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-200 w-full transition-colors hover:bg-gray-100">
                    <Checkbox
                      id="install"
                      checked={watch("incluye_instalacion")}
                      onCheckedChange={(c) =>
                        setValue("incluye_instalacion", c === true)
                      }
                    />
                    <Label
                      htmlFor="install"
                      className="text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Wrench className="w-3 h-3 text-gray-500" /> Instalación
                      Incluida
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Finanzas */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-700">
                <Wallet className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase">Finanzas</h4>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] font-bold text-gray-700 mb-1 block">
                      Moneda
                    </Label>
                    <Select
                      onValueChange={(v) => setValue("moneda", v)}
                      defaultValue={moneda}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PEN">S/ Soles</SelectItem>
                        <SelectItem value="USD">$ Dólares</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {moneda === "USD" && (
                    <div className="animate-in fade-in zoom-in duration-200">
                      <Label className="text-[10px] font-bold text-blue-600 mb-1 block">
                        T. Cambio
                      </Label>
                      <div className="relative">
                        <span className="absolute left-2 top-2.5 text-xs text-gray-500 font-bold">
                          S/
                        </span>
                        <Input
                          type="number"
                          step="0.001"
                          className="h-9 bg-white pl-6"
                          {...register("tipo_cambio", { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-gray-700 mb-1 block">
                    Forma de Pago *
                  </Label>
                  <Input
                    className={cn(
                      "h-9 text-xs",
                      errors.forma_pago && "border-red-500",
                    )}
                    {...register("forma_pago", { required: true })}
                  />
                </div>

                {/* DETRACCIÓN SPOT */}
                <div className="border-t border-gray-100 pt-2 mt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Checkbox
                      id="detrac"
                      checked={tieneDetraccion}
                      onCheckedChange={(c) => {
                        if (c === true && !superaMinimoDetraccion)
                          toast.error("Monto bajo");
                        setValue("tiene_detraccion", c === true);
                      }}
                    />
                    <Label
                      htmlFor="detrac"
                      className={cn(
                        "text-xs font-bold cursor-pointer",
                        !superaMinimoDetraccion
                          ? "text-gray-400"
                          : "text-blue-600",
                      )}
                    >
                      Aplica Detracción
                    </Label>
                  </div>
                  {tieneDetraccion && (
                    // CORRECCIÓN 4: bg-blue-50 en lugar de bg-blue-50/50
                    <div className="space-y-3 bg-blue-50 p-3 rounded-lg border border-blue-100 animate-in fade-in zoom-in-95">
                      <Select
                        onValueChange={(v) => setValue("tipo_detraccion", v)}
                        defaultValue={watch("tipo_detraccion")}
                      >
                        <SelectTrigger className="h-9 w-full text-xs bg-white border-blue-200">
                          <span className="truncate">
                            {TIPOS_DETRACCION.find(
                              (t) => t.codigo === watch("tipo_detraccion"),
                            )?.label || "Seleccione..."}
                          </span>
                        </SelectTrigger>
                        <SelectContent className="max-h-48 overflow-y-auto">
                          {TIPOS_DETRACCION.map((t) => (
                            <SelectItem
                              key={t.codigo}
                              value={t.codigo}
                              textValue={t.label}
                              className="text-xs border-b border-gray-50"
                            >
                              <span className="font-bold text-blue-600">
                                {t.codigo}
                              </span>{" "}
                              {t.label}{" "}
                              <span className="font-bold ml-1 text-gray-500">
                                ({t.tasa}%)
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <Label className="text-[9px] text-gray-500 font-bold mb-1 block uppercase">
                            N° Cta. BN
                          </Label>
                          <Input
                            className="h-8 text-xs bg-white"
                            placeholder="00-000..."
                            {...register("numero_cuenta_operacion", {
                              required: true,
                            })}
                          />
                        </div>
                        <div>
                          <Label className="text-[9px] text-gray-500 font-bold mb-1 block uppercase">
                            % Tasa
                          </Label>
                          <Input
                            className="h-8 text-xs bg-gray-100 text-center font-bold"
                            readOnly
                            {...register("porcentaje_detraccion")}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ITEMS TABLE */}
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-[#1e293b] text-white px-4 py-3 flex justify-between items-center text-xs font-bold uppercase tracking-wider">
              <span>Detalle de Bienes / Servicios</span>
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  append({
                    codigo: "",
                    descripcion: "",
                    unidad: "UND",
                    cantidad: 1,
                    precio_unitario: 0,
                  })
                }
                className="h-7 bg-gray-700 hover:bg-gray-600 text-xs text-white"
              >
                <Plus className="w-3 h-3 mr-1" /> Agregar Item
              </Button>
            </div>
            <div className="overflow-x-auto bg-white">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
                  <tr>
                    <th className="p-3 w-24 uppercase">Código</th>
                    <th className="p-3 uppercase">Descripción *</th>
                    <th className="p-3 w-20 text-center uppercase">U.M.</th>
                    <th className="p-3 w-20 text-center uppercase">Cant.</th>
                    <th className="p-3 w-28 text-center uppercase">P. Unit.</th>
                    <th className="p-3 w-28 text-right uppercase">Total</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {fields.map((item, index) => (
                    <tr
                      key={item.id}
                      className="hover:bg-blue-50 transition-colors"
                    >
                      <td className="p-2">
                        <Input
                          className="h-8 text-xs"
                          {...register(`items.${index}.codigo`)}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          className={cn(
                            "h-8 text-xs w-full",
                            errors.items?.[index]?.descripcion &&
                              "border-red-500",
                          )}
                          {...register(`items.${index}.descripcion`, {
                            required: true,
                          })}
                        />
                      </td>
                      <td className="p-2">
                        <Select
                          // CAMBIO: Usamos 'value' en lugar de 'defaultValue' para que reaccione al reset
                          value={watch(`items.${index}.unidad`)}
                          onValueChange={(v) =>
                            setValue(`items.${index}.unidad`, v)
                          }
                        >
                          <SelectTrigger className="h-8 text-xs px-2">
                            <SelectValue placeholder="U.M." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UND">UND</SelectItem>
                            <SelectItem value="KGM">KG</SelectItem>
                            <SelectItem value="SERV">SERV</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          className="h-8 text-xs text-center"
                          {...register(`items.${index}.cantidad`, {
                            valueAsNumber: true,
                            min: 1,
                          })}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          step="0.01"
                          className="h-8 text-xs text-center"
                          {...register(`items.${index}.precio_unitario`, {
                            valueAsNumber: true,
                            min: 0,
                          })}
                        />
                      </td>
                      <td className="p-2 text-right font-medium text-xs align-middle">
                        {(
                          (watch(`items.${index}.cantidad`) || 0) *
                          (watch(`items.${index}.precio_unitario`) || 0)
                        ).toFixed(2)}
                      </td>
                      <td className="p-2 text-center align-middle">
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* TOTALES */}
          <div className="flex justify-end pt-2">
            <div className="w-full md:w-5/12 bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="inc_igv"
                    checked={incluyeIgv}
                    onCheckedChange={(c) => setValue("incluye_igv", c === true)}
                  />
                  <Label
                    htmlFor="inc_igv"
                    className="text-xs cursor-pointer font-bold text-gray-700"
                  >
                    Precios incluyen IGV
                  </Label>
                </div>
              </div>

              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal:</span>
                <span className="font-medium">{subtotalBruto.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Descuento (-):</span>
                <Input
                  type="number"
                  min={0}
                  className="w-24 h-7 text-right text-xs bg-gray-50"
                  {...register("descuento_global", {
                    valueAsNumber: true,
                    min: 0,
                  })}
                />
              </div>
              <div className="flex justify-between text-sm font-medium text-gray-800 border-t border-dashed border-gray-200 pt-2">
                <span>Base Imponible:</span>
                <span>{baseImponible.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>IGV (18%):</span>
                <span>{montoIgv.toFixed(2)}</span>
              </div>

              <div className="flex justify-between font-bold text-xl border-t border-gray-300 pt-3 mt-3 text-gray-900">
                <span>Total OC:</span>
                <span>
                  {moneda === "PEN" ? "S/" : "$"} {totalNeto.toFixed(2)}
                </span>
              </div>

              {moneda === "USD" && (
                <div className="flex justify-between items-center bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 text-blue-800 mt-2">
                  <span className="text-xs font-bold flex items-center gap-1">
                    <ArrowRightLeft className="w-3 h-3" /> Ref. Soles (T.C.{" "}
                    {tipoCambio}):
                  </span>
                  <span className="text-sm font-extrabold">
                    S/ {totalEnSoles.toFixed(2)}
                  </span>
                </div>
              )}

              {tieneDetraccion && (
                // CORRECCIÓN 5: bg-blue-50 en lugar de bg-blue-50/50
                <div className="p-3 rounded-lg border mt-3 bg-blue-50 border-blue-100 text-xs">
                  <div className="border-b border-blue-100 pb-2 mb-2">
                    <div className="flex justify-between text-blue-800 font-bold mb-1">
                      <span>Detracción ({porcDetraccion}%):</span>
                      <span className="text-red-500">
                        - S/ {montoDetraccionSoles.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between font-medium text-gray-700 items-center">
                    <span>A Pagar (Proveedor):</span>
                    <span className="text-lg text-blue-900 font-extrabold">
                      S/ {saldoPagarSoles.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full mt-5 bg-green-600 hover:bg-green-700 text-white font-bold h-12 text-base shadow-md transition-transform hover:scale-[1.02] rounded-lg"
              >
                {loading ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : (
                  <Save className="mr-2 w-5 h-5" />
                )}
                Emitir Orden de Compra
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
