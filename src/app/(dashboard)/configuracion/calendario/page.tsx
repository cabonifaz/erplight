'use client'

import { useState, useEffect, useRef } from "react";
import { CalendarDays, Plus, Trash2, TrendingUp, AlertCircle, UploadCloud, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { getHolidays, addHoliday, deleteHoliday, importarCalendarioExcel, updateHolidayMultiplier } from "@/actions/calendar-actions";

export default function CalendarioPage() {
    const [feriados, setFeriados] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Estados para subida de Excel
    const [subiendoExcel, setSubiendoExcel] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const anioActual = 2026; // O puedes hacerlo dinámico: new Date().getFullYear()

    // Estados para el formulario modal manual
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [fecha, setFecha] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [impacto, setImpacto] = useState("1.30");
    const [guardando, setGuardando] = useState(false);

    const cargarFeriados = async () => {
        setLoading(true);
        const res = await getHolidays();
        if (res.success) setFeriados(res.data);
        setLoading(false);
    };

    useEffect(() => {
        cargarFeriados();
    }, []);

    // --- MANEJO DEL EXCEL ---
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSubiendoExcel(true);
        const reader = new FileReader();

        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

                if (data.length === 0) return alert("El Excel está vacío.");

                const result = await importarCalendarioExcel({ data, year: anioActual });
                if (result.success) {
                    alert(result.message);
                    cargarFeriados();
                } else {
                    alert(`❌ Error: ${result.message}`);
                }
            } catch (error) {
                alert("Error al leer el archivo Excel.");
            } finally {
                setSubiendoExcel(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsBinaryString(file);
    };

    // --- MANEJO MANUAL ---
    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fecha || !descripcion) return alert("Completa todos los campos.");
        
        setGuardando(true);
        const res = await addHoliday(fecha, descripcion, Number(impacto));
        if (res.success) {
            setIsModalOpen(false);
            cargarFeriados();
        } else alert(res.message);
        setGuardando(false);
    };

    const handleEliminar = async (id: number) => {
        if (!confirm("¿Seguro que deseas eliminar este día festivo?")) return;
        const res = await deleteHoliday(id);
        if (res.success) cargarFeriados();
    };

    // ✨ NUEVO: Actualizar multiplicador en vivo desde la tabla
    const handleCambiarMultiplicador = async (id: number, nuevoValor: string) => {
        // Actualizamos visualmente primero para que sea instantáneo (Optimistic UI)
        setFeriados(prev => prev.map(f => f.id === id ? { ...f, multiplier: nuevoValor } : f));
        // Guardamos en la BD
        await updateHolidayMultiplier(id, Number(nuevoValor));
    };

    // Determina el color del selector según el valor
    const getColorClass = (val: number) => {
        if (val >= 2.0) return "bg-red-50 text-red-700 border-red-200";
        if (val >= 1.5) return "bg-orange-50 text-orange-700 border-orange-200";
        if (val > 1.0) return "bg-blue-50 text-blue-700 border-blue-200";
        return "bg-gray-50 text-gray-700 border-gray-200";
    };

    return (
        <div className="p-6 w-full max-w-5xl mx-auto space-y-6">
            
            {/* HEADER Y BOTONES */}
            <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2 tracking-tight">
                        <CalendarDays className="text-indigo-600 w-8 h-8" /> 
                        Calendario de Demanda
                    </h1>
                    <p className="text-gray-500 mt-1.5 font-medium">Sube tu Excel para proyectar la demanda en días festivos automáticamente.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    {/* BOTÓN EXCEL */}
                    <div className="relative">
                        <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={subiendoExcel}
                            className="bg-green-50 text-green-700 border border-green-200 px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-green-100 transition-colors"
                        >
                            {subiendoExcel ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                            {subiendoExcel ? "Importando..." : "Subir Excel"}
                        </button>
                    </div>

                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 font-semibold flex items-center gap-2 shadow-sm transition-colors"
                    >
                        <Plus className="w-5 h-5" /> Manual
                    </button>
                </div>
            </div>

            {/* TABLA EDITABLE */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="w-full overflow-x-auto">
                    <table className="min-w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600">Fecha</th>
                                <th className="p-4 font-semibold text-gray-600">Festividad / Evento</th>
                                <th className="p-4 font-semibold text-gray-600">Multiplicador (Editable)</th>
                                <th className="p-4 font-semibold text-gray-600 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={4} className="p-8 text-center text-gray-400">Cargando calendario...</td></tr>
                            ) : feriados.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-gray-500">No hay días festivos. Sube tu Excel.</td></tr>
                            ) : (
                                feriados.map((f) => (
                                    <tr key={f.id} className="hover:bg-gray-50/50 transition-colors items-center">
                                        <td className="p-4 font-medium text-gray-900">
                                            {new Date(f.holiday_date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </td>
                                        <td className="p-4 font-bold text-gray-700">{f.description}</td>
                                        <td className="p-4">
                                            {/* ✨ SELECTOR EDITABLE EN VIVO */}
                                            <select 
                                                value={Number(f.multiplier).toFixed(2)}
                                                onChange={(e) => handleCambiarMultiplicador(f.id, e.target.value)}
                                                className={`border rounded-lg p-1.5 text-xs font-bold outline-none cursor-pointer transition-colors ${getColorClass(Number(f.multiplier))}`}
                                            >
                                                <option value="1.00">Normal (x1.0)</option>
                                                <option value="1.30">Leve (x1.3)</option>
                                                <option value="1.50">Alto (x1.5)</option>
                                                <option value="1.80">Muy Alto (x1.8)</option>
                                                <option value="2.00">Extremo (x2.0)</option>
                                            </select>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => handleEliminar(f.id)} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL MANUAL (Se mantiene igual, oculto por brevedad pero asume que está aquí) */}
            {/* ... */}
        </div>
    );
}