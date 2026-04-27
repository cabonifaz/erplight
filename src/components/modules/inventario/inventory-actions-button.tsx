'use client'

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, UploadCloud, Loader2 } from "lucide-react";
import { ManualEntryDialog } from "./manual-entry-dialog";
import * as XLSX from "xlsx";
import { procesarAjusteInventarioExcel } from "@/actions/inventory-actions";

interface InventoryActionsButtonProps {
    branches?: any[]; 
    userRole?: string;
    userBranchId?: number;
}

export function InventoryActionsButton({ 
    branches = [], 
    userRole = "", 
    userBranchId 
}: InventoryActionsButtonProps) {
    
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const rolesPermitidosExcel = ['GERENTE GENERAL', 'GERENTE DE LOGISTICA', 'ADMINISTRADOR GENERAL'];
    const puedeSubirExcel = rolesPermitidosExcel.includes(userRole.toUpperCase());

    const [excelBranchId, setExcelBranchId] = useState<number>(
        userBranchId || (branches && branches.length > 0 ? branches[0].id : 0)
    );

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!excelBranchId) {
            alert("Debes seleccionar una sucursal destino para cargar el inventario.");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        setIsLoading(true);
        const reader = new FileReader();

        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

                if (data.length === 0) {
                    alert("El archivo Excel está vacío.");
                    setIsLoading(false);
                    return;
                }

                const result = await procesarAjusteInventarioExcel({
                    branchId: Number(excelBranchId),
                    data: data
                });

                if (result.success) {
                    alert(`✅ ${result.message}`);
                    window.location.reload(); 
                } else {
                    if (result.errores && result.errores.length > 0) {
                        const listaErrores = result.errores.slice(0, 10).join("\n- ");
                        alert(`🚫 CARGA RECHAZADA\n\n${result.message}\n\nProductos no encontrados:\n- ${listaErrores}`);
                    } else {
                        alert(`❌ Error: ${result.message}`);
                    }
                }
            } catch (error) {
                console.error("Error procesando:", error);
                alert("Error al leer el archivo Excel.");
            } finally {
                setIsLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = ""; 
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <>
            <div className="flex flex-wrap items-center gap-3">
                {/* BOTÓN 1: AJUSTE MANUAL */}
                <Button 
                    type="button" 
                    onClick={() => setOpen(true)} 
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-9 text-xs sm:text-sm"
                >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Ajuste Manual
                </Button>

                {/* BOTÓN 2: CARGA EXCEL */}
                {puedeSubirExcel && (
                    <div className="flex items-center gap-2 bg-purple-50/50 p-1 pr-1.5 pl-2 rounded-lg border border-purple-100 shadow-sm">
                        <span className="text-xs font-semibold text-purple-800">Carga Masiva:</span>
                        
                        <select 
                            value={excelBranchId}
                            onChange={(e) => setExcelBranchId(Number(e.target.value))}
                            className="text-xs h-7 rounded border border-purple-200 bg-white text-gray-700 px-2 py-1 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer max-w-[120px] truncate"
                        >
                            <option value={0} disabled>Elige sede...</option>
                            {branches && branches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>

                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            disabled={isLoading}
                        />
                        
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading || !excelBranchId}
                            className="h-7 px-3 text-xs font-bold bg-white text-purple-700 border-purple-200 hover:bg-purple-100 hover:text-purple-800 transition-all disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5 mr-1.5" />}
                            {isLoading ? "Validando..." : "Subir Excel"}
                        </Button>
                    </div>
                )}
            </div>

            {/* ✨ MODAL RESTAURADO FUERA DEL DIV FLEX ✨ */}
            <ManualEntryDialog 
                open={open} 
                onOpenChange={setOpen} 
                branches={branches} 
                userRole={userRole}
                userBranchId={userBranchId || 0}
            />
        </>
    );
}