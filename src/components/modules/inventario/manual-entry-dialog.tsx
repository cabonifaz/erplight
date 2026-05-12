'use client'

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Search, ArrowRightLeft, Lock } from "lucide-react";
import { toast } from "sonner";
import { registerManualAdjustment, buscarProductoEnAlmacen } from "@/actions/inventory-actions"; // ✨ IMPORTAMOS EL NUEVO BUSCADOR

interface ManualEntryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    branches: { id: number; name: string }[];
    userRole: string;     
    userBranchId: number; 
}

export function ManualEntryDialog({ open, onOpenChange, branches, userRole, userBranchId }: ManualEntryDialogProps) {
    const [loading, setLoading] = useState(false);
    
    const PRIVILEGED_ROLES = ['CEO', 'LOGISTICA', 'ADMINISTRADOR GENERAL', 'GERENTE GENERAL'];
    const canChangeBranch = PRIVILEGED_ROLES.includes(userRole);

    const [branchId, setBranchId] = useState(""); 
    const [type, setType] = useState("INGRESO"); 
    const [quantity, setQuantity] = useState(1);
    const [reason, setReason] = useState("");
    
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (open) {
            setReason("");
            setQuantity(1);
            setSearchTerm("");
            setSelectedProduct(null);
            setType("INGRESO");

            if (userBranchId && userBranchId > 0) {
                setBranchId(userBranchId.toString());
            } else {
                setBranchId(""); 
            }
        }
    }, [open, userBranchId]); 

    // ✨ BUSCADOR SEGURO CONTRA LA BASE DE DATOS (Con protección contra bucles infinitos)
    useEffect(() => {
        const fetchResults = async () => {
            if (searchTerm.length > 1 && !selectedProduct && branchId) {
                setIsSearching(true);
                const res = await buscarProductoEnAlmacen(Number(branchId), searchTerm);
                if (res.success) {
                    setSearchResults(res.data);
                } else {
                    setSearchResults([]);
                }
                setIsSearching(false);
            } else {
                setSearchResults([]);
            }
        };

        const timer = setTimeout(() => {
            fetchResults();
        }, 300); // Espera 300ms después de que dejas de escribir para no saturar la BD

        return () => clearTimeout(timer);
    }, [searchTerm, branchId, selectedProduct]);

    const handleSelectProduct = (prod: any) => {
        setSelectedProduct({
            id: prod.product_id,
            name: prod.product_name,
            code: prod.product_code,
            unit_measure: prod.unit_measure
        });
        setSearchTerm(prod.product_name);
        setSearchResults([]); 
    };

    const handleSubmit = async () => {
        if (!branchId) return toast.error("El almacén es obligatorio.");
        if (!selectedProduct) return toast.error("Debes buscar y seleccionar un producto.");
        if (quantity <= 0) return toast.error("La cantidad debe ser mayor a 0.");
        if (!reason.trim()) return toast.error("Debes indicar un motivo.");

        setLoading(true);
        const formData = new FormData();
        formData.append("branch_id", branchId); // Manda el warehouseId real
        formData.append("product_id", selectedProduct.id.toString());
        formData.append("quantity", quantity.toString());
        formData.append("type", type);
        formData.append("reason", reason);

        const res = await registerManualAdjustment(formData);
        setLoading(false);

        if (res.success) {
            toast.success(res.message);
            onOpenChange(false);
            window.location.reload(); 
        } else {
            toast.error(res.message);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md overflow-visible">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-gray-800">
                        <ArrowRightLeft className="w-5 h-5" /> Ajuste Manual de Stock
                    </DialogTitle>
                    <DialogDescription>
                        {canChangeBranch 
                            ? "Selecciona el almacén y registra el movimiento."
                            : "Registrando movimiento en tu almacén asignado."}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Almacén Físico</Label>
                            <div className="relative">
                                <Select 
                                    value={branchId} 
                                    onValueChange={(val) => {
                                        setBranchId(val);
                                        setSearchTerm(""); 
                                        setSelectedProduct(null);
                                    }} 
                                    disabled={!canChangeBranch}
                                >
                                    <SelectTrigger className={!canChangeBranch ? "bg-gray-100 text-gray-600 font-medium opacity-100" : "bg-white"}>
                                        <SelectValue placeholder={canChangeBranch ? "Seleccionar Almacén" : "Cargando..."} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {branches.map(b => (
                                            <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {!canChangeBranch && (
                                    <Lock className="w-3 h-3 text-gray-400 absolute right-8 top-3" />
                                )}
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Tipo Movimiento</Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger className={type === 'INGRESO' ? "border-blue-200 bg-blue-50 text-blue-700" : "border-red-200 bg-red-50 text-red-700"}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="INGRESO">🔵 Ingreso / Carga</SelectItem>
                                    <SelectItem value="SALIDA">🔴 Salida / Merma</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2 relative">
                        <Label>Producto</Label>
                        <div className="relative">
                            <Input 
                                placeholder="Buscar en este almacén..." 
                                value={searchTerm} 
                                onChange={e => { setSearchTerm(e.target.value); if(!e.target.value) setSelectedProduct(null); }}
                                className={selectedProduct ? "border-green-500 bg-green-50 text-green-700 font-medium pl-8" : "pl-8"}
                                disabled={!branchId}
                            />
                            {isSearching ? (
                                <Loader2 className="absolute left-2.5 top-2.5 h-4 w-4 text-blue-500 animate-spin" />
                            ) : (
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                            )}
                        </div>
                        
                        {/* Resultados del buscador */}
                        {searchResults.length > 0 && !selectedProduct && (
                            <div className="absolute top-full left-0 w-full bg-white border rounded-md shadow-lg z-[100] max-h-48 overflow-y-auto mt-1">
                                {searchResults.map(prod => (
                                    <div 
                                        key={prod.product_id} 
                                        className="p-2 hover:bg-blue-50 cursor-pointer text-sm border-b last:border-0"
                                        onClick={() => handleSelectProduct(prod)}
                                    >
                                        <div className="font-bold text-gray-700">{prod.product_name}</div>
                                        <div className="text-xs text-gray-400 flex justify-between">
                                            <span>{prod.product_code}</span>
                                            <span>{prod.unit_measure}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {searchTerm.length > 1 && searchResults.length === 0 && !selectedProduct && !isSearching && branchId && (
                            <div className="absolute top-full left-0 w-full bg-white border rounded-md shadow-lg z-[100] p-3 text-center text-xs text-red-500 mt-1">
                                El producto no existe en este almacén.
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Cantidad ({selectedProduct?.unit_measure || 'UND'})</Label>
                        <Input 
                            type="number" 
                            min="0.01" 
                            step="0.01" 
                            value={quantity} 
                            onChange={e => setQuantity(parseFloat(e.target.value))} 
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Motivo / Observación</Label>
                        <Textarea 
                            placeholder="Ej: Conteo cíclico, merma por rotura, carga inicial..." 
                            value={reason} 
                            onChange={e => setReason(e.target.value)} 
                            className="resize-none h-20"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={loading} className={type === 'INGRESO' ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"}>
                        {loading ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : <Save className="mr-2 w-4 h-4" />}
                        {type === 'INGRESO' ? 'Registrar Ingreso' : 'Registrar Salida'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}