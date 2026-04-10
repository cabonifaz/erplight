'use client'

import { useState } from "react";
import { generarProyeccion } from "@/actions/projection-actions";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, ShoppingCart, Clock } from "lucide-react";

export default function ProyeccionesPage() {
    // Usamos la sede 1 por defecto (puedes volverlo dinámico luego con tu lista de sucursales)
    const [branchId, setBranchId] = useState("1");
    const [fechaTarget, setFechaTarget] = useState("");
    const [loading, setLoading] = useState(false);
    
    // Estados para guardar la data que viene del backend
    const [datosHora, setDatosHora] = useState<any[]>([]);
    const [datosStock, setDatosStock] = useState<any[]>([]);

    const handleGenerar = async () => {
        if (!fechaTarget) return alert("Selecciona una fecha futura.");
        
        setLoading(true);
        const result = await generarProyeccion(Number(branchId), fechaTarget);
        
        if (result.success) {
            // Agrupamos la data para que el gráfico la entienda mejor (Agrupar por Hora)
            const groupedByHour = result.horas.reduce((acc: any, curr: any) => {
                const existing = acc.find((item: any) => item.hora === curr.hora);
                if (existing) {
                    existing[curr.producto] = curr.cantidad;
                } else {
                    acc.push({ hora: curr.hora, [curr.producto]: curr.cantidad });
                }
                return acc;
            }, []);

            setDatosHora(groupedByHour);
            setDatosStock(result.stock);
        } else {
            alert(result.message);
        }
        setLoading(false);
    };

    return (
        <div className="p-6 w-full max-w-7xl mx-auto space-y-6">
            <div className="border-b pb-4">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <TrendingUp className="text-blue-600" /> Proyección de Ventas (Forecasting)
                </h1>
                <p className="text-gray-600">Calcula la demanda futura y el stock necesario basándose en el historial de las últimas 4 semanas.</p>
            </div>

            {/* Controles */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha a Proyectar (Futuro)</label>
                    <input 
                        type="date" 
                        value={fechaTarget} 
                        onChange={(e) => setFechaTarget(e.target.value)}
                        className="w-full border border-gray-300 rounded-md p-2"
                    />
                </div>
                <button 
                    onClick={handleGenerar}
                    disabled={loading || !fechaTarget}
                    className="bg-blue-600 text-white px-8 py-2 rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 transition-colors"
                >
                    {loading ? "Calculando IA..." : "Generar Proyección"}
                </button>
            </div>

            {datosHora.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* Gráfico de Picos por Hora */}
                    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Clock className="text-orange-500 w-5 h-5" /> Picos de Demanda por Hora
                        </h2>
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={datosHora}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="hora" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    {/* El gráfico detecta automáticamente los productos y les asigna un color */}
                                    {Object.keys(datosHora[0]).filter(k => k !== 'hora').map((producto, idx) => (
                                        <Bar key={producto} dataKey={producto} fill={idx % 2 === 0 ? "#3b82f6" : "#10b981"} radius={[4, 4, 0, 0]} />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Tabla de Logística (Stock Requerido) */}
                    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <ShoppingCart className="text-green-600 w-5 h-5" /> Insumos a Comprar
                        </h2>
                        <div className="overflow-y-auto max-h-[400px]">
                            <table className="min-w-full text-left text-sm">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="p-3 font-semibold text-gray-700">Insumo / Ingrediente</th>
                                        <th className="p-3 font-semibold text-gray-700 text-right">Cantidad Necesaria</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {datosStock.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="p-3 font-medium text-gray-900">{item.insumo}</td>
                                            <td className="p-3 text-right font-bold text-blue-600">
                                                {Number(item.cantidad).toFixed(2)} <span className="text-gray-500 text-xs font-normal">{item.unidad}</span>
                                            </td>
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