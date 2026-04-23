'use client'

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, UploadCloud, Loader2 } from "lucide-react";
import { ManualEntryDialog } from "./manual-entry-dialog";
import * as XLSX from "xlsx";
import { procesarAjusteInventarioExcel } from "@/actions/inventory-actions";

// Definimos la interfaz para recibir los nuevos datos
interface InventoryActionsButtonProps {
    branches: any[];
    userRole: string;      // <--- IMPORTANTE
    userBranchId: number;  // <--- IMPORTANTE
}

export function InventoryActionsButton({ branches, userRole, userBranchId }: InventoryActionsButtonProps) {
    const [open, setOpen] = useState(false);
    
    // Estados para la carga del Excel
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 1. Verificamos si el usuario tiene permiso para ver el botón de Excel
    const rolesPermitidosExcel = ['GERENTE GENERAL', 'GERENTE DE LOGISTICA', 'ADMINISTRADOR GENERAL'];
    const puedeSubirExcel = rolesPermitidosExcel.includes(userRole?.toUpperCase() || "");

    // 2. Estado para seleccionar a qué sucursal va el Excel (por defecto la primera)
    const [excelBranchId, setExcelBranchId] = useState<number>(
        userBranchId || (branches.length > 0 ? branches[0].id : 0)
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
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                
                // Convertimos a JSON
                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    alert("El archivo Excel está vacío.");
                    setIsLoading(false);
                    return;
                }

                // Llamada al Server Action
                const result = await procesarAjusteInventarioExcel({
                    branchId: Number(excelBranchId),
                    data: data
                });

                if (result.success) {
                    alert(`✅ ${result.message}`);
                    window.location.reload(); // Refrescamos para ver el nuevo stock
                } else {
                    // Manejo de errores de validación (Productos faltantes en BD)
                    if (result.errores && result.errores.length > 0) {
                        const listaErrores = result.errores.slice(0, 10).join("\n- ");
                        alert(
                            `🚫 CARGA RECHAZADA\n\n${result.message}\n\nProductos no encontrados en el maestro:\n- ${listaErrores}${result.errores.length > 10 ? `\n... y ${result.errores.length - 10} más.` : ""}`
                        );
                    } else {
                        alert(`❌ Error: ${result.message}`);
                    }
                }
            } catch (error) {
                console.error("Error al procesar el archivo:", error);
                alert("Error al leer el archivo Excel. Asegúrate de que las columnas se llamen 'producto' y 'stock'.");
            } finally {
                setIsLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = ""; // Reseteamos el input oculto
            }
        };

        reader.readAsBinaryString(file);
    };

    return (
        <div className="flex flex-wrap items-center gap-3">
            {/* BOTÓN 1: AJUSTE MANUAL (Original) */}
            <Button 
                onClick={() => setOpen(true)} 
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-9 text-xs sm:text-sm"
            >
                <PlusCircle className="w-4 h-4 mr-2" />
                Ajuste Manual
            </Button>

            {/* BOTÓN 2: CARGA EXCEL (Solo visible para Gerentes/Admins) */}
            {puedeSubirExcel && (
                <div className="flex items-center gap-2 bg-purple-50/50 p-1 pr-1.5 pl-2 rounded-lg border border-purple-100 shadow-sm">
                    <span className="text-xs font-semibold text-purple-800">Carga Masiva:</span>
                    
                    {/* Selector de Sucursal exclusivo para el Excel */}
                    <select 
                        value={excelBranchId}
                        onChange={(e) => setExcelBranchId(Number(e.target.value))}
                        className="text-xs h-7 rounded border border-purple-200 bg-white text-gray-700 px-2 py-1 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer max-w-[120px] truncate"
                        title="Selecciona la sucursal para este inventario"
                    >
                        <option value={0} disabled>Elige sede...</option>
                        {branches.map(b => (
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
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading || !excelBranchId}
                        className="h-7 px-3 text-xs font-bold bg-white text-purple-700 border-purple-200 hover:bg-purple-100 hover:text-purple-800 transition-all disabled:opacity-50"
                    >
                        {isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                            <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        {isLoading ? "Validando..." : "Subir Excel"}
                    </Button>
                </div>
            )}

            {/* Aquí pasamos los datos hacia abajo al Modal */}
            <ManualEntryDialog 
                open={open} 
                onOpenChange={setOpen} 
                branches={branches} 
                userRole={userRole}           // Pasamos el rol
                userBranchId={userBranchId}   // Pasamos el ID de sucursal
            />
        </div>
    );
}