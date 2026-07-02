'use client'

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Search, ArrowRightLeft, Lock, Building2 } from "lucide-react";
import { toast } from "sonner";
import { registerManualAdjustment, buscarProductoEnAlmacen, getWarehousesByBranch } from "@/actions/inventory-actions"; 

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

    // Estados de ubicación
    const [branchId, setBranchId] = useState(""); 
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [warehouseId, setWarehouseId] = useState("");
    const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);

    // Estados del formulario
    const [type, setType] = useState("INGRESO"); 
    const [quantity, setQuantity] = useState(1);
    const [reason, setReason] = useState("");
    
    // Estados del buscador
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Inicializar modal
    useEffect(() => {
        if (open) {
            setReason("");
            setQuantity(1);
            setSearchTerm("");
            setSelectedProduct(null);
            setType("INGRESO");
            setWarehouses([]);
            setWarehouseId("");

            if (userBranchId && userBranchId > 0) {
                setBranchId(userBranchId.toString());
            } else {
                setBranchId(""); 
            }
        }
    }, [open, userBranchId]); 

    // Cargar almacenes cuando cambia la sucursal
    useEffect(() => {
        const fetchWarehouses = async () => {
            if (branchId) {
                setIsLoadingWarehouses(true);
                const res = await getWarehousesByBranch(Number(branchId));
                setWarehouses(res.data || []);
                
                // Si la sucursal tiene almacenes, autoseleccionar el primero
                if (res.data && res.data.length > 0) {
                    setWarehouseId(res.data[0].id.toString());
                } else {
                    setWarehouseId(""); // No tiene almacenes
                }
                setIsLoadingWarehouses(false);
            } else {
                setWarehouses([]);
                setWarehouseId("");
            }
        };

        if (open) {
            fetchWarehouses();
        }
    }, [branchId, open]);

    // Buscador de productos
    useEffect(() => {
        const fetchResults = async () => {
            // Se busca usando branchId temporalmente para heredar la lógica anterior, 
            // pero lo ideal es que busque en toda la BD si es un producto nuevo.
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
        }, 300);

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
        if (!branchId) return toast.error("La sucursal es obligatoria.");
        if (!selectedProduct) return toast.error("Debes buscar y seleccionar un producto.");
        if (quantity <= 0) return toast.error("La cantidad debe ser mayor a 0.");
        if (!reason.trim()) return toast.error("Debes indicar un motivo.");

        setLoading(true);
        const formData = new FormData();
        formData.append("branch_id", branchId); 
        
        // Enviamos el warehouseId si existe, de lo contrario enviamos vacío
        // El backend debe estar preparado para procesar un ajuste sin almacén específico si así lo requieres
        formData.append("warehouse_id", warehouseId); 
        
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
                            ? "Selecciona la sucursal, el almacén y registra el movimiento."
                            : "Registrando movimiento en tu sucursal asignada."}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        {/* SELECTOR DE SUCURSAL */}
                        <div className="space-y-2">
                            <Label>Sucursal Principal</Label>
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
                                        <SelectValue placeholder="Seleccionar Sucursal" />
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

                        {/* SELECTOR DE ALMACÉN */}
                        <div className="space-y-2">
                            <Label>Almacén Físico</Label>
                            <div className="relative">
                                <Select 
                                    value={warehouseId} 
                                    onValueChange={setWarehouseId} 
                                    disabled={!branchId || warehouses.length === 0 || isLoadingWarehouses}
                                >
                                    <SelectTrigger className={!branchId || warehouses.length === 0 ? "bg-gray-100 text-gray-400" : "bg-white"}>
                                        {isLoadingWarehouses ? (
                                            <div className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Cargando...</div>
                                        ) : (
                                            <SelectValue placeholder={warehouses.length === 0 && branchId ? "Sin almacén" : "Seleccionar Almacén"} />
                                        )}
                                    </SelectTrigger>
                                    <SelectContent>
                                        {warehouses.length > 0 ? (
                                            warehouses.map(w => (
                                                <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="none" disabled>No hay almacenes</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                                {warehouses.length === 0 && branchId && !isLoadingWarehouses && (
                                    <Building2 className="w-3 h-3 text-gray-400 absolute right-8 top-3" />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                    </div>

                    <div className="space-y-2 relative">
                        <Label>Producto</Label>
                        <div className="relative">
                            <Input 
                                placeholder="Buscar producto..." 
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
                                No encontrado (Verifique el catálogo)
                            </div>
                        )}
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