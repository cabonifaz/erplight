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
import { Utensils, Loader2, Save, Edit, Plus } from "lucide-react";
import { toast } from "sonner";
import { createMenuAction, updateMenuAction } from "@/actions/menu-actions";

export function CreateMenuModal({
  existingMenu,
}: {
  existingMenu?: any;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const isEditing = !!existingMenu;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (isEditing && existingMenu) {
        reset({
          name: existingMenu.name || "",
        });
      } else {
        reset({
          name: "",
        });
      }
    }
  }, [open, isEditing, existingMenu, reset]);

  const onSubmit = async (data: any) => {
    setLoading(true);
    
    const payload = {
      ...data,
      id: existingMenu?.id,
    };

    const res = isEditing
      ? await updateMenuAction(payload)
      : await createMenuAction(payload);

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
        {isEditing ? (
          <Button variant="outline" className="h-8 text-xs border-gray-200 text-gray-700 hover:bg-gray-50">
            <Edit className="w-3 h-3 mr-2" /> Editar
          </Button>
        ) : (
          <Button className="bg-[#2a4365] hover:bg-[#1e3048] text-white">
            <Plus className="w-4 h-4 mr-2" /> Nuevo Platillo / Combo
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm bg-gray-50 p-0 gap-0">
        <div className="bg-white p-6 border-b shadow-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg font-bold text-gray-800">
              <div className="bg-orange-50 p-2 rounded-lg">
                <Utensils className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex flex-col">
                <span>{isEditing ? "Editar Platillo" : "Registrar Nuevo Platillo"}</span>
                <span className="text-xs font-normal text-gray-500">Solo nombre requerido</span>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-bold text-gray-700">Nombre del Platillo / Combo *</Label>
              <Input 
                className={`bg-white h-9 mt-1 ${errors.name ? "border-red-500" : ""}`} 
                placeholder="Ej. COMBO TEMPURA ROLL"
                {...register("name", { required: true })} 
              />
              {errors.name && <span className="text-[10px] text-red-500">El nombre es obligatorio</span>}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading} 
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {loading ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : <Save className="mr-2 w-4 h-4" />} 
              {isEditing ? "Guardar" : "Registrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}