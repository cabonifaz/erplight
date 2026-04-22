'use client'

import { useState, useEffect } from "react";
import { generarProyeccion, obtenerHistorialProyecciones, obtenerDetalleProyeccion } from "@/actions/projection-actions";
import { getBranches } from "@/actions/admin-actions"; 
import { TrendingUp, History, Search, ChevronRight, Calculator, Filter, Clock, ShoppingCart, Utensils, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function ProyeccionesPage() {
    const [sucursales, setSucursales] = useState<any[]>([]);
    const [cargandoSedes, setCargandoSedes] = useState(true);
    const [branchId, setBranchId] = useState(""); 
    
    const today = new Date().toISOString().split('T')[0];
    const [targetDate, setTargetDate] = useState(today);
    const [loading, setLoading] = useState(false);
    
    const [historial, setHistorial] = useState<any[]>([]);
    const [filtroHistorial, setFiltroHistorial] = useState("");

    const [proyeccionSeleccionada, setProyeccionSeleccionada] = useState<any | null>(null);
    const [detalles, setDetalles] = useState<any[]>([]);
    const [datosHora, setDatosHora] = useState<any[]>([]);
    const [datosStock, setDatosStock] = useState<any[]>([]);

    const formatMoneda = (valor: any) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(Number(valor) || 0);
    const formatFechaHora = (fecha: string) => new Date(fecha).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    useEffect(() => {
        async function fetchSucursales() {
            try {
                const result = await getBranches(); 
                if (Array.isArray(result) && result.length > 0) {
                    setSucursales(result);
                    setBranchId(result[0].id.toString());
                }
            } catch (error) {
                console.error("Error cargando sucursales", error);
            } finally {
                setCargandoSedes(false);
            }
        }
        fetchSucursales();
    }, []);

    useEffect(() => {
        if (branchId) cargarHistorial();
    }, [branchId]);

    const cargarHistorial = async () => {
        const res = await obtenerHistorialProyecciones(Number(branchId));
        if (res.success) setHistorial(res.data);
    };

    const handleGenerar = async () => {
        setLoading(true);
        const res = await generarProyeccion(Number(branchId), targetDate);
        if (res.success) {
            alert("✅ Proyección generada con éxito basándose en el historial de las últimas 4 semanas.");
            await cargarHistorial(); 
        } else {
            alert("❌ Error al generar: " + res.message);
        }
        setLoading(false);
    };

    const verDetalle = async (proyeccion: any) => {
        setProyeccionSeleccionada(proyeccion);
        const res = await obtenerDetalleProyeccion(proyeccion.id);
        if (res.success) {
            setDetalles(res.data.articulos || []);
            setDatosHora(res.data.horas || []);
            setDatosStock(res.data.stock || []);
        }
    };

    const historialFiltrado = historial.filter(h => {
        if (!filtroHistorial) return true;
        const target = new Date(h.target_date).toISOString().split('T')[0];
        return target.includes(filtroHistorial);
    });

    return (
        <div className="p-6 w-full max-w-7xl mx-auto space-y-6">
            <div className="border-b pb-4">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="text-purple-600" /> Inteligencia Predictiva de Ventas
                </h1>
                <p className="text-gray-500 mt-1">Calcula ventas, picos de hora y necesidades logísticas cruzando el comportamiento real de las últimas 4 semanas con tus recetas.</p>
            </div>

            {/* CONTROLES DE GENERACIÓN */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-5 items-end">
                <div className="flex-1 w-full">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sucursal a Analizar</label>
                    <select 
                        value={branchId} 
                        onChange={(e) => setBranchId(e.target.value)} 
                        className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all outline-none"
                        disabled={cargandoSedes}
                    >
                        {cargandoSedes ? <option>Cargando...</option> : sucursales.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div className="flex-1 w-full">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Fecha a Proyectar</label>
                    <input 
                        type="date" 
                        value={targetDate} 
                        onChange={(e) => setTargetDate(e.target.value)} 
                        min={today}
                        className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all outline-none cursor-pointer"
                    />
                </div>
                <button 
                    onClick={handleGenerar} 
                    disabled={loading || !branchId || !targetDate} 
                    className="bg-purple-600 text-white px-8 py-2.5 rounded-lg hover:bg-purple-700 font-semibold disabled:opacity-70 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all w-full md:w-auto"
                >
                    {loading ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            Calculando Algoritmo...
                        </>
                    ) : (
                        <>
                            <Calculator className="w-4 h-4" /> Ejecutar Predicción
                        </>
                    )}
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
                
                {/* LISTA DE HISTORIAL (PANEL IZQUIERDO - AHORA ES STICKY Y ELEGANTE) */}
                <div className="xl:col-span-1 bg-white border border-gray-100 rounded-xl shadow-sm flex flex-col h-[600px] xl:h-[calc(100vh-140px)] sticky top-6 overflow-hidden">
                    <div className="p-5 bg-white border-b border-gray-100 flex flex-col gap-4 z-10 shadow-sm">
                        <div className="flex items-center gap-2">
                            <History className="w-5 h-5 text-gray-400" />
                            <h2 className="font-bold text-gray-800">Historial Generado</h2>
                        </div>
                        <div className="relative">
                            <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                            <input 
                                type="text" 
                                placeholder="Filtrar por fecha..." 
                                value={filtroHistorial}
                                onChange={(e) => setFiltroHistorial(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                            />
                        </div>
                    </div>
                    
                    {/* SCROLLBAR ESTILIZADO CON TAILWIND */}
                    <div className="overflow-y-auto flex-1 divide-y divide-gray-50 bg-gray-50/30 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 hover:[&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
                        {historialFiltrado.length > 0 ? historialFiltrado.map((h, idx) => {
                            const isZero = Number(h.total_estimado) === 0;
                            const isSelected = proyeccionSeleccionada?.id === h.id;

                            return (
                                <div 
                                    key={idx} 
                                    onClick={() => verDetalle(h)}
                                    className={`p-4 cursor-pointer transition-all hover:bg-purple-50 
                                        ${isSelected ? 'bg-purple-50 border-l-4 border-purple-600' : 'border-l-4 border-transparent'}
                                        ${isZero ? 'opacity-70 grayscale-[50%]' : ''}
                                    `}
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span className={`font-bold px-2.5 py-1 rounded-md text-xs border shadow-sm ${isSelected ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-white text-gray-700 border-gray-200'}`}>
                                            Obj: {new Date(h.target_date).toISOString().split('T')[0]}
                                        </span>
                                        <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-purple-600' : 'text-gray-300'}`} />
                                    </div>
                                    <p className="text-[11px] text-gray-400 mb-1 font-medium tracking-wide">CÁLCULO: {formatFechaHora(h.created_at)}</p>
                                    <p className={`text-sm font-black ${isZero ? 'text-gray-500' : 'text-purple-700'}`}>
                                        {isZero ? 'Sin datos suficientes' : `Total: S/ ${formatMoneda(h.total_estimado)}`}
                                    </p>
                                </div>
                            )
                        }) : (
                            <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center h-full">
                                <Search className="w-10 h-10 text-gray-200 mb-3" />
                                <p className="text-sm font-medium">No hay historial disponible.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* DETALLES COMPLETOS (PANEL DERECHO - AHORA CRECE NATURALMENTE SIN SCROLLBAR PROPIO) */}
                <div className="xl:col-span-3 flex flex-col gap-6">
                    {proyeccionSeleccionada ? (
                        <>
                            {/* HEADER DE IMPACTO */}
                            <div className="p-6 bg-white border border-gray-100 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-600"></div>
                                <div className="z-10 pl-2">
                                    <h2 className="font-black text-gray-900 text-2xl mb-1">Predicción: {new Date(proyeccionSeleccionada.target_date).toISOString().split('T')[0]}</h2>
                                    <p className="text-sm text-gray-500 font-medium flex items-center gap-1.5">
                                        <AlertCircle className="w-4 h-4 text-purple-500" />
                                        Análisis basado en {datosHora.length} franjas horarias comerciales.
                                    </p>
                                </div>
                                <div className="mt-4 sm:mt-0 bg-purple-600 p-4 rounded-xl shadow-lg border border-purple-500 text-right min-w-[200px]">
                                    <p className="text-[11px] text-purple-200 uppercase font-bold tracking-wider mb-1">Ingreso Bruto Esperado</p>
                                    <p className="text-3xl font-black text-white tracking-tight">S/ {formatMoneda(proyeccionSeleccionada.total_estimado)}</p>
                                </div>
                            </div>

                            {/* GRID DE TABLAS (AHORA CRECEN SOLAS, SIN SCROLL) */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                
                                {/* TABLA PLATILLOS */}
                                <div className="bg-white border border-gray-100 rounded-xl shadow-sm flex flex-col overflow-hidden h-full">
                                    <div className="p-4 border-b border-gray-100 bg-gray-50/80">
                                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                            <div className="p-1.5 bg-blue-100 rounded-lg"><Utensils className="w-4 h-4 text-blue-600" /></div>
                                            Platillos y Combos a Preparar
                                        </h3>
                                    </div>
                                    <div className="w-full overflow-x-auto">
                                        <table className="min-w-full text-left text-sm whitespace-nowrap">
                                            <thead className="bg-white border-b border-gray-100">
                                                <tr>
                                                    <th className="p-4 pl-5 font-semibold text-gray-500 text-xs uppercase tracking-wider">Platillo</th>
                                                    <th className="p-4 pr-5 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right">Cant. Estimada</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {detalles.map((d, i) => (
                                                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="p-4 pl-5 font-medium text-gray-800">{d.producto}</td>
                                                        <td className="p-4 pr-5 text-right">
                                                            <span className="inline-flex items-center justify-center px-3.5 py-1 rounded-full bg-purple-100 text-purple-800 font-bold text-sm border border-purple-200">
                                                                {d.cantidad}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* TABLA LOGÍSTICA */}
                                <div className="bg-white border border-gray-100 rounded-xl shadow-sm flex flex-col overflow-hidden h-full">
                                    <div className="p-4 border-b border-gray-100 bg-gray-50/80">
                                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                            <div className="p-1.5 bg-green-100 rounded-lg"><ShoppingCart className="w-4 h-4 text-green-600" /></div>
                                            Consumo Logístico Proyectado
                                        </h3>
                                    </div>
                                    <div className="w-full overflow-x-auto">
                                        <table className="min-w-full text-left text-sm whitespace-nowrap">
                                            <thead className="bg-white border-b border-gray-100">
                                                <tr>
                                                    <th className="p-4 pl-5 font-semibold text-gray-500 text-xs uppercase tracking-wider">Insumo Base</th>
                                                    <th className="p-4 pr-5 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right">Aprovisionamiento</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {datosStock.map((s, i) => (
                                                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="p-4 pl-5 font-medium text-gray-800">{s.insumo}</td>
                                                        <td className="p-4 pr-5 text-right">
                                                            <span className="font-black text-green-600 text-[15px]">{Number(s.cantidad).toFixed(2)}</span>
                                                            <span className="text-xs text-gray-400 font-medium ml-1.5">{s.unidad}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* GRÁFICA DE HORAS CON GRADIENTE */}
                                <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl shadow-sm p-6 h-[360px]">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                            <div className="p-1.5 bg-orange-100 rounded-lg"><Clock className="w-4 h-4 text-orange-600" /></div>
                                            Picos de Demanda por Hora (Tickets)
                                        </h3>
                                    </div>
                                    <div className="h-[240px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={datosHora} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#f97316" stopOpacity={1}/>
                                                        <stop offset="100%" stopColor="#ea580c" stopOpacity={0.7}/>
                                                    </linearGradient>
                                                </defs>
                                                
                                                <CartesianGrid stroke="#f3f4f6" strokeDasharray="4 4" vertical={false} />
                                                <XAxis dataKey="hora" tick={{fill: '#6b7280', fontSize: 12}} axisLine={false} tickLine={false} dy={10} />
                                                <YAxis tick={{fill: '#6b7280', fontSize: 12}} axisLine={false} tickLine={false} />
                                                <RechartsTooltip 
                                                    cursor={{fill: '#f9fafb'}} 
                                                    contentStyle={{borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                                                    formatter={(value: any) => [`${value} Tickets`, 'Carga de Trabajo']} 
                                                />
                                                <Bar dataKey="cantidad" fill="url(#orangeGradient)" radius={[6, 6, 0, 0]} name="Operaciones Esperadas" barSize={40} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-12 text-center bg-white border border-gray-100 border-dashed rounded-2xl shadow-sm min-h-[400px]">
                            <div className="p-4 bg-gray-50 rounded-full mb-4">
                                <Search className="w-12 h-12 text-gray-300" />
                            </div>
                            <p className="text-xl font-bold text-gray-800 mb-2">Selecciona un Historial</p>
                            <p className="text-sm text-gray-500 max-w-md">Navega por el panel izquierdo y haz clic en un cálculo para ver la radiografía predictiva: platillos sugeridos, picos horarios y compras necesarias de inventario.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}