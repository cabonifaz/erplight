import React from 'react';
import { 
  Search, Plus, CheckCircle2, FileText, Building2, Wallet, 
  UploadCloud, MapPin, ArrowRightLeft, Settings, ListFilter, Package 
} from 'lucide-react';

export type ManualKey = 'carga_diaria' | 'compras' | 'inventario' | 'rrhh' | 'reportes';

export const manualContent: Record<ManualKey, { title: string, content: React.ReactNode }> = {
  
  compras: {
    title: "Guía Rápida: Módulo de Compras",
    content: (
      <div className="pb-8 pt-2 px-2 text-left">
        
        <p className="text-sm text-gray-600 mb-12">
          Siga estos 3 pasos para gestionar los requerimientos, emitir órdenes de compra y registrar pagos en el sistema:
        </p>

        {/* --- PASO 1 --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-md bg-blue-900 text-white flex items-center justify-center font-bold shadow-sm">1</span>
              <h3 className="text-lg font-bold text-slate-800">Aprobar Requerimientos</h3>
            </div>
            <ul className="text-sm text-slate-600 space-y-3 pl-11 list-disc">
              <li>Use la barra de <b>Filtros Avanzados</b> superior para localizar solicitudes por código o sucursal.</li>
              <li>Revise el detalle de los productos y el monto estimado.</li>
              <li>Haga clic en el botón verde <span className="font-bold text-emerald-700">Aprobar</span> para autorizar el requerimiento de inmediato.</li>
            </ul>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner space-y-3">
             <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex gap-2 items-center shadow-sm">
                <div className="h-7 w-1/3 bg-slate-50 border border-slate-200 rounded px-2 flex items-center text-[10px] text-slate-400">Sucursal: Todas</div>
                <div className="h-7 flex-1 bg-slate-50 border border-slate-200 rounded px-2 flex items-center text-[10px] text-slate-400">Ej. REQ-000004</div>
                <div className="h-7 w-8 bg-blue-600 rounded flex items-center justify-center shrink-0"><Search className="w-3.5 h-3.5 text-white"/></div>
             </div>
             <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] text-slate-400 font-mono mb-0.5">REQ-000025</div>
                  <div className="text-sm font-bold text-slate-800">30 Inka Kolas 250ml</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-amber-100 text-amber-700 border border-amber-200 text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider">Pendiente</span>
                  <span className="bg-emerald-600 text-white text-[11px] px-2.5 py-1.5 rounded flex items-center gap-1 font-medium"><CheckCircle2 className="w-3.5 h-3.5"/> Aprobar</span>
                </div>
             </div>
          </div>
        </div>

        <hr className="border-slate-200 my-16" />

        {/* --- PASO 2 --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner order-2 md:order-1">
             <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <div className="bg-slate-900 p-3 flex justify-between items-center text-white">
                  <span className="text-[11px] font-bold flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-amber-400"/> Nueva Orden de Compra</span>
                </div>
                <div className="p-3 space-y-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-2"><Building2 className="w-3 h-3"/> Datos del Proveedor</span>
                    <div className="flex gap-2">
                      <div className="h-8 w-1/3 bg-white border border-slate-200 shadow-sm rounded px-2 flex items-center text-[10px] font-mono text-slate-400">20...</div>
                      <div className="h-8 flex-1 bg-white border border-slate-200 shadow-sm rounded px-2 flex items-center text-[10px] text-slate-400">Razón Social</div>
                    </div>
                  </div>
                  <div className="bg-slate-800 rounded flex justify-between items-center p-2 shadow-sm">
                    <span className="text-[10px] font-bold text-white tracking-wider">BIENES / SERVICIOS</span>
                    <span className="border border-slate-600 bg-slate-700 text-white text-[10px] px-2 py-1 rounded flex items-center gap-1"><Plus className="w-3 h-3"/> Agregar Item</span>
                  </div>
                </div>
             </div>
          </div>
          <div className="space-y-4 order-1 md:order-2">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-md bg-blue-900 text-white flex items-center justify-center font-bold shadow-sm">2</span>
              <h3 className="text-lg font-bold text-slate-800">Emitir Orden (OC)</h3>
            </div>
            <ul className="text-sm text-slate-600 space-y-3 pl-11 list-disc">
              <li>Ingrese a <i>"Ver Detalle"</i> en la solicitud aprobada y haga clic en <b>+ Nueva Orden</b>.</li>
              <li>Registre el RUC, Razón Social y defina las condiciones logísticas (Ej. Fecha de entrega).</li>
              <li>Agregue los ítems precisos con las cantidades y precios finales pactados.</li>
            </ul>
          </div>
        </div>

        <hr className="border-slate-200 my-16" />

        {/* --- PASO 3 --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-md bg-blue-900 text-white flex items-center justify-center font-bold shadow-sm">3</span>
              <h3 className="text-lg font-bold text-slate-800">Facturación y Pagos</h3>
            </div>
            <ul className="text-sm text-slate-600 space-y-3 pl-11 list-disc">
              <li>En el detalle de la orden de compra, haga clic en el botón blanco <b>Registrar Doc.</b></li>
              <li>Ingrese el número de la factura, el monto total y suba el archivo PDF/Imagen.</li>
              <li>Utilice la sección de <b>Vouchers</b> para adjuntar la captura de la transferencia (Yape, Plin o cuenta bancaria).</li>
            </ul>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
               <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                 <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">1</div>
                 <span className="text-xs font-bold text-blue-950">Documento de Compra</span>
               </div>
               <div className="p-4 space-y-4">
                 <div className="flex gap-3">
                   <div className="flex-1 space-y-1">
                     <span className="text-[9px] text-slate-400 font-bold tracking-wide">N° FACTURA</span>
                     <div className="h-8 bg-white border border-slate-200 rounded flex items-center px-2 text-[11px] font-mono text-slate-600 shadow-sm"># F001-00045</div>
                   </div>
                   <div className="flex-1 space-y-1">
                     <span className="text-[9px] text-slate-400 font-bold tracking-wide">MONTO (S/.)</span>
                     <div className="h-8 bg-white border border-slate-200 rounded flex items-center px-2 text-[11px] font-bold text-slate-800 shadow-sm">15,000.00</div>
                   </div>
                 </div>
                 <div className="border border-slate-200 rounded-md p-2.5 flex justify-between items-center bg-slate-50">
                   <span className="text-[11px] text-slate-600 font-bold flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5 text-slate-400"/> Vouchers</span>
                   <span className="text-[10px] text-blue-700 font-bold bg-blue-100 px-2 py-1 rounded shadow-sm">+ Agregar Pago</span>
                 </div>
               </div>
            </div>
          </div>
        </div>

      </div>
    )
  },

  inventario: {
    title: "Guía Rápida: Inventario Inteligente",
    content: (
      <div className="pb-8 pt-2 px-2 text-left">
        
        <p className="text-sm text-gray-600 mb-12">
          Monitoree sus existencias en tiempo real, registre ajustes manuales y configure recetas para el descuento automático en 3 pasos:
        </p>

        {/* --- PASO 1 --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-md bg-blue-900 text-white flex items-center justify-center font-bold shadow-sm">1</span>
              <h3 className="text-lg font-bold text-slate-800">Monitoreo y Existencias</h3>
            </div>
            <ul className="text-sm text-slate-600 space-y-3 pl-11 list-disc">
              <li>Use los <b>Filtros Avanzados</b> para buscar productos específicos, filtrar por sucursal o detectar stock crítico.</li>
              <li>Visualice el <b>Stock Actual</b>; el sistema pintará de verde el stock saludable, amarillo el punto de reorden y rojo cuando esté agotado.</li>
              <li>Utilice el botón blanco <b>Subir Excel</b> si desea realizar una carga masiva inicial o una actualización completa del almacén.</li>
            </ul>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner space-y-4">
             <div className="flex flex-col sm:flex-row gap-3 justify-between">
                <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm flex gap-2 flex-1 items-center">
                  <ListFilter className="w-4 h-4 text-blue-600 ml-1 shrink-0"/>
                  <div className="h-7 w-full bg-slate-50 border border-slate-200 rounded px-2 flex items-center text-[10px] text-slate-400">Buscar producto...</div>
                </div>
                <div className="flex gap-2">
                  <div className="bg-blue-600 text-white text-[11px] px-3 py-1.5 rounded-md flex items-center gap-1.5 font-bold shadow-sm cursor-pointer"><Plus className="w-3.5 h-3.5"/> Ajuste Manual</div>
                  <div className="bg-white border border-purple-200 text-purple-700 text-[11px] px-3 py-1.5 rounded-md flex items-center gap-1.5 font-bold shadow-sm cursor-pointer"><UploadCloud className="w-3.5 h-3.5"/> Subir Excel</div>
                </div>
             </div>
             <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 p-2.5 border-b border-slate-100 flex justify-between text-[9px] font-bold text-slate-400 tracking-wider">
                  <span>SUCURSAL / PRODUCTO</span>
                  <span className="pr-2">STOCK ACTUAL</span>
                </div>
                <div className="p-3 flex justify-between items-center">
                   <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">AJONJOLI</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3 text-slate-400"/> Almacén Central - Callao</div>
                   </div>
                   <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md font-mono text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                     <CheckCircle2 className="w-3.5 h-3.5 opacity-50"/> 5000.00 GR
                   </div>
                </div>
             </div>
          </div>
        </div>

        <hr className="border-slate-200 my-16" />

        {/* --- PASO 2 --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner order-2 md:order-1">
             <div className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-slate-600"/>
                    <span className="text-sm font-bold text-slate-800">Ajuste Manual de Stock</span>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-slate-700">Sucursal</div>
                      <div className="h-8 bg-white border border-slate-200 rounded-md flex items-center px-2 text-[11px] text-slate-600 shadow-sm">Sede Principal - Lima</div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-slate-700">Tipo Movimiento</div>
                      <div className="h-8 bg-blue-50 border border-blue-200 rounded-md flex items-center px-2 text-[11px] text-blue-700 font-bold shadow-sm">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600 mr-2 shadow-sm"></div> Ingreso / Carga
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-700">Producto</div>
                    <div className="h-8 bg-white border border-slate-200 rounded-md flex items-center px-2 text-[11px] text-slate-400 shadow-sm"><Search className="w-3 h-3 mr-1.5"/> Buscar por nombre o código...</div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-700">Motivo / Observación</div>
                    <div className="h-10 bg-white border border-slate-200 rounded-md p-2 text-[10px] text-slate-400 italic shadow-sm">Ej: Conteo cíclico, merma por rotura...</div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <div className="bg-blue-600 text-white text-[11px] px-4 py-2 rounded-md flex items-center font-bold shadow-sm">Registrar Ingreso</div>
                  </div>
                </div>
             </div>
          </div>
          <div className="space-y-4 order-1 md:order-2">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-md bg-blue-900 text-white flex items-center justify-center font-bold shadow-sm">2</span>
              <h3 className="text-lg font-bold text-slate-800">Ajustes Manuales</h3>
            </div>
            <ul className="text-sm text-slate-600 space-y-3 pl-11 list-disc">
              <li>Haga clic en el botón azul <b>+ Ajuste Manual</b> para corregir diferencias, registrar mermas o hacer ingresos rápidos.</li>
              <li>Seleccione con cuidado si el movimiento es un <b>Ingreso</b> (Suma al stock) o una <b>Salida / Merma</b> (Resta al stock).</li>
              <li>Indique la cantidad exacta y <b>siempre escriba un motivo</b> u observación para mantener un registro claro para auditorías futuras.</li>
            </ul>
          </div>
        </div>

        <hr className="border-slate-200 my-16" />

        {/* --- PASO 3 --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-md bg-blue-900 text-white flex items-center justify-center font-bold shadow-sm">3</span>
              <h3 className="text-lg font-bold text-slate-800">Recetas (BOM)</h3>
            </div>
            <ul className="text-sm text-slate-600 space-y-3 pl-11 list-disc">
              <li>Diríjase a la opción de <i>Configuración de Recetas (BOM)</i> para enlazar los insumos del almacén con los productos finales que usted vende.</li>
              <li>Seleccione el plato o combo a configurar.</li>
              <li>Agregue los ingredientes exactos (Ej. 120gr de Arroz, 1 Alga Nori). <b>Esto permitirá que el sistema descuente el almacén de forma automática</b> con cada venta.</li>
            </ul>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
            <div className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
               <div className="bg-slate-900 p-3.5 flex justify-between items-center text-white">
                  <span className="text-[11px] font-bold flex items-center gap-2"><Settings className="w-4 h-4 text-amber-400"/> Configuración de Recetas (BOM)</span>
               </div>
               <div className="p-4 space-y-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 shadow-sm">
                     <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Plato o Combo a Configurar</div>
                     <div className="text-xs font-bold text-blue-950 flex items-center gap-1.5"><Package className="w-3.5 h-3.5"/> COMBO CALIFORNIA MIX</div>
                  </div>
                  <div className="space-y-2">
                     <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-2">Ingredientes de la Receta</div>
                     <div className="flex justify-between items-center p-2.5 border border-slate-200 rounded-lg bg-white shadow-sm">
                        <span className="text-xs font-bold text-slate-700">ARROZ</span>
                        <span className="text-[10px] font-mono text-blue-700 font-bold bg-blue-50 px-2 py-1 rounded border border-blue-100">120.00 GR</span>
                     </div>
                     <div className="flex justify-between items-center p-2.5 border border-slate-200 rounded-lg bg-white shadow-sm">
                        <span className="text-xs font-bold text-slate-700">ALGA NORI</span>
                        <span className="text-[10px] font-mono text-blue-700 font-bold bg-blue-50 px-2 py-1 rounded border border-blue-100">1.00 UND</span>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>

      </div>
    )
  },

  carga_diaria: { title: "Carga Diaria", content: <p>Próximamente...</p> },
  rrhh: { title: "RRHH", content: <p>Próximamente...</p> },
  reportes: { title: "Reportes", content: <p>Próximamente...</p> }
};
