import { auth } from "@/auth";
// ✨ Cambiamos la importación aquí:
import { getDashboardInteligente } from "@/actions/main-dashboard-actions"; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, Package, Activity, AlertTriangle, CheckCircle, Clock, TrendingUp } from "lucide-react";

export default async function DashboardPage() {
    const session = await auth();
    const userName = session?.user?.name || "Usuario";
    
    // Obtenemos todos los datos procesados por la BD según el rol
    const data = await getDashboardInteligente();

    if (!data) {
        return <div className="p-10 text-center font-bold text-gray-500">Cargando módulos del dashboard...</div>;
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
                    {/* Stock Crítico */}
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

                    {/* Compras Pendientes y Aprobadas */}
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
                VISTA 2: ADMINISTRADOR DE SUCURSAL
            =============================================================== */}
            {data.role === 'ADMIN_SUCURSAL' && (
                <>
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card className="bg-gradient-to-br from-blue-50 to-white shadow-sm border-blue-100">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-bold text-blue-800">Venta Actual (Hoy)</CardTitle>
                                <DollarSign className="h-4 w-4 text-blue-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-blue-900">S/ {Number(data.kpis.venta_real).toFixed(2)}</div>
                                <p className="text-xs text-blue-600 font-medium mt-1">Proyectado: S/ {Number(data.kpis.venta_proyectada).toFixed(2)}</p>
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
                    
                    {/* --- SECCIÓN 1: FINANZAS Y METAS --- */}
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

                    {/* --- SECCIÓN 2: LOGÍSTICA --- */}
                    <section>
                        <div className="border-b-2 border-yellow-100 pb-2 mb-4">
                            <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                                📦 2. Logística y Abastecimiento
                            </h2>
                            <p className="text-sm text-gray-500">Estado de las solicitudes de compra de los almacenes.</p>
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
                                    <CardTitle className="text-sm font-bold text-green-800">Aprobadas Listas para Ingresar (48 hrs)</CardTitle>
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <div className="text-4xl font-black text-green-700">{data.kpis.compras_aprobadas} <span className="text-sm font-medium text-green-600">en camino</span></div>
                                </CardContent>
                            </Card>
                        </div>
                    </section>

                    {/* --- SECCIÓN 3: RANKING DE PRODUCTOS --- */}
                    <section>
                        <div className="border-b-2 border-gray-200 pb-2 mb-4">
                            <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                                🏆 3. Ranking de Productos (Proyección vs. Realidad)
                            </h2>
                            <p className="text-sm text-gray-500">Compara lo que planeabas vender con lo que realmente está saliendo hoy.</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="shadow-sm border-gray-200">
                                <CardHeader className="border-b pb-3 bg-gray-50">
                                    <CardTitle className="text-sm font-bold text-gray-700">Lo que ESPERAMOS vender (Global)</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <table className="w-full text-sm text-left">
                                        <tbody className="divide-y divide-gray-100">
                                            {data.topProyectados.length === 0 ? <tr><td className="p-4 text-center text-gray-400">No se han registrado proyecciones para hoy.</td></tr> : 
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
                                            {data.topVendidos.length === 0 ? <tr><td className="p-4 text-center text-gray-400">Aún no hay ventas registradas hoy.</td></tr> : 
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
        </div>
    );
}