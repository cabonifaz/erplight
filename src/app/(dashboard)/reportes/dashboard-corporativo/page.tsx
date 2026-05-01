'use client'

import { useState } from "react";
import { useSession } from "next-auth/react";
import { obtenerDashboardCorporativo } from "@/actions/dashboard-actions";
import { Building2, Clock, DollarSign, Receipt, Utensils, PieChart } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function DashboardCorporativoPage() {
    const { data: session, status } = useSession();
    const userRole = (session?.user as any)?.role?.toUpperCase() || "";

    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const [kpis, setKpis] = useState({ total_operaciones: 0, total_ingresos: 0 });
    const [rankingSedes, setRankingSedes] = useState<any[]>([]);
    const [horarios, setHorarios] = useState<any[]>([]);
    const [topProductos, setTopProductos] = useState<any[]>([]);

    if (status === 'loading') {
        return <div className="min-h-[60vh] flex justify-center items-center font-bold text-gray-500">Verificando accesos...</div>;
    }

    const PRIVILEGED_ROLES = ["GERENTE GENERAL", "ADMINISTRADOR GENERAL", "CEO"];
    if (!PRIVILEGED_ROLES.includes(userRole)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <span className="text-6xl mb-4">⛔</span>
                <h1 className="text-2xl font-bold text-gray-800">Acceso Restringido</h1>
                <p className="mt-2 text-gray-500">Tu rol actual no tiene permisos para ver metricas corporativas globales.</p>
            </div>
        );
    }

    const handleGenerar = async () => {
        if (!fechaInicio || !fechaFin) return alert("Por favor selecciona un rango de fechas.");
        if (fechaInicio > fechaFin) return alert("La fecha de inicio no puede ser mayor a la fecha de fin.");
        
        setLoading(true);
        setHasSearched(true);
        const result = await obtenerDashboardCorporativo(fechaInicio, fechaFin);
        
        if (result.success) {
            setKpis(result.kpis || { total_operaciones: 0, total_ingresos: 0 });
            setRankingSedes(Array.isArray(result.rankingSedes) ? result.rankingSedes : []);
            
            const safeHorarios = Array.isArray(result.horarios) ? result.horarios : [];
            const horariosOrdenados = [...safeHorarios].sort((a, b) => Number(a.hora) - Number(b.hora));
            
            setHorarios(horariosOrdenados);
            setTopProductos(Array.isArray(result.topProductos) ? result.topProductos : []);
        } else {
            alert(result.message);
        }
        setLoading(false);
    };

    const formatMoneda = (valor: any) => {
        return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(valor));
    };

    const formatHora = (hora: any) => {
        const h = Number(hora);
        if (h === 12) return '12:00 PM';
        return h > 12 ? `${h - 12}:00 PM` : `${h}:00 AM`;
    };

    const sedesActivas = rankingSedes.filter(sede => Number(sede.total_vendido) > 0);

    return (
        <div className="p-6 w-full max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen">
            <div className="border-b border-gray-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <PieChart className="text-blue-700" /> Dashboard Corporativo
                    </h1>
                    <p className="text-gray-600">Rendimiento global, comparacion de sedes y analisis de ventas.</p>
                </div>
                <div className="bg-white text-blue-800 px-4 py-2 rounded-md font-semibold text-sm border border-blue-200 shadow-sm">
                    Vista General Consolidada
                </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha de Inicio</label>
                    <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha de Fin</label>
                    <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <button onClick={handleGenerar} disabled={loading || !fechaInicio || !fechaFin} className="bg-blue-600 text-white px-8 py-2.5 rounded-lg hover:bg-blue-700 font-bold disabled:opacity-50 transition-all shadow-md">
                    {loading ? "Analizando Cadena..." : "Generar Analisis"}
                </button>
            </div>

            {hasSearched && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
                            <div className="p-4 bg-green-50 text-green-600 rounded-full ring-1 ring-green-100"><DollarSign className="w-8 h-8" /></div>
                            <div>
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Facturacion Total Cadena</p>
                                <p className="text-4xl font-extrabold text-gray-800">{formatMoneda(kpis.total_ingresos)}</p>
                            </div>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
                            <div className="p-4 bg-blue-50 text-blue-600 rounded-full ring-1 ring-blue-100"><Receipt className="w-8 h-8" /></div>
                            <div>
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Operaciones (Tickets)</p>
                                <p className="text-4xl font-extrabold text-gray-800">{new Intl.NumberFormat('es-PE').format(kpis.total_operaciones)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <Building2 className="text-indigo-500 w-5 h-5" /> Ranking de Ventas por Sede
                            </h2>
                            <div className="h-[320px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={sedesActivas} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                                        <XAxis type="number" tickFormatter={(val) => `S/${val/1000}k`} stroke="#9ca3af" />
                                        <YAxis dataKey="sucursal" type="category" width={110} tick={{fontSize: 12, fill: '#4b5563', fontWeight: 600}} />
                                        <RechartsTooltip cursor={{fill: '#f3f4f6'}} formatter={(value: any) => [formatMoneda(value), 'Ingresos']} />
                                        <Bar dataKey="total_vendido" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={35} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <Clock className="text-orange-500 w-5 h-5" /> Demanda por Horario
                            </h2>
                            <div className="h-[320px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={horarios} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis dataKey="hora" tickFormatter={formatHora} tick={{fontSize: 11, fill: '#6b7280'}} />
                                        <YAxis tickFormatter={(val) => `S/${val/1000}k`} tick={{fontSize: 12, fill: '#9ca3af'}}/>
                                        <RechartsTooltip cursor={{fill: '#f3f4f6'}} labelFormatter={formatHora} formatter={(value: any) => [formatMoneda(value), 'Facturacion']} />
                                        <Bar dataKey="ingresos" fill="#f97316" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>

                    <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Utensils className="text-green-500 w-5 h-5" /> Top Productos Mas Rentables
                        </h2>
                        <div className="overflow-x-auto rounded-lg border border-gray-100">
                            <table className="min-w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="p-4 font-bold text-gray-600">Producto</th>
                                        <th className="p-4 font-bold text-gray-600 text-center">Precio Prom.</th>
                                        <th className="p-4 font-bold text-gray-600 text-center">Unidades</th>
                                        <th className="p-4 font-bold text-blue-700 text-right">Facturacion Generada</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {topProductos.map((art, idx) => {
                                        const precioUnitario = Number(art.total_generado) / Number(art.cantidad);
                                        
                                        return (
                                            <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                                                <td className="p-4 font-semibold text-gray-800 flex items-center gap-3">
                                                    <span className="flex items-center justify-center bg-gray-100 text-gray-500 rounded-md w-7 h-7 text-xs">
                                                        {idx + 1}
                                                    </span> 
                                                    {art.producto}
                                                </td>
                                                <td className="p-4 text-center text-gray-500 font-medium">
                                                    {formatMoneda(precioUnitario)}
                                                </td>
                                                <td className="p-4 text-center text-gray-600">
                                                    <span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold">
                                                        {new Intl.NumberFormat('es-PE').format(art.cantidad)} und
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right font-extrabold text-blue-600">
                                                    {formatMoneda(art.total_generado)}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {topProductos.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-gray-500">No hay ventas registradas en este rango.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}