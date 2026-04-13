'use client'

import { useState, useEffect } from "react";
import { obtenerCierreMensual } from "@/actions/cierre-mensual-actions";
// IMPORTANTE: Asegúrate de tener esta función o una similar para listar sucursales
import { getBranches } from "@/actions/admin-actions";
import { DollarSign, Receipt, Calculator, CalendarDays, TrendingUp, CreditCard } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function CierreMensualPage() {
    // --- ESTADOS PARA SUCURSALES ---
    const [sucursales, setSucursales] = useState<any[]>([]);
    const [cargandoSedes, setCargandoSedes] = useState(true);

    // --- ESTADOS DEL FORMULARIO ---
    const [branchId, setBranchId] = useState("0"); // 0 = Todas las sedes
    const [periodo, setPeriodo] = useState(""); 
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // --- ESTADOS DE DATOS ---
    const [datosPagos, setDatosPagos] = useState<any[]>([]);
    const [datosArticulos, setDatosArticulos] = useState<any[]>([]);
    const [datosTurnos, setDatosTurnos] = useState<any[]>([]);
    const [kpis, setKpis] = useState({ total_operaciones: 0, total_dinero: 0, ticket_promedio: 0 });

  // --- EFECTO INICIAL: CARGAR SUCURSALES ---
    useEffect(() => {
        async function fetchSucursales() {
            try {
                // Ahora usamos el nombre correcto y recibimos el arreglo directo
                const result = await getBranches(); 
                
                // Si result es un arreglo y tiene datos, lo guardamos
                if (Array.isArray(result) && result.length > 0) {
                    setSucursales(result);
                } else {
                    console.error("No se encontraron sucursales o el arreglo está vacío.");
                }
            } catch (error) {
                console.error("Error en la petición de sucursales", error);
            } finally {
                setCargandoSedes(false);
            }
        }
        fetchSucursales();
    }, []);

    // --- FUNCIÓN DE BÚSQUEDA ---
    const handleSearch = async () => {
        if (!periodo) return alert("Por favor selecciona un mes a consultar.");
        
        setLoading(true);
        setHasSearched(true);
        const result = await obtenerCierreMensual(Number(branchId), periodo);
        
        if (result.success) {
            setDatosPagos(result.pagos);
            setDatosArticulos(result.articulos);
            setKpis(result.kpis);
            setDatosTurnos(result.turnos);
        } else {
            alert(result.message);
        }
        setLoading(false);
    };

    return (
        <div className="p-6 w-full max-w-7xl mx-auto space-y-6">
            <div className="border-b pb-4">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <CalendarDays className={branchId === "0" ? "text-purple-600" : "text-blue-600"} /> 
                    {branchId === "0" ? "Cierre Mensual Consolidado" : "Cierre Mensual por Sucursal"}
                </h1>
                <p className="text-gray-600">Resumen macro-financiero y rendimiento acumulado del mes.</p>
            </div>

            {/* CONTROLES */}
            <div className={`p-4 rounded-lg shadow-sm border flex flex-col md:flex-row gap-4 items-end ${branchId === "0" ? "bg-purple-50 border-purple-200" : "bg-white border-gray-200"}`}>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alcance del Reporte</label>
                    <select 
                        value={branchId} 
                        onChange={(e) => setBranchId(e.target.value)} 
                        className="w-full border border-gray-300 rounded-md p-2 font-semibold bg-white"
                        disabled={cargandoSedes}
                    >
                        <option value="0">TODAS LAS SEDES (Consolidado)</option>
                        {cargandoSedes ? (
                            <option value="" disabled>Cargando sedes...</option>
                        ) : (
                            sucursales.map((sede) => (
                                <option key={sede.id} value={sede.id}>
                                    {sede.name}
                                </option>
                            ))
                        )}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mes a Consultar</label>
                    <input 
                        type="month" 
                        value={periodo} 
                        onChange={(e) => setPeriodo(e.target.value)} 
                        className="w-full border border-gray-300 rounded-md p-2" 
                    />
                </div>
                <button 
                    onClick={handleSearch} 
                    disabled={loading || !periodo || cargandoSedes} 
                    className={`text-white px-8 py-2 rounded-md font-medium disabled:opacity-50 transition-colors ${branchId === "0" ? "bg-purple-600 hover:bg-purple-700" : "bg-blue-600 hover:bg-blue-700"}`}
                >
                    {loading ? "Procesando Mes..." : "Generar Cierre Mensual"}
                </button>
            </div>

            {/* VISTA DE RESULTADOS */}
            {hasSearched && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    
                    {/* KPIs SUPERIORES */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex items-center gap-4">
                            <div className="p-4 bg-green-100 text-green-700 rounded-full"><DollarSign className="w-8 h-8" /></div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 uppercase">Ingresos del Mes</p>
                                <p className="text-3xl font-bold text-gray-900">S/ {Number(kpis.total_dinero).toFixed(2)}</p>
                            </div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex items-center gap-4">
                            <div className="p-4 bg-blue-100 text-blue-700 rounded-full"><Receipt className="w-8 h-8" /></div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 uppercase">Total Tickets Emitidos</p>
                                <p className="text-3xl font-bold text-gray-900">{kpis.total_operaciones}</p>
                            </div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex items-center gap-4">
                            <div className="p-4 bg-purple-100 text-purple-700 rounded-full"><Calculator className="w-8 h-8" /></div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 uppercase">Ticket Promedio</p>
                                <p className="text-3xl font-bold text-gray-900">S/ {Number(kpis.ticket_promedio).toFixed(2)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* GRÁFICA DE RENDIMIENTO MENSUAL POR TURNO */}
                        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <TrendingUp className="text-orange-500 w-5 h-5" /> Ingresos por Franja Horaria (Mensual)
                            </h2>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={datosTurnos} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" tickFormatter={(val) => `S/${val}`} />
                                        <YAxis dataKey="rango_horas" type="category" width={150} tick={{fontSize: 12}} />
                                        <RechartsTooltip formatter={(value: any) => [`S/ ${Number(value).toFixed(2)}`, 'Generado']} />
                                        <Bar dataKey="total_generado" fill="#f97316" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* INGRESOS POR MÉTODO DE PAGO */}
                        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <CreditCard className="text-green-600 w-5 h-5" /> Consolidado de Métodos de Pago
                            </h2>
                            <div className="overflow-hidden rounded-md border">
                                <table className="min-w-full text-left text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="p-3 font-semibold text-gray-700">Método</th>
                                            <th className="p-3 font-semibold text-gray-700 text-center">Tx.</th>
                                            <th className="p-3 font-semibold text-gray-700 text-right">Monto Recaudado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {datosPagos.length > 0 ? (
                                            datosPagos.map((pago, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="p-3 font-medium uppercase text-gray-800">{pago.metodo_pago}</td>
                                                    <td className="p-3 text-center text-gray-600">{pago.cantidad_transacciones}</td>
                                                    <td className="p-3 text-right font-bold text-gray-800">S/ {Number(pago.total_recaudado).toFixed(2)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan={3} className="p-4 text-center text-gray-500">No hay datos registrados</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* TOP PLATILLOS DEL MES */}
                    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">Top Platillos del Mes</h2>
                        <div className="overflow-x-auto rounded-md border">
                            <table className="min-w-full text-left text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="p-3 font-semibold text-gray-700">Producto</th>
                                        <th className="p-3 font-semibold text-gray-700 text-center">Unidades Vendidas</th>
                                        <th className="p-3 font-semibold text-blue-700 text-right">Facturación Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {datosArticulos.length > 0 ? (
                                        datosArticulos.map((art, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="p-3 font-medium text-gray-800">{art.articulo}</td>
                                                <td className="p-3 text-center text-gray-600">{art.cantidad_vendida}</td>
                                                <td className="p-3 text-right font-bold text-blue-600">S/ {Number(art.total_generado).toFixed(2)}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan={3} className="p-4 text-center text-gray-500">No hay platillos registrados</td></tr>
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