'use client'

import { CheckCircle2, ShoppingCart, Plus, PackageX, Edit, FileText, ArrowRight, Trash2 } from "lucide-react";
import { CreateOCModal } from "./create-oc-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner"; // <--- AÑADE ESTA LÍNEA
import { deletePurchaseOrderAction } from "@/actions/purchase-actions"; // Asegúrate de que esta también esté

// ... resto del código

interface Props {
  request: any;       
  orders: any[];      
  onRefresh: () => void; 
}

export function PurchaseOrderManager({ request, orders = [], onRefresh }: Props) {
  
  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar esta orden? Esta acción no se puede deshacer.")) return;
    
    try {
      const res = await deletePurchaseOrderAction(id);
      if (res.success) {
        toast.success(res.message);
        onRefresh(); // Esto refresca la lista automáticamente
      } else {
        toast.error(res.message);
      }
    } catch (error) {
      toast.error("Error al intentar eliminar");
    }
  };
  return (
    <div className="mt-4">
      {/* 1. CABECERA LIMPIA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
                <h3 className="font-bold text-gray-900 text-sm">Órdenes de Compra</h3>
                <p className="text-xs text-gray-500">Gestión de proveedores</p>
            </div>
        </div>

        {/* BOTÓN "NUEVA ORDEN" */}
        <div className="w-full sm:w-auto">
            <CreateOCModal 
                request={request} 
                onSuccess={onRefresh} 
            />
        </div>
      </div>

      {/* 2. LISTA DE ÓRDENES (Espaciada y sin bordes dobles) */}
      <div className="space-y-3">
        {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 bg-gray-50/50 rounded-lg border-2 border-dashed border-gray-200 text-gray-400">
                <PackageX className="w-8 h-8 mb-2 opacity-40"/>
                <span className="text-xs font-medium">No hay órdenes generadas aún.</span>
            </div>
        ) : (
            orders.map((order, index) => (
                <div 
                    key={order.id || index} 
                    className="group relative bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200"
                >
                    <div className="flex flex-col gap-3">
                        {/* Fila Superior: ID y Estado */}
                        <div className="flex justify-between items-start">
    <div className="flex items-center gap-2">
        <div className="bg-green-100 p-1.5 rounded-md text-green-700">
            <CheckCircle2 className="w-4 h-4" />
        </div>
        <div>
            <p className="font-bold text-gray-800 text-sm">
                Orden #{order.id || '---'}
            </p>
            <p className="text-[10px] text-gray-500">
                {request.requester_name || 'Solicitud General'}
            </p>
        </div>
    </div>
    
    {/* CONTENEDOR DE ESTADO Y ELIMINAR */}
    <div className="flex items-center gap-2">
        <StatusBadge status={order.estado} />
        
        <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handleDelete(order.id)}
            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
        >
            <Trash2 className="w-4 h-4" />
        </Button>
    </div>
</div>

                        <hr className="border-gray-100/60" />

                        {/* Fila Media: Datos del Proveedor y Monto */}
                        <div className="flex justify-between items-end">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Proveedor</p>
                                <p className="text-sm font-semibold text-gray-700 truncate max-w-[180px]">
                                    {order.proveedor_razon || 'Sin Razón Social'}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total</p>
                                <p className="text-base font-bold text-blue-700">
                                    {order.moneda === 'USD' ? '$' : 'S/'} {Number(order.total || 0).toFixed(2)}
                                </p>
                            </div>
                        </div>

                        {/* Fila Inferior: Botón Editar (Ancho completo para fácil clic) */}
                        <div className="mt-1">
                            <CreateOCModal 
                                request={request} 
                                existingOrder={order} 
                                onSuccess={onRefresh} 
                            />
                        </div>
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
}

// Un pequeño componente interno para que el Badge se vea bonito
function StatusBadge({ status }: { status: string }) {
    const s = status || 'BORRADOR';
    let styles = "bg-gray-100 text-gray-600 border-gray-200";

    if (s === 'EMITIDA' || s === 'GENERADA') styles = "bg-green-50 text-green-700 border-green-200";
    if (s === 'BORRADOR') styles = "bg-yellow-50 text-yellow-700 border-yellow-200";
    if (s === 'ANULADA') styles = "bg-red-50 text-red-700 border-red-200";

    return (
        <Badge variant="outline" className={`${styles} font-medium text-[10px] px-2 py-0.5 shadow-none`}>
            {s}
        </Badge>
    );
}