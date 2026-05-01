import { auth } from "@/auth";
import { getDashboardInteligente } from "@/actions/main-dashboard-actions"; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, Package, Activity, AlertTriangle, CheckCircle, Clock, TrendingUp, Briefcase } from "lucide-react";

export const dynamic = 'force-dynamic';

// ✨ RECIBIMOS LOS PROPS PARA MANEJAR LA URL ASÍNCRONA
export default async function DashboardPage(props: any) {
    const session = await auth();
    const userName = session?.user?.name || "Usuario";
    
    // ✨ CORRECCIÓN NEXT.JS 15+: Extraemos los parámetros con await
    const searchParams = await props.searchParams;
    const sucursalId = searchParams?.sucursal;
    
    // Le mandamos la sede seleccionada al backend
    const data = await getDashboardInteligente(sucursalId);

    if (!data) {
        return <div className="p-10 text-center font-bold text-gray-500">Cargando módulos del dashboard...</div>;
    }

    if (data.role === 'ERROR') {
        return (
            <div className="p-10 flex flex-col items-center justify-center min-h-[50vh]">
                <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Error en la Base de Datos</h2>
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md font-mono text-sm max-w-2xl text-center">
                    {data.message}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-6">
                Bienvenido, <span className="text-blue-600">{userName}</span>
            </h1>

            {/* ===============================================================
                VISTA 1: ALMACENERO 
            =============================================================== */}
            {data.role === 'ALMACENERO' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="border-red-200 shadow-sm">
                        <CardHeader className="bg-red-50/50 border-b border-red-100 pb-3">
                            <CardTitle className="text-lg font-bold text-red-700 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" /> Stock Crítico (¡Atención!)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 max-h-[400px] overflow-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500 sticky top-0">
                                    <tr><th className="p-3">Producto</th><th className="p-3 text-center">Actual</th><th className="p-3 text-center">Mínimo</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {data.stockCritico.length === 0 ? (
                                        <tr><td colSpan={3} className="p-6 text-center text-gray-400">Todo el stock está en niveles óptimos.</td></tr>
                                    ) : (
                                        data.stockCritico.map((item: any, i: number) => (
                                            <tr key={i} className="hover:bg-red-50">
                                                <td className="p-3 font-bold text-gray-800">{item.producto}</td>
                                                <td className="p-3 text-center font-black text-red-600">{item.stock_current}</td>
                                                <td className="p-3 text-center text-gray-500">{item.min_stock}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        <Card className="shadow-sm">
                            <CardHeader className="bg-yellow-50/50 border-b border-yellow-100 pb-3">
                                <CardTitle className="text-lg font-bold text-yellow-700 flex items-center gap-2">
                                    <Clock className="w-5 h-5" /> Requerimientos Pendientes
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                {data.comprasPendientes.length === 0 ? <p className="text-sm text-gray-400">No hay solicitudes pendientes.</p> : 
                                    data.comprasPendientes.map((compra: any) => (
                                        <div key={compra.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                                            <span className="text-sm font-medium">REQ-{compra.id}</span>
                                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-bold">En Revisión</span>
                                        </div>
                                    ))
                                }
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm">
                            <CardHeader className="bg-green-50/50 border-b border-green-100 pb-3">
                                <CardTitle className="text-lg font-bold text-green-700 flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5" /> Compras Aprobadas (Recientes)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                {data.comprasAprobadas.length === 0 ? <p className="text-sm text-gray-400">Sin aprobaciones recientes.</p> : 
                                    data.comprasAprobadas.map((compra: any) => (
                                        <div key={compra.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-800">REQ-{compra.id}</span>
                                                <span className="text-[10px] text-gray-500">{new Date(compra.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-bold">¡Listo para recibir!</span>
                                        </div>
                                    ))
                                }
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* ===============================================================
                VISTA 2: ADMINISTRADOR DE SUCURSAL / ZONAL
            =============================================================== */}
            {data.role === 'ADMIN_SUCURSAL' && (
                <>
                    {/* ✨ SELECTOR DE SUCURSAL (AHORA 100% DINÁMICO) */}
                    {data.isZonal && (
                        <form action="" method="GET" className="mb-6 flex flex-col sm:flex-row gap-4 items-end bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                            <div className="flex flex-col gap-1 w-full sm:w-auto">
                                <label className="text-sm font-bold text-gray-700">Vista de Administrador Zonal</label>
                                <select 
                                    name="sucursal" 
                                    defaultValue={sucursalId || ""} 
                                    className="border border-gray-300 p-2 rounded-md bg-gray-50 text-sm w-full sm:w-72"
                                >
                                    <option value=""> Todas mis sedes (Suma Global)</option>
                                    
                                    {/* Dibujamos las sedes automáticamente desde la Base de Datos */}
                                    {data.listaSedes?.map((sede: any) => (
                                        <option key={sede.id} value={sede.id}>
                                            {sede.name}
                                        </option>
                                    ))}

                                </select>
                            </div>
                            <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-md text-sm font-bold hover:bg-blue-700 transition-colors">
                                Filtrar Datos
                            </button>
                        </form>
                    )}

                    <div className="grid gap-4 md:grid-cols-3">
                        <Card className="bg-gradient-to-br from-blue-50 to-white shadow-sm border-blue-100">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-bold text-blue-800">Avance de Meta (Hoy)</CardTitle>
                                <DollarSign className="h-4 w-4 text-blue-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-end mb-2">
                                    <div className="text-3xl font-black text-blue-900">S/ {Number(data.kpis.venta_real).toFixed(2)}</div>
                                    <div className="text-xl font-bold text-blue-700">
                                        {data.kpis.venta_proyectada > 0 
                                            ? Math.round((data.kpis.venta_real / data.kpis.venta_proyectada) * 100) 
                                            : 0}%
                                    </div>
                                </div>
                                <div className="w-full bg-blue-100 rounded-full h-3 mb-2">
                                    <div className="bg-blue-600 h-3 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (data.kpis.venta_real / (data.kpis.venta_proyectada || 1)) * 100)}%` }}></div>
                                </div>
                                <p className="text-xs text-blue-600 font-medium">Meta proyectada: S/ {Number(data.kpis.venta_proyectada).toFixed(2)}</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-red-50 to-white shadow-sm border-red-100">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-bold text-red-800">Alertas de Almacén</CardTitle>
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-red-900">{data.kpis.items_criticos}</div>
                                <p className="text-xs text-red-600 font-medium mt-1">Ítems con stock por agotarse</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-purple-50 to-white shadow-sm border-purple-100">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-bold text-purple-800">Personal en Turno Hoy</CardTitle>
                                <Users className="h-4 w-4 text-purple-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-purple-900">{data.turnos.length}</div>
                                <p className="text-xs text-purple-600 font-medium mt-1">Empleados programados</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                        <Card className="shadow-sm">
                            <CardHeader className="border-b pb-3 bg-gray-50/50">
                                <CardTitle className="text-sm font-bold text-gray-700">Top 5 - Proyección de Ventas (Hoy)</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <table className="w-full text-sm text-left">
                                    <tbody className="divide-y divide-gray-100">
                                        {data.topProyectados.length === 0 ? <tr><td className="p-4 text-center text-gray-400">Sin proyecciones.</td></tr> : 
                                            data.topProyectados.map((prod: any, i: number) => (
                                                <tr key={i} className="hover:bg-gray-50">
                                                    <td className="p-3 font-medium">{prod.product_name}</td>
                                                    <td className="p-3 text-right font-bold text-blue-600">{prod.projected_qty} und</td>
                                                </tr>
                                            ))
                                        }
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                        
                        <Card className="shadow-sm">
                            <CardHeader className="border-b pb-3 bg-gray-50/50">
                                <CardTitle className="text-sm font-bold text-gray-700">Horarios del Personal (Hoy)</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 max-h-[300px] overflow-auto">
                                <table className="w-full text-sm text-left">
                                    <tbody className="divide-y divide-gray-100">
                                        {data.turnos.length === 0 ? <tr><td className="p-4 text-center text-gray-400">Nadie programado hoy.</td></tr> : 
                                            data.turnos.map((turno: any, i: number) => (
                                                <tr key={i} className="hover:bg-gray-50">
                                                    <td className="p-3 font-medium text-gray-800">{turno.nombres} {turno.apellidos}</td>
                                                    <td className="p-3 text-right font-mono text-xs text-gray-500 bg-gray-50">{turno.hora_inicio} - {turno.hora_fin}</td>
                                                </tr>
                                            ))
                                        }
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}

            {/* ===============================================================
                VISTA 3: GERENCIA GENERAL 
            =============================================================== */}
            {data.role === 'GERENTE' && (
                <div className="space-y-8">
                    <section>
                        <div className="border-b-2 border-blue-100 pb-2 mb-4">
                            <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                                💰 1. Rendimiento Financiero (Visión Global Hoy)
                            </h2>
                            <p className="text-sm text-gray-500">Métricas de ingresos en tiempo real de todas las sucursales.</p>
                        </div>
                        
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card className="bg-blue-600 text-white shadow-md">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-blue-100">Ventas Globales (Real)</CardTitle>
                                    <DollarSign className="h-4 w-4 text-blue-200" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-4xl font-black">S/ {Number(data.kpis.venta_real_global).toFixed(2)}</div>
                                    <p className="text-sm text-blue-200 mt-1 font-medium">Meta del día: S/ {Number(data.kpis.venta_proyectada_global).toFixed(2)}</p>
                                </CardContent>
                            </Card>

                            <Card className="shadow-sm border-gray-200">
                                <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gray-50">
                                    <CardTitle className="text-sm font-bold text-gray-600">Avance de Meta (Progreso)</CardTitle>
                                    <TrendingUp className="h-4 w-4 text-gray-400" />
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <div className="flex justify-between items-end mb-2">
                                        <div className="text-4xl font-black text-gray-800">
                                            {data.kpis.venta_proyectada_global > 0 
                                                ? Math.round((data.kpis.venta_real_global / data.kpis.venta_proyectada_global) * 100) 
                                                : 0}%
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div className="bg-blue-600 h-3 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (data.kpis.venta_real_global / (data.kpis.venta_proyectada_global || 1)) * 100)}%` }}></div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </section>

                    <section>
                        <div className="border-b-2 border-yellow-100 pb-2 mb-4">
                            <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                                📦 2. Logística y Abastecimiento
                            </h2>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <Card className="shadow-sm border-yellow-200">
                                <CardHeader className="flex flex-row items-center justify-between pb-2 bg-yellow-50/50">
                                    <CardTitle className="text-sm font-bold text-yellow-800">Compras x Aprobar (Cuello de botella)</CardTitle>
                                    <Clock className="h-4 w-4 text-yellow-600" />
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <div className="text-4xl font-black text-yellow-700">{data.kpis.compras_pendientes} <span className="text-sm font-medium text-yellow-600">pendientes</span></div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-sm border-green-200">
                                <CardHeader className="flex flex-row items-center justify-between pb-2 bg-green-50/50">
                                    <CardTitle className="text-sm font-bold text-green-800">Aprobadas Listas para Ingresar</CardTitle>
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <div className="text-4xl font-black text-green-700">{data.kpis.compras_aprobadas} <span className="text-sm font-medium text-green-600">en camino</span></div>
                                </CardContent>
                            </Card>
                        </div>
                    </section>

                    <section>
                        <div className="border-b-2 border-gray-200 pb-2 mb-4">
                            <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                                🏆 3. Ranking de Productos (Proyección vs. Realidad)
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="shadow-sm border-gray-200">
                                <CardHeader className="border-b pb-3 bg-gray-50">
                                    <CardTitle className="text-sm font-bold text-gray-700">Lo que ESPERAMOS vender (Global)</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <table className="w-full text-sm text-left">
                                        <tbody className="divide-y divide-gray-100">
                                            {data.topProyectados.length === 0 ? <tr><td className="p-4 text-center text-gray-400">No hay proyecciones para hoy.</td></tr> : 
                                                data.topProyectados.map((prod: any, i: number) => (
                                                    <tr key={i} className="hover:bg-gray-50">
                                                        <td className="p-3 font-medium">{prod.product_name}</td>
                                                        <td className="p-3 text-right font-bold text-gray-600">{prod.qty} und</td>
                                                        <td className="p-3 text-right font-bold text-blue-600">S/ {Number(prod.revenue).toFixed(2)}</td>
                                                    </tr>
                                                ))
                                            }
                                        </tbody>
                                    </table>
                                </CardContent>
                            </Card>
                            
                            <Card className="shadow-sm border-green-200">
                                <CardHeader className="border-b pb-3 bg-green-50">
                                    <CardTitle className="text-sm font-bold text-green-800">🔥 Lo que ESTAMOS vendiendo (Global)</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <table className="w-full text-sm text-left">
                                        <tbody className="divide-y divide-gray-100">
                                            {data.topVendidos.length === 0 ? <tr><td className="p-4 text-center text-gray-400">Aún no hay ventas.</td></tr> : 
                                                data.topVendidos.map((prod: any, i: number) => (
                                                    <tr key={i} className="hover:bg-green-50">
                                                        <td className="p-3 font-medium text-gray-800">{prod.product_name}</td>
                                                        <td className="p-3 text-right font-bold text-gray-600">{prod.qty} und</td>
                                                        <td className="p-3 text-right font-black text-green-700">S/ {Number(prod.revenue).toFixed(2)}</td>
                                                    </tr>
                                                ))
                                            }
                                        </tbody>
                                    </table>
                                </CardContent>
                            </Card>
                        </div>
                    </section>
                </div>
            )}

{/* ===============================================================
                VISTA 4: JEFE DE RECURSOS HUMANOS
            =============================================================== */}
            {data.role === 'JEFE_RRHH' && (
                <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card className="bg-gradient-to-br from-indigo-50 to-white shadow-sm border-indigo-100">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-bold text-indigo-800">Total Empleados Activos</CardTitle>
                                <Briefcase className="h-4 w-4 text-indigo-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-black text-indigo-900">{data.kpis.total_empleados}</div>
                                <p className="text-xs text-indigo-600 font-medium mt-1">Registrados en la empresa</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-teal-50 to-white shadow-sm border-teal-100">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-bold text-teal-800">Personal Programado Hoy</CardTitle>
                                <Users className="h-4 w-4 text-teal-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-black text-teal-900">{data.kpis.turnos_hoy}</div>
                                <p className="text-xs text-teal-600 font-medium mt-1">Colaboradores con turno asignado a nivel global</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="shadow-sm">
                        <CardHeader className="border-b pb-3 bg-gray-50/50">
                            <CardTitle className="text-sm font-bold text-gray-700">Agenda Global de Turnos (Hoy)</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 max-h-[400px] overflow-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-100 text-xs uppercase text-gray-500 sticky top-0">
                                    <tr>
                                        <th className="p-3">Empleado</th>
                                        <th className="p-3">Sucursal Asignada</th>
                                        <th className="p-3 text-right">Horario de Trabajo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {data.turnosGlobales.length === 0 ? <tr><td colSpan={3} className="p-6 text-center text-gray-400">No hay turnos programados para hoy.</td></tr> : 
                                        data.turnosGlobales.map((turno: any, i: number) => (
                                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-3 font-medium text-gray-800">{turno.nombres} {turno.apellidos}</td>
                                                <td className="p-3 text-gray-600 text-xs font-bold">{turno.sucursal || 'Sin Sucursal Fija'}</td>
                                                <td className="p-3 text-right font-mono text-xs text-gray-500 bg-gray-50">{turno.hora_inicio} - {turno.hora_fin}</td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </div>
            )}


        </div>
    );
}