'use client'

import { useState } from "react";
import { getCierreInventario } from "@/actions/report-actions";
import { obtenerResumenVentasDiarias } from "@/actions/cierre-financiero-actions";
import { 
    AlertTriangle, TrendingUp, TrendingDown, PackageSearch, Search, 
    Package, DollarSign, Receipt, CreditCard, Calculator, Clock, ChevronDown, ChevronUp
} from "lucide-react";
// ✨ IMPORTAMOS RECHARTS
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

export default function CierreClient({ sucursales }: { sucursales: any[] }) {
    const [branchId, setBranchId] = useState(sucursales[0]?.id?.toString() || "");
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const [datos, setDatos] = useState<any[]>([]);
    const [datosPagos, setDatosPagos] = useState<any[]>([]);
    const [datosArticulos, setDatosArticulos] = useState<any[]>([]);
    const [datosTurnos, setDatosTurnos] = useState<any[]>([]);
    const [detallesTurnos, setDetallesTurnos] = useState<any[]>([]); // Estado para el detalle de productos
    const [turnoSeleccionado, setTurnoSeleccionado] = useState<string | null>(null); // Estado para abrir/cerrar detalles

    const [kpis, setKpis] = useState({ total_operaciones: 0, total_dinero: 0, ticket_promedio: 0 });
    const [pestañaActiva, setPestañaActiva] = useState("inventario");

    const totalDineroPagos = datosPagos.reduce((sum, item) => sum + Number(item.total_recaudado), 0);
    const totalTickets = datosPagos.reduce((sum, item) => sum + Number(item.cantidad_transacciones), 0);
    const totalDineroArticulos = datosArticulos.reduce((sum, item) => sum + Number(item.total_generado), 0);
    const totalCantidadArticulos = datosArticulos.reduce((sum, item) => sum + Number(item.cantidad_vendida), 0);

    const handleSearch = async () => {
        if (!branchId || !fecha) return;
        setLoading(true);
        setHasSearched(true);
        setTurnoSeleccionado(null); // Reseteamos la vista de detalle al buscar
        
        try {
            const [resultInventario, resultFinanzas] = await Promise.all([
                getCierreInventario({ branchId: Number(branchId), fechaInicio: fecha, fechaFin: fecha }),
                obtenerResumenVentasDiarias(Number(branchId), fecha)
            ]);
            
            if (resultInventario.success) setDatos(resultInventario.data);
            else { alert("ERROR EN BASE DE DATOS (Inventario):\n" + resultInventario.message); setDatos([]); }

            if (resultFinanzas.success) {
                setDatosPagos(resultFinanzas.pagos);
                setDatosArticulos(resultFinanzas.articulos);
                setKpis(resultFinanzas.kpis); 
                setDatosTurnos(resultFinanzas.turnos || []);
                setDetallesTurnos(resultFinanzas.detallesTurnos || []); // ✨ Guardamos los detalles
            } else {
                alert("ERROR EN BASE DE DATOS (Finanzas):\n" + resultFinanzas.message);
                setDatosPagos([]); setDatosArticulos([]); setDatosTurnos([]); setDetallesTurnos([]);
            }
        } catch (error: any) {
            alert("ERROR CRITICO:\n" + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Colores para la gráfica
    const COLORS = ['#3b82f6', '#f97316', '#22c55e', '#a855f7', '#64748b'];

    // Función para manejar el clic en "Ver Detalle"
    const toggleDetalle = (turnoNombre: string) => {
        if (turnoSeleccionado === turnoNombre) {
            setTurnoSeleccionado(null); // Si ya está abierto, lo cierra
        } else {
            setTurnoSeleccionado(turnoNombre); // Abre el seleccionado
        }
    };

    return (
        <div className="space-y-6 w-full max-w-7xl mx-auto">
            <div className="border-b pb-4">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Search className="text-blue-600" /> Panel de Cierre Diario
                </h1>
                <p className="text-gray-600">Consulta el movimiento de almacen y el resumen financiero del dia.</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
                    <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="w-full border border-gray-300 rounded-md p-2">
                        {sucursales.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Cierre</label>
                    <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full border border-gray-300 rounded-md p-2"/>
                </div>
                <button onClick={handleSearch} disabled={loading || !branchId} className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center gap-2 transition-colors">
                    <PackageSearch className="w-4 h-4" />
                    {loading ? "Calculando..." : "Generar Cierre"}
                </button>
            </div>

            {hasSearched && (
                <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="flex border-b border-gray-200 bg-gray-50 flex-wrap">
                        <button className={`flex-1 min-w-[200px] py-4 text-center font-bold flex items-center justify-center gap-2 transition-colors ${pestañaActiva === 'inventario' ? 'text-blue-700 border-b-2 border-blue-700 bg-white' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setPestañaActiva('inventario')}>
                            <Package className="w-5 h-5" /> Cuadre de Almacen
                        </button>
                        <button className={`flex-1 min-w-[200px] py-4 text-center font-bold flex items-center justify-center gap-2 transition-colors ${pestañaActiva === 'finanzas' ? 'text-green-700 border-b-2 border-green-700 bg-white' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setPestañaActiva('finanzas')}>
                            <DollarSign className="w-5 h-5" /> Resumen Financiero
                        </button>
                        <button className={`flex-1 min-w-[200px] py-4 text-center font-bold flex items-center justify-center gap-2 transition-colors ${pestañaActiva === 'turnos' ? 'text-orange-700 border-b-2 border-orange-700 bg-white' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setPestañaActiva('turnos')}>
                            <Clock className="w-5 h-5" /> Análisis por Turnos
                        </button>
                    </div>

                    <div className="p-6">
                        {pestañaActiva === 'inventario' && (
                            <div className="animate-in fade-in duration-300">
                                <h2 className="text-lg font-bold text-gray-800 mb-4">Rotacion de Ingredientes</h2>
                                {/* Tu código de inventario sigue aquí intacto... */}
                                 <div className="overflow-x-auto border rounded-lg max-h-[600px] overflow-y-auto">
                                    <table className="min-w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-gray-100 border-b border-gray-200 sticky top-0">
                                            <tr>
                                                <th className="p-3 font-semibold text-gray-700">Producto / Insumo</th>
                                                <th className="p-3 font-semibold text-gray-700 text-center">Stock Teorico Inicio</th>
                                                <th className="p-3 font-semibold text-blue-700 text-center">+ Ingresos Hoy</th>
                                                <th className="p-3 font-semibold text-orange-700 text-center">- Ventas/Consumo</th>
                                                <th className="p-3 font-semibold text-gray-900 text-center">Stock Actual</th>
                                                <th className="p-3 font-semibold text-gray-700 text-center">Estado / Rotacion</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {datos.length === 0 ? (
                                                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No hay movimientos en esta fecha.</td></tr>
                                            ) : (
                                                datos.map((item, idx) => {
                                                    const stockActual = Number(item.stock_actual);
                                                    const ingresos = Number(item.ingresos_rango);
                                                    const salidas = Number(item.salidas_rango);
                                                    const stockInicio = stockActual - ingresos + salidas;

                                                    const diasCobertura = salidas > 0 ? (stockActual / salidas) : (stockActual > 0 ? 999 : 0);
                                                    const isOverstock = diasCobertura > 5 && stockActual > 0; 
                                                    const isDesabastecido = stockActual <= 0;

                                                    return (
                                                        <tr key={idx} className={`hover:bg-gray-50 transition-colors ${isOverstock ? 'bg-red-50/50' : ''}`}>
                                                            <td className="p-3 font-medium text-gray-900">
                                                                {item.producto} <span className="text-xs text-gray-500 font-normal">({item.unidad})</span>
                                                            </td>
                                                            <td className="p-3 text-center text-gray-600">{stockInicio.toFixed(2)}</td>
                                                            <td className="p-3 text-center text-blue-600 font-medium">+{ingresos.toFixed(2)}</td>
                                                            <td className="p-3 text-center text-orange-600 font-medium">-{salidas.toFixed(2)}</td>
                                                            <td className="p-3 text-center font-bold text-gray-900 text-lg">
                                                                {stockActual.toFixed(2)}
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                {isOverstock ? (
                                                                    <span className="flex items-center justify-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded border border-red-200">
                                                                        <AlertTriangle className="w-3 h-3" /> Exceso ({diasCobertura.toFixed(0)} dias)
                                                                    </span>
                                                                ) : isDesabastecido ? (
                                                                    <span className="flex items-center justify-center gap-1 text-xs font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                                                                        <TrendingDown className="w-3 h-3 text-red-500" /> Agotado
                                                                    </span>
                                                                ) : (
                                                                    <span className="flex items-center justify-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded">
                                                                        <TrendingUp className="w-3 h-3" /> Saludable
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {pestañaActiva === 'finanzas' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-5 shadow-sm flex items-center gap-4">
                                        <div className="p-3 bg-green-500 text-white rounded-full"><DollarSign className="w-6 h-6" /></div>
                                        <div>
                                            <p className="text-sm font-medium text-green-800">Ingresos Totales</p>
                                            <p className="text-2xl font-bold text-green-900">S/ {Number(kpis.total_dinero).toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-5 shadow-sm flex items-center gap-4">
                                        <div className="p-3 bg-blue-500 text-white rounded-full"><Receipt className="w-6 h-6" /></div>
                                        <div>
                                            <p className="text-sm font-medium text-blue-800">Total Transacciones</p>
                                            <p className="text-2xl font-bold text-blue-900">{kpis.total_operaciones} Operación{kpis.total_operaciones !== 1 ? 'es' : ''}</p>
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-5 shadow-sm flex items-center gap-4">
                                        <div className="p-3 bg-purple-500 text-white rounded-full"><Calculator className="w-6 h-6" /></div>
                                        <div>
                                            <p className="text-sm font-medium text-purple-800">Ticket Promedio</p>
                                            <p className="text-2xl font-bold text-purple-900">S/ {Number(kpis.ticket_promedio).toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="bg-white border rounded-lg p-5 shadow-sm flex flex-col h-fit">
                                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><CreditCard className="text-green-600 w-5 h-5" /> Ingresos por Metodo de Pago</h2>
                                        <div className="overflow-hidden rounded-md border">
                                            <table className="min-w-full text-left text-sm">
                                                <thead className="bg-gray-50">
                                                    <tr><th className="p-3 font-semibold text-gray-700">Metodo</th><th className="p-3 font-semibold text-gray-700 text-center">Transacciones</th><th className="p-3 font-semibold text-gray-700 text-right">Total</th></tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {datosPagos.length > 0 ? datosPagos.map((pago, idx) => (
                                                        <tr key={idx} className="hover:bg-gray-50"><td className="p-3 font-medium uppercase text-gray-800">{pago.metodo_pago}</td><td className="p-3 text-center text-gray-600">{pago.cantidad_transacciones}</td><td className="p-3 text-right text-gray-800">S/ {Number(pago.total_recaudado).toFixed(2)}</td></tr>
                                                    )) : <tr><td colSpan={3} className="p-4 text-center text-gray-500">No hay ventas registradas</td></tr>}
                                                </tbody>
                                                <tfoot className="bg-green-50 border-t border-green-200">
                                                    <tr><td className="p-3 font-bold text-green-900">TOTALES</td><td className="p-3 text-center font-bold text-green-900">{totalTickets}</td><td className="p-3 text-right font-bold text-green-700 text-lg">S/ {totalDineroPagos.toFixed(2)}</td></tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                    <div className="bg-white border rounded-lg p-5 shadow-sm flex flex-col h-fit">
                                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><TrendingUp className="text-blue-600 w-5 h-5" /> Articulos Vendidos</h2>
                                        <div className="overflow-hidden rounded-md border">
                                            <table className="min-w-full text-left text-sm">
                                                <thead className="bg-gray-50">
                                                    <tr><th className="p-3 font-semibold text-gray-700">Platillo / Articulo</th><th className="p-3 font-semibold text-gray-700 text-center">Cant.</th><th className="p-3 font-semibold text-gray-700 text-right">Generado</th></tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {datosArticulos.length > 0 ? datosArticulos.map((art, idx) => (
                                                        <tr key={idx} className="hover:bg-gray-50"><td className="p-3 font-medium text-gray-800">{art.articulo}</td><td className="p-3 text-center text-gray-600">{Number(art.cantidad_vendida).toFixed(0)}</td><td className="p-3 text-right text-gray-800">S/ {Number(art.total_generado).toFixed(2)}</td></tr>
                                                    )) : <tr><td colSpan={3} className="p-4 text-center text-gray-500">No hay detalles de venta</td></tr>}
                                                </tbody>
                                                <tfoot className="bg-blue-50 border-t border-blue-200">
                                                    <tr><td className="p-3 font-bold text-blue-900">TOTALES</td><td className="p-3 text-center font-bold text-blue-900">{totalCantidadArticulos.toFixed(0)}</td><td className="p-3 text-right font-bold text-blue-700 text-lg">S/ {totalDineroArticulos.toFixed(2)}</td></tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ✨ NUEVA VISTA: GRÁFICA Y DETALLES POR TURNO */}
                        {pestañaActiva === 'turnos' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                
                                {/* 1. Gráfica de Barras */}
                                <div className="bg-white border rounded-lg p-5 shadow-sm">
                                    <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                                        <TrendingUp className="text-orange-500 w-5 h-5" /> Ingresos por Turno de Trabajo
                                    </h2>
                                    {datosTurnos.length > 0 ? (
                                        <div className="h-[350px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={datosTurnos} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                                    {/* Usamos substring(3) para quitar el "1. " o "2. " del nombre del turno */}
                                                    <XAxis dataKey="rango_horas" tickFormatter={(val) => val.substring(3).split('(')[0].trim()} stroke="#6b7280" />
                                                    <YAxis stroke="#6b7280" tickFormatter={(val) => `S/ ${val}`} />
                                                    <RechartsTooltip 
    cursor={{fill: '#f3f4f6'}} 
    contentStyle={{borderRadius: '8px', border: '1px solid #e5e7eb'}} 
    formatter={(value: any) => [`S/ ${Number(value).toFixed(2)}`, 'Generado']} 
    labelFormatter={(label: any) => label ? String(label).substring(3) : ''} 
/>
                                                    <Bar dataKey="total_generado" radius={[4, 4, 0, 0]}>
                                                        {datosTurnos.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <div className="h-[200px] flex items-center justify-center text-gray-500">No hay datos de turnos para graficar</div>
                                    )}
                                </div>

                                {/* 2. Lista de Turnos con Botón de "Ver Detalle" */}
                                <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                                    <div className="p-5 border-b bg-gray-50">
                                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                            <Package className="text-orange-500 w-5 h-5" /> Detalle de Productos por Turno
                                        </h2>
                                    </div>
                                    
                                    <div className="divide-y divide-gray-200">
                                        {datosTurnos.length > 0 ? datosTurnos.map((turno, idx) => {
                                            const nombreLimpio = turno.rango_horas.substring(3).split('(')[0].trim(); // Ej: "Mañana"
                                            // Filtramos los productos que corresponden a este turno específico
                                            const productosDelTurno = detallesTurnos.filter(d => d.turno_nombre.includes(nombreLimpio));
                                            
                                            return (
                                            <div key={idx} className="flex flex-col">
                                                {/* Fila Principal del Turno */}
                                                <div className="p-5 flex flex-wrap items-center justify-between gap-4 bg-white hover:bg-gray-50 transition-colors">
                                                    <div>
                                                        <p className="font-bold text-gray-800 text-lg">{turno.rango_horas.substring(3)}</p>
                                                        <p className="text-sm text-gray-500">{turno.cantidad_operaciones} operaciones realizadas</p>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <div className="text-right">
                                                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Generado</p>
                                                            <p className="font-bold text-xl text-orange-600">S/ {Number(turno.total_generado).toFixed(2)}</p>
                                                        </div>
                                                        <button 
                                                            onClick={() => toggleDetalle(nombreLimpio)}
                                                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                                                        >
                                                            {turnoSeleccionado === nombreLimpio ? 'Ocultar Detalle' : 'Ver Detalle'}
                                                            {turnoSeleccionado === nombreLimpio ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Acordeón de Productos (Se muestra solo si se hace clic) */}
                                                {turnoSeleccionado === nombreLimpio && (
                                                    <div className="bg-gray-50 p-5 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
                                                        <h4 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wider">Productos Vendidos</h4>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                                            {productosDelTurno.length > 0 ? productosDelTurno.map((prod, i) => (
                                                                <div key={i} className="bg-white p-3 rounded-md border border-gray-200 shadow-sm flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded text-sm">
                                                                            x{prod.cantidad_vendida}
                                                                        </div>
                                                                        <p className="font-medium text-gray-800 truncate" title={prod.articulo}>{prod.articulo}</p>
                                                                    </div>
                                                                    <p className="font-semibold text-gray-600">S/ {Number(prod.total_generado).toFixed(2)}</p>
                                                                </div>
                                                            )) : (
                                                                <p className="text-sm text-gray-500 italic">No hay detalle de productos para este turno.</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}) : (
                                            <div className="p-8 text-center text-gray-500">No hay datos de turnos registrados</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}