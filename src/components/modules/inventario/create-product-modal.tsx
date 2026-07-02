"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PackagePlus, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

// ✨ Asegúrate de importar también la nueva función getUnitMeasures
import { createProduct, getUnitMeasures } from "@/actions/product-actions"; 

export function CreateProductModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<{ code: string; description: string }[]>([]);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      unit_measure: "UND", // Valor por defecto
      description: "",
    },
  });

  const unitWatch = watch("unit_measure");

  // ✨ Cargar las unidades de medida dinámicamente al abrir el modal
  useEffect(() => {
    if (open) {
      const fetchUnits = async () => {
        const result = await getUnitMeasures();
        if (result.success) {
          setUnits(result.data);
        }
      };
      fetchUnits();
    } else {
      // Limpiar formulario al cerrar
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (data: any) => {
    setLoading(true);
    
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("unit_measure", data.unit_measure);
    if (data.description) {
      formData.append("description", data.description);
    }

    const res = await createProduct(formData);

    setLoading(false);

    if (res.success) {
      toast.success(res.message);
      setOpen(false);
      router.refresh();
    } else {
      toast.error(res.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-9 text-xs sm:text-sm">
          <PackagePlus className="w-4 h-4 mr-2" /> Nuevo Insumo
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md bg-gray-50 p-0 gap-0">
        <div className="bg-white p-6 border-b shadow-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg font-bold text-gray-800">
              <div className="bg-emerald-50 p-2 rounded-lg">
                <PackagePlus className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex flex-col">
                <span>Registrar Nuevo Insumo</span>
                <span className="text-xs font-normal text-gray-500">Agrega productos al catálogo general</span>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-bold text-gray-700">Nombre del Producto / Insumo *</Label>
              <Input 
                className={`bg-white h-9 mt-1 ${errors.name ? "border-red-500" : ""}`} 
                placeholder="Ej. SALMÓN FRESCO"
                {...register("name", { required: true })} 
              />
              {errors.name && <span className="text-[10px] text-red-500">Campo obligatorio</span>}
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-700">Unidad de Medida</Label>
              <Select 
                value={unitWatch} 
                onValueChange={(val) => setValue("unit_measure", val)}
              >
                <SelectTrigger className="h-9 mt-1 bg-white">
                  <SelectValue placeholder="Seleccione U.M." />
                </SelectTrigger>
                <SelectContent>
                  {/* ✨ Iteración dinámica de la tabla master_catalogs */}
                  {units.map((unit) => (
                    <SelectItem key={unit.code} value={unit.code}>
                      {unit.description} ({unit.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-700">Descripción (Opcional)</Label>
              <Textarea 
                className="bg-white mt-1 resize-none h-20 text-xs" 
                placeholder="Detalles adicionales del insumo..."
                {...register("description")} 
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {loading ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : <Save className="mr-2 w-4 h-4" />} 
              Registrar Insumo
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}