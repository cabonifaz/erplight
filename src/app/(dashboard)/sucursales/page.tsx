'use client'

import { getBranches, createBranch, toggleBranchStatus } from "@/actions/admin-actions";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { toast } from "sonner"; 
// ✨ CAMBIO APLICADO: Usamos Ban en lugar de StoreOff para evitar el error de versión
import { Store, Ban } from "lucide-react"; 

export default function SucursalesPage() {
    const { data: session } = useSession();
    // @ts-ignore
    const userRole = session?.user?.role || "USUARIO_ESTANDAR";
    
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getBranches().then(res => setBranches(res));
    }, []);

    const submitBranch = createBranch.bind(null, userRole);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        
        const form = e.currentTarget; 
        const formData = new FormData(form);
        
        const result = await submitBranch(formData);
        
        setLoading(false);

        if (result?.success) {
            toast.success(result.message);
            form.reset(); 
            getBranches().then(res => setBranches(res));
        } else {
            toast.error(result?.message || "Error al crear la sucursal");
        }
    };

    // Función para deshabilitar
    const handleToggleStatus = async (branch: any) => {
        const estadoActual = branch.status !== undefined ? branch.status : 1;
        const accionTexto = estadoActual === 1 ? "deshabilitar" : "habilitar";

        if (!confirm(`¿Estás seguro de ${accionTexto} la sucursal ${branch.name}?`)) return;

        const res = await toggleBranchStatus(branch.id, estadoActual);
        if (res.success) {
            toast.success(res.message);
            getBranches().then(r => setBranches(r)); // Recargar tabla
        } else {
            toast.error(res.message);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Gestión de Sucursales (Locales)</h1>

            {/* Formulario para crear sucursal */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold mb-4">Nueva Sucursal</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Local</label>
                        <input type="text" name="name" required placeholder="Ej: Almacén Piura" className="w-full border rounded-md p-2 bg-gray-50 focus:bg-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">RUC</label>
                        <input type="text" name="ruc" required placeholder="1045..." maxLength={11} className="w-full border rounded-md p-2 bg-gray-50 focus:bg-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social</label>
                        <input type="text" name="razon_social" required placeholder="Empresa S.A.C." className="w-full border rounded-md p-2 bg-gray-50 focus:bg-white" />
                    </div>
                    <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium disabled:opacity-50">
                        {loading ? 'Validando...' : 'Guardar Sucursal'}
                    </button>
                </form>
            </div>

            {/* Tabla de sucursales */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RUC</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Razón Social</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {branches.length === 0 ? (
                            <tr><td colSpan={6} className="p-6 text-center text-gray-400">No hay sucursales.</td></tr>
                        ) : (
                            branches.map((branch: any) => {
                                const estadoActual = branch.status !== undefined ? branch.status : 1;
                                
                                return (
                                    <tr key={branch.id} className={`hover:bg-gray-50 ${estadoActual === 0 ? 'bg-red-50/50 opacity-75' : ''}`}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{branch.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{branch.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{branch.ruc}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{branch.razon_social}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={`px-2 py-1 inline-flex text-[10px] uppercase font-bold rounded-full border ${estadoActual === 1 ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                                                {estadoActual === 1 ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center whitespace-nowrap text-sm font-medium">
                                            <button 
                                                onClick={() => handleToggleStatus(branch)}
                                                className={`p-1.5 rounded transition-colors ${estadoActual === 1 ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-green-600 bg-green-50 hover:bg-green-100'}`}
                                                title={estadoActual === 1 ? "Deshabilitar Sucursal" : "Habilitar Sucursal"}
                                            >
                                                {/* ✨ CAMBIO APLICADO: Usamos Ban en lugar de StoreOff */}
                                                {estadoActual === 1 ? <Ban className="w-4 h-4" /> : <Store className="w-4 h-4" />}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}