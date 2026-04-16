'use client'

import { useState, useEffect } from "react";
import { getPurchaseRequests, obtenerReporteCompras, obtenerPrediccionCompras } from "@/actions/purchase-actions";
import { RequestFormSheet } from "@/components/modules/compras/request-form-sheet";
import { PurchaseRequestActions } from "@/components/modules/compras/purchase-request-actions"; 
import { PurchaseRequestFilters } from "@/components/modules/compras/purchase-request-filters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
// ✨ Nuevos íconos corporativos agregados aquí
import { ShoppingCart, Calendar, MapPin, User, FileText, MessageSquare, TrendingUp, BarChart3, Building2, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

const money = (amount: number, currency: string = 'PEN') => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: currency }).format(amount);
};

const formatDate = (dateString: string) => {
    if(!dateString) return "-";
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
    return adjustedDate.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
};

function StatusBadge({ code, label }: { code: string, label: string }) {
    let styles = "bg-gray-100 text-gray-600 border-gray-200"; 
    if (code === 'PENDIENTE') styles = "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100";
    if (code === 'APROBADO') styles = "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100";
    if (code === 'COMPLETADO') styles = "bg-green-50 text-green-700 border-green-200 hover:bg-green-100";
    if (code === 'RECHAZADO') styles = "bg-red-50 text-red-700 border-red-200 hover:bg-red-100";

    return (
        <Badge className={`${styles} shadow-none border font-semibold px-2.5 py-0.5 whitespace-nowrap`}>
            {label}
        </Badge>
    );
}

export default function PurchaseRequestsClient({ 
    initialRequests, 
    branches, 
    userRole, 
    userBranchId 
}: { 
    initialRequests: any[], 
    branches: any[], 
    userRole: string, 
    userBranchId?: number 
}) {
    const [activeTab, setActiveTab] = useState('solicitudes');
    const [requests, setRequests] = useState(initialRequests);

    // ✨ ESTADO CENTRALIZADO PARA LA SUCURSAL SELECCIONADA
    const [selectedBranchId, setSelectedBranchId] = useState<number>(userBranchId || (branches && branches.length > 0 ? branches[0].id : 1));

    const [datosPrediccion, setDatosPrediccion] = useState<any[]>([]);
    const [cargandoPrediccion, setCargandoPrediccion] = useState(false);

    const [reporteInicio, setReporteInicio] = useState<string>(new Date(new Date().setDate(1)).toISOString().split('T')[0]);
    const [reporteFin, setReporteFin] = useState<string>(new Date().toISOString().split('T')[0]);
    const [datosReporte, setDatosReporte] = useState<any[]>([]);
    const [cargandoReporte, setCargandoReporte] = useState(false);

    useEffect(() => {
        setRequests(initialRequests);
    }, [initialRequests]);

    const loadData = async (filtros: any) => {
        const data = await getPurchaseRequests(filtros);
        setRequests(data);
    };

    const handleGenerarPrediccion = async () => {
        setCargandoPrediccion(true);
        const res = await obtenerPrediccionCompras(selectedBranchId); // ✨ Ahora usa la sucursal del dropdown
        if (res.success) setDatosPrediccion(res.data);
        else alert("Error al analizar el inventario. Revisa la consola del servidor.");
        setCargandoPrediccion(false);
    };

    const handleGenerarReporte = async () => {
        setCargandoReporte(true);
        const res = await obtenerReporteCompras(selectedBranchId, reporteInicio, reporteFin); // ✨ Ahora usa la sucursal del dropdown
        if (res.success) setDatosReporte(res.data);
        else alert("Error al generar el reporte. Revisa la consola del servidor.");
        setCargandoReporte(false);
    };

    // ✨ COMPONENTE REUTILIZABLE: Selector de Sucursal
    const BranchSelector = () => (
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm w-full sm:w-auto">
            <Building2 className="w-4 h-4 text-gray-500 shrink-0" />
            <span className="text-sm font-semibold text-gray-700 hidden md:inline">Sucursal:</span>
            <select 
                className="bg-transparent text-sm font-bold text-slate-800 outline-none cursor-pointer w-full"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(Number(e.target.value))}
            >
                {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                ))}
            </select>
        </div>
    );

    return (
      <div className="space-y-8 p-1 md:p-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">Módulo de Compras</h1>
            <p className="text-sm text-muted-foreground">Gestione requerimientos, analice inventario y revise reportes.</p>
          </div>
          {activeTab === 'solicitudes' && (
              <div className="w-full sm:w-auto">
                  <RequestFormSheet userBranchId={userBranchId} userRole={userRole} />
              </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setActiveTab('solicitudes')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'solicitudes' ? 'bg-white shadow text-slate-800' : 'text-gray-600 hover:text-gray-900'}`}>Bandeja de Requerimientos</button>
            <button onClick={() => setActiveTab('prediccion')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'prediccion' ? 'bg-white shadow text-slate-800' : 'text-gray-600 hover:text-gray-900'}`}>Predicción de Stock</button>
            <button onClick={() => setActiveTab('reportes')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'reportes' ? 'bg-white shadow text-slate-800' : 'text-gray-600 hover:text-gray-900'}`}>Reporte Histórico</button>
        </div>

        {/* ==================== TAB 1: SOLICITUDES ==================== */}
        {activeTab === 'solicitudes' && (
            <>
                <PurchaseRequestFilters 
                    onFilterChange={loadData} 
                    branches={branches} 
                    availableRequests={initialRequests} 
                    userRole={userRole} 
                />

                <Card className="shadow-sm border-gray-200 overflow-hidden">
                <CardHeader className="pb-3 border-b border-gray-100 bg-gray-50/40 px-6 py-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-100 rounded-md">
                            <ShoppingCart className="w-4 h-4 text-blue-600" />
                        </div>
                        <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                            Bandeja de Requerimientos
                        </CardTitle>
                    </div>
                </CardHeader>
                
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-100">
                            <TableHead className="w-[100px] pl-6">Código</TableHead>
                            <TableHead className="w-[140px]">Fecha</TableHead>
                            <TableHead>Sucursal / Solicitante</TableHead>
                            <TableHead className="w-[30%]">Descripción</TableHead>
                            <TableHead className="text-right">Monto Est.</TableHead>
                            <TableHead className="text-center">Estado</TableHead>
                            <TableHead className="text-right w-[50px] pr-6"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {requests.map((req: any) => (
                            <TableRow key={req.id} className="group transition-colors hover:bg-blue-50/40 border-b border-gray-50 last:border-0">
                                <TableCell className="pl-6 font-mono text-xs font-medium text-gray-500">
                                REQ-{req.id.toString().padStart(6, '0')}
                                </TableCell>
                                
                                <TableCell>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Calendar className="w-3 h-3 text-gray-400" />
                                    {formatDate(req.issue_date)}
                                </div>
                                </TableCell>
                                
                                <TableCell>
                                <div className="flex flex-col gap-1">
                                    <span className="font-semibold text-gray-800 text-xs flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-blue-500" /> {req.branch_name}
                                    </span>
                                    <span className="text-xs text-gray-500 flex items-center gap-1 ml-4">
                                        <User className="w-3 h-3" /> {req.requester_name}
                                    </span>
                                </div>
                                </TableCell>
                                
                                <TableCell>
                                <div className="flex flex-col gap-2">
                                    <p className="text-sm text-gray-700 line-clamp-2 leading-snug" title={req.description}>
                                        {req.description}
                                    </p>
                                    {req.is_direct_purchase === 1 && (
                                        <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 w-fit">
                                            ⚡ COMPRA DIRECTA
                                        </span>
                                    )}
                                    {req.approval_comment && (
                                        <div className="flex gap-2 items-start p-2 rounded-md bg-yellow-50/80 border border-yellow-100 mt-1">
                                            <MessageSquare className="w-3 h-3 text-yellow-600 mt-0.5 shrink-0" />
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-yellow-700 uppercase tracking-tight">Nota:</span>
                                                <p className="text-xs text-gray-700 italic leading-relaxed">
                                                    "{req.approval_comment}"
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                </TableCell>
                                
                                <TableCell className="text-right font-medium text-gray-900">
                                {money(req.estimated_total, req.currency)}
                                </TableCell>
                                
                                <TableCell className="text-center">
                                <StatusBadge code={req.status_code} label={req.status_desc} />
                                </TableCell>

                                <TableCell className="text-right pr-6">
                                <PurchaseRequestActions request={req} userRole={userRole} />
                                </TableCell>
                            </TableRow>
                            ))}
                            
                            {requests.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-24 text-gray-500">
                                <div className="flex flex-col items-center justify-center gap-4">
                                    <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center">
                                        <FileText className="w-8 h-8 text-gray-300" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-medium text-gray-900">No hay solicitudes</p>
                                        <p className="text-sm text-gray-400 mt-1">Intente con otros filtros o cree una nueva.</p>
                                    </div>
                                </div>
                                </TableCell>
                            </TableRow>
                            )}
                        </TableBody>
                        </Table>
                    </div>
                </CardContent>
                </Card>
            </>
        )}

        {/* ==================== TAB 2: PREDICCIÓN INTELIGENTE (REDISEÑADO) ==================== */}
        {activeTab === 'prediccion' && (
            <div className="space-y-6">
                <div className="bg-slate-800 p-6 rounded-xl shadow-md text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-3">
                            <TrendingUp className="w-6 h-6 text-blue-400"/> 
                            Análisis de Abastecimiento
                        </h2>
                        <p className="text-slate-300 text-sm mt-1">Evaluación del ritmo de salidas para sugerir volumen de compra exacto.</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                        <BranchSelector />
                        <button 
                            onClick={handleGenerarPrediccion} 
                            disabled={cargandoPrediccion} 
                            className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${cargandoPrediccion ? 'animate-spin' : ''}`} />
                            {cargandoPrediccion ? 'Calculando...' : 'Analizar Inventario'}
                        </button>
                    </div>
                </div>

                <Card className="shadow-sm border-gray-200 overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50 border-b border-gray-200">
                                        <TableHead className="p-4 font-semibold text-slate-700 pl-6">Producto</TableHead>
                                        <TableHead className="p-4 font-semibold text-slate-700 text-center">Stock Actual</TableHead>
                                        <TableHead className="p-4 font-semibold text-slate-700 text-center">Consumo Diario</TableHead>
                                        <TableHead className="p-4 font-semibold text-slate-700 text-center">Punto Reorden</TableHead>
                                        <TableHead className="p-4 font-semibold text-slate-700 text-center">Estado</TableHead>
                                        <TableHead className="p-4 font-bold text-center bg-blue-50/50 text-blue-900">Sugerencia</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {datosPrediccion.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="p-12 text-center text-gray-500">Selecciona una sucursal y haz clic en "Analizar Inventario".</TableCell></TableRow>
                                    ) : (
                                        datosPrediccion.map((row: any, i: number) => (
                                            <TableRow key={i} className="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                                                <TableCell className="p-4 font-semibold text-slate-800 pl-6">{row.nombre}</TableCell>
                                                <TableCell className="p-4 text-center font-mono text-slate-600">{row.stock_actual}</TableCell>
                                                <TableCell className="p-4 text-center text-slate-500 text-xs">{Number(row.consumo_diario).toFixed(2)} / día</TableCell>
                                                <TableCell className="p-4 text-center font-mono text-slate-400">{row.punto_reorden}</TableCell>
                                                <TableCell className="p-4 text-center">
                                                    <div className="flex justify-center">
                                                        {row.estado.includes('COMPRAR') ? (
                                                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 rounded-md border border-red-100">
                                                                <AlertCircle className="w-3.5 h-3.5" />
                                                                <span className="text-[11px] font-bold uppercase">Reponer</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100">
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                <span className="text-[11px] font-bold uppercase">Óptimo</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="p-4 text-center font-bold text-lg text-blue-700 bg-blue-50/30">
                                                    {row.cantidad_sugerida > 0 ? `+${row.cantidad_sugerida}` : '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}

        {/* ==================== TAB 3: REPORTES (REDISEÑADO) ==================== */}
        {activeTab === 'reportes' && (
            <div className="space-y-6">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm gap-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-slate-500"/> Reporte de Órdenes
                        </h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">Consolida las órdenes de compra y el dinero invertido por sucursal.</p>
                    </div>
                    
                    <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
                        <BranchSelector />
                        
                        <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm w-full md:w-auto">
                            <div className="flex items-center gap-2 px-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Desde</span>
                                <input type="date" className="p-1 outline-none text-sm font-semibold text-slate-700" value={reporteInicio} onChange={e => setReporteInicio(e.target.value)} />
                            </div>
                            <div className="w-px h-6 bg-slate-200"></div>
                            <div className="flex items-center gap-2 px-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hasta</span>
                                <input type="date" className="p-1 outline-none text-sm font-semibold text-slate-700" value={reporteFin} onChange={e => setReporteFin(e.target.value)} />
                            </div>
                        </div>

                        <button 
                            onClick={handleGenerarReporte} 
                            disabled={cargandoReporte} 
                            className="w-full md:w-auto bg-slate-800 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-slate-900 shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <FileText className="w-4 h-4" />
                            {cargandoReporte ? 'Generando...' : 'Generar Reporte'}
                        </button>
                    </div>
                </div>

                <Card className="shadow-sm border-gray-200 overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-800 text-white hover:bg-slate-800">
                                        <TableHead className="text-slate-100 font-semibold pl-6">ID Orden</TableHead>
                                        <TableHead className="text-slate-100 font-semibold text-center">Fecha</TableHead>
                                        <TableHead className="text-slate-100 font-semibold">Proveedor</TableHead>
                                        <TableHead className="text-slate-100 font-semibold text-center">Estado</TableHead>
                                        <TableHead className="text-slate-100 font-semibold">Responsable</TableHead>
                                        <TableHead className="text-white font-bold text-right pr-6">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {datosReporte.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="p-12 text-center text-slate-500 font-medium">Selecciona los parámetros y haz clic en "Generar Reporte".</TableCell></TableRow>
                                    ) : (
                                        datosReporte.map((row: any, i: number) => (
                                            <TableRow key={i} className="hover:bg-slate-50 transition-colors border-b border-gray-100 last:border-0">
                                                <TableCell className="font-mono text-slate-500 text-xs pl-6">OC-{row.orden_id.toString().padStart(6, '0')}</TableCell>
                                                <TableCell className="text-center text-sm">{formatDate(row.fecha_emision)}</TableCell>
                                                <TableCell className="font-semibold text-slate-800">{row.proveedor}</TableCell>
                                                <TableCell className="text-center">
                                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${row.estado === 'COMPLETADO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{row.estado}</span>
                                                </TableCell>
                                                <TableCell className="text-sm text-slate-600 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400"/> {row.responsable}</TableCell>
                                                <TableCell className="text-right font-bold text-base text-slate-900 pr-6">{money(row.total)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}
      </div>
    );
}