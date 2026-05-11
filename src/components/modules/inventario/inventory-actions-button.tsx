'use client'

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, UploadCloud, Loader2, ArrowRightLeft } from "lucide-react"; // ✨ Agregamos ArrowRightLeft
import { ManualEntryDialog } from "./manual-entry-dialog";
import { TransferStockDialog } from "./transfer-stock-dialog"; // ✨ Importamos el nuevo Modal
import * as XLSX from "xlsx";
import { procesarAjusteInventarioExcel } from "@/actions/inventory-actions";

interface InventoryActionsButtonProps {
    branches?: any[]; 
    userRole?: string;
    userBranchId?: number;
    productos?: any[]; // ✨ Recibimos los productos desde la página principal
}

export function InventoryActionsButton({ 
    branches = [], 
    userRole = "", 
    userBranchId,
    productos = [] // ✨ Inicializamos en vacío por seguridad
}: InventoryActionsButtonProps) {
    
    const [open, setOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false); // ✨ Estado para el modal de traslado
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Estados para la justificación del Excel
    const [justificationModalOpen, setJustificationModalOpen] = useState(false);
    const [justificationText, setJustificationText] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const rolesPermitidosExcel = ['GERENTE GENERAL', 'GERENTE DE LOGISTICA', 'ADMINISTRADOR GENERAL'];
    const puedeSubirExcel = rolesPermitidosExcel.includes(userRole.toUpperCase());

    const [excelBranchId, setExcelBranchId] = useState<number>(
        userBranchId || (branches && branches.length > 0 ? branches[0].id : 0)
    );

    // Paso 1: Atrapamos el archivo pero NO lo procesamos aún
    const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!excelBranchId) {
            alert("Debes seleccionar una sucursal destino para cargar el inventario.");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        // Guardamos el archivo en memoria y abrimos el Modal
        setSelectedFile(file);
        setJustificationText("");
        setJustificationModalOpen(true);
    };

    // Paso 2: Procesamos cuando el usuario ingresa el motivo y confirma
    const handleConfirmUpload = () => {
        if (!justificationText.trim()) {
            alert("⚠️ La justificación es obligatoria por motivos de auditoría.");
            return;
        }

        setJustificationModalOpen(false);
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
                    data: data,
                    justificacion: justificationText 
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
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = ""; 
            }
        };
        
        if (selectedFile) {
            reader.readAsBinaryString(selectedFile);
        }
    };

    const handleCancelUpload = () => {
        setJustificationModalOpen(false);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = ""; 
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

                {/* ✨ BOTÓN 2: TRASLADO ENTRE SUCURSALES ✨ */}
                <Button 
                    type="button" 
                    onClick={() => setIsTransferModalOpen(true)} 
                    className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm h-9 text-xs sm:text-sm"
                >
                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                    Trasladar Stock
                </Button>

                {/* BOTÓN 3: CARGA EXCEL */}
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
                            onChange={handleFileSelection}
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
                            {isLoading ? "Procesando..." : "Subir Excel"}
                        </Button>
                    </div>
                )}
            </div>

            {/* MODAL DE JUSTIFICACIÓN DE AUDITORÍA */}
            {justificationModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-purple-600 p-4 text-white">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <UploadCloud className="w-5 h-5" /> 
                                Justificación de Auditoría
                            </h3>
                            <p className="text-purple-100 text-sm mt-1">
                                Estás a punto de cargar un archivo Excel ({selectedFile?.name}). Se requiere un motivo.
                            </p>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Motivo de la carga masiva:
                            </label>
                            <textarea 
                                rows={3}
                                placeholder="Ej: Inventario físico de fin de mes, regularización general, etc."
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
                                value={justificationText}
                                onChange={(e) => setJustificationText(e.target.value)}
                            />
                            <div className="mt-6 flex justify-end gap-3">
                                <Button type="button" variant="outline" onClick={handleCancelUpload}>
                                    Cancelar
                                </Button>
                                <Button type="button" className="bg-purple-600 hover:bg-purple-700" onClick={handleConfirmUpload}>
                                    Confirmar y Cargar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ManualEntryDialog 
                open={open} 
                onOpenChange={setOpen} 
                branches={branches} 
                userRole={userRole}
                userBranchId={userBranchId || 0}
            />

            {/* ✨ MODAL DE TRASLADO DE INVENTARIO ✨ */}
            <TransferStockDialog 
                isOpen={isTransferModalOpen}
                onOpenChange={setIsTransferModalOpen}
                sucursalActualId={excelBranchId || userBranchId || 0} 
                sucursales={branches} 
                productos={productos} // Le pasamos la data real de la tabla
                onSuccess={() => window.location.reload()} // Refresca la página al terminar
            />
        </>
    );
}