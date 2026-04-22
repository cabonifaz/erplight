'use client'

import { useState, useEffect } from "react";
import { generarProyeccion, obtenerDetalleProyeccion } from "@/actions/projection-actions";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, ShoppingCart, Clock, Utensils, Globe, Calculator, AlertCircle } from "lucide-react";

export default function ProyeccionGlobalPage() {
    const todayFull = new Date().toISOString().split('T')[0]; // Ej: "2026-04-22"
    const todayMonth = todayFull.substring(0, 7); // Ej: "2026-04"

    const [tipoVista, setTipoVista] = useState("DIA"); // 'DIA' o 'MES'
    
    // Inicializamos con la fecha completa
    const [fechaTarget, setFechaTarget] = useState(todayFull);
    const [loading, setLoading] = useState(false);
    
    const [datosHora, setDatosHora] = useState<any[]>([]);
    const [datosStock, setDatosStock] = useState<any[]>([]);
    const [datosMenu, setDatosMenu] = useState<any[]>([]);

    const formatMoneda = (valor: any) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(Number(valor) || 0);

    // ✨ EFECTO MAGICO: Cambia la fecha por defecto cuando cambias el tipo de vista
    useEffect(() => {
        if (tipoVista === "MES") {
            setFechaTarget(todayMonth);
        } else {
            setFechaTarget(todayFull);
        }
    }, [tipoVista, todayMonth, todayFull]);

    const handleGenerar = async () => {
        if (!fechaTarget) return alert("Selecciona una fecha u objetivo válido.");
        
        setLoading(true);
        
        // ✨ TRUCO BACKEND: Si es mes (YYYY-MM), le agregamos el "-01" para que SQL no dé error.
        const dateToSubmit = tipoVista === 'MES' ? `${fechaTarget}-01` : fechaTarget;

        const result = await generarProyeccion(0, dateToSubmit);
        
        if (result.success && result.projectionId) {
            const detallesResult = await obtenerDetalleProyeccion(result.projectionId);

            if (detallesResult.success) {
                // ✨ NUEVA LÓGICA INTELIGENTE DE FECHAS
                let multiplicador = 1;
                if (tipoVista === 'MES') {
                    // Extraemos el año y mes que el usuario eligió
                    const [year, month] = fechaTarget.split('-');
                    // Date(year, month, 0) nos da mágicamente el último día de ese mes
                    const diasDelMes = new Date(Number(year), Number(month), 0).getDate();
                    multiplicador = diasDelMes; 
                }

                const horasData = detallesResult.data.horas || [];
                const groupedByHour = horasData.reduce((acc: any, curr: any) => {
                    const existing = acc.find((item: any) => item.hora === curr.hora);
                    if (existing) {
                        existing.total += Number(curr.cantidad);
                    } else {
                        acc.push({ hora: curr.hora, total: Number(curr.cantidad) });
                    }
                    return acc;
                }, []);

                // APLICAMOS EL MULTIPLICADOR
                const scaledHoras = groupedByHour.map((item: any) => ({
                    ...item,
                    total: item.total * multiplicador
                }));

                const scaledStock = (detallesResult.data.stock || []).map((s: any) => ({
                    ...s,
                    cantidad: Number(s.cantidad) * multiplicador
                }));

                const scaledMenus = (detallesResult.data.articulos || []).map((m: any) => ({
                    ...m,
                    cantidad: Number(m.cantidad) * multiplicador,
                    ingresos: Number(m.ingresos) * multiplicador
                }));

                setDatosHora(scaledHoras);
                setDatosStock(scaledStock);
                setDatosMenu(scaledMenus);
            }
        } else {
            alert(result.message || "Error al generar la proyección");
        }
        setLoading(false);
    };

    const ingresosTotalesProyectados = datosMenu.reduce((sum, item) => sum + Number(item.ingresos), 0);

    const formatMedida = (cantidad: number, unidad: string) => {
        const num = Number(cantidad);
        let finalNum = num;
        let finalUnidad = unidad || 'UND';

        if (unidad === 'GR' && num >= 1000) {
            finalNum = num / 1000;
            finalUnidad = 'KG';
        } else if (unidad === 'ML' && num >= 1000) {
            finalNum = num / 1000;
            finalUnidad = 'LT';
        }

        return (
            <>
                <span className="font-black text-purple-600 text-[15px]">{finalNum.toFixed(2)}</span>
                <span className="text-xs text-gray-400 font-medium ml-1.5">{finalUnidad}</span>
            </>
        );
    };

    return (
        <div className="p-6 w-full max-w-7xl mx-auto space-y-6">
            
            {/* HEADER CORPORATIVO */}
            <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2 tracking-tight">
                        <Globe className="text-purple-600 w-8 h-8" /> 
                        Proyección Consolidada Global
                    </h1>
                    <p className="text-gray-500 mt-1.5 font-medium">Suma total de proyecciones, ingresos y logística de todas las sedes a nivel cadena.</p>
                </div>
                <div className="bg-purple-100 border border-purple-200 text-purple-800 px-4 py-1.5 rounded-full font-bold text-sm shadow-sm inline-flex items-center gap-1.5 self-start sm:self-auto">
                    <TrendingUp className="w-4 h-4" /> Modo Corporativo
                </div>
            </div>

            {/* CONTROLES GLOBALES */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-5 items-end">
                <div className="flex-1 w-full">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Rango de Proyección</label>
                    <select 
                        value={tipoVista} 
                        onChange={(e) => setTipoVista(e.target.value)} 
                        className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all outline-none cursor-pointer"
                    >
                        <option value="DIA">Vista por Día Específico</option>
                        <option value="MES">Vista Mensual Acumulada</option>
                    </select>
                </div>
                <div className="flex-1 w-full">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Fecha Objetivo</label>
                    <input 
                        type={tipoVista === 'MES' ? "month" : "date"} 
                        value={fechaTarget} 
                        onChange={(e) => setFechaTarget(e.target.value)} 
                        min={tipoVista === 'MES' ? todayMonth : todayFull}
                        className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all outline-none cursor-pointer" 
                    />
                </div>
                <button 
                    onClick={handleGenerar} 
                    disabled={loading || !fechaTarget} 
                    className="bg-purple-600 text-white px-8 py-2.5 rounded-lg hover:bg-purple-700 font-semibold disabled:opacity-70 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all w-full md:w-auto"
                >
                    {loading ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            Consolidando Cadena...
                        </>
                    ) : (
                        <>
                            <Calculator className="w-4 h-4" /> Generar Consolidado
                        </>
                    )}
                </button>
            </div>

            {/* RESULTADOS */}
            {datosHora.length > 0 && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* KPI PRINCIPAL */}
                        <div className="bg-gradient-to-br from-purple-600 to-purple-800 p-6 rounded-xl shadow-lg border border-purple-500 flex flex-col justify-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Globe className="w-32 h-32" />
                            </div>
                            <div className="z-10">
                                <h3 className="text-purple-200 font-bold uppercase tracking-wider text-sm mb-2 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    Ingreso Global Estimado ({tipoVista === 'DIA' ? 'Día' : 'Mes'})
                                </h3>
                                <p className="text-5xl font-black text-white tracking-tight">
                                    S/ {formatMoneda(ingresosTotalesProyectados)}
                                </p>
                            </div>
                        </div>
                        
                        {/* TABLA DE MENÚS CONSOLIDADA */}
                        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                            <div className="p-5 border-b border-gray-100 bg-gray-50/80">
                                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <div className="p-1.5 bg-blue-100 rounded-lg"><Utensils className="text-blue-600 w-4 h-4" /></div>
                                    Proyección por Menús (Nivel Cadena)
                                </h2>
                            </div>
                            <div className="w-full overflow-x-auto">
                                <table className="min-w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-white border-b border-gray-100">
                                        <tr>
                                            <th className="p-4 pl-6 font-semibold text-gray-500 text-xs uppercase tracking-wider">Menú / Combo</th>
                                            <th className="p-4 font-semibold text-gray-500 text-xs uppercase tracking-wider text-center">Cant. Proyectada</th>
                                            <th className="p-4 pr-6 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right">Ingreso Estimado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {datosMenu.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="p-4 pl-6 font-medium text-gray-800">{item.producto}</td>
                                                <td className="p-4 text-center">
                                                    <span className="inline-flex items-center justify-center px-3.5 py-1 rounded-full bg-purple-100 text-purple-800 font-bold text-sm border border-purple-200">
                                                        {item.cantidad}
                                                    </span>
                                                </td>
                                                <td className="p-4 pr-6 text-right font-black text-purple-700 text-[15px]">S/ {formatMoneda(item.ingresos)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                        
                        {/* GRÁFICA DE HORAS */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <div className="p-1.5 bg-orange-100 rounded-lg"><Clock className="text-orange-600 w-4 h-4" /></div>
                                    Picos de Demanda (Nacional)
                                </h2>
                            </div>
                            <div className="flex-1 w-full min-h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={datosHora} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#9333ea" stopOpacity={1}/>
                                                <stop offset="100%" stopColor="#7e22ce" stopOpacity={0.7}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid stroke="#f3f4f6" strokeDasharray="4 4" vertical={false} />
                                        <XAxis dataKey="hora" tick={{fill: '#6b7280', fontSize: 12}} axisLine={false} tickLine={false} dy={10} />
                                        <YAxis tick={{fill: '#6b7280', fontSize: 12}} axisLine={false} tickLine={false} />
                                        <RechartsTooltip 
                                            cursor={{fill: '#f9fafb'}} 
                                            contentStyle={{borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                                            formatter={(value: any) => [`${value} Tickets`, 'Operaciones en Caja']} 
                                        />
                                        <Bar dataKey="total" fill="url(#purpleGradient)" radius={[6, 6, 0, 0]} name="Transacciones Esperadas" barSize={50} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* LOGÍSTICA GLOBAL */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
                            <div className="p-5 border-b border-gray-100 bg-gray-50/80">
                                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <div className="p-1.5 bg-green-100 rounded-lg"><ShoppingCart className="text-green-600 w-4 h-4" /></div>
                                    Logística Global (Centro de Acopio)
                                </h2>
                            </div>
                            <div className="w-full flex-1 overflow-x-auto">
                                <table className="min-w-full text-left text-sm whitespace-nowrap h-full">
                                    <thead className="bg-white border-b border-gray-100">
                                        <tr>
                                            <th className="p-4 pl-6 font-semibold text-gray-500 text-xs uppercase tracking-wider">Insumo / Ingrediente</th>
                                            <th className="p-4 pr-6 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right">Compra Total Sugerida</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {datosStock.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="p-4 pl-6 font-medium text-gray-800">{item.insumo}</td>
                                                <td className="p-4 pr-6 text-right">
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