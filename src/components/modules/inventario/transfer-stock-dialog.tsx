'use client';

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRightLeft } from "lucide-react";
import { transferirStockSucursal } from "@/actions/inventory-actions"; // Asegúrate de que la ruta sea correcta

export function TransferStockDialog({ 
    isOpen, 
    onOpenChange, 
    sucursalActualId, 
    sucursales, 
    productos, 
    onSuccess 
}: { 
    isOpen: boolean; 
    onOpenChange: (open: boolean) => void;
    sucursalActualId: number;
    sucursales: any[];
    productos: any[];
    onSuccess: () => void;
}) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        toBranch: 0,
        productId: 0,
        quantity: '',
        reason: ''
    });

    const handleTransfer = async () => {
        if (!formData.toBranch || !formData.productId || !formData.quantity) {
            return alert("Por favor completa los campos obligatorios (Destino, Producto y Cantidad).");
        }
        
        if (Number(formData.quantity) <= 0) {
            return alert("La cantidad debe ser mayor a 0.");
        }

        setLoading(true);
        const res = await transferirStockSucursal({
            fromBranch: sucursalActualId,
            toBranch: formData.toBranch,
            productId: formData.productId,
            quantity: Number(formData.quantity),
            reason: formData.reason || 'Traslado manual'
        });

        if (res.success) {
            alert("✅ " + res.message);
            onSuccess(); // Recarga la tabla de inventario
            onOpenChange(false);
            setFormData({ toBranch: 0, productId: 0, quantity: '', reason: '' });
        } else {
            alert("❌ Error: " + res.message);
        }
        setLoading(false);
    };

    // Filtramos para no poder enviarnos stock a nosotros mismos
    const sucursalesDestino = sucursales.filter(s => s.id !== sucursalActualId);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-white rounded-xl shadow-2xl">
                <DialogHeader className="border-b pb-4 mb-4">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 text-blue-900">
                        <ArrowRightLeft className="w-5 h-5" />
                        Trasladar Stock
                    </DialogTitle>
                    <DialogDescription>
                        Envía insumos desde esta sede hacia otra sucursal.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Sucursal Destino <span className="text-red-500">*</span></label>
                        <select 
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            value={formData.toBranch}
                            onChange={(e) => setFormData({...formData, toBranch: Number(e.target.value)})}
                        >
                            <option value={0} disabled>-- Selecciona la sede destino --</option>
                            {sucursalesDestino.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Insumo a Enviar <span className="text-red-500">*</span></label>
                        <select 
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            value={formData.productId}
                            onChange={(e) => setFormData({...formData, productId: Number(e.target.value)})}
                        >
                            <option value={0} disabled>-- Selecciona el insumo --</option>
                            {productos.map(p => <option key={p.id} value={p.product_id || p.id}>{p.product_name || p.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Cantidad a Enviar <span className="text-red-500">*</span></label>
                        <input 
                            type="number" 
                            step="0.01"
                            placeholder="Ej: 15.50"
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            value={formData.quantity}
                            onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Motivo / Observación</label>
                        <input 
                            type="text" 
                            placeholder="Ej: Préstamo urgente por falta de stock"
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            value={formData.reason}
                            onChange={(e) => setFormData({...formData, reason: e.target.value})}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button onClick={handleTransfer} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRightLeft className="w-4 h-4 mr-2" />}
                            Confirmar Traslado
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}