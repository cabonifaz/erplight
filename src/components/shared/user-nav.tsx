'use client'

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Settings, ShieldCheck, MapPin, Lock } from "lucide-react"; 
import { signOut } from "next-auth/react";
import { cambiarPasswordUsuario } from "@/actions/auth-actions"; // ✨ Importamos la función

interface UserNavProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
    branch_name?: string | null; 
  }
}

export function UserNav({ user }: UserNavProps) {
  // ✨ ESTADOS PARA EL MODAL DE CONTRASEÑA
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [loadingPass, setLoadingPass] = useState(false);
  const [passwords, setPasswords] = useState({ actual: '', nueva: '', confirmar: '' });

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()
    : "U";

  // ✨ FUNCIÓN PARA GUARDAR
  const handleCambiarPassword = async () => {
      if (!passwords.actual || !passwords.nueva || !passwords.confirmar) {
          return alert("Por favor, completa todos los campos.");
      }
      if (passwords.nueva !== passwords.confirmar) {
          return alert("Las contraseñas nuevas no coinciden.");
      }
      if (passwords.nueva.length < 6) {
          return alert("La nueva contraseña debe tener al menos 6 caracteres.");
      }

      setLoadingPass(true);
      const res = await cambiarPasswordUsuario(passwords.actual, passwords.nueva);
      
      if (res.success) {
          alert(res.message);
          setIsPasswordModalOpen(false);
          setPasswords({ actual: '', nueva: '', confirmar: '' });
      } else {
          alert("❌ " + res.message);
      }
      setLoadingPass(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10 border border-gray-200">
              <AvatarImage src={user.image || ""} alt={user.name || ""} />
              <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent className="w-60" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
              
              {/* Contenedor de etiquetas (Rol + Sucursal) */}
              <div className="flex flex-wrap gap-2 mt-2">
                {/* Etiqueta ROL */}
                {user.role && (
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-wide flex items-center gap-1">
                     <ShieldCheck className="w-3 h-3" />
                     {user.role}
                  </span>
                )}
                
                {/* Etiqueta SUCURSAL */}
                {user.branch_name && (
                  <span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200 uppercase tracking-wide flex items-center gap-1">
                     <MapPin className="w-3 h-3" />
                     {user.branch_name}
                  </span>
                )}
              </div>

            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuGroup>
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Configuración</span>
            </DropdownMenuItem>
            {/* ✨ NUEVA OPCIÓN DE CONTRASEÑA */}
            <DropdownMenuItem 
                className="cursor-pointer text-blue-600 focus:text-blue-700 focus:bg-blue-50"
                onClick={() => setIsPasswordModalOpen(true)}
            >
              <Lock className="mr-2 h-4 w-4" />
              <span className="font-medium">Cambiar Contraseña</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          
          <DropdownMenuSeparator />
          <DropdownMenuItem 
              className="cursor-pointer text-red-600 focus:text-red-600"
              onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Cerrar Sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ✨ MODAL DE CAMBIO DE CONTRASEÑA ✨ */}
      {isPasswordModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden">
                  <div className="bg-blue-900 p-4 text-white flex justify-between items-center">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                          <Lock className="w-5 h-5" /> Cambiar Contraseña
                      </h3>
                      <button onClick={() => setIsPasswordModalOpen(false)} className="text-blue-200 hover:text-white text-2xl leading-none pb-1">&times;</button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña Actual</label>
                          <input 
                              type="password" 
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              value={passwords.actual}
                              onChange={e => setPasswords({...passwords, actual: e.target.value})}
                          />
                      </div>
                      <div className="pt-2 border-t border-gray-100">
                          <label className="block text-sm font-bold text-gray-700 mb-1">Nueva Contraseña</label>
                          <input 
                              type="password" 
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              value={passwords.nueva}
                              onChange={e => setPasswords({...passwords, nueva: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Confirmar Nueva Contraseña</label>
                          <input 
                              type="password" 
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              value={passwords.confirmar}
                              onChange={e => setPasswords({...passwords, confirmar: e.target.value})}
                          />
                      </div>
                      <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                          <button 
                              onClick={() => setIsPasswordModalOpen(false)} 
                              className="px-4 py-2 text-gray-600 bg-gray-100 font-bold rounded-lg hover:bg-gray-200 transition-colors"
                          >
                              Cancelar
                          </button>
                          <button 
                              onClick={handleCambiarPassword} 
                              disabled={loadingPass}
                              className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                          >
                              {loadingPass ? 'Guardando...' : 'Actualizar'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </>
  );
}