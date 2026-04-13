'use client'

import { useState } from "react";
import { generarProyeccion } from "@/actions/projection-actions";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, ShoppingCart, Clock, DollarSign, Utensils, Globe } from "lucide-react";

export default function ProyeccionGlobalPage() {
    const [fechaTarget, setFechaTarget] = useState("");
    const [tipoVista, setTipoVista] = useState("DIA"); // 'DIA' o 'MES'
    const [loading, setLoading] = useState(false);
    
    const [datosHora, setDatosHora] = useState<any[]>([]);
    const [datosStock, setDatosStock] = useState<any[]>([]);
    const [datosMenu, setDatosMenu] = useState<any[]>([]);

    const handleGenerar = async () => {
        if (!fechaTarget) return alert("Selecciona una fecha futura.");
        
        setLoading(true);
        // ✨ EL SECRETO: Le pasamos un 0 fijo como branchId para traer el consolidado global
        const result = await generarProyeccion(0, fechaTarget, tipoVista);
        
        if (result.success) {
            // ✨ LÓGICA OPTIMIZADA: Sumamos el total de platos por hora
            const groupedByHour = result.horas.reduce((acc: any, curr: any) => {
                const existing = acc.find((item: any) => item.hora === curr.hora);
                if (existing) {
                    existing.total += Number(curr.cantidad);
                } else {
                    acc.push({ hora: curr.hora, total: Number(curr.cantidad) });
                }
                return acc;
            }, []);

            setDatosHora(groupedByHour);
            setDatosStock(result.stock);
            setDatosMenu(result.menus);
        } else {
            alert(result.message);
        }
        setLoading(false);
    };

    const ingresosTotalesProyectados = datosMenu.reduce((sum, item) => sum + Number(item.ingresos), 0);

    // ✨ FUNCIÓN DE FORMATEO DE UNIDADES
    const formatMedida = (cantidad: number, unidad: string) => {
        const num = Number(cantidad);
        
        // Si son gramos y pasan de 1000, mostramos en Kilos
        if (unidad === 'GR' && num >= 1000) {
            return (
                <>
                    {(num / 1000).toFixed(2)} <span className="text-gray-500 text-xs font-normal ml-1">KG</span>
                </>
            );
        }
        // Si son mililitros y pasan de 1000, mostramos en Litros
        if (unidad === 'ML' && num >= 1000) {
            return (
                <>
                    {(num / 1000).toFixed(2)} <span className="text-gray-500 text-xs font-normal ml-1">LT</span>
                </>
            );
        }
        // Si es menor a 1000 o son Unidades, lo mostramos normal
        return (
            <>
                {num.toFixed(2)} <span className="text-gray-500 text-xs font-normal ml-1">{unidad || 'UND'}</span>
            </>
        );
    };

    return (
        <div className="p-6 w-full max-w-7xl mx-auto space-y-6">
            <div className="border-b pb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-purple-900 flex items-center gap-2">
                        <Globe className="text-purple-600" /> Proyección Consolidada Global
                    </h1>
                    <p className="text-gray-600">Suma total de proyecciones, ingresos y logística de todas las sedes a nivel cadena.</p>
                </div>
                <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-full font-bold text-sm">
                    Modo Corporativo
                </div>
            </div>

            {/* CONTROLES GLOBALES */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-200 flex flex-col md:flex-row gap-4 items-end bg-gradient-to-r from-purple-50 to-white">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rango de Proyección</label>
                    <select value={tipoVista} onChange={(e) => setTipoVista(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 bg-white font-semibold">
                        <option value="DIA">Vista por Día Específico</option>
                        <option value="MES">Vista Mensual Acumulada</option>
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio</label>
                    <input type="date" value={fechaTarget} onChange={(e) => setFechaTarget(e.target.value)} className="w-full border border-gray-300 rounded-md p-2" />
                </div>
                <button onClick={handleGenerar} disabled={loading || !fechaTarget} className="bg-purple-600 text-white px-8 py-2 rounded-md hover:bg-purple-700 font-medium disabled:opacity-50 transition-colors shadow-md">
                    {loading ? "Consolidando Cadena..." : "Generar Consolidado Global"}
                </button>
            </div>

            {datosHora.length > 0 && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 p-6 rounded-lg shadow-sm flex flex-col justify-center">
                            <h3 className="text-purple-800 font-semibold flex items-center gap-2 mb-2">
                                <DollarSign className="w-5 h-5" /> Ingresos Globales ({tipoVista === 'DIA' ? 'Día' : 'Mes'})
                            </h3>
                            <p className="text-4xl font-bold text-purple-900">
                                S/ {ingresosTotalesProyectados.toFixed(2)}
                            </p>
                        </div>
                        
                        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Utensils className="text-purple-500 w-5 h-5" /> Proyección por Menús (Toda la cadena)
                            </h2>
                            <div className="overflow-y-auto max-h-[160px]">
                                <table className="min-w-full text-left text-sm">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="p-3 font-semibold text-gray-700">Menú / Combo</th>
                                            <th className="p-3 font-semibold text-gray-700 text-center">Cant. Proyectada</th>
                                            <th className="p-3 font-semibold text-green-700 text-right">Ingreso Estimado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {datosMenu.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="p-3 font-medium text-gray-900">{item.menu}</td>
                                                <td className="p-3 text-center text-gray-600 font-bold">{item.cantidad}</td>
                                                <td className="p-3 text-right font-bold text-green-700">S/ {Number(item.ingresos).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Clock className="text-purple-500 w-5 h-5" /> Picos de Demanda (Nacional)
                            </h2>
                            <div className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    {/* ✨ GRÁFICA LIMPIA CON BARRA MORADA */}
                                    <BarChart data={datosHora} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="hora" />
                                        <YAxis />
                                        <RechartsTooltip 
                                            cursor={{fill: '#f3f4f6'}} 
                                            formatter={(value: any) => [`${value} Platos`, 'Volumen Total']} 
                                        />
                                        <Legend verticalAlign="top" height={36}/>
                                        <Bar 
                                            dataKey="total" 
                                            fill="#9333ea" 
                                            radius={[4, 4, 0, 0]} 
                                            name="Carga de Cocina (Platos)" 
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <ShoppingCart className="text-purple-600 w-5 h-5" /> Logística Global (Centro de Acopio)
                            </h2>
                            <div className="overflow-y-auto max-h-[400px]">
                                <table className="min-w-full text-left text-sm">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="p-3 font-semibold text-gray-700">Insumo / Ingrediente</th>
                                            <th className="p-3 font-semibold text-gray-700 text-right">Compra Total Sugerida</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {datosStock.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="p-3 font-medium text-gray-900">{item.insumo}</td>
                                                <td className="p-3 text-right font-bold text-purple-600">
                                                    {/* ✨ APLICAMOS LA FUNCIÓN AQUÍ */}
                                                    {formatMedida(item.cantidad, item.unidad)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}