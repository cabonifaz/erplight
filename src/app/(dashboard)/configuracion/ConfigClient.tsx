'use client'

import { useState } from "react";
import { saveApprovalLimit } from "@/actions/admin-actions";
import { toast } from "sonner";
import { Save, ShieldAlert } from "lucide-react";

export default function ConfigClient({ users, limits }: { users: any[], limits: any[] }) {
    // 1. Filtramos solo a los que aprueban (excluimos al Gerente General porque es infinito y Almaceneros porque no aprueban)
    const approvers = users.filter(u => 
        u.role === 'ADMIN_SUCURSAL' || u.role === 'GERENTE DE LOGISTICA'
    );

    // 2. Estado local para enlazar cada cajita de texto con su usuario
    const [localLimits, setLocalLimits] = useState<Record<number, string>>(() => {
        const initialState: Record<number, string> = {};
        approvers.forEach(user => {
            const userLimit = limits.find(l => l.user_id === user.id.toString());
            initialState[user.id] = userLimit ? userLimit.limit_amount : "0";
        });
        return initialState;
    });

    const [loadingId, setLoadingId] = useState<number | null>(null);

    // 3. Función para guardar
    const handleSave = async (userId: number, userName: string) => {
        setLoadingId(userId);
        const amount = localLimits[userId];
        const res = await saveApprovalLimit(userId, userName, amount);
        setLoadingId(null);

        if (res.success) toast.success(res.message);
        else toast.error(res.message);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-6">
                <ShieldAlert className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-800">Límites de Aprobación de Compras</h2>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trabajador</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol y Sede</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto Máximo (S/)</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {approvers.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {user.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-blue-700">{user.role}</span>
                                        <span className="text-xs text-gray-500 mt-0.5">{user.assigned_branches || 'Sin asignar'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-sm text-gray-500 font-medium">S/</span>
                                        <input 
                                            type="number" 
                                            value={localLimits[user.id]} 
                                            onChange={(e) => setLocalLimits({...localLimits, [user.id]: e.target.value})}
                                            className="w-36 pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-purple-500 focus:border-purple-500"
                                            min="0"
                                            step="100"
                                        />
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <button 
                                        onClick={() => handleSave(user.id, user.name)}
                                        disabled={loadingId === user.id}
                                        className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 text-sm font-medium transition-colors"
                                    >
                                        <Save className="w-4 h-4" />
                                        {loadingId === user.id ? 'Guardando...' : 'Guardar Límite'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {approvers.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-sm">
                                    No hay administradores ni gerentes de logística registrados en el sistema.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}