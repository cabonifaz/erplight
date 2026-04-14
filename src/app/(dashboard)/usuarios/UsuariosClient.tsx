'use client'

import { useState } from "react";
import { createUser } from "@/actions/admin-actions";
import { toast } from "sonner"; 

export default function UsuariosClient({ users, branches }: { users: any[], branches: any[] }) {
    const [role, setRole] = useState("ADMIN_SUCURSAL");
    const [selectedBranches, setSelectedBranches] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);

    const handleCheckboxChange = (branchId: number) => {
        setSelectedBranches(prev => 
            prev.includes(branchId) ? prev.filter(id => id !== branchId) : [...prev, branchId]
        );
    };

    const isGerente = role === "GERENTE GENERAL" || role === "GERENTE DE LOGISTICA";

    // Enlazamos el server action con el array de sucursales seleccionadas
    const submitUser = createUser.bind(null, selectedBranches);

    // Atrapamos el envío del formulario para mostrar la contraseña
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        
        // 1. Guardamos el formulario en una variable ANTES del await
        const form = e.currentTarget; 
        const formData = new FormData(form);
        
        const result = await submitUser(formData);
        
        setLoading(false);

        if (result?.success) {
            // Mostramos la contraseña generada
            toast.success(result.message, { duration: 10000 });
            
            // 2. Usamos la variable 'form' que guardamos arriba
            form.reset(); 
            setSelectedBranches([]);
            setRole("ADMIN_SUCURSAL");
        } else {
            toast.error(result?.message || "Error al crear el usuario");
        }
    };

    return (
        <div className="space-y-6">
            {/* Formulario de Creación */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold mb-4">Nuevo Usuario</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Ajustamos el grid a 3 columnas */}
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
                                    setSelectedBranches([]); // Resetea sucursales al cambiar de rol
                                }}
                                className="w-full border rounded-md p-2 bg-white"
                            >
                                <option value="GERENTE GENERAL">Gerente General</option>
                                <option value="GERENTE DE LOGISTICA">Gerente de Logística</option>
                                {/* ✨ AQUÍ ESTÁ EL NUEVO ROL ✨ */}
                                <option value="ADMINISTRADOR_ZONAL">Administrador Zonal</option>
                                <option value="ADMIN_SUCURSAL">Administrador de Sucursal</option>
                                <option value="ALMACENERO">Almacenero</option>
                                <option value="MARCADOR">Marcador </option>
                            </select>
                        </div>
                    </div>

                    {/* Selector de Sucursales (Se oculta si es Gerente) */}
                    <div className={`p-4 border rounded-md bg-gray-50 ${isGerente ? 'hidden' : 'block'}`}>
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sucursales Asignadas</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user: any) => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${user.role.includes('GERENTE') || user.role.includes('ZONAL') ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {user.assigned_branches || 'Sin asignar'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}