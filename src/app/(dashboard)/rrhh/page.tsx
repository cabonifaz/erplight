'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react'; 
import { 
    getEmpleadosPorSucursal, crearEmpleado, editarEmpleado, registrarAsistencia, 
    obtenerHorariosSemana, guardarHorarioEmpleado, obtenerCatalogosRRHH, 
    obtenerEstadoAsistencia, obtenerSucursales, obtenerDisponibilidad, 
    guardarDisponibilidad, autogenerarHorarioSemana, publicarHorariosSemana, 
    eliminarHorarioEmpleado,
    obtenerReporteHoras // ✨ IMPORTACIÓN DEL REPORTE AGREGADA
} from '@/actions/rrhh-actions';

const getLunes = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
};

export default function RRHHPage() {
    const { data: session, status } = useSession(); 
    const rolCrudo = (session?.user as any)?.role || 'GERENTE_GENERAL'; 
    const rolUsuario = rolCrudo.toUpperCase().replace(' ', '_'); 
    const sucursalUsuario = (session?.user as any)?.branch_id || 1;

    const [activeTab, setActiveTab] = useState('empleados'); 
    const [loading, setLoading] = useState(false);
    
    const [sucursales, setSucursales] = useState<any[]>([]);
    const [sucursalActiva, setSucursalActiva] = useState<number>(rolUsuario === 'ADMIN_SUCURSAL' ? sucursalUsuario : 1); 
    
    const [empleados, setEmpleados] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [listaDocumentos, setListaDocumentos] = useState<any[]>([]);
    const [listaCargos, setListaCargos] = useState<any[]>([]);
    const [formData, setFormData] = useState({ nombres: '', apellidos: '', tipo_documento_id: 0, numero_documento: '', cargo_id: 0, salario_hora: '', fecha_nacimiento: '' });
    
    const [horaActual, setHoraActual] = useState(new Date());
    const [empleadoMarcacion, setEmpleadoMarcacion] = useState('');
    const [estadoAsistencia, setEstadoAsistencia] = useState<'PENDIENTE_ENTRADA' | 'PENDIENTE_SALIDA' | 'COMPLETADO' | ''>('');

    const [horariosGlobales, setHorariosGlobales] = useState<any[]>([]);
    const [modalTurno, setModalTurno] = useState({ isOpen: false, empId: 0, empName: '', fechaStr: '', diaName: '', inicio: '', fin: '', existe: false, estado_actual: 0 });
    const [semanaActual, setSemanaActual] = useState<Date>(getLunes(new Date()));

    const [isDispModalOpen, setIsDispModalOpen] = useState(false);
    const [dispEmp, setDispEmp] = useState({ id: 0, nombre: '' });
    const [dispData, setDispData] = useState<any[]>([]);

    // ✨ ESTADOS PARA EL REPORTE
    const [reporteInicio, setReporteInicio] = useState<string>(new Date(new Date().setDate(1)).toISOString().split('T')[0]); 
    const [reporteFin, setReporteFin] = useState<string>(new Date().toISOString().split('T')[0]); 
    const [reporteDatos, setReporteDatos] = useState<any[]>([]);
    const [cargandoReporte, setCargandoReporte] = useState(false);

    const diasDeLaSemana = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(semanaActual);
        d.setDate(d.getDate() + i);
        return {
            fechaStr: d.toISOString().split('T')[0], 
            nombre: d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' }) 
        };
    });

    const nombresDiasFijos = [
        { id: 1, nombre: 'Lunes' }, { id: 2, nombre: 'Martes' }, { id: 3, nombre: 'Miércoles' },
        { id: 4, nombre: 'Jueves' }, { id: 5, nombre: 'Viernes' }, { id: 6, nombre: 'Sábado' }, { id: 7, nombre: 'Domingo' }
    ];

    const cambiarSemana = (dias: number) => {
        const nuevaFecha = new Date(semanaActual);
        nuevaFecha.setDate(nuevaFecha.getDate() + dias);
        setSemanaActual(nuevaFecha);
    };

    useEffect(() => {
        const initData = async () => {
            const resCat = await obtenerCatalogosRRHH();
            if (resCat.success) { setListaDocumentos(resCat.documentos); setListaCargos(resCat.cargos); }
            const resSuc = await obtenerSucursales();
            if (resSuc.success) {
                setSucursales(resSuc.data);
                if (rolUsuario === 'ADMIN_SUCURSAL' && sucursalUsuario) setSucursalActiva(sucursalUsuario);
            }
        };
        if (rolUsuario === 'GERENTE_GENERAL' || rolUsuario === 'ADMIN_SUCURSAL') initData();
    }, [rolUsuario, sucursalUsuario]);

    useEffect(() => {
        if (sucursalActiva) {
            cargarDatosSucursal();
            setEmpleadoMarcacion('');
            // Opcional: Limpiar el reporte al cambiar de sucursal
            setReporteDatos([]);
        }
    }, [sucursalActiva, semanaActual]);

    useEffect(() => {
        const timer = setInterval(() => setHoraActual(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchEstado = async () => {
            if (empleadoMarcacion) {
                const res = await obtenerEstadoAsistencia(Number(empleadoMarcacion));
                if (res.success) setEstadoAsistencia(res.estado);
            } else setEstadoAsistencia('');
        };
        fetchEstado();
    }, [empleadoMarcacion]);

    const cargarDatosSucursal = async () => {
        setLoading(true);
        const fechaFin = new Date(semanaActual);
        fechaFin.setDate(fechaFin.getDate() + 6); 
        
        const [resEmp, resHor] = await Promise.all([ 
            getEmpleadosPorSucursal(sucursalActiva), 
            obtenerHorariosSemana(sucursalActiva, semanaActual.toISOString().split('T')[0], fechaFin.toISOString().split('T')[0]) 
        ]);
        
        if (resEmp.success) setEmpleados(resEmp.data);
        if (resHor.success) setHorariosGlobales(resHor.data || []);
        setLoading(false);
    };

    const handleAbrirNuevo = () => {
        setEditingId(null);
        setFormData({ nombres: '', apellidos: '', tipo_documento_id: listaDocumentos[0]?.id || 0, numero_documento: '', cargo_id: listaCargos[0]?.id || 0, salario_hora: '', fecha_nacimiento: '' });
        setIsModalOpen(true);
    };

    const handleAbrirEditar = (emp: any) => {
        setEditingId(emp.id);
        setFormData({ 
            nombres: emp.nombres || '', 
            apellidos: emp.apellidos || '', 
            tipo_documento_id: emp.tipo_documento_id || (listaDocumentos[0]?.id || 0), 
            numero_documento: emp.numero_documento || '', 
            cargo_id: emp.cargo_id || (listaCargos[0]?.id || 0), 
            salario_hora: emp.salario_hora || '',
            fecha_nacimiento: emp.fecha_nacimiento ? new Date(emp.fecha_nacimiento).toISOString().split('T')[0] : '' 
        });
        setIsModalOpen(true);
    };

    const handleGuardarEmpleado = async () => {
        setLoading(true);
        const res = editingId ? await editarEmpleado({ ...formData, id: editingId }) : await crearEmpleado({ ...formData, branch_id: sucursalActiva });
        if (res.success) { setIsModalOpen(false); cargarDatosSucursal(); } else alert(res.message);
        setLoading(false);
    };

    const handleMarcarAsistencia = async () => {
        if(!empleadoMarcacion) return alert("Selecciona usuario.");
        setLoading(true);
        const res = await registrarAsistencia(Number(empleadoMarcacion), 1);
        alert(res.message);
        if(res.success) {
            const statusRes = await obtenerEstadoAsistencia(Number(empleadoMarcacion));
            if (statusRes.success) setEstadoAsistencia(statusRes.estado);
        }
        setLoading(false);
    };

    const calcularHoras = (inicio: string, fin: string) => {
        if (!inicio || !fin) return 0;
        const [hInicio, mInicio] = inicio.split(':').map(Number);
        const [hFin, mFin] = fin.split(':').map(Number);
        let diff = (hFin + mFin / 60) - (hInicio + mInicio / 60);
        if (diff < 0) diff += 24; 
        return Number(diff.toFixed(2));
    };

    const abrirEdicionCelda = (emp: any, dia: any, turnoActual: any) => {
        setModalTurno({ 
            isOpen: true, empId: emp.id, empName: emp.nombre_completo, 
            fechaStr: dia.fechaStr, diaName: dia.nombre, 
            inicio: turnoActual?.hora_inicio || '', 
            fin: turnoActual?.hora_fin || '',
            existe: !!turnoActual,
            estado_actual: turnoActual ? turnoActual.estado : 0
        });
    };

    const handleGuardarTurnoCelda = async (forzar: boolean = false) => {
        if (!modalTurno.inicio || !modalTurno.fin) return alert('Completa las horas');
        setLoading(true);
        const horasTotales = calcularHoras(modalTurno.inicio, modalTurno.fin);
        
        const res = await guardarHorarioEmpleado(modalTurno.empId, modalTurno.fechaStr, modalTurno.inicio, modalTurno.fin, horasTotales, forzar, modalTurno.estado_actual);
        
        if (res.requiresConfirm) {
            if (window.confirm(res.message)) {
                handleGuardarTurnoCelda(true); 
            } else {
                setLoading(false);
            }
            return;
        }

        if(res.success) {
            setModalTurno({ ...modalTurno, isOpen: false });
            cargarDatosSucursal(); 
        } else {
            alert(res.message);
        }
        setLoading(false);
    };

    const handleEliminarTurnoCelda = async () => {
        if (!confirm('¿Estás seguro de eliminar este turno?')) return;
        setLoading(true);
        const res = await eliminarHorarioEmpleado(modalTurno.empId, modalTurno.fechaStr);
        if(res.success) {
            setModalTurno({ ...modalTurno, isOpen: false });
            cargarDatosSucursal(); 
        } else alert(res.message);
        setLoading(false);
    };

    const handleAutogenerar = async () => {
        if (!confirm("Esto asignará turnos automáticamente (en borrador) según la disponibilidad de cada empleado para esta semana. ¿Continuar?")) return;
        setLoading(true);
        const fechaFin = new Date(semanaActual);
        fechaFin.setDate(fechaFin.getDate() + 6); 
        const res = await autogenerarHorarioSemana(sucursalActiva, semanaActual.toISOString().split('T')[0], fechaFin.toISOString().split('T')[0]);
        alert(res.message);
        if (res.success) cargarDatosSucursal();
        setLoading(false);
    };

    const handlePublicar = async () => {
        if (!confirm("¿Estás seguro de APLICAR todos los borradores de esta semana? Ya no podrán ser modificados sin dejar rastro.")) return;
        setLoading(true);
        const fechaFin = new Date(semanaActual);
        fechaFin.setDate(fechaFin.getDate() + 6); 
        const res = await publicarHorariosSemana(sucursalActiva, semanaActual.toISOString().split('T')[0], fechaFin.toISOString().split('T')[0]);
        alert(res.message);
        if (res.success) cargarDatosSucursal();
        setLoading(false);
    };

    const handleAbrirDisponibilidad = async (emp: any) => {
        setLoading(true);
        setDispEmp({ id: emp.id, nombre: emp.nombre_completo });
        const res = await obtenerDisponibilidad(emp.id);
        const dbDisp = res.success ? res.data : [];

        const initDisp = nombresDiasFijos.map(d => {
            const encontrado = dbDisp.find((x: any) => x.dia_semana === d.id);
            return {
                dia_semana: d.id, nombre: d.nombre, activo: !!encontrado,
                inicio: encontrado ? encontrado.hora_inicio : '08:00',
                fin: encontrado ? encontrado.hora_fin : '18:00'
            };
        });

        setDispData(initDisp);
        setIsDispModalOpen(true);
        setLoading(false);
    };

    const handleCambioDisp = (diaId: number, campo: string, valor: any) => {
        setDispData(prev => prev.map(d => d.dia_semana === diaId ? { ...d, [campo]: valor } : d));
    };

    const handleGuardarDisponibilidadTotal = async () => {
        setLoading(true);
        const datosParaGuardar = dispData.filter(d => d.activo).map(d => ({ dia_semana: d.dia_semana, hora_inicio: d.inicio, hora_fin: d.fin }));
        const res = await guardarDisponibilidad(dispEmp.id, datosParaGuardar);
        if (res.success) { setIsDispModalOpen(false); alert("¡Disponibilidad guardada con éxito!"); } 
        else alert(res.message);
        setLoading(false);
    };

    // ✨ FUNCIÓN PARA GENERAR REPORTE
    const handleGenerarReporte = async () => {
        setCargandoReporte(true);
        const res = await obtenerReporteHoras(sucursalActiva, reporteInicio, reporteFin);
        if (res.success) setReporteDatos(res.data);
        else alert("Error al obtener el reporte.");
        setCargandoReporte(false);
    };

    if (status === 'loading') return <div className="min-h-[60vh] flex justify-center items-center font-bold text-gray-500">Cargando credenciales...</div>;

    if (rolUsuario !== 'GERENTE_GENERAL' && rolUsuario !== 'ADMIN_SUCURSAL') {
        return ( 
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <span className="text-6xl mb-4">⛔</span>
                <h1 className="text-2xl font-bold text-gray-800">Acceso Restringido</h1>
                <p className="mt-2 text-gray-500">Tu rol en la base de datos es: <span className="font-bold text-red-600">{rolCrudo}</span></p>
                <p className="text-xs text-gray-400 mt-1">El sistema esperaba: GERENTE_GENERAL o ADMIN_SUCURSAL</p>
            </div> 
        );
    }

    const nombreSucursal = sucursales.find(s => s.id === sucursalActiva)?.name || 'Cargando...';
    const fechaFinSemana = new Date(semanaActual);
    fechaFinSemana.setDate(fechaFinSemana.getDate() + 6);
    const tituloSemana = `${semanaActual.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })} al ${fechaFinSemana.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}`;

    return (
        <div className="p-6 w-full max-w-7xl mx-auto space-y-6">
            <div className="border-b pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">👥 Recursos Humanos</h1>
                    <p className="text-gray-600">Gestión de personal, horarios y control de asistencia.</p>
                </div>
                <div className="flex items-center gap-3 bg-blue-50 p-2 px-4 rounded-lg border border-blue-100 shadow-sm">
                    <span className="text-sm font-bold text-blue-800">🏢 Sede:</span>
                    {rolUsuario === 'GERENTE_GENERAL' ? (
                        <select className="p-2 border border-blue-200 rounded-md bg-white text-sm focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer" value={sucursalActiva} onChange={(e) => setSucursalActiva(Number(e.target.value))}>
                            {sucursales.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    ) : <span className="p-2 text-sm font-bold text-gray-700">{nombreSucursal}</span>}
                </div>
            </div>

            <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setActiveTab('empleados')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'empleados' ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}>Lista de Personal</button>
                <button onClick={() => setActiveTab('asistencia')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'asistencia' ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}>Control de Asistencia</button>
                <button onClick={() => setActiveTab('horarios')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'horarios' ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}>Planificador Semanal</button>
                {/* ✨ NUEVO BOTÓN DE PESTAÑA: REPORTES */}
                <button onClick={() => setActiveTab('reportes')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'reportes' ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}>Reportes</button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 min-h-[400px]">
                
                {/* -------------------- TAB 1: EMPLEADOS -------------------- */}
                {activeTab === 'empleados' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-gray-800">Personal Activo ({nombreSucursal})</h2>
                            <button onClick={handleAbrirNuevo} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium shadow-sm">+ Nuevo Empleado</button>
                        </div>
                        {loading && !isModalOpen && !isDispModalOpen ? <p className="text-center text-gray-500 py-10">Cargando...</p> : (
                            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                <table className="min-w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr><th className="p-3">Nombre</th><th className="p-3">Doc</th><th className="p-3">Cargo</th><th className="p-3 text-center">Acciones</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {empleados.length === 0 ? (
                                            <tr><td colSpan={4} className="p-6 text-center text-gray-500">No hay personal registrado en esta sede.</td></tr>
                                        ) : (
                                            empleados.map(emp => (
                                                <tr key={emp.id} className="hover:bg-gray-50">
                                                    <td className="p-3 font-medium text-gray-800">{emp.nombre_completo}</td>
                                                    <td className="p-3 text-gray-600">{emp.numero_documento}</td>
                                                    <td className="p-3"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-semibold">{emp.cargo}</span></td>
                                                    <td className="p-3 text-center">
                                                        <div className="flex justify-center gap-3">
                                                            <button onClick={() => handleAbrirEditar(emp)} className="text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                                                            <span className="text-gray-300">|</span>
                                                            <button onClick={() => handleAbrirDisponibilidad(emp)} className="text-orange-600 hover:text-orange-800 font-medium">⏳ Disponibilidad</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
                
                {/* -------------------- TAB 2: ASISTENCIA -------------------- */}
                {activeTab === 'asistencia' && (
                    <div className="flex flex-col items-center py-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Reloj de Control de Personal</h2>
                        <div className="bg-gray-900 text-white p-8 rounded-2xl shadow-inner mb-8 text-center min-w-[300px]">
                            <p className="text-5xl font-mono tracking-wider font-bold">{horaActual.toLocaleTimeString('es-PE', { hour12: false })}</p>
                            <p className="text-gray-400 mt-2 font-medium capitalize">{horaActual.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                        <div className="w-full max-w-md bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
                            <select className="w-full p-3 border border-gray-300 rounded-lg mb-6 bg-white focus:ring-2 focus:ring-blue-500" value={empleadoMarcacion} onChange={(e) => setEmpleadoMarcacion(e.target.value)}>
                                <option value="">-- Selecciona tu nombre --</option>
                                {empleados.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre_completo}</option>)}
                            </select>
                            <button onClick={handleMarcarAsistencia} disabled={loading || !empleadoMarcacion || estadoAsistencia === 'COMPLETADO'} className={`w-full py-4 font-bold text-lg rounded-lg shadow-md transition-all disabled:opacity-50 ${estadoAsistencia === 'PENDIENTE_SALIDA' ? 'bg-red-600 hover:bg-red-700 text-white' : estadoAsistencia === 'COMPLETADO' ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                                {loading ? 'Procesando...' : estadoAsistencia === 'PENDIENTE_SALIDA' ? ' MARCAR SALIDA' : estadoAsistencia === 'COMPLETADO' ? '✅ TURNO COMPLETADO' : ' MARCAR ENTRADA'}
                            </button>
                        </div>
                    </div>
                )}

                {/* -------------------- TAB 3: HORARIOS -------------------- */}
                {activeTab === 'horarios' && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Horarios Rotativos</h2>
                                <p className="text-sm text-gray-500">Asigna turnos por fechas específicas.</p>
                            </div>
                            <div className="flex items-center gap-4 mt-4 sm:mt-0">
                                <button onClick={() => cambiarSemana(-7)} className="p-2 bg-white border border-gray-300 rounded hover:bg-gray-100 font-bold px-4 shadow-sm">← Anterior</button>
                                <span className="font-bold text-blue-800 text-lg uppercase tracking-wide min-w-[180px] text-center">{tituloSemana}</span>
                                <button onClick={() => cambiarSemana(7)} className="p-2 bg-white border border-gray-300 rounded hover:bg-gray-100 font-bold px-4 shadow-sm">Siguiente →</button>
                            </div>
                        </div>

                        <div className="flex gap-4 mb-4">
                            <button onClick={handleAutogenerar} disabled={loading} className="px-4 py-2 bg-purple-100 text-purple-700 font-bold border border-purple-200 rounded-lg hover:bg-purple-200 transition-colors shadow-sm disabled:opacity-50">
                                Autogenerar Borradores
                            </button>
                            <button onClick={handlePublicar} disabled={loading} className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors shadow-md disabled:opacity-50">
                                Aplicar / Publicar Semana
                            </button>
                        </div>
                        
                        {loading && horariosGlobales.length === 0 ? <p className="text-center py-10">Cargando turnos...</p> : (
                            <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
                                <table className="min-w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-gray-800 text-white">
                                        <tr>
                                            <th className="p-3 border-r border-gray-700 font-semibold">Personal</th>
                                            {diasDeLaSemana.map(d => (
                                                <th key={d.fechaStr} className="p-3 text-center border-r border-gray-700 font-semibold capitalize">
                                                    {d.nombre}
                                                </th>
                                            ))}
                                            <th className="p-3 text-center font-bold text-yellow-400 bg-gray-900">Total Hrs</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {empleados.length === 0 ? (
                                            <tr><td colSpan={9} className="p-6 text-center text-gray-500">No hay personal registrado en esta sede.</td></tr>
                                        ) : (
                                            empleados.map((emp) => {
                                                const totalHorasSemana = horariosGlobales.filter(h => h.employee_id === emp.id).reduce((sum, h) => sum + Number(h.horas_totales), 0);
                                                return (
                                                    <tr key={emp.id} className="hover:bg-blue-50 transition-colors group">
                                                        <td className="p-3 border-r border-gray-200 bg-gray-50 group-hover:bg-blue-100">
                                                            <div className="font-bold text-gray-800">{emp.nombre_completo}</div>
                                                            <div className="text-xs text-gray-500">{emp.cargo}</div>
                                                        </td>
                                                        {diasDeLaSemana.map(dia => {
                                                            const turno = horariosGlobales.find(h => h.employee_id === emp.id && new Date(h.fecha).toISOString().split('T')[0] === dia.fechaStr);
                                                            
                                                            const isBorrador = turno && turno.estado === 0;
                                                            const cellClass = turno 
                                                                ? (isBorrador ? "bg-yellow-50 text-yellow-800 border-2 border-dashed border-yellow-300" : "bg-green-100 text-green-800 border-2 border-solid border-green-200")
                                                                : "text-gray-300 hover:text-blue-500";

                                                            return (
                                                                <td 
                                                                    key={dia.fechaStr} 
                                                                    onClick={() => abrirEdicionCelda(emp, dia, turno)}
                                                                    className={`p-3 border-r border-gray-200 text-center cursor-pointer transition-all hover:ring-2 hover:ring-inset hover:ring-blue-400`}
                                                                >
                                                                    {turno ? (
                                                                        <div className={`rounded px-2 py-1 font-medium shadow-sm inline-block ${cellClass}`}>
                                                                            {turno.hora_inicio} - {turno.hora_fin}
                                                                            {isBorrador && <span className="ml-1 text-[10px] uppercase font-bold text-yellow-600">Borrador</span>}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-xl font-bold">+</span>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                        <td className={`p-3 text-center font-black text-lg ${totalHorasSemana > 48 ? 'text-red-600 bg-red-50' : 'text-blue-600'}`}>
                                                            {totalHorasSemana}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ✨ -------------------- TAB 4: REPORTES -------------------- ✨ */}
                {activeTab === 'reportes' && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-center bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm">
                            <div>
                                <h2 className="text-xl font-black text-blue-900">Reporte de Planilla</h2>
                                <p className="text-sm text-blue-700 font-medium">Calcula el total de horas oficiales por empleado.</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-4 sm:mt-0">
                                <div className="bg-white p-2 rounded-lg border border-blue-200 flex items-center gap-2 shadow-sm">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Desde</span>
                                    <input type="date" className="p-1 outline-none text-sm font-bold text-gray-800" value={reporteInicio} onChange={e => setReporteInicio(e.target.value)} />
                                </div>
                                <div className="bg-white p-2 rounded-lg border border-blue-200 flex items-center gap-2 shadow-sm">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Hasta</span>
                                    <input type="date" className="p-1 outline-none text-sm font-bold text-gray-800" value={reporteFin} onChange={e => setReporteFin(e.target.value)} />
                                </div>
                                <button onClick={handleGenerarReporte} disabled={cargandoReporte} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 shadow-md transition-all disabled:opacity-50">
                                    {cargandoReporte ? 'Calculando...' : 'Generar'}
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
                            <table className="min-w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-800 text-white">
                                    <tr>
                                        <th className="p-4 font-semibold">Personal</th>
                                        <th className="p-4 font-semibold text-center">Documento</th>
                                        <th className="p-4 font-semibold text-center">Cargo</th>
                                        <th className="p-4 font-black text-center text-yellow-400 bg-gray-900 text-base">Total Horas</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {reporteDatos.length === 0 ? (
                                        <tr><td colSpan={4} className="p-10 text-center text-gray-500 font-medium">Selecciona un rango de fechas y haz clic en "Generar".</td></tr>
                                    ) : (
                                        reporteDatos.map((row, i) => (
                                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4 font-bold text-gray-800">{row.nombre_completo}</td>
                                                <td className="p-4 text-center text-gray-600 font-mono">{row.numero_documento}</td>
                                                <td className="p-4 text-center"><span className="bg-gray-100 border border-gray-200 text-gray-700 px-3 py-1 rounded-md text-xs font-bold">{row.cargo}</span></td>
                                                <td className="p-4 text-center font-black text-xl text-blue-600">{row.total_horas} <span className="text-sm font-bold text-gray-400">hrs</span></td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* -------------------- MODAL: CREAR/EDITAR EMPLEADO -------------------- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
                    <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-lg">
                        <h3 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">
                            {editingId ? 'Editar Empleado' : 'Registrar Nuevo Empleado'}
                        </h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Nombres</label>
                                    <input type="text" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" value={formData.nombres} onChange={e => setFormData({...formData, nombres: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Apellidos</label>
                                    <input type="text" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" value={formData.apellidos} onChange={e => setFormData({...formData, apellidos: e.target.value})} />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Doc.</label>
                                    <select 
                                        className="w-full p-2 pr-8 truncate border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500" 
                                        value={formData.tipo_documento_id} 
                                        onChange={e => setFormData({...formData, tipo_documento_id: Number(e.target.value)})}
                                    >
                                        <option value={0} disabled>Seleccione...</option>
                                        {listaDocumentos.map(doc => <option key={doc.id} value={doc.id}>{doc.description}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Número de Doc.</label>
                                    <input type="text" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" value={formData.numero_documento} onChange={e => setFormData({...formData, numero_documento: e.target.value})} />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Cargo</label>
                                    <select className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500" value={formData.cargo_id} onChange={e => setFormData({...formData, cargo_id: Number(e.target.value)})}>
                                        <option value={0} disabled>Seleccione...</option>
                                        {listaCargos.map(cargo => <option key={cargo.id} value={cargo.id}>{cargo.description}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Salario Hora (S/)</label>
                                    <input type="number" step="0.10" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" value={formData.salario_hora} onChange={e => setFormData({...formData, salario_hora: e.target.value})} />
                                </div>
                            </div>

                            <div className="mt-2">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Fecha de Nacimiento</label>
                                <input 
                                    type="date" 
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" 
                                    value={formData.fecha_nacimiento} 
                                    onChange={e => setFormData({...formData, fecha_nacimiento: e.target.value})} 
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                                <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-gray-600 bg-gray-100 font-bold rounded-lg hover:bg-gray-200 transition-colors">
                                    Cancelar
                                </button>
                                <button onClick={handleGuardarEmpleado} disabled={loading} className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                    {loading ? 'Guardando...' : (editingId ? 'Actualizar' : 'Guardar Empleado')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* -------------------- MODAL: DISPONIBILIDAD -------------------- */}
            {isDispModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70]">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg">
                        <div className="border-b pb-3 mb-4">
                            <h3 className="text-xl font-bold text-gray-800">Reglas de Disponibilidad</h3>
                            <p className="text-sm text-gray-500">Configura qué días y a qué hora puede trabajar <strong>{dispEmp.nombre}</strong>.</p>
                        </div>
                        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                            {dispData.map((dia) => (
                                <div key={dia.dia_semana} className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${dia.activo ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-gray-50'}`}>
                                    <label className="flex items-center gap-2 w-32 cursor-pointer">
                                        <input type="checkbox" className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500" checked={dia.activo} onChange={(e) => handleCambioDisp(dia.dia_semana, 'activo', e.target.checked)}/>
                                        <span className={`font-bold ${dia.activo ? 'text-orange-800' : 'text-gray-400'}`}>{dia.nombre}</span>
                                    </label>
                                    <div className="flex items-center gap-2 flex-1">
                                        <input type="time" disabled={!dia.activo} className="w-full p-2 border rounded-md text-sm disabled:opacity-50 disabled:bg-gray-100" value={dia.inicio} onChange={(e) => handleCambioDisp(dia.dia_semana, 'inicio', e.target.value)} />
                                        <span className="text-gray-400 font-bold">-</span>
                                        <input type="time" disabled={!dia.activo} className="w-full p-2 border rounded-md text-sm disabled:opacity-50 disabled:bg-gray-100" value={dia.fin} onChange={(e) => handleCambioDisp(dia.dia_semana, 'fin', e.target.value)} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                            <button onClick={() => setIsDispModalOpen(false)} className="px-5 py-2 text-gray-600 bg-gray-100 font-bold rounded-xl hover:bg-gray-200">Cancelar</button>
                            <button onClick={handleGuardarDisponibilidadTotal} disabled={loading} className="px-5 py-2 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 disabled:opacity-50">{loading ? 'Guardando...' : 'Guardar Reglas'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* -------------------- MODAL: ASIGNAR TURNO EN EL PLANIFICADOR -------------------- */}
            {modalTurno.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[80]">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm">
                        <h3 className="text-2xl font-black text-gray-800 mb-1">Turno del {modalTurno.diaName}</h3>
                        <p className="text-base font-medium text-blue-600 mb-6">{modalTurno.empName}</p>
                        
                        <div className="grid grid-cols-2 gap-5 mb-8">
                            <div>
                                <label className="block text-sm font-bold text-gray-500 mb-2 uppercase tracking-wider">Entrada</label>
                                <input type="time" className="w-full p-3 border-2 border-gray-200 rounded-xl text-xl font-bold text-gray-800 focus:border-blue-500 focus:ring-0" 
                                    value={modalTurno.inicio} onChange={e => setModalTurno({...modalTurno, inicio: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-500 mb-2 uppercase tracking-wider">Salida</label>
                                <input type="time" className="w-full p-3 border-2 border-gray-200 rounded-xl text-xl font-bold text-gray-800 focus:border-blue-500 focus:ring-0" 
                                    value={modalTurno.fin} onChange={e => setModalTurno({...modalTurno, fin: e.target.value})} />
                            </div>
                        </div>

                        <div className="flex justify-between items-center mt-2">
                            <div>
                                {modalTurno.existe && (
                                    <button onClick={handleEliminarTurnoCelda} disabled={loading} className="px-4 py-3 bg-red-100 text-red-600 font-bold rounded-xl hover:bg-red-200 transition-colors disabled:opacity-50">
                                        Eliminar
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setModalTurno({...modalTurno, isOpen: false})} className="px-5 py-3 text-gray-600 bg-gray-100 font-bold rounded-xl hover:bg-gray-200">
                                    Cancelar
                                </button>
                                <button onClick={() => handleGuardarTurnoCelda(false)} disabled={loading} className="px-5 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50">
                                    {loading ? '...' : 'Guardar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}