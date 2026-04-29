'use client';

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { ShoppingCart, Plus, Minus, Trash2, Loader2, Store } from "lucide-react";
import { getMenuPOS, processSalePOS } from "@/actions/sale-actions"; 
import { getBranches } from "@/actions/admin-actions"; 
import { toast } from "sonner";

export default function MenuPOSPage() {
    const { data: session, status } = useSession();
    // @ts-ignore
    const userRole = session?.user?.role || "USUARIO_ESTANDAR";
    // @ts-ignore
    const userBranchId = session?.user?.branch_id || 1;

    const [branches, setBranches] = useState<any[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<number | string>(""); 
    
    const [categoriaActiva, setCategoriaActiva] = useState("Todos");
    const [carrito, setCarrito] = useState<any[]>([]);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [isProcessing, setIsProcessing] = useState(false); 
    const [clienteDoc, setClienteDoc] = useState(""); 
    
    // ✨ NUEVO ESTADO PARA EL MÉTODO DE PAGO (Por defecto en Efectivo)
    const [metodoPago, setMetodoPago] = useState("EFECTIVO");

    useEffect(() => {
        if (status === "loading") return; 

        const initData = async () => {
            const sucursales = await getBranches();
            setBranches(sucursales);
            setSelectedBranch(userBranchId);
        };
        initData();
    }, [status, userBranchId]);

    useEffect(() => {
        if (!selectedBranch) return;

        const fetchMenu = async () => {
            setLoading(true);
            setCarrito([]); 
            setClienteDoc(""); 
            setMetodoPago("EFECTIVO"); // Resetear al cambiar de sucursal
            const res = await getMenuPOS(Number(selectedBranch));
            if (res.success) {
                setMenuItems(res.data);
            } else {
                toast.error("Error al cargar el menú");
            }
            setLoading(false);
        };
        fetchMenu();
    }, [selectedBranch]);

    const categoriasDinamicas = ["Todos", ...Array.from(new Set(menuItems.map(item => item.categoria)))];

    const productosFiltrados = categoriaActiva === "Todos" 
        ? menuItems 
        : menuItems.filter(p => p.categoria === categoriaActiva);

    const total = carrito.reduce((sum, item) => sum + (Number(item.precio) * item.cantidad), 0);

    const agregarAlCarrito = (producto: any) => {
        if (producto.disponible === 0 || !producto.disponible) return;
        setCarrito(prev => {
            const existe = prev.find(item => item.id === producto.id);
            if (existe) {
                if (existe.cantidad >= producto.stock_actual) return prev; 
                return prev.map(item => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item);
            }
            return [...prev, { ...producto, cantidad: 1 }];
        });
    };

    const restarDelCarrito = (productoId: number) => {
        setCarrito(prev => {
            const existe = prev.find(item => item.id === productoId);
            if (existe && existe.cantidad > 1) {
                return prev.map(item => item.id === productoId ? { ...item, cantidad: item.cantidad - 1 } : item);
            }
            return prev.filter(item => item.id !== productoId); 
        });
    };

    const handleProcesarVenta = async () => {
        if (carrito.length === 0 || !selectedBranch) return;
        
        setIsProcessing(true);
        // ✨ ENVIAMOS EL MÉTODO DE PAGO AL FINAL
        const res = await processSalePOS(Number(selectedBranch), total, carrito, clienteDoc, metodoPago);
        
        if (res.success) {
            toast.success(res.message);
            setCarrito([]); 
            setClienteDoc(""); 
            setMetodoPago("EFECTIVO"); // Devolvemos el selector a Efectivo tras la venta
            
            setLoading(true);
            const menuRes = await getMenuPOS(Number(selectedBranch));
            if (menuRes.success) setMenuItems(menuRes.data);
            setLoading(false);
        } else {
            toast.error(res.message);
        }
        setIsProcessing(false);
    };

    const displayBranches = userRole === 'GERENTE GENERAL' 
        ? branches 
        : branches.filter(b => b.id === userBranchId);

    return (
        <div className="flex h-[85vh] gap-6 p-4">
            {/* LADO IZQUIERDO: MENÚ Y PRODUCTOS */}
            <div className="flex-1 flex flex-col gap-4">
                
                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                    <h1 className="text-xl font-black text-gray-800 flex items-center gap-3">
                        <Store className="w-6 h-6 text-blue-600" />
                        Punto de Venta
                        {loading && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
                    </h1>

                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-500">Operando en:</span>
                        <select 
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            disabled={userRole !== 'GERENTE GENERAL'}
                            className={`border border-gray-300 rounded-lg p-2 text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 
                                ${userRole !== 'GERENTE GENERAL' ? 'bg-gray-100 cursor-not-allowed text-gray-600' : 'bg-white cursor-pointer hover:border-blue-400'}`}
                        >
                            <option value="" disabled>Seleccione Sucursal...</option>
                            {displayBranches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {categoriasDinamicas.map((cat: any) => (
                        <button 
                            key={cat} 
                            onClick={() => setCategoriaActiva(cat)}
                            className={`px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-colors ${categoriaActiva === cat ? 'bg-red-600 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-20">
                    {!loading && productosFiltrados.length === 0 && (
                        <div className="col-span-full text-center text-gray-400 py-10 font-bold">
                            No hay menú disponible para esta sucursal o no hay stock.
                        </div>
                    )}
                    
                    {productosFiltrados.map(prod => (
                        <div 
                            key={prod.id} 
                            onClick={() => agregarAlCarrito(prod)}
                            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between h-32 
                                ${prod.disponible ? 'bg-white border-gray-200 hover:border-red-500 hover:shadow-md' : 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'}`}
                        >
                            <div>
                                <h3 className="font-bold text-gray-800 text-sm leading-tight">{prod.nombre}</h3>
                                {prod.disponible ? (
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold mt-1 inline-block ${prod.stock_type === 'receta' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                        Disp: {prod.stock_actual}
                                    </span>
                                ) : (
                                    <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold mt-1 inline-block">
                                        Agotado / Sin Insumos
                                    </span>
                                )}
                            </div>
                            <div className="text-lg font-black text-red-600">S/ {Number(prod.precio).toFixed(2)}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* LADO DERECHO: CARRITO / ORDEN */}
            <div className="w-[350px] bg-white rounded-2xl shadow-lg border border-gray-200 flex flex-col">
                <div className="p-4 border-b bg-gray-50 rounded-t-2xl flex justify-between items-center">
                    <h2 className="font-black text-lg text-gray-800 flex items-center gap-2"><ShoppingCart className="w-5 h-5"/> Orden Actual</h2>
                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold">{carrito.length} items</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {carrito.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <ShoppingCart className="w-12 h-12 mb-2 opacity-50" />
                            <p className="font-medium">El carrito está vacío</p>
                        </div>
                    ) : (
                        carrito.map((item, index) => (
                            <div key={index} className="flex justify-between items-center gap-2 border-b pb-3">
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm text-gray-800">{item.nombre}</h4>
                                    <p className="text-red-600 font-bold text-sm">S/ {(Number(item.precio) * item.cantidad).toFixed(2)}</p>
                                </div>
                                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                                    <button onClick={() => restarDelCarrito(item.id)} className="p-1 bg-white rounded shadow-sm text-gray-600 hover:text-red-600">
                                        {item.cantidad === 1 ? <Trash2 className="w-3 h-3"/> : <Minus className="w-3 h-3"/>}
                                    </button>
                                    <span className="font-bold text-sm w-4 text-center">{item.cantidad}</span>
                                    <button onClick={() => agregarAlCarrito(item)} className="p-1 bg-white rounded shadow-sm text-gray-600 hover:text-green-600">
                                        <Plus className="w-3 h-3"/>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* CAJA DE DATOS DEL CLIENTE Y PAGO */}
                <div className="px-4 py-3 border-t bg-white space-y-3">
                    
                    <div>
                        <label className="text-[11px] font-bold text-gray-500 mb-1 block uppercase tracking-wide">Documento Cliente (Opcional)</label>
                        <input 
                            type="text" 
                            placeholder="Ej. 72145896"
                            maxLength={11}
                            value={clienteDoc}
                            onChange={(e) => setClienteDoc(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-gray-50 focus:bg-white"
                        />
                    </div>

                    {/* ✨ NUEVO SELECTOR DE MÉTODO DE PAGO */}
                    <div>
                        <label className="text-[11px] font-bold text-gray-500 mb-1 block uppercase tracking-wide">Método de Pago <span className="text-red-500">*</span></label>
                        <select 
                            value={metodoPago}
                            onChange={(e) => setMetodoPago(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-gray-50 focus:bg-white text-gray-800"
                        >
                            <option value="EFECTIVO"> Efectivo</option>
                            <option value="YAPE"> Yape</option>
                            <option value="PLIN"> Plin</option>
                            <option value="VISA"> Tarjeta (Visa/MC)</option>
                        </select>
                    </div>

                </div>

                <div className="p-4 bg-gray-50 border-t rounded-b-2xl">
                    <div className="flex justify-between items-center mb-4">
                        <span className="font-bold text-gray-600">Total a cobrar:</span>
                        <span className="text-2xl font-black text-gray-900">S/ {total.toFixed(2)}</span>
                    </div>
                    <button 
                        disabled={carrito.length === 0 || isProcessing}
                        className="w-full flex items-center justify-center gap-2 bg-red-600 text-white font-black py-4 rounded-xl hover:bg-red-700 transition-colors shadow-lg disabled:opacity-50"
                        onClick={handleProcesarVenta}
                    >
                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Procesar Venta"}
                    </button>
                </div>
            </div>
        </div>
    );
}