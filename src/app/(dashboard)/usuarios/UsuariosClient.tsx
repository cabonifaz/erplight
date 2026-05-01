'use client'

import { useState } from "react";
import { createUser, adminCambiarPassword, adminToggleEstadoUsuario } from "@/actions/admin-actions";
import { toast } from "sonner"; 
import { Lock, UserX, UserCheck } from "lucide-react"; 

// ✨ 1. Declaramos los roles globales AFUERA del componente
const ROLES_GLOBALES = ["GERENTE GENERAL", "GERENTE DE LOGISTICA", "JEFE DE RRHH"];

export default function UsuariosClient({ users, branches }: { users: any[], branches: any[] }) {
    const [role, setRole] = useState("ADMIN_SUCURSAL");
    const [selectedBranches, setSelectedBranches] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);

    const [isPassModalOpen, setIsPassModalOpen] = useState(false);
    const [targetUser, setTargetUser] = useState<any>(null);
    const [newAdminPass, setNewAdminPass] = useState("");
    const [loadingAction, setLoadingAction] = useState(false);

    const handleCheckboxChange = (branchId: number) => {
        setSelectedBranches(prev => 
            prev.includes(branchId) ? prev.filter(id => id !== branchId) : [...prev, branchId]
        );
    };

    // ✨ 2. Validamos si el rol seleccionado en el formulario es global
    const isGlobalRole = ROLES_GLOBALES.includes(role);

    const submitUser = createUser.bind(null, selectedBranches);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if (!isGlobalRole && selectedBranches.length === 0) {
            return toast.error("Debes asignar al menos una sucursal para este rol.");
        }

        setLoading(true);
        const form = e.currentTarget; 
        const formData = new FormData(form);
        
        const result = await submitUser(formData);
            
        setLoading(false);

        if (result?.success) {
            toast.success(result.message, { duration: 10000 });
            form.reset(); 
            setSelectedBranches([]);
            setRole("ADMIN_SUCURSAL");
        } else {
            toast.error(result?.message || "Error al crear el usuario");
        }
    };

    const handleAdminChangePassword = async () => {
        if (newAdminPass.length < 6) return toast.error("La contraseña debe tener al menos 6 caracteres.");
        
        setLoadingAction(true);
        const res = await adminCambiarPassword(targetUser.id, newAdminPass);
        setLoadingAction(false);

        if (res.success) {
            toast.success(res.message);
            setIsPassModalOpen(false);
            setNewAdminPass("");
        } else {
            toast.error(res.message);
        }
    };

    const handleToggleStatus = async (user: any) => {
        const estadoActual = user.status !== undefined ? user.status : 1;
        const nuevoEstado = estadoActual === 1 ? 0 : 1;
        const accionTexto = nuevoEstado === 1 ? "habilitar" : "deshabilitar";

        if (!confirm(`¿Estás seguro de ${accionTexto} el acceso a ${user.name}?`)) return;

        const res = await adminToggleEstadoUsuario(user.id, nuevoEstado);
        if (res.success) {
            toast.success(res.message);
        } else {
            toast.error(res.message);
        }
    };

    return (
        <div className="space-y-6 relative">
            {/* Formulario de Creación */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold mb-4">Nuevo Usuario</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                            <input type="text" name="name" required className="w-full border rounded-md p-2 bg-gray-50" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Correo (Login)</label>
                            <input type="email" name="email" required className="w-full border rounded-md p-2 bg-gray-50" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Rol en el Sistema</label>
                            <select 
                                name="role" 
                                value={role} 
                                onChange={(e) => {
                                    setRole(e.target.value);
                                    setSelectedBranches([]);
                                }}
                                className="w-full border rounded-md p-2 bg-white"
                            >
                                <option value="GERENTE GENERAL">Gerente General</option>
                                <option value="GERENTE DE LOGISTICA">Gerente de Logística</option>
                                <option value="JEFE DE RRHH">Jefe de RRHH</option>
                                <option value="ADMINISTRADOR_ZONAL">Administrador Zonal</option>
                                <option value="ADMIN_SUCURSAL">Administrador de Sucursal</option>
                                <option value="ALMACENERO">Almacenero</option>
                                <option value="MARCADOR">Marcador </option>
                            </select>
                        </div>
                    </div>

                    <div className={`p-4 border rounded-md bg-gray-50 ${isGlobalRole ? 'hidden' : 'block'}`}>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">Asignar Sucursales (Obligatorio)</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {branches.map(branch => (
                                <label key={branch.id} className="flex items-center space-x-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedBranches.includes(branch.id)}
                                        onChange={() => handleCheckboxChange(branch.id)}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">{branch.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
                        >
                            {loading ? "Creando..." : "Crear Usuario"}
                        </button>
                    </div>
                </form>
            </div>

            {/* Tabla de Usuarios */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sucursales</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user: any) => {
                            const estadoActual = user.status !== undefined ? user.status : 1;
                            
                            // ✨ 3. CORRECCIÓN AQUÍ: Forzamos el tipo `as string[]` para que TypeScript no arroje error
                            const sucursalesRaw = user.assigned_branches ? user.assigned_branches.split(',') : [];
                            const sucursalesLimpias = Array.from(new Set(sucursalesRaw.map((s: string) => s.trim()))).filter(Boolean) as string[];

                            return (
                                <tr key={user.id} className={estadoActual === 0 ? "bg-red-50/50 opacity-75" : ""}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${user.role.includes('GERENTE') || user.role.includes('ZONAL') || user.role.includes('JEFE') ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    
                                    {/* ✨ 4. Mostramos las etiquetas (badges) para las sucursales asignadas */}
                                    <td className="px-6 py-4 text-sm text-gray-500 min-w-[250px] max-w-[350px]">
                                        {ROLES_GLOBALES.includes(user.role) ? (
                                            <span className="inline-flex items-center font-bold text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100 text-[10px] uppercase tracking-wider">
                                                Acceso Global
                                            </span>
                                        ) : sucursalesLimpias.length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5 items-center">
                                                {/* ✨ Quitamos la declaración explícita (sede: string, idx: number) */}
                                                {sucursalesLimpias.slice(0, 2).map((sede, idx) => (
                                                    <span 
                                                        key={idx} 
                                                        className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium bg-white text-gray-700 border border-gray-200 shadow-sm truncate max-w-[160px]" 
                                                        title={sede}
                                                    >
                                                        {sede}
                                                    </span>
                                                ))}
                                                
                                                {sucursalesLimpias.length > 2 && (
                                                    <span 
                                                        className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 cursor-help hover:bg-slate-200 transition-colors" 
                                                        title={`Otras sedes:\n${sucursalesLimpias.slice(2).join('\n')}`}
                                                    >
                                                        +{sucursalesLimpias.length - 2} más
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 italic text-xs font-medium">Sin asignar</span>
                                        )}
                                    </td>

                                    <td className="px-6 py-4 text-center whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex text-[10px] uppercase font-bold rounded-full border ${estadoActual === 1 ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                            {estadoActual === 1 ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center justify-center gap-3">
                                            <button 
                                                onClick={() => { setTargetUser(user); setIsPassModalOpen(true); }}
                                                className="text-blue-600 hover:text-blue-900 bg-blue-50 p-1.5 rounded"
                                                title="Forzar cambio de contraseña"
                                            >
                                                <Lock className="w-4 h-4" />
                                            </button>
                                            
                                            <button 
                                                onClick={() => handleToggleStatus(user)}
                                                className={`p-1.5 rounded ${estadoActual === 1 ? 'text-red-600 bg-red-50 hover:text-red-900' : 'text-green-600 bg-green-50 hover:text-green-900'}`}
                                                title={estadoActual === 1 ? "Deshabilitar Usuario" : "Habilitar Usuario"}
                                            >
                                                {estadoActual === 1 ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* MODAL DE CAMBIO DE CONTRASEÑA FORZADO */}
            {isPassModalOpen && targetUser && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden">
                        <div className="bg-blue-900 p-4 text-white flex justify-between items-center">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Lock className="w-5 h-5" /> Nueva Clave
                            </h3>
                            <button onClick={() => setIsPassModalOpen(false)} className="text-blue-200 hover:text-white text-2xl leading-none pb-1">&times;</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <p className="text-sm text-gray-500 mb-4">
                                    Cambiar la contraseña de <strong className="text-gray-800">{targetUser.name}</strong>.
                                </p>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nueva Contraseña</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Escribe la nueva clave..."
                                    value={newAdminPass}
                                    onChange={e => setNewAdminPass(e.target.value)}
                                />
                            </div>
                            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button 
                                    onClick={() => setIsPassModalOpen(false)} 
                                    className="px-4 py-2 text-gray-600 bg-gray-100 font-bold rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleAdminChangePassword} 
                                    disabled={loadingAction}
                                    className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    {loadingAction ? 'Aplicando...' : 'Cambiar y Guardar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}