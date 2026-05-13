'use client'

import { useState, useEffect } from "react";
import { obtenerResumenVentasDiarias, verificarEstadoCierre, enviarCierreDiario } from "@/actions/cierre-financiero-actions";
import { obtenerResumenCierreAlmacenParaFinanzas } from "@/actions/almacen-actions"; 
import { 
    AlertTriangle, TrendingUp, PackageSearch, Search, 
    DollarSign, Receipt, CreditCard, Calculator, Clock, ChevronDown, ChevronUp, Lock, Send, CheckCircle, Wallet
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

export default function CierreClient({ sucursales }: { sucursales: any[] }) {
    const [branchId, setBranchId] = useState(sucursales[0]?.id?.toString() || "");
    const [fecha, setFecha] = useState(() => {
        return new Intl.DateTimeFormat('en-CA', { 
            timeZone: 'America/Lima', 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
        }).format(new Date());
    });
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // ESTADOS DE BLOQUEO DE CIERRE
    const [isClosed, setIsClosed] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // ESTADOS LOGÍSTICOS
    const [estadoAlmacenes, setEstadoAlmacenes] = useState({ cerrado: false, total: 0, completados: 0 });
    const [datosAlmacen, setDatosAlmacen] = useState<any[]>([]);

    const [showCashBreakdown, setShowCashBreakdown] = useState(false);
    const [cashBreakdown, setCashBreakdown] = useState({
        billetes_200: '', billetes_100: '', billetes_50: '', billetes_20: '', billetes_10: '',
        monedas_5: '', monedas_2: '', monedas_1: '', monedas_050: '', monedas_020: '', monedas_010: ''
    });

    const [datosPagos, setDatosPagos] = useState<any[]>([]);
    const [datosArticulos, setDatosArticulos] = useState<any[]>([]);
    const [datosTurnos, setDatosTurnos] = useState<any[]>([]);
    const [detallesTurnos, setDetallesTurnos] = useState<any[]>([]); 
    const [turnoSeleccionado, setTurnoSeleccionado] = useState<string | null>(null); 

    const [kpis, setKpis] = useState({ total_operaciones: 0, total_dinero: 0, ticket_promedio: 0 });
    const [pestañaActiva, setPestañaActiva] = useState("almacen");

    const formatMoneda = (valor: any) => {
        return new Intl.NumberFormat('en-US', { 
            minimumFractionDigits: 2,
            maximumFractionDigits: 2 
        }).format(Number(valor) || 0);
    };

    const totalDineroPagos = datosPagos.reduce((sum, item) => sum + Number(item.total_recaudado), 0);
    const totalTickets = datosPagos.reduce((sum, item) => sum + Number(item.cantidad_transacciones), 0);
    const totalDineroArticulos = datosArticulos.reduce((sum, item) => sum + Number(item.total_generado), 0);
    const totalCantidadArticulos = datosArticulos.reduce((sum, item) => sum + Number(item.cantidad_vendida), 0);

    const calcularEfectivoFisico = () => {
        return (
            (Number(cashBreakdown.billetes_200) * 200) +
            (Number(cashBreakdown.billetes_100) * 100) +
            (Number(cashBreakdown.billetes_50) * 50) +
            (Number(cashBreakdown.billetes_20) * 20) +
            (Number(cashBreakdown.billetes_10) * 10) +
            (Number(cashBreakdown.monedas_5) * 5) +
            (Number(cashBreakdown.monedas_2) * 2) +
            (Number(cashBreakdown.monedas_1) * 1) +
            (Number(cashBreakdown.monedas_050) * 0.50) +
            (Number(cashBreakdown.monedas_020) * 0.20) +
            (Number(cashBreakdown.monedas_010) * 0.10)
        );
    };

    const pagoEfectivo = datosPagos.find(p => p.metodo_pago?.toUpperCase() === 'EFECTIVO');
    const totalEfectivoEsperado = pagoEfectivo ? Number(pagoEfectivo.total_recaudado) : 0;
    const totalFisico = calcularEfectivoFisico();
    const diferenciaEfectivo = totalFisico - totalEfectivoEsperado;
    const isCuadrado = Math.abs(diferenciaEfectivo) <= 0.02;

    useEffect(() => {
        setCashBreakdown({
            billetes_200: '', billetes_100: '', billetes_50: '', billetes_20: '', billetes_10: '',
            monedas_5: '', monedas_2: '', monedas_1: '', monedas_050: '', monedas_020: '', monedas_010: ''
        });
    }, [fecha, branchId]);

    const handleSearch = async () => {
        if (!branchId || !fecha) return;
        setLoading(true);
        setHasSearched(true);
        setTurnoSeleccionado(null); 
        
        setCashBreakdown({
            billetes_200: '', billetes_100: '', billetes_50: '', billetes_20: '', billetes_10: '',
            monedas_5: '', monedas_2: '', monedas_1: '', monedas_050: '', monedas_020: '', monedas_010: ''
        });

        try {
            const estadoRes = await verificarEstadoCierre(Number(branchId), fecha);
            setIsClosed(estadoRes.isClosed);

            // ✨ ESTE ES EL BLOQUE QUE DEBES ACTUALIZAR:
            const almacenRes = await obtenerResumenCierreAlmacenParaFinanzas(Number(branchId), fecha);
            if (almacenRes.success) {
                setEstadoAlmacenes({
                    cerrado: almacenRes.isInventarioCerrado,
                    total: almacenRes.totalAlmacenes,
                    completados: almacenRes.almacenesCerrados
                });
                setDatosAlmacen(almacenRes.data);
            } else {
                // ✨ AHORA EL SISTEMA NOS AVISARÁ SI HAY UN ERROR
                alert("ERROR CARGANDO DATOS LOGÍSTICOS:\n" + almacenRes.message);
            }

            const resultFinanzas = await obtenerResumenVentasDiarias(Number(branchId), fecha);
            
            if (resultFinanzas.success) {
                setDatosPagos(resultFinanzas.pagos);
                setDatosArticulos(resultFinanzas.articulos);
                setKpis(resultFinanzas.kpis); 
                
                const turnosRecibidos = resultFinanzas.turnos || [];
                const turnosEstandar = [
                    { id: '1. Mañana', nombreCompleto: '1. Mañana (06:00 - 12:00)' },
                    { id: '2. Tarde', nombreCompleto: '2. Tarde (12:00 - 18:00)' },
                    { id: '3. Noche', nombreCompleto: '3. Noche (18:00 - 23:59)' },
                    { id: '4. Madrugada', nombreCompleto: '4. Madrugada (00:00 - 05:59)' }
                ];

                const turnosCompletos = turnosEstandar.map(turnoBase => {
                    const turnoEncontrado = turnosRecibidos.find((t: any) => 
                        String(t.rango_horas).includes(turnoBase.id)
                    );
                    if (turnoEncontrado) return turnoEncontrado;
                    return { rango_horas: turnoBase.nombreCompleto, cantidad_operaciones: 0, total_generado: 0 };
                });

                setDatosTurnos(turnosCompletos);
                setDetallesTurnos(resultFinanzas.detallesTurnos || []); 

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

    const handleEnviarCierre = async () => {
        if (!confirm("⚠️ ¿Estás seguro de enviar el Cierre Diario?\n\nEsta acción es IRREVERSIBLE y el día quedará bloqueado.")) {
            return;
        }
        
        setIsSending(true);
        const res = await enviarCierreDiario(Number(branchId), fecha, cashBreakdown);
        
        if (res.success) {
            setIsClosed(true);
            setShowCashBreakdown(false);
            setCashBreakdown({
                billetes_200: '', billetes_100: '', billetes_50: '', billetes_20: '', billetes_10: '',
                monedas_5: '', monedas_2: '', monedas_1: '', monedas_050: '', monedas_020: '', monedas_010: ''
            });
            alert("✅ " + res.message);
        } else {
            alert("❌ Error: " + res.message);
        }
        setIsSending(false);
    };

    const COLORS = ['#3b82f6', '#f97316', '#8b5cf6', '#10b981', '#ef4444', '#64748b'];
    const getShiftNameOnly = (val: any) => val ? String(val).replace(/^[0-9]+\.\s*/, '').split('(')[0].trim() : "";
    const getShiftFullName = (val: any) => val ? String(val).replace(/^[0-9]+\.\s*/, '').trim() : "";

    const toggleDetalle = (turnoNombre: string) => {
        if (turnoSeleccionado === turnoNombre) setTurnoSeleccionado(null);
        else setTurnoSeleccionado(turnoNombre);
    };

    const almacenesAgrupados = datosAlmacen.reduce((acc: any, item) => {
        if (!acc[item.almacen_nombre]) acc[item.almacen_nombre] = [];
        acc[item.almacen_nombre].push(item);
        return acc;
    }, {});

    return (
        <div className="space-y-6 w-full max-w-7xl mx-auto">
            <div className="border-b pb-4">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Search className="text-blue-600" /> Panel de Cierre Diario
                </h1>
                <p className="text-gray-600">Consulta el movimiento de almacén y el resumen financiero del día.</p>
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
                    
                    <div className="bg-gray-100 p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            {isClosed ? (
                                <div className="bg-red-100 text-red-800 border border-red-200 px-4 py-2 rounded-md font-bold flex items-center gap-2 shadow-sm whitespace-nowrap">
                                    <Lock className="w-5 h-5" /> 
                                    CIERRE ENVIADO Y BLOQUEADO
                                    <span className="text-xs font-normal ml-2 opacity-80">(Solo lectura)</span>
                                </div>
                            ) : (
                                <div className="bg-green-100 text-green-800 border border-green-200 px-4 py-2 rounded-md font-bold flex items-center gap-2 shadow-sm whitespace-nowrap">
                                    <CheckCircle className="w-5 h-5" />
                                    DÍA ABIERTO Y EDITABLE
                                </div>
                            )}

                            {!estadoAlmacenes.cerrado && !isClosed && (
                                <div className="bg-orange-100 text-orange-800 border border-orange-200 px-4 py-2 rounded-md font-bold flex items-center gap-2 shadow-sm animate-pulse whitespace-nowrap">
                                    <AlertTriangle className="w-5 h-5" /> INVENTARIO PENDIENTE ({estadoAlmacenes.completados}/{estadoAlmacenes.total})
                                </div>
                            )}
                        </div>
                        
                        <button 
                            onClick={() => setShowCashBreakdown(true)}
                            disabled={isClosed || isSending || datosPagos.length === 0 || !estadoAlmacenes.cerrado}
                            className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-md font-bold transition-all shadow-sm w-full sm:w-auto
                                ${isClosed ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 
                                  !estadoAlmacenes.cerrado ? 'bg-gray-300 text-gray-500 cursor-not-allowed' :
                                  datosPagos.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 
                                  'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'}`}
                        >
                            {isClosed ? <Lock className="w-4 h-4" /> : !estadoAlmacenes.cerrado ? <Lock className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                            {isClosed ? "Cierre Completado" : !estadoAlmacenes.cerrado ? "Cierra el Almacén Primero" : "Enviar Cierre Diario Definitivo"}
                        </button>
                    </div>

                    <div className="flex border-b border-gray-200 bg-gray-50 flex-wrap">
                        <button className={`flex-1 min-w-[200px] py-4 text-center font-bold flex items-center justify-center gap-2 transition-colors ${pestañaActiva === 'almacen' ? 'text-blue-700 border-b-2 border-blue-700 bg-white' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setPestañaActiva('almacen')}>
                            <PackageSearch className="w-5 h-5" /> Reporte de Almacén y Merma
                        </button>
                        <button className={`flex-1 min-w-[200px] py-4 text-center font-bold flex items-center justify-center gap-2 transition-colors ${pestañaActiva === 'finanzas' ? 'text-green-700 border-b-2 border-green-700 bg-white' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setPestañaActiva('finanzas')}>
                            <DollarSign className="w-5 h-5" /> Resumen Financiero
                        </button>
                        <button className={`flex-1 min-w-[200px] py-4 text-center font-bold flex items-center justify-center gap-2 transition-colors ${pestañaActiva === 'turnos' ? 'text-orange-700 border-b-2 border-orange-700 bg-white' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setPestañaActiva('turnos')}>
                            <Clock className="w-5 h-5" /> Análisis por Turnos
                        </button>
                    </div>

                    <div className="p-6 bg-gray-50/30">
                        {pestañaActiva === 'almacen' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-lg border shadow-sm">
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-800">Auditoría de Almacenes</h2>
                                        <p className="text-sm text-gray-500">Revisa las diferencias reportadas por los almaceneros antes de cerrar la caja.</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="text-center">
                                            <p className="text-xs text-gray-500 font-bold uppercase">Almacenes en la Sede</p>
                                            <p className="text-2xl font-black text-gray-800">{estadoAlmacenes.total}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-gray-500 font-bold uppercase">Cierres Enviados</p>
                                            <p className={`text-2xl font-black ${estadoAlmacenes.cerrado ? 'text-green-600' : 'text-orange-500'}`}>
                                                {estadoAlmacenes.completados}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {datosAlmacen.length > 0 ? (
                                    <div className="space-y-6">
                                        {Object.entries(almacenesAgrupados).map(([nombreAlmacen, items]: [string, any]) => (
                                            <div key={nombreAlmacen} className="bg-white border rounded-lg shadow-sm overflow-hidden">
                                                <div className="bg-slate-800 text-white p-3 font-bold text-sm flex items-center gap-2">
                                                    <PackageSearch className="w-4 h-4 text-blue-400" /> {nombreAlmacen}
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full text-left text-sm">
                                                        <thead className="bg-gray-50 border-b">
                                                            <tr>
                                                                <th className="p-3 font-semibold text-gray-600 w-1/4">Producto / Insumo</th>
                                                                <th className="p-3 font-semibold text-orange-700 text-center bg-orange-50/50">Consumo x Venta</th>
                                                                <th className="p-3 font-semibold text-gray-600 text-center">Stock Sistema (Teórico)</th>
                                                                <th className="p-3 font-semibold text-blue-700 text-center bg-blue-50 border-x">Conteo Físico (Real)</th>
                                                                <th className="p-3 font-black text-red-700 text-center">Merma / Descuadre</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {items.map((prod: any, idx: number) => {
                                                                const diferencia = Number(prod.difference);
                                                                return (
                                                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                                        <td className="p-3 text-gray-800 font-bold">
                                                                            {prod.producto} <span className="text-xs text-gray-400 font-normal">({prod.unidad})</span>
                                                                        </td>
                                                                        <td className="p-3 text-center text-orange-700 font-mono font-bold bg-orange-50/20">
                                                                            {Number(prod.consumido_ventas).toFixed(2)}
                                                                        </td>
                                                                        <td className="p-3 text-center text-gray-600 font-mono">
                                                                            {Number(prod.system_stock).toFixed(2)}
                                                                        </td>
                                                                        <td className="p-3 text-center font-black text-blue-900 bg-blue-50/30 border-x text-base">
                                                                            {Number(prod.physical_stock).toFixed(2)}
                                                                        </td>
                                                                        <td className="p-3 text-center">
                                                                            {diferencia < 0 ? (
                                                                                <span className="px-3 py-1.5 rounded-md text-sm font-black bg-red-100 text-red-800 border border-red-200 shadow-sm">
                                                                                    {diferencia.toFixed(2)}
                                                                                </span>
                                                                            ) : diferencia > 0 ? (
                                                                                <span className="px-3 py-1.5 rounded-md text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                                                                                    +{diferencia.toFixed(2)} (Sobrante)
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-gray-400 font-bold text-xs">OK (Cuadrado)</span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-white p-12 rounded-lg border border-dashed flex flex-col items-center justify-center text-gray-400 gap-3">
                                        <AlertTriangle className="w-12 h-12 opacity-30" />
                                        <p>Ningún almacén ha reportado su cierre físico para el {fecha}.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {pestañaActiva === 'finanzas' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-5 shadow-sm flex items-center gap-4">
                                        <div className="p-3 bg-green-500 text-white rounded-full"><DollarSign className="w-6 h-6" /></div>
                                        <div>
                                            <p className="text-sm font-medium text-green-800">Ingresos Totales</p>
                                            <p className="text-2xl font-bold text-green-900">S/ {formatMoneda(kpis.total_dinero)}</p>
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
                                            <p className="text-2xl font-bold text-purple-900">S/ {formatMoneda(kpis.ticket_promedio)}</p>
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
                                                        <tr key={idx} className="hover:bg-gray-50"><td className="p-3 font-medium uppercase text-gray-800">{pago.metodo_pago}</td><td className="p-3 text-center text-gray-600">{pago.cantidad_transacciones}</td><td className="p-3 text-right text-gray-800">S/ {formatMoneda(pago.total_recaudado)}</td></tr>
                                                    )) : <tr><td colSpan={3} className="p-4 text-center text-gray-500">No hay ventas registradas</td></tr>}
                                                </tbody>
                                                <tfoot className="bg-green-50 border-t border-green-200">
                                                    <tr><td className="p-3 font-bold text-green-900">TOTALES</td><td className="p-3 text-center font-bold text-green-900">{totalTickets}</td><td className="p-3 text-right font-bold text-green-700 text-lg">S/ {formatMoneda(totalDineroPagos)}</td></tr>
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
                                                        <tr key={idx} className="hover:bg-gray-50"><td className="p-3 font-medium text-gray-800">{art.articulo}</td><td className="p-3 text-center text-gray-600">{Number(art.cantidad_vendida).toFixed(0)}</td><td className="p-3 text-right text-gray-800">S/ {formatMoneda(art.total_generado)}</td></tr>
                                                    )) : <tr><td colSpan={3} className="p-4 text-center text-gray-500">No hay detalles de venta</td></tr>}
                                                </tbody>
                                                <tfoot className="bg-blue-50 border-t border-blue-200">
                                                    <tr><td className="p-3 font-bold text-blue-900">TOTALES</td><td className="p-3 text-center font-bold text-blue-900">{totalCantidadArticulos.toFixed(0)}</td><td className="p-3 text-right font-bold text-blue-700 text-lg">S/ {formatMoneda(totalDineroArticulos)}</td></tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {pestañaActiva === 'turnos' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                
                                <div className="bg-white border rounded-lg p-5 shadow-sm">
                                    <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                                        <TrendingUp className="text-orange-500 w-5 h-5" /> Ingresos por Turno de Trabajo
                                    </h2>
                                    {datosTurnos.length > 0 ? (
                                        <div className="h-[350px] w-full">
                                            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                                                <BarChart data={datosTurnos} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                                    <XAxis dataKey="rango_horas" tickFormatter={getShiftNameOnly} stroke="#6b7280" />
                                                    <YAxis stroke="#6b7280" tickFormatter={(val) => `S/ ${formatMoneda(val)}`} />
                                                    <RechartsTooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: '1px solid #e5e7eb'}} formatter={(value: any) => [`S/ ${formatMoneda(value)}`, 'Generado']} labelFormatter={getShiftFullName} />
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

                                <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                                    <div className="p-5 border-b bg-gray-50">
                                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                            <Receipt className="text-orange-500 w-5 h-5" /> Detalle de Productos por Turno
                                        </h2>
                                    </div>
                                    
                                    <div className="divide-y divide-gray-200">
                                        {datosTurnos.length > 0 ? datosTurnos.map((turno, idx) => {
                                            const nombreLimpio = getShiftNameOnly(turno.rango_horas); 
                                            const nombreCompleto = getShiftFullName(turno.rango_horas);
                                            
                                            const productosDelTurno = detallesTurnos.filter(d => {
                                                const dNombreLimpio = getShiftNameOnly(d.turno_nombre);
                                                return dNombreLimpio === nombreLimpio;
                                            });
                                            
                                            return (
                                            <div key={idx} className="flex flex-col">
                                                <div className="p-5 flex flex-wrap items-center justify-between gap-4 bg-white hover:bg-gray-50 transition-colors">
                                                    <div>
                                                        <p className="font-bold text-gray-800 text-lg">{nombreCompleto}</p>
                                                        <p className="text-sm text-gray-500">{turno.cantidad_operaciones} operaciones realizadas</p>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <div className="text-right">
                                                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Generado</p>
                                                            <p className="font-bold text-xl text-orange-600">S/ {formatMoneda(turno.total_generado)}</p>
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

                                                {turnoSeleccionado === nombreLimpio && (
                                                    <div className="bg-gray-50 p-5 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
                                                        <h4 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wider">Productos Vendidos</h4>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                                            {productosDelTurno.length > 0 ? productosDelTurno.map((prod, i) => (
                                                                <div key={i} className="bg-white p-3 rounded-md border border-gray-200 shadow-sm flex items-center justify-between">
                                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                                        <div className="bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded text-sm shrink-0">
                                                                            x{prod.cantidad_vendida}
                                                                        </div>
                                                                        <p className="font-medium text-gray-800 truncate" title={prod.articulo}>{prod.articulo}</p>
                                                                    </div>
                                                                    <p className="font-semibold text-gray-600 shrink-0">S/ {formatMoneda(prod.total_generado)}</p>
                                                                </div>
                                                            )) : (
                                                                <p className="text-sm text-gray-500 italic col-span-full">No hay detalle de productos para este turno.</p>
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

            {showCashBreakdown && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col overflow-hidden max-h-[90vh]">
                        <div className="bg-blue-900 p-5 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <Wallet className="w-6 h-6" /> Arqueo de Caja Físico
                                </h3>
                                <p className="text-sm text-blue-200 mt-1">
                                    Cuenta los billetes y monedas. El total debe cuadrar exactamente con el sistema.
                                </p>
                            </div>
                            <button onClick={() => setShowCashBreakdown(false)} className="text-blue-200 hover:text-white text-3xl font-light">&times;</button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 bg-gray-50 border-b border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <h4 className="font-bold text-gray-700 border-b pb-2 mb-4 uppercase tracking-wider text-sm flex items-center gap-2">
                                        💵 Billetes
                                    </h4>
                                    {[
                                        { k: 'billetes_200', l: 'S/ 200.00' },
                                        { k: 'billetes_100', l: 'S/ 100.00' },
                                        { k: 'billetes_50',  l: 'S/ 50.00' },
                                        { k: 'billetes_20',  l: 'S/ 20.00' },
                                        { k: 'billetes_10',  l: 'S/ 10.00' }
                                    ].map((item) => (
                                        <div key={item.k} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                            <span className="font-bold text-gray-700">{item.l}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-400 font-medium">Cant:</span>
                                                <input 
                                                    type="number" min="0" placeholder="0"
                                                    className="w-20 p-2 border border-gray-300 rounded-md text-right font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                                    value={(cashBreakdown as any)[item.k]}
                                                    onChange={e => setCashBreakdown({...cashBreakdown, [item.k]: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-3">
                                    <h4 className="font-bold text-gray-700 border-b pb-2 mb-4 uppercase tracking-wider text-sm flex items-center gap-2">
                                        🪙 Monedas
                                    </h4>
                                    {[
                                        { k: 'monedas_5',   l: 'S/ 5.00' },
                                        { k: 'monedas_2',   l: 'S/ 2.00' },
                                        { k: 'monedas_1',   l: 'S/ 1.00' },
                                        { k: 'monedas_050', l: 'S/ 0.50' },
                                        { k: 'monedas_020', l: 'S/ 0.20' },
                                        { k: 'monedas_010', l: 'S/ 0.10' }
                                    ].map((item) => (
                                        <div key={item.k} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                            <span className="font-bold text-gray-700">{item.l}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-400 font-medium">Cant:</span>
                                                <input 
                                                    type="number" min="0" placeholder="0"
                                                    className="w-20 p-2 border border-gray-300 rounded-md text-right font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                                    value={(cashBreakdown as any)[item.k]}
                                                    onChange={e => setCashBreakdown({...cashBreakdown, [item.k]: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-white flex flex-col gap-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-gray-100 p-4 rounded-xl border border-gray-200 text-center">
                                    <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Esperado en Sistema</span>
                                    <span className="text-2xl font-black text-gray-800">S/ {totalEfectivoEsperado.toFixed(2)}</span>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-center">
                                    <span className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">Físico Contado</span>
                                    <span className="text-2xl font-black text-blue-700">S/ {totalFisico.toFixed(2)}</span>
                                </div>
                                <div className={`p-4 rounded-xl border text-center ${isCuadrado ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                    <span className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isCuadrado ? 'text-green-800' : 'text-red-800'}`}>Diferencia</span>
                                    <span className={`text-2xl font-black ${isCuadrado ? 'text-green-700' : 'text-red-700'}`}>
                                        {diferenciaEfectivo > 0 ? '+' : ''}S/ {diferenciaEfectivo.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-2">
                                <button 
                                    onClick={() => setShowCashBreakdown(false)}
                                    className="px-6 py-3 text-gray-600 bg-gray-100 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleEnviarCierre}
                                    disabled={isSending || !isCuadrado}
                                    className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-400 shadow-md transition-colors"
                                    title={!isCuadrado ? "Debes cuadrar la caja a S/ 0.00 para poder cerrar el día" : ""}
                                >
                                    {isSending ? 'Enviando...' : (isCuadrado ? 'Confirmar y Cerrar Día' : 'Caja Descuadrada')}
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}