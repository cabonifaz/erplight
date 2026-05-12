'use client'

import { useState, useEffect } from "react";
import { obtenerSucursales } from "@/actions/rrhh-actions";
import { obtenerMisAlmacenes, crearNuevoAlmacen, obtenerUsuariosPorAlmacen, asignarUsuarioAlmacen, removerUsuarioAlmacen, obtenerUsuariosDisponiblesParaAsignar } from "@/actions/almacen-actions";
import { Building2, Package, Users, PlusCircle, Trash2, UserPlus, Filter } from "lucide-react";

export default function GestionAlmacenesPage() {
    const [sucursales, setSucursales] = useState<any[]>([]);
    const [sucursalActiva, setSucursalActiva] = useState<number>(0);
    const [almacenes, setAlmacenes] = useState<any[]>([]);
    const [almacenSeleccionado, setAlmacenSeleccionado] = useState<any>(null);
    
    const [usuariosAsignados, setUsuariosAsignados] = useState<any[]>([]);
    const [usuariosDisponibles, setUsuariosDisponibles] = useState<any[]>([]);
    const [nuevoUsuarioId, setNuevoUsuarioId] = useState<string>("");

    const [nuevoAlmacenNombre, setNuevoAlmacenNombre] = useState("");
    const [loading, setLoading] = useState(false);
    
    // ✨ ESTADO DEL FILTRO MAGICO
    const [soloSedeActual, setSoloSedeActual] = useState(true);

    useEffect(() => {
        const init = async () => {
            const resSuc = await obtenerSucursales();
            if (resSuc.success) {
                setSucursales(resSuc.data);
                if (resSuc.defaultBranchId) setSucursalActiva(resSuc.defaultBranchId);
            }
            const resUsr = await obtenerUsuariosDisponiblesParaAsignar();
            if (resUsr.success) setUsuariosDisponibles(resUsr.data);
        };
        init();
    }, []);

    useEffect(() => {
        const cargarAlmacenes = async () => {
            if (!sucursalActiva) return;
            setAlmacenSeleccionado(null);
            const res = await obtenerMisAlmacenes(sucursalActiva);
            if (res.success) setAlmacenes(res.data);
        };
        cargarAlmacenes();
    }, [sucursalActiva]);

    const cargarUsuariosDelAlmacen = async (warehouseId: number) => {
        setLoading(true);
        const res = await obtenerUsuariosPorAlmacen(warehouseId);
        if (res.success) setUsuariosAsignados(res.data);
        setLoading(false);
    };

    const handleSeleccionarAlmacen = (almacen: any) => {
        setAlmacenSeleccionado(almacen);
        cargarUsuariosDelAlmacen(almacen.id);
    };

    const handleCrearAlmacen = async () => {
        if (!nuevoAlmacenNombre.trim()) return alert("Ingresa un nombre para el almacén.");
        setLoading(true);
        const res = await crearNuevoAlmacen(sucursalActiva, nuevoAlmacenNombre);
        if (res.success) {
            setNuevoAlmacenNombre("");
            const resAlm = await obtenerMisAlmacenes(sucursalActiva);
            if (resAlm.success) setAlmacenes(resAlm.data);
        } else alert(res.message);
        setLoading(false);
    };

    const handleAsignarUsuario = async () => {
        if (!nuevoUsuarioId || !almacenSeleccionado) return;
        setLoading(true);
        const res = await asignarUsuarioAlmacen(almacenSeleccionado.id, Number(nuevoUsuarioId));
        if (res.success) {
            setNuevoUsuarioId("");
            cargarUsuariosDelAlmacen(almacenSeleccionado.id);
        } else alert(res.message);
        setLoading(false);
    };

    const handleRemoverUsuario = async (userId: number) => {
        if (!confirm("¿Remover acceso de este usuario al almacén?")) return;
        setLoading(true);
        const res = await removerUsuarioAlmacen(almacenSeleccionado.id, userId);
        if (res.success) cargarUsuariosDelAlmacen(almacenSeleccionado.id);
        else alert(res.message);
        setLoading(false);
    };

    const formatearSedes = (branchStr: string) => {
        if (!branchStr) return '🌐 Global';
        const sedesArray = branchStr.split(' / ');
        if (sedesArray.length <= 2) return `📍 ${sedesArray.join(', ')}`;
        return `📍 ${sedesArray[0]} y ${sedesArray.length - 1} sedes más`;
    };

    // ✨ LÓGICA DE FILTRADO EN TIEMPO REAL
    const usuariosParaAsignar = usuariosDisponibles.filter(u => {
        if (!soloSedeActual) return true; // Si el filtro está apagado, mostramos todos
        
        if (u.branch_ids) {
            const ids = String(u.branch_ids).split(',');
            return ids.includes(sucursalActiva.toString());
        }
        return false; // Si no tiene sucursal (es global), lo ocultamos con el filtro activo
    });

    return (
        <div className="p-6 w-full max-w-7xl mx-auto space-y-6">
            <div className="border-b pb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Building2 className="text-blue-600" /> Gestión de Almacenes y Permisos
                    </h1>
                    <p className="text-gray-600">Crea zonas de inventario y asigna quién puede operarlas.</p>
                </div>
                <select value={sucursalActiva} onChange={(e) => setSucursalActiva(Number(e.target.value))} className="border border-gray-300 rounded-md p-2 shadow-sm font-bold bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 max-w-xs">
                    {sucursales.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* COLUMNA IZQUIERDA: LISTA DE ALMACENES */}
                <div className="md:col-span-5 flex flex-col gap-4">
                    <div className="bg-white p-5 rounded-xl border shadow-sm">
                        <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Package className="w-5 h-5 text-orange-500" /> Almacenes de la Sede</h2>
                        
                        <div className="flex gap-2 mb-4">
                            <input 
                                type="text" placeholder="Nuevo almacén (Ej. Cámara de Frío)" 
                                value={nuevoAlmacenNombre} onChange={e => setNuevoAlmacenNombre(e.target.value)}
                                className="flex-1 p-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button onClick={handleCrearAlmacen} disabled={loading} className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                                <PlusCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                            {almacenes.map(alm => (
                                <div 
                                    key={alm.id} 
                                    onClick={() => handleSeleccionarAlmacen(alm)}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all flex justify-between items-center ${almacenSeleccionado?.id === alm.id ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                                >
                                    <span className="font-bold text-gray-700 text-sm">{alm.name}</span>
                                    <span className="text-[10px] bg-white px-2 py-1 rounded-full border shadow-sm text-gray-500">Configurar</span>
                                </div>
                            ))}
                            {almacenes.length === 0 && <p className="text-center text-sm text-gray-500 py-4">No hay almacenes creados.</p>}
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA: USUARIOS ASIGNADOS */}
                <div className="md:col-span-7 flex flex-col">
                    {almacenSeleccionado ? (
                        <div className="bg-white p-5 rounded-xl border shadow-sm animate-in fade-in zoom-in-95 duration-200">
                            <h2 className="font-bold text-blue-900 mb-1 flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-600" /> Personal Asignado
                            </h2>
                            <p className="text-sm text-gray-500 mb-6">Configurando accesos para: <strong className="text-gray-800">{almacenSeleccionado.name}</strong></p>

                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
                                {/* ✨ EL NUEVO INTERRUPTOR DE FILTRO */}
                                <div className="flex items-center gap-2 mb-3">
                                    <input 
                                        type="checkbox" 
                                        id="filterSede" 
                                        checked={soloSedeActual} 
                                        onChange={(e) => setSoloSedeActual(e.target.checked)}
                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <label htmlFor="filterSede" className="text-xs text-blue-800 font-semibold cursor-pointer flex items-center gap-1">
                                        <Filter className="w-3 h-3" /> Mostrar solo personal de esta sede
                                    </label>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2">
                                    <select 
                                        value={nuevoUsuarioId} 
                                        onChange={e => setNuevoUsuarioId(e.target.value)} 
                                        className="flex-1 min-w-[250px] p-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        <option value="">Selecciona un usuario del sistema...</option>
                                        {usuariosParaAsignar.map(u => (
                                            <option key={u.id} value={u.id}>
                                                {u.name} ({u.role}) — {formatearSedes(u.branch_names)}
                                            </option>
                                        ))}
                                    </select>
                                    <button onClick={handleAsignarUsuario} disabled={loading || !nuevoUsuarioId} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-bold shadow-sm">
                                        <UserPlus className="w-4 h-4" /> Asignar
                                    </button>
                                </div>
                                {usuariosParaAsignar.length === 0 && (
                                    <p className="text-xs text-orange-600 mt-2 italic">No hay personal registrado exclusivamente para esta sede. Desactiva el filtro para ver la lista global.</p>
                                )}
                            </div>

                            <div className="border rounded-lg overflow-hidden">
                                <table className="min-w-full text-left text-sm">
                                    <thead className="bg-gray-100 border-b">
                                        <tr>
                                            <th className="p-3 font-semibold text-gray-600">Usuario</th>
                                            <th className="p-3 font-semibold text-gray-600">Rol Sistema</th>
                                            <th className="p-3 font-semibold text-center text-gray-600">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {usuariosAsignados.map(usr => (
                                            <tr key={usr.id} className="hover:bg-gray-50">
                                                <td className="p-3">
                                                    <div className="font-bold text-gray-800">{usr.name}</div>
                                                    <div className="text-xs text-gray-500">{usr.email}</div>
                                                </td>
                                                <td className="p-3">
                                                    <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-bold">{usr.role}</span>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <button onClick={() => handleRemoverUsuario(usr.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-md transition-colors" title="Remover acceso">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {usuariosAsignados.length === 0 && (
                                            <tr><td colSpan={3} className="p-8 text-center text-gray-400 italic">Nadie tiene acceso a este almacén aún.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 p-8 rounded-xl border border-dashed flex flex-col items-center justify-center h-full text-gray-400 gap-3 min-h-[300px]">
                            <Package className="w-12 h-12 opacity-20" />
                            <p className="text-center">Selecciona un almacén de la lista para gestionar sus accesos.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}