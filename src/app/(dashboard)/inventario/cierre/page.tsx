'use client'

import { useState, useEffect } from "react";
import { obtenerMisAlmacenes, obtenerStockParaCierre, guardarCierreAlmacenDiario } from "@/actions/almacen-actions";
import { obtenerSucursales } from "@/actions/rrhh-actions";
import { PackageSearch, Lock, AlertTriangle } from "lucide-react";

export default function CierreAlmacenPage() {
    const [sucursales, setSucursales] = useState<any[]>([]);
    const [sucursalActiva, setSucursalActiva] = useState<number>(0);
    const [almacenes, setAlmacenes] = useState<any[]>([]);
    const [warehouseId, setWarehouseId] = useState<string>("");
    const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
    
    const [loading, setLoading] = useState(false);
    const [productos, setProductos] = useState<any[]>([]);

    // Cargar sucursales al inicio
    useEffect(() => {
        const init = async () => {
            const res = await obtenerSucursales();
            if (res.success) {
                setSucursales(res.data);
                if (res.defaultBranchId) setSucursalActiva(res.defaultBranchId);
            }
        };
        init();
    }, []);

    // Cargar almacenes cuando cambia la sucursal
    useEffect(() => {
        const cargarAlmacenes = async () => {
            if (!sucursalActiva) return;
            const res = await obtenerMisAlmacenes(sucursalActiva);
            if (res.success) {
                setAlmacenes(res.data);
                if (res.data.length > 0) setWarehouseId(res.data[0].id.toString());
                else setWarehouseId("");
            }
        };
        cargarAlmacenes();
    }, [sucursalActiva]);

    const handleGenerarPlanilla = async () => {
        if (!warehouseId || !fecha) return;
        setLoading(true);
        const res = await obtenerStockParaCierre(Number(warehouseId));
        
        if (res.success) {
            const productosFormateados = res.data.map((p: any) => ({
                productId: p.product_id,
                producto: p.producto,
                unidad: p.unidad,
                systemStock: Number(p.stock_teorico),
                physicalStock: '', // Empieza en blanco para obligar a contar
                difference: 0
            }));
            setProductos(productosFormateados);
        } else {
            alert(res.message);
        }
        setLoading(false);
    };

    const handleActualizarConteo = (index: number, valor: string) => {
        const nuevosProductos = [...productos];
        const fisico = valor === '' ? '' : Number(valor);
        const teorico = nuevosProductos[index].systemStock;
        
        nuevosProductos[index].physicalStock = fisico;
        nuevosProductos[index].difference = fisico !== '' ? Number(fisico) - teorico : 0;
        
        setProductos(nuevosProductos);
    };

    const handleConfirmarCierre = async () => {
        const sinContar = productos.find(p => p.physicalStock === '');
        if (sinContar) return alert(`Falta ingresar el conteo físico de: ${sinContar.producto}`);

        if (!confirm("⚠️ ¿Estás seguro de cerrar el almacén?\nEsto actualizará el stock oficial del sistema y bloqueará los movimientos de hoy.")) return;

        setLoading(true);
        const res = await guardarCierreAlmacenDiario({
            warehouseId: Number(warehouseId),
            fechaCierre: fecha,
            detalles: productos
        });

        if (res.success) {
            alert("✅ " + res.message);
            setProductos([]);
        } else {
            alert("❌ " + res.message);
        }
        setLoading(false);
    };

    const totalDescuadre = productos.reduce((sum, p) => sum + (p.difference || 0), 0);

    return (
        <div className="p-6 w-full max-w-7xl mx-auto space-y-6">
            <div className="border-b pb-4 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <PackageSearch className="text-blue-600" /> Cierre Diario de Almacén
                    </h1>
                    <p className="text-gray-600">Auditoría física y bloqueo de inventario.</p>
                </div>
                <select value={sucursalActiva} onChange={(e) => setSucursalActiva(Number(e.target.value))} className="border-gray-300 rounded-md p-2 shadow-sm font-bold bg-white">
                    {sucursales.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>

            <div className="bg-white p-6 rounded-xl border shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-gray-50 p-4 rounded-lg border">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mi Almacén Asignado</label>
                        <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="w-full p-2 border rounded-md font-medium bg-white">
                            {almacenes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            {almacenes.length === 0 && <option value="">No tienes almacenes asignados</option>}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha</label>
                        <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="w-full p-2 border rounded-md font-medium" />
                    </div>
                    <div className="flex items-end">
                        <button onClick={handleGenerarPlanilla} disabled={loading || almacenes.length === 0} className="bg-blue-600 text-white px-6 py-2 rounded-md font-bold hover:bg-blue-700 disabled:opacity-50 h-[42px]">
                            {loading ? 'Cargando...' : 'Iniciar Conteo'}
                        </button>
                    </div>
                </div>

                {productos.length > 0 && (
                    <div className="animate-in fade-in duration-300">
                        <div className="flex justify-between items-center bg-orange-50 p-4 border border-orange-200 rounded-t-lg">
                            <p className="text-sm font-bold text-orange-800 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" /> Ingresa el conteo físico de cada ítem.
                            </p>
                            <p className="text-sm font-black text-gray-700">
                                Descuadre Global: <span className={totalDescuadre < 0 ? 'text-red-600' : totalDescuadre > 0 ? 'text-green-600' : 'text-gray-600'}>{totalDescuadre.toFixed(2)}</span>
                            </p>
                        </div>

                        <div className="overflow-hidden border border-t-0 rounded-b-lg max-h-[500px] overflow-y-auto">
                            <table className="min-w-full text-left text-sm">
                                <thead className="bg-gray-800 text-white sticky top-0 z-10">
                                    <tr>
                                        <th className="p-3 font-semibold">Producto / Insumo</th>
                                        <th className="p-3 font-semibold text-center">Stock Teorico (Sistema)</th>
                                        <th className="p-3 font-bold text-center bg-blue-700">Stock Físico (Real)</th>
                                        <th className="p-3 font-semibold text-center">Faltante/Sobrante</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {productos.map((prod, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="p-3 font-bold text-gray-800">
                                                {prod.producto} <span className="text-xs font-normal text-gray-500">({prod.unidad})</span>
                                            </td>
                                            <td className="p-3 text-center text-gray-600 font-mono text-base">
                                                {prod.systemStock.toFixed(2)}
                                            </td>
                                            <td className="p-3 text-center bg-blue-50/30">
                                                <input 
                                                    type="number" 
                                                    min="0" step="0.01"
                                                    className="w-24 p-2 border-2 border-blue-300 rounded-md text-center font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                                    placeholder="0.00"
                                                    value={prod.physicalStock}
                                                    onChange={(e) => handleActualizarConteo(idx, e.target.value)}
                                                />
                                            </td>
                                            <td className="p-3 text-center">
                                                {prod.physicalStock !== '' && (
                                                    <span className={`px-3 py-1 rounded font-black text-sm ${prod.difference < 0 ? 'bg-red-100 text-red-700' : prod.difference > 0 ? 'bg-green-100 text-green-700' : 'text-gray-400'}`}>
                                                        {prod.difference > 0 ? '+' : ''}{prod.difference.toFixed(2)}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button 
                                onClick={handleConfirmarCierre} 
                                disabled={loading}
                                className="bg-gray-900 text-white px-8 py-3 rounded-xl font-black hover:bg-black transition-colors flex items-center gap-2 shadow-lg disabled:opacity-50"
                            >
                                <Lock className="w-5 h-5" /> 
                                Confirmar y Cerrar Almacén
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}