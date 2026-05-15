'use client'

import { useActionState, useState, useEffect } from "react";
import { createConsolidatedPurchaseRequest } from "@/actions/purchase-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileSpreadsheet, Building2, Upload } from "lucide-react"; 
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface BulkRequestDialogProps {
  branches: any[];
  userBranchId?: number;
}

export function BulkRequestDialog({ branches, userBranchId }: BulkRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>(userBranchId ? String(userBranchId) : "");
  
  const [description, setDescription] = useState("");
  const [estimatedTotal, setEstimatedTotal] = useState("");
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [itemsList, setItemsList] = useState<any[]>([]);

  const [state, dispatch, isPending] = useActionState(createConsolidatedPurchaseRequest, null);

  useEffect(() => {
      if (!open) {
          setDescription("");
          setEstimatedTotal("");
          setExcelFile(null);
          setItemsList([]);
      } else if (branches.length > 0 && !selectedBranch) {
          setSelectedBranch(String(branches[0].id));
      }
  }, [open, branches]);

  useEffect(() => {
    if (state?.success) {
      setOpen(false);
      toast.success(state.message);
    } else if (state?.message) {
      toast.error(state.message);
    }
  }, [state]);

  const handleExcelProcessing = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setExcelFile(file);

      const reader = new FileReader();
      reader.onload = (evt) => {
          try {
              const bstr = evt.target?.result;
              const wb = XLSX.read(bstr, { type: 'binary' });
              const wsname = wb.SheetNames[0];
              const ws = wb.Sheets[wsname];
              const data = XLSX.utils.sheet_to_json(ws);

              let sumTotal = 0;
              const listaParaBD: any[] = []; 
              let previewText = `PRODUCTOS DETECTADOS EN EL DOCUMENTO:\n\n`;

              const knownCols = [
                "CODIGO", "P", "DESCRIPCION", "UNID. MED.", "UNID.MED.", "UNIDAD",
                "STOCK MIN", "STOCK MAX", "ENTRADAS", "SALIDAS", "STOCK FINAL",
                "N°", "NOMBRE", "IGV", "TIPO", "CATEGORÍA", "CATEGORIA", "PRESENTACIÓN DE COMPRA",
                "PRESENTACIÓN DE COMPRA*", "P. VENTA", "PRECIO", "TOTAL"
              ];

              data.forEach((row: any) => {
                  const keys = Object.keys(row);
                  const nombreKey = keys.find(k => k.toUpperCase().includes('DESCRIPCION') || k.toUpperCase().includes('NOMBRE'));
                  const nombre = nombreKey ? row[nombreKey] : null;
                  if (!nombre) return; 

                  // EXTRAER NUEVOS DATOS DEL EXCEL
                  const codigoProd = row["P"] || row["CODIGO"] || row["Código"] || row["Codigo"] || "";
                  const categoria = row["Categoría"] || row["CATEGORÍA"] || row["Categoria"] || "";
                  const tipo = row["TIPO"] || row["Tipo"] || "";

                  const undKey = keys.find(k => k.toUpperCase().includes('UNID') || k.toUpperCase().includes('PRESENTACI'));
                  const und = undKey ? row[undKey] : "UND";
                  
                  let cant = 0;
                  let isMatrixFormat = false;
                  
                  const hasCantidadCol = keys.some(k => k.toUpperCase().includes('CANTIDAD') || k.toUpperCase() === 'CANTIDA');

                  if (hasCantidadCol) {
                      const cantKey = keys.find(k => k.toUpperCase().includes('CANTIDAD') || k.toUpperCase() === 'CANTIDA');
                      cant = parseFloat(row[cantKey as string]) || 0;
                  } else {
                      keys.forEach(k => {
                          const keyUpper = k.toUpperCase().trim();
                          if (!knownCols.includes(keyUpper)) {
                              const val = parseFloat(row[k]);
                              if (!isNaN(val) && val > 0) {
                                  cant += val;
                                  isMatrixFormat = true;
                              }
                          }
                      });
                      
                      // Asignación predeterminada si no es matriz y carece de columna cantidad
                      if (cant === 0 && !isMatrixFormat) {
                          cant = 1;
                      }
                  }

                  const pVentaStr = String(row["P. Venta"] || row["Precio"] || "0").replace(/[^0-9.-]+/g, "");
                  const precio = parseFloat(pVentaStr) || 0;
                  const tot = cant * precio;

                  if (cant > 0) {
                      listaParaBD.push({
                          nombre: nombre,
                          codigoProd: codigoProd,
                          categoria: categoria,
                          tipo: tipo,
                          cantidad: cant,
                          unidad: und,
                          precio: precio,
                          total: tot
                      });
                      
                      sumTotal += tot;
                      const subtotalStr = tot > 0 ? ` - S/ ${tot.toFixed(2)}` : '';
                      previewText += `• [${codigoProd || 'S/C'}] ${nombre}: ${cant} ${und}${subtotalStr}\n`;
                  }
              });

              setDescription(previewText);
              setEstimatedTotal(sumTotal.toFixed(2));
              setItemsList(listaParaBD); 
              
              if (listaParaBD.length > 0) {
                  toast.success(`Procesamiento completado: ${listaParaBD.length} registros preparados.`);
              } else {
                  toast.warning("No se encontraron registros válidos para procesar.");
              }
          } catch (err) {
              toast.error("Ocurrió un error en el procesamiento del archivo Excel.");
              setExcelFile(null);
          }
      };
      reader.readAsBinaryString(file);
  };

  const handleFormSubmit = (formData: FormData) => {
      if (!excelFile || itemsList.length === 0) {
          toast.error("El archivo no cuenta con datos estructurados para su importación.");
          return;
      }
      formData.append("quotations", excelFile);
      formData.append("items_json", JSON.stringify(itemsList));
      dispatch(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-sm text-white">
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Carga Masiva 
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md w-full p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold text-emerald-900 flex items-center gap-2">
            <Upload className="h-5 w-5 text-emerald-600"/> Importación de Registros
          </DialogTitle>
          <DialogDescription>
            Seleccione la plantilla correspondiente. El algoritmo consolidará los parámetros y generará las solicitudes.
          </DialogDescription>
        </DialogHeader>
        
        <form action={handleFormSubmit} className="flex flex-col gap-5">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-600">Sucursal Solicitante <span className="text-red-500">*</span></Label>
            <input type="hidden" name="branch_id" value={selectedBranch} />
            <Select value={selectedBranch} onValueChange={setSelectedBranch} required>
                <SelectTrigger className="h-10 bg-gray-50 border-gray-200">
                    <SelectValue placeholder="Seleccione Sucursal" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                    {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id.toString()}>
                            <div className="flex items-center gap-2">
                                <Building2 className="w-3 h-3 text-emerald-500" /> <span>{b.name}</span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-600">Documento de Origen <span className="text-red-500">*</span></Label>
              <Input type="file" accept=".xlsx, .xls, .csv" required onChange={handleExcelProcessing} className="bg-emerald-50/50 border-emerald-200 file:bg-emerald-100 file:text-emerald-800" />
          </div>

          {description && (
              <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-600">Previsualización de Datos</Label>
                  <Textarea name="preview_text" value={description} readOnly className="min-h-[150px] bg-gray-100 border-gray-200 font-mono text-[11px] leading-tight resize-none focus-visible:ring-0" />
                  {Number(estimatedTotal) > 0 && (
                      <p className="text-right text-sm font-bold text-emerald-700">Monto Calculado: S/ {estimatedTotal}</p>
                  )}
              </div>
          )}

          <DialogFooter className="mt-2 pt-4 border-t border-gray-100">
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isPending || itemsList.length === 0}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "PROCESAR SOLICITUDES"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}