'use client'

import { useState } from "react";
import { obtenerDashboardCorporativo } from "@/actions/dashboard-actions";
// ✨ Cambiamos BarChart por PieChart aquí para evitar choques
import { Building2, Clock, DollarSign, Receipt, TrendingUp, Utensils, PieChart } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function DashboardCorporativoPage() {
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const [kpis, setKpis] = useState({ total_operaciones: 0, total_ingresos: 0 });
    const [rankingSedes, setRankingSedes] = useState<any[]>([]);
    const [horarios, setHorarios] = useState<any[]>([]);
    const [topProductos, setTopProductos] = useState<any[]>([]);

    const handleGenerar = async () => {
        if (!fechaInicio || !fechaFin) return alert("Por favor selecciona un rango de fechas.");
        if (fechaInicio > fechaFin) return alert("La fecha de inicio no puede ser mayor a la fecha de fin.");
        
        setLoading(true);
        setHasSearched(true);
        const result = await obtenerDashboardCorporativo(fechaInicio, fechaFin);
        
        if (result.success) {
            setKpis(result.kpis);
            setRankingSedes(result.rankingSedes);
            // Ordenamos los horarios cronológicamente para la gráfica
            const horariosOrdenados = [...result.horarios].sort((a, b) => a.hora.localeCompare(b.hora));
            setHorarios(horariosOrdenados);
            setTopProductos(result.topProductos);
        } else {
            alert(result.message);
        }
        setLoading(false);
    };

    return (
        <div className="p-6 w-full max-w-7xl mx-auto space-y-6">
            <div className="border-b pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <PieChart className="text-blue-700" />
                    </h1>
                    <p className="text-gray-600">Rendimiento global, comparación de sedes y análisis de ventas de toda la cadena.</p>
                </div>
                <div className="bg-blue-50 text-blue-800 px-4 py-2 rounded-md font-semibold text-sm border border-blue-200">
                    Vista General Consolidada
                </div>
            </div>

            {/* CONTROLES */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio</label>
                    <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="w-full border border-gray-300 rounded-md p-2" />
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Fin</label>
                    <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="w-full border border-gray-300 rounded-md p-2" />
                </div>
                <button onClick={handleGenerar} disabled={loading || !fechaInicio || !fechaFin} className="bg-blue-700 text-white px-8 py-2 rounded-md hover:bg-blue-800 font-medium disabled:opacity-50 transition-colors">
                    {loading ? "Analizando Cadena..." : "Generar Análisis"}
                </button>
            </div>

            {hasSearched && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    
                    {/* KPIs SUPERIORES */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex items-center gap-4">
                            <div className="p-4 bg-green-100 text-green-700 rounded-full"><DollarSign className="w-8 h-8" /></div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 uppercase">Facturación Total Cadena</p>
                                <p className="text-4xl font-bold text-gray-900">S/ {Number(kpis.total_ingresos).toFixed(2)}</p>
                            </div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex items-center gap-4">
                            <div className="p-4 bg-blue-100 text-blue-700 rounded-full"><Receipt className="w-8 h-8" /></div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 uppercase">Operaciones Totales (Tickets)</p>
                                <p className="text-4xl font-bold text-gray-900">{kpis.total_operaciones}</p>
                            </div>
                        </div>
                    </div>

                    {/* GRÁFICAS DE RENDIMIENTO */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* 1. RANKING DE SEDES (¿Cuál vendió más?) */}
                        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Building2 className="text-indigo-600 w-5 h-5" /> Ranking de Ventas por Sede
                            </h2>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={rankingSedes} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" tickFormatter={(val) => `S/${val}`} />
                                        <YAxis dataKey="sucursal" type="category" width={120} tick={{fontSize: 12}} />
                                        <RechartsTooltip cursor={{fill: '#f3f4f6'}} formatter={(value: any) => [`S/ ${Number(value).toFixed(2)}`, 'Ventas']} />
                                        <Bar dataKey="total_vendido" fill="#4f46e5" radius={[0, 4, 4, 0]} name="Ingresos Totales" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 2. PICOS DE HORARIO GLOBAL (¿En qué horario se vendió más?) */}
                        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Clock className="text-orange-500 w-5 h-5" /> Picos de Horario (Cadena Completa)
                            </h2>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={horarios} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="hora" />
                                        <YAxis />
                                        <RechartsTooltip cursor={{fill: '#f3f4f6'}} formatter={(value: any) => [`S/ ${Number(value).toFixed(2)}`, 'Ventas']} />
                                        <Bar dataKey="ingresos" fill="#f97316" radius={[4, 4, 0, 0]} name="Ingresos por Hora" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>

                    {/* 3. TOP PRODUCTOS GLOBAL (¿Qué producto se vendió más?) */}
                    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Utensils className="text-green-600 w-5 h-5" /> Top 15 Productos Más Vendidos (Nivel Nacional)
                        </h2>
                        <div className="overflow-x-auto rounded-md border">
                            <table className="min-w-full text-left text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="p-3 font-semibold text-gray-700">Producto</th>
                                        <th className="p-3 font-semibold text-gray-700 text-center">Unidades Vendidas</th>
                                        <th className="p-3 font-semibold text-blue-700 text-right">Facturación Generada</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {topProductos.map((art, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="p-3 font-medium text-gray-800 flex items-center gap-2">
                                                <span className="text-gray-400 font-bold text-xs w-4">{idx + 1}.</span> {art.producto}
                                            </td>
                                            <td className="p-3 text-center text-gray-600">{art.cantidad}</td>
                                            <td className="p-3 text-right font-bold text-blue-600">S/ {Number(art.total_generado).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}