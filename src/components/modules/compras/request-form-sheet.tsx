'use client'

import { useActionState, useState, useEffect } from "react";
import { createPurchaseRequest, updatePurchaseRequest, getBranches, getRequestDetails, Quotation } from "@/actions/purchase-actions"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, ShoppingCart, Edit, FileText, X, Paperclip, Trash2, Building2 } from "lucide-react"; 
import { toast } from "sonner";

const Req = () => <span className="text-red-500 ml-1 font-bold">*</span>;

interface RequestFormSheetProps {
  userBranchId?: number; 
  userRole?: string; 
  requestToEdit?: any;
  trigger?: React.ReactNode;
}

export function RequestFormSheet({ userBranchId, userRole, requestToEdit, trigger }: RequestFormSheetProps) {
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<any[]>([]); 
  const [selectedBranch, setSelectedBranch] = useState<string>("");

  const [fileInputKeys, setFileInputKeys] = useState<number[]>([1]); 
  const [existingQuotations, setExistingQuotations] = useState<Quotation[]>([]);
  const [deletedQuotationIds, setDeletedQuotationIds] = useState<number[]>([]);

  const isEditing = !!requestToEdit;
  const PRIVILEGED_ROLES = ['GERENTE GENERAL', 'GERENTE DE LOGISTICA', 'ADMINISTRADOR GENERAL', 'CEO'];
  const isRestricted = !PRIVILEGED_ROLES.includes(userRole?.toUpperCase() || "");
  
  const actionFn = isEditing ? updatePurchaseRequest : createPurchaseRequest;
  const [state, dispatch, isPending] = useActionState(actionFn, null);

  useEffect(() => {
    if (open) {
      getBranches().then(data => {
          setBranches(data);
          if (isEditing && requestToEdit?.branch_id) {
              setSelectedBranch(String(requestToEdit.branch_id));
          } else if (!isEditing && userBranchId) {
              setSelectedBranch(String(userBranchId));
          } else if (data.length > 0 && !selectedBranch) {
              setSelectedBranch(String(data[0].id));
          }
      });

      if (isEditing && requestToEdit?.id) {
          getRequestDetails(requestToEdit.id).then(data => {
              setExistingQuotations(data.quotations);
          });
      }
    }
  }, [open, isEditing, requestToEdit, userBranchId]); 

  useEffect(() => {
    if (state?.success) {
      setOpen(false);
      toast.success(state.message);
      setFileInputKeys([1]);
      setDeletedQuotationIds([]);
      setSelectedBranch(userBranchId ? String(userBranchId) : ""); 
    } else if (state?.message) {
      toast.error(state.message);
    }
  }, [state, userBranchId]);

  const handleRemoveExistingFile = (id: number) => {
    setExistingQuotations(prev => prev.filter(q => q.id !== id));
    setDeletedQuotationIds(prev => [...prev, id]);
  };
  const addFileInput = () => setFileInputKeys(prev => [...prev, Date.now()]);
  const removeFileInput = (key: number) => {
      if (fileInputKeys.length > 1) setFileInputKeys(prev => prev.filter(k => k !== key));
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ? trigger : (
            <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                <Plus className="mr-2 h-4 w-4" /> Nueva Solicitud Manual
            </Button>
        )}
      </SheetTrigger>
      
      <SheetContent className="overflow-y-auto sm:max-w-md w-full p-6">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            {isEditing ? <Edit className="h-6 w-6 text-orange-600"/> : <ShoppingCart className="h-6 w-6 text-blue-600"/>}
            {isEditing ? "Editar Solicitud" : "Solicitar Compra (Manual)"}
          </SheetTitle>
          <SheetDescription>
            {isEditing ? "Modifique los detalles de su solicitud." : "Ingrese el detalle para 1 solo requerimiento específico."}
          </SheetDescription>
        </SheetHeader>
        
        <div className="pb-8"> 
            <form action={dispatch} className="flex flex-col gap-6">
              {isEditing && <input type="hidden" name="request_id" value={requestToEdit.id} />}
              {deletedQuotationIds.map(id => ( <input key={id} type="hidden" name="deleted_file_ids" value={id} /> ))}
              
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-600">Sucursal <Req/></Label>
                <input type="hidden" name="branch_id" value={selectedBranch} />
                <Select 
                    key={`select-${isEditing ? 'edit' : 'create'}-${branches.length}`}
                    value={selectedBranch} 
                    onValueChange={setSelectedBranch} 
                    disabled={isRestricted} 
                    required
                >
                    <SelectTrigger className={`h-10 border-gray-200 ${isRestricted ? 'bg-gray-100 opacity-80 cursor-not-allowed' : 'bg-gray-50'}`}>
                        <SelectValue placeholder={branches.length === 0 ? "Cargando sedes..." : "Seleccione Sede"} />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-[300px] overflow-y-auto">
                        {branches.map((b) => (
                            <SelectItem key={b.id} value={b.id.toString()}>
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-3 h-3 text-blue-500" />
                                    <span>{b.name}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-600">Descripción del Producto <Req/></Label>
                <Textarea 
                    name="description" 
                    required 
                    key={`desc-${requestToEdit?.id || 'new'}`}
                    defaultValue={isEditing ? requestToEdit.description : ""}
                    placeholder="Ej: 1 Extintor de emergencia..." 
                    className="min-h-[60px] bg-gray-50 border-gray-200 resize-none"
                />
              </div>

              {/* ✨ NUEVOS CAMPOS: Código, Categoría, Tipo y Presentación */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50/50 border border-gray-200 rounded-lg">
                  <div className="space-y-2">
                      <Label className="text-[11px] font-semibold text-gray-500 uppercase">Código (Opc.)</Label>
                      <Input name="product_code" placeholder="Ej: APL002" defaultValue={isEditing ? requestToEdit.product_code : ""} className="h-8 text-xs bg-white" />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-[11px] font-semibold text-gray-500 uppercase">Categoría</Label>
                      <Input name="category" placeholder="Ej: PESCADOS" defaultValue={isEditing ? requestToEdit.category : ""} className="h-8 text-xs bg-white" />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-[11px] font-semibold text-gray-500 uppercase">Tipo</Label>
                      <Input name="product_type" placeholder="Ej: Insumo" defaultValue={isEditing ? requestToEdit.product_type : ""} className="h-8 text-xs bg-white" />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-[11px] font-semibold text-gray-500 uppercase">Presentación</Label>
                      <Input name="presentation" placeholder="Ej: KILOS" defaultValue={isEditing ? requestToEdit.presentation : ""} className="h-8 text-xs bg-white" />
                  </div>
              </div>

              {isEditing && existingQuotations.length > 0 && (
                  <div className="space-y-2 bg-orange-50 p-3 rounded-md border border-orange-100">
                      <Label className="text-xs font-semibold text-orange-800">Archivos Actuales:</Label>
                      <div className="space-y-1">
                          {existingQuotations.map(q => (
                              <div key={q.id} className="flex justify-between items-center text-xs bg-white p-2 rounded border">
                                  <div className="flex items-center gap-2 truncate">
                                      <FileText className="w-3 h-3 text-gray-400"/>
                                      <span className="truncate max-w-[180px]">{q.file_name}</span>
                                  </div>
                                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-50" onClick={() => handleRemoveExistingFile(q.id)}>
                                      <X className="w-3 h-3"/>
                                  </Button>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold text-gray-600">
                        {isEditing ? "Agregar más cotizaciones" : "Cotizaciones (Opcional)"}
                    </Label>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addFileInput}>
                        <Plus className="w-3 h-3 mr-1" /> Agregar
                    </Button>
                </div>
                <div className="space-y-2">
                    {fileInputKeys.map((key) => (
                        <div key={key} className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Input type="file" name="quotations" accept=".pdf,.jpg,.jpeg,.png" className="pr-8 text-xs bg-gray-50" />
                                <Paperclip className="w-4 h-4 text-gray-400 absolute right-3 top-2.5 pointer-events-none" />
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-red-500" onClick={() => removeFileInput(key)}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                </div>
              </div>

              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-4">
                <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1 space-y-2">
                        <Label className="text-xs font-semibold text-gray-600">Moneda</Label>
                        <Select name="currency" key={`curr-${requestToEdit?.id || 'new'}`} defaultValue={isEditing ? requestToEdit.currency : "PEN"}>
                            <SelectTrigger className="h-10 bg-white border-blue-200"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="PEN">S/ (Soles)</SelectItem>
                                <SelectItem value="USD">$ (Dólares)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="col-span-2 space-y-2">
                        <Label className="text-xs font-semibold text-gray-600">Monto Estimado <Req/></Label>
                        <Input name="estimated_total" type="number" step="0.01" required key={`total-${requestToEdit?.id || 'new'}`} defaultValue={isEditing ? requestToEdit.estimated_total : ""} className="h-10 bg-white border-blue-200 font-mono text-right" />
                    </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white pt-2 border-t border-gray-100 mt-2">
                <Button type="submit" className={`w-full h-12 ${isEditing ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}`} disabled={isPending}>
                    {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (isEditing ? "GUARDAR CAMBIOS" : "ENVIAR SOLICITUD")}
                </Button>
              </div>
            </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}