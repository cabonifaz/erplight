'use client'

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Plus, Loader2, Building2, MapPin } from "lucide-react";
import { createProvider, updateProvider } from "@/actions/provider-actions";
import { toast } from "sonner"; 

interface ProviderFormProps {
    mode?: 'create' | 'edit';
    provider?: any;
}

export function ProviderFormSheet({ mode = 'create', provider }: ProviderFormProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        ruc: "",
        name: "",
        address: ""
    });

    useEffect(() => {
        if (open) {
            if (mode === "edit" && provider) {
                setFormData({
                    ruc: provider.ruc || "",
                    name: provider.name || "",
                    address: provider.address || ""
                });
            } else {
                setFormData({ ruc: "", name: "", address: "" });
            }
        }
    }, [open, mode, provider]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.ruc || !formData.name) {
            toast.error("El RUC y la Razón Social son obligatorios.");
            return;
        }

        setLoading(true);
        let res;
        
        if (mode === "create") {
            res = await createProvider(formData);
        } else {
            res = await updateProvider(provider.id, formData);
        }

        if (res.success) {
            toast.success(res.message);
            setOpen(false);
        } else {
            toast.error(res.message);
        }
        setLoading(false);
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {mode === "create" ? (
                    <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm text-white">
                        <Plus className="mr-2 h-4 w-4" /> Nuevo Proveedor
                    </Button>
                ) : (
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-blue-600 border border-transparent hover:border-blue-200 hover:bg-blue-50 transition-colors">
                        Editar
                    </Button>
                )}
            </SheetTrigger>
            
            <SheetContent className="overflow-y-auto sm:max-w-xl w-full p-6 bg-white">
                <SheetHeader className="mb-6">
                    <SheetTitle className="text-2xl font-bold text-gray-900">
                        {mode === "create" ? "Registrar Proveedor" : "Editar Proveedor"}
                    </SheetTitle>
                    <SheetDescription>
                        {mode === "create" ? "Complete los datos del nuevo proveedor." : "Modifique los datos necesarios."}
                    </SheetDescription>
                </SheetHeader>
                
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    {/* DATOS PRINCIPALES */}
                    <div className="space-y-5 border border-gray-100 p-5 rounded-xl bg-white shadow-sm">
                        <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-widest mb-1">
                            <Building2 className="w-4 h-4" /><h3>Datos de la Empresa</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="ruc" className="text-xs font-semibold text-gray-600">RUC <span className="text-red-500 ml-1">*</span></Label>
                                <Input 
                                    id="ruc" 
                                    value={formData.ruc} 
                                    onChange={handleInputChange} 
                                    placeholder="Ej: 20123456789" 
                                    maxLength={11} 
                                    className="h-10 font-mono bg-gray-50 border-gray-200"
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-xs font-semibold text-gray-600">Razón Social <span className="text-red-500 ml-1">*</span></Label>
                                <Input 
                                    id="name" 
                                    value={formData.name} 
                                    onChange={handleInputChange} 
                                    placeholder="Ej: Importaciones del Perú S.A.C." 
                                    className="h-10 uppercase bg-gray-50 border-gray-200"
                                />
                            </div>
                        </div>
                    </div>

                    {/* UBICACIÓN */}
                    <div className="space-y-5 border border-gray-100 p-5 rounded-xl bg-white shadow-sm">
                        <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-widest mb-1">
                            <MapPin className="w-4 h-4" /><h3>Ubicación</h3>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="address" className="text-xs font-semibold text-gray-600">Dirección Fiscal</Label>
                            <Input 
                                id="address" 
                                value={formData.address} 
                                onChange={handleInputChange} 
                                placeholder="Ej: Av. Los Próceres 123, Lima" 
                                className="h-10 bg-gray-50 border-gray-200"
                            />
                        </div>
                    </div>
                    
                    <div className="sticky bottom-0 bg-white pt-4 border-t border-gray-100 mt-2">
                        <Button type="submit" disabled={loading} className="w-full h-12 text-base font-semibold shadow-lg bg-blue-600 hover:bg-blue-700 transition-all text-white">
                            {loading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                            {mode === "create" ? "GUARDAR REGISTRO" : "GUARDAR CAMBIOS"}
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}