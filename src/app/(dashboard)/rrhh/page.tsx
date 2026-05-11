'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react'; 
import * as XLSX from 'xlsx'; 
import { 
    getEmpleadosPorSucursal, crearEmpleado, editarEmpleado, registrarAsistencia, 
    obtenerHorariosSemana, guardarHorarioEmpleado, obtenerCatalogosRRHH, 
    obtenerEstadoAsistencia, obtenerSucursales, obtenerDisponibilidad, 
    guardarDisponibilidad, autogenerarHorarioSemana, publicarHorariosSemana, 
    eliminarHorarioEmpleado, obtenerReporteHoras,
    obtenerDetalleHorasEmpleado,
    getContratosEmpleado, subirContratoEmpleado, eliminarContratoEmpleado,
    obtenerIncidencias, crearIncidencia, obtenerDocumentosGenerales, subirDocumentoGeneral, eliminarDocumentoGeneral,
    obtenerAdelantosEmpleado, registrarAdelantoEmpleado, obtenerReporteAdelantosMensual,
    obtenerPlanillaMensual // ✨ IMPORTAMOS LA NUEVA FUNCIÓN DE PLANILLA
} from '@/actions/rrhh-actions';

const getLunes = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
};

export default function RRHHPage() {
    const { data: session, status } = useSession(); 
    const sessionUser = session?.user as any;
    
    const rolCrudo = sessionUser?.role || 'GERENTE_GENERAL'; 
    const rolUsuario = rolCrudo.toUpperCase().replaceAll(' ', '_'); 

    const [activeTab, setActiveTab] = useState('empleados'); 
    const [loading, setLoading] = useState(false);
    
    const [sucursales, setSucursales] = useState<any[]>([]);
    const [sucursalActiva, setSucursalActiva] = useState<number>(0); 
    
    const [empleados, setEmpleados] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [listaDocumentos, setListaDocumentos] = useState<any[]>([]);
    const [listaCargos, setListaCargos] = useState<any[]>([]);
    
    const [formData, setFormData] = useState({ 
        nombres: '', apellidos: '', tipo_documento_id: 0, numero_documento: '', 
        cargo_id: 0, salario_hora: '', fecha_nacimiento: '', employment_type: 'FULL TIME' 
    });
    
    const [perfilTab, setPerfilTab] = useState('general'); 
    const [listaDocsGenerales, setListaDocsGenerales] = useState<any[]>([]);
    const [listaIncidencias, setListaIncidencias] = useState<any[]>([]);
    const [nuevaIncidencia, setNuevaIncidencia] = useState({ incident_type: 'VACACIONES', start_date: '', end_date: '', reason: '' });
    const [nuevoDocNombre, setNuevoDocNombre] = useState('');
    const [nuevoDocVencimiento, setNuevoDocVencimiento] = useState('');

    const [listaAdelantos, setListaAdelantos] = useState<any[]>([]);
    const [nuevoAdelanto, setNuevoAdelanto] = useState({ amount: '', requestDate: new Date().toISOString().split('T')[0], reason: '' });
    const adelantoFileRef = useRef<HTMLInputElement>(null);

    const [horaActual, setHoraActual] = useState(new Date());
    const [empleadoMarcacion, setEmpleadoMarcacion] = useState('');
    const [estadoAsistencia, setEstadoAsistencia] = useState<'PENDIENTE_ENTRADA' | 'PENDIENTE_SALIDA' | 'COMPLETADO' | ''>('');

    const [horariosGlobales, setHorariosGlobales] = useState<any[]>([]);
    const [modalTurno, setModalTurno] = useState({ isOpen: false, empId: 0, empName: '', fechaStr: '', diaName: '', inicio: '', fin: '', existe: false, estado_actual: 0 });
    const [semanaActual, setSemanaActual] = useState<Date>(getLunes(new Date()));

    const [isDispModalOpen, setIsDispModalOpen] = useState(false);
    const [dispEmp, setDispEmp] = useState({ id: 0, nombre: '' });
    const [dispData, setDispData] = useState<any[]>([]);

    const [reporteInicio, setReporteInicio] = useState<string>(new Date(new Date().setDate(1)).toISOString().split('T')[0]); 
    const [reporteFin, setReporteFin] = useState<string>(new Date().toISOString().split('T')[0]); 
    const [reporteDatos, setReporteDatos] = useState<any[]>([]);
    const [cargandoReporte, setCargandoReporte] = useState(false);

    const [adelantoMes, setAdelantoMes] = useState(new Date().getMonth() + 1);
    const [adelantoAno, setAdelantoAno] = useState(new Date().getFullYear());
    const [cargandoReporteAdelantos, setCargandoReporteAdelantos] = useState(false);

    // ✨ ESTADOS PARA EL REPORTE DE PLANILLA FINAL
    const [planillaMes, setPlanillaMes] = useState(new Date().getMonth() + 1);
    const [planillaAno, setPlanillaAno] = useState(new Date().getFullYear());
    const [planillaDatos, setPlanillaDatos] = useState<any[]>([]);
    const [cargandoPlanilla, setCargandoPlanilla] = useState(false);

    const [isContratoModalOpen, setIsContratoModalOpen] = useState(false);
    const [contratoEmp, setContratoEmp] = useState({ id: 0, nombre: '' });
    const [contratosLista, setContratosLista] = useState<any[]>([]); 
    const [nuevoContratoFecha, setNuevoContratoFecha] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null); 
    const [subiendoContrato, setSubiendoContrato] = useState(false); 

    const [isDetalleModalOpen, setIsDetalleModalOpen] = useState(false);
    const [detalleEmpSeleccionado, setDetalleEmpSeleccionado] = useState<any>(null);
    const [detalleHoras, setDetalleHoras] = useState<any[]>([]);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);

    const diasDeLaSemana = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(semanaActual);
        d.setDate(d.getDate() + i);
        return {
            fechaStr: d.toISOString().split('T')[0], 
            nombre: d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' }) 
        };
    });

    const nombresDiasFijos = [
        { id: 1, nombre: 'Lunes' }, { id: 2, nombre: 'Martes' }, { id: 3, nombre: 'Miercoles' },
        { id: 4, nombre: 'Jueves' }, { id: 5, nombre: 'Viernes' }, { id: 6, nombre: 'Sabado' }, { id: 7, nombre: 'Domingo' }
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
                if (resSuc.defaultBranchId) {
                    setSucursalActiva(resSuc.defaultBranchId);
                } else {
                    setSucursalActiva(1);
                }
            }
        };
        
        if (rolUsuario === 'GERENTE_GENERAL' || rolUsuario === 'ADMIN_SUCURSAL' || rolUsuario === 'JEFE_DE_RRHH') initData();
    }, [rolUsuario]);

    useEffect(() => {
        if (sucursalActiva > 0) {
            cargarDatosSucursal();
            setEmpleadoMarcacion('');
            setReporteDatos([]);
            setPlanillaDatos([]); // Limpiamos la planilla al cambiar de sucursal
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
        
        if (resEmp.success) {
            setEmpleados(resEmp.data);
        }
        if (resHor.success) setHorariosGlobales(resHor.data || []);
        setLoading(false);
    };

    const handleAbrirNuevo = () => {
        setEditingId(null);
        setPerfilTab('general');
        setFormData({ 
            nombres: '', apellidos: '', tipo_documento_id: listaDocumentos[0]?.id || 0, 
            numero_documento: '', cargo_id: listaCargos[0]?.id || 0, salario_hora: '', 
            fecha_nacimiento: '', employment_type: 'FULL TIME' 
        });
        setIsModalOpen(true);
    };

    const handleAbrirEditar = async (emp: any) => {
        setEditingId(emp.id);
        setPerfilTab('general');
        setFormData({ 
            nombres: emp.nombres || '', 
            apellidos: emp.apellidos || '', 
            tipo_documento_id: emp.tipo_documento_id || (listaDocumentos[0]?.id || 0), 
            numero_documento: emp.numero_documento || '', 
            cargo_id: emp.cargo_id || (listaCargos[0]?.id || 0), 
            salario_hora: emp.salario_hora || '',
            fecha_nacimiento: emp.fecha_nacimiento ? new Date(emp.fecha_nacimiento).toISOString().split('T')[0] : '',
            employment_type: emp.employment_type || 'FULL TIME'
        });
        
        const [resDocs, resInc, resAdv] = await Promise.all([
            obtenerDocumentosGenerales(emp.id), 
            obtenerIncidencias(emp.id),
            obtenerAdelantosEmpleado(emp.id)
        ]);
        setListaDocsGenerales(resDocs.data || []);
        setListaIncidencias(resInc.data || []);
        setListaAdelantos(resAdv.data || []);
        
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
        if (!confirm('Esta seguro de eliminar este turno?')) return;
        setLoading(true);
        const res = await eliminarHorarioEmpleado(modalTurno.empId, modalTurno.fechaStr);
        if(res.success) {
            setModalTurno({ ...modalTurno, isOpen: false });
            cargarDatosSucursal(); 
        } else alert(res.message);
        setLoading(false);
    };

    const handleAutogenerar = async () => {
        if (!confirm("Esto asignara turnos automaticamente (en borrador) segun la disponibilidad de cada empleado para esta semana. Continuar?")) return;
        setLoading(true);
        const fechaFin = new Date(semanaActual);
        fechaFin.setDate(fechaFin.getDate() + 6); 
        const res = await autogenerarHorarioSemana(sucursalActiva, semanaActual.toISOString().split('T')[0], fechaFin.toISOString().split('T')[0]);
        alert(res.message);
        if (res.success) cargarDatosSucursal();
        setLoading(false);
    };

    const handlePublicar = async () => {
        if (!confirm("Esta seguro de APLICAR todos los borradores de esta semana? Ya no podran ser modificados sin dejar rastro.")) return;
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
        if (res.success) { setIsDispModalOpen(false); alert("Disponibilidad guardada con exito!"); } 
        else alert(res.message);
        setLoading(false);
    };

    const handleGenerarReporte = async () => {
        setCargandoReporte(true);
        const res = await obtenerReporteHoras(sucursalActiva, reporteInicio, reporteFin);
        if (res.success) setReporteDatos(res.data);
        else alert("Error al obtener el reporte.");
        setCargandoReporte(false);
    };

    const handleExportarExcel = () => {
        if(reporteDatos.length === 0) return alert("No hay datos para exportar. Genera el reporte primero.");
        
        const datosFormateados = reporteDatos.map(row => ({
            "Personal": row.nombre_completo,
            "Documento": row.numero_documento,
            "Cargo": row.cargo,
            "Total Horas Oficiales": Number(row.total_horas)
        }));

        const ws = XLSX.utils.json_to_sheet(datosFormateados);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Planilla Horas");
        
        XLSX.writeFile(wb, `Planilla_Horas_${reporteInicio}_al_${reporteFin}.xlsx`);
    };

    const handleExportarAdelantos = async () => {
        setCargandoReporteAdelantos(true);
        const res = await obtenerReporteAdelantosMensual(sucursalActiva, adelantoMes, adelantoAno);
        
        if (res.success && res.data.length > 0) {
            const ws = XLSX.utils.json_to_sheet(res.data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Adelantos");
            XLSX.writeFile(wb, `Reporte_Adelantos_Mes_${adelantoMes}_${adelantoAno}.xlsx`);
        } else {
            alert("No hay adelantos registrados en este mes para exportar.");
        }
        setCargandoReporteAdelantos(false);
    };

    // ✨ GENERAR PLANILLA DE PAGOS MENSUAL
    const handleGenerarPlanilla = async () => {
        setCargandoPlanilla(true);
        const res = await obtenerPlanillaMensual(sucursalActiva, planillaMes, planillaAno);
        if (res.success) {
            setPlanillaDatos(res.data);
        } else {
            alert("Error al obtener la planilla: " + res.message);
        }
        setCargandoPlanilla(false);
    };

    // ✨ EXPORTAR PLANILLA A EXCEL
    const handleExportarPlanilla = () => {
        if (planillaDatos.length === 0) return alert("No hay datos para exportar. Genera la planilla primero.");
        
        const datosFormateados = planillaDatos.map(row => ({
            "Documento": row.numero_documento,
            "Personal": row.nombre_completo,
            "Modalidad": row.employment_type,
            "Salario/Hr": Number(row.salario_hora),
            "Hrs Trabajadas": Number(row.horas_trabajadas),
            "Hrs Permisos": Number(row.horas_permisos_pagados),
            "Sueldo Bruto": Number(row.sueldoBruto),
            "Adelantos": Number(row.total_adelantos),
            "Neto a Pagar": Number(row.netoAPagar)
        }));

        const ws = XLSX.utils.json_to_sheet(datosFormateados);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Planilla Pagos");
        
        XLSX.writeFile(wb, `Planilla_Final_Mes_${planillaMes}_${planillaAno}.xlsx`);
    };

    const handleAbrirContratos = async (emp: any) => {
        setContratoEmp({ id: emp.id, nombre: emp.nombre_completo });
        setIsContratoModalOpen(true);
        setContratosLista([]); 
        
        const res = await getContratosEmpleado(emp.id);
        if (res.success) setContratosLista(res.data);
    };

    const handleSubirContrato = async () => {
        if (!nuevoContratoFecha) return alert("Selecciona la fecha de vencimiento");
        const file = fileInputRef.current?.files?.[0];
        if (!file) return alert("Selecciona un archivo PDF");

        setSubiendoContrato(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('employeeId', String(contratoEmp.id));
        formData.append('fechaVencimiento', nuevoContratoFecha);

        const res = await subirContratoEmpleado(formData);
        
        if (res.success) {
            alert("Exito: " + res.message);
            setNuevoContratoFecha(''); 
            if(fileInputRef.current) fileInputRef.current.value = '';
            
            const listRes = await getContratosEmpleado(contratoEmp.id);
            if (listRes.success) setContratosLista(listRes.data);
            cargarDatosSucursal(); 
        } else {
            alert("Error: " + res.message);
        }
        setSubiendoContrato(false);
    };

    const handleEliminarContrato = async (idContrato: number, urlArchivo: string) => {
        if (!confirm("Seguro que deseas eliminar este contrato? Esta accion no se puede deshacer.")) return;
        
        const res = await eliminarContratoEmpleado(idContrato, urlArchivo);
        if (res.success) {
            const listRes = await getContratosEmpleado(contratoEmp.id);
            if (listRes.success) setContratosLista(listRes.data);
            cargarDatosSucursal(); 
        } else {
            alert("Error al eliminar: " + res.message);
        }
    };

    const handleAbrirDetalle = async (emp: any) => {
        setDetalleEmpSeleccionado(emp);
        setIsDetalleModalOpen(true);
        setCargandoDetalle(true);
        
        const idEmpleado = emp.employee_id || emp.id; 
        
        const res = await obtenerDetalleHorasEmpleado(idEmpleado, reporteInicio, reporteFin);
        if (res.success) setDetalleHoras(res.data);
        setCargandoDetalle(false);
    };

    if (status === 'loading') return <div className="min-h-[60vh] flex justify-center items-center font-bold text-gray-500">Cargando credenciales...</div>;

    if (rolUsuario !== 'GERENTE_GENERAL' && rolUsuario !== 'ADMIN_SUCURSAL' && rolUsuario !== 'JEFE_DE_RRHH') {
        return ( 
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <span className="text-6xl mb-4">⛔</span>
                <h1 className="text-2xl font-bold text-gray-800">Acceso Restringido</h1>
                <p className="mt-2 text-gray-500">Tu rol en la base de datos es: <span className="font-bold text-red-600">{rolCrudo}</span></p>
                <p className="text-xs text-gray-400 mt-1">El sistema esperaba: GERENTE_GENERAL, ADMIN_SUCURSAL o JEFE_DE_RRHH</p>
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
                    <p className="text-gray-600">Gestion de personal, horarios y control de asistencia.</p>
                </div>
                <div className="flex items-center gap-3 bg-blue-50 p-2 px-4 rounded-lg border border-blue-100 shadow-sm">
                    <span className="text-sm font-bold text-blue-800">🏢 Sede:</span>
                    {rolUsuario === 'GERENTE_GENERAL' || rolUsuario === 'JEFE_DE_RRHH' ? (
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
                <button onClick={() => setActiveTab('reportes')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'reportes' ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}>Reportes</button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 min-h-[400px]">
                
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
                                        <tr><th className="p-3">Nombre</th><th className="p-3">Doc</th><th className="p-3">Cargo y Modalidad</th><th className="p-3 text-center">Acciones</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {empleados.length === 0 ? (
                                            <tr><td colSpan={4} className="p-6 text-center text-gray-500">No hay personal registrado en esta sede.</td></tr>
                                        ) : (
                                            empleados.map(emp => (
                                                <tr key={emp.id} className="hover:bg-gray-50">
                                                    <td className="p-3 font-medium text-gray-800">
                                                        {emp.nombre_completo}
                                                        {emp.dias_vencimiento_contrato !== null && emp.dias_vencimiento_contrato !== undefined && emp.dias_vencimiento_contrato <= 10 && emp.dias_vencimiento_contrato >= 0 && (
                                                            <span title={`El contrato vence en ${emp.dias_vencimiento_contrato} dias`} className="ml-2 bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-red-200">
                                                                🔴 Vence pronto
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-gray-600">{emp.numero_documento}</td>
                                                    <td className="p-3">
                                                        <div className="flex flex-col gap-1 items-start">
                                                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-semibold border border-blue-100">{emp.cargo}</span>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${emp.employment_type === 'PART TIME' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                                                {emp.employment_type || 'FULL TIME'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <div className="flex justify-center gap-3">
                                                            <button onClick={() => handleAbrirEditar(emp)} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                                                                👤 Perfil
                                                            </button>
                                                            <span className="text-gray-300">|</span>
                                                            <button onClick={() => handleAbrirDisponibilidad(emp)} className="text-orange-600 hover:text-orange-800 font-medium">⏳ Disp.</button>
                                                            <span className="text-gray-300">|</span>
                                                            <button onClick={() => handleAbrirContratos(emp)} className="text-purple-600 hover:text-purple-800 font-medium">📄 Contratos</button>
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

                {activeTab === 'horarios' && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Horarios Rotativos</h2>
                                <p className="text-sm text-gray-500">Asigna turnos por fechas especificas.</p>
                            </div>
                            <div className="flex items-center gap-4 mt-4 sm:mt-0">
                                <button onClick={() => cambiarSemana(-7)} className="p-2 bg-white border border-gray-300 rounded hover:bg-gray-100 font-bold px-4 shadow-sm">Anterior</button>
                                <span className="font-bold text-blue-800 text-lg uppercase tracking-wide min-w-[180px] text-center">{tituloSemana}</span>
                                <button onClick={() => cambiarSemana(7)} className="p-2 bg-white border border-gray-300 rounded hover:bg-gray-100 font-bold px-4 shadow-sm">Siguiente</button>
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

                {activeTab === 'reportes' && (
                    <div className="space-y-6">
                        {/* 1. REPORTE DE HORAS */}
                        <div className="flex flex-col sm:flex-row justify-between items-center bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm">
                            <div>
                                <h2 className="text-xl font-black text-blue-900">Reporte de Planilla (Horas)</h2>
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
                                <button onClick={handleExportarExcel} className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 shadow-md transition-all">
                                    📥 Exportar
                                </button>
                            </div>
                        </div>

                        {/* 2. REPORTE DE ADELANTOS MENSUALES */}
                        <div className="flex flex-col sm:flex-row justify-between items-center bg-purple-50 p-6 rounded-xl border border-purple-100 shadow-sm mt-4">
                            <div>
                                <h2 className="text-xl font-black text-purple-900">Reporte de Adelantos de Sueldo</h2>
                                <p className="text-sm text-purple-700 font-medium">Exporta todos los adelantos de esta sucursal por mes.</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-4 sm:mt-0">
                                <div className="bg-white p-2 rounded-lg border border-purple-200 flex items-center gap-2 shadow-sm">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Mes</span>
                                    <select className="p-1 outline-none text-sm font-bold text-gray-800 bg-transparent" value={adelantoMes} onChange={e => setAdelantoMes(Number(e.target.value))}>
                                        <option value="1">Enero</option><option value="2">Febrero</option><option value="3">Marzo</option>
                                        <option value="4">Abril</option><option value="5">Mayo</option><option value="6">Junio</option>
                                        <option value="7">Julio</option><option value="8">Agosto</option><option value="9">Setiembre</option>
                                        <option value="10">Octubre</option><option value="11">Noviembre</option><option value="12">Diciembre</option>
                                    </select>
                                </div>
                                <div className="bg-white p-2 rounded-lg border border-purple-200 flex items-center gap-2 shadow-sm">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Año</span>
                                    <input type="number" min="2024" max="2030" className="p-1 w-16 outline-none text-sm font-bold text-gray-800" value={adelantoAno} onChange={e => setAdelantoAno(Number(e.target.value))} />
                                </div>
                                <button onClick={handleExportarAdelantos} disabled={cargandoReporteAdelantos} className="bg-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-purple-700 shadow-md transition-all disabled:opacity-50">
                                    {cargandoReporteAdelantos ? 'Generando...' : '📥 Exportar Excel'}
                                </button>
                            </div>
                        </div>

                        {/* ✨ NUEVO: 3. CÁLCULO FINAL DE PLANILLA (NETO A PAGAR) */}
                        <div className="flex flex-col sm:flex-row justify-between items-center bg-emerald-50 p-6 rounded-xl border border-emerald-100 shadow-sm mt-4">
                            <div>
                                <h2 className="text-xl font-black text-emerald-900">Cálculo de Planilla Final</h2>
                                <p className="text-sm text-emerald-700 font-medium">Suma horas, permisos pagados y resta los adelantos del mes.</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-4 sm:mt-0">
                                <div className="bg-white p-2 rounded-lg border border-emerald-200 flex items-center gap-2 shadow-sm">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Mes</span>
                                    <select className="p-1 outline-none text-sm font-bold text-gray-800 bg-transparent" value={planillaMes} onChange={e => setPlanillaMes(Number(e.target.value))}>
                                        <option value="1">Enero</option><option value="2">Febrero</option><option value="3">Marzo</option>
                                        <option value="4">Abril</option><option value="5">Mayo</option><option value="6">Junio</option>
                                        <option value="7">Julio</option><option value="8">Agosto</option><option value="9">Setiembre</option>
                                        <option value="10">Octubre</option><option value="11">Noviembre</option><option value="12">Diciembre</option>
                                    </select>
                                </div>
                                <div className="bg-white p-2 rounded-lg border border-emerald-200 flex items-center gap-2 shadow-sm">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Año</span>
                                    <input type="number" min="2024" max="2030" className="p-1 w-16 outline-none text-sm font-bold text-gray-800" value={planillaAno} onChange={e => setPlanillaAno(Number(e.target.value))} />
                                </div>
                                <button onClick={handleGenerarPlanilla} disabled={cargandoPlanilla} className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-emerald-700 shadow-md transition-all disabled:opacity-50">
                                    {cargandoPlanilla ? 'Calculando...' : 'Ver Planilla'}
                                </button>
                                <button onClick={handleExportarPlanilla} className="bg-emerald-800 text-white px-6 py-3 rounded-lg font-bold hover:bg-emerald-900 shadow-md transition-all">
                                    📥 Exportar
                                </button>
                            </div>
                        </div>

                        {/* TABLA DE RESULTADOS PLANILLA FINAL */}
                        {planillaDatos.length > 0 && (
                            <div className="overflow-x-auto border border-emerald-200 rounded-lg shadow-sm mt-6">
                                <table className="min-w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-emerald-800 text-white">
                                        <tr>
                                            <th className="p-4 font-semibold">Personal</th>
                                            <th className="p-4 font-semibold text-center">Modalidad</th>
                                            <th className="p-4 font-semibold text-center">Salario/Hr</th>
                                            <th className="p-4 font-semibold text-center">Hrs Trab.</th>
                                            <th className="p-4 font-semibold text-center">Hrs Permisos</th>
                                            <th className="p-4 font-semibold text-center">Sueldo Bruto</th>
                                            <th className="p-4 font-semibold text-center text-red-300">Adelantos</th>
                                            <th className="p-4 font-black text-center text-yellow-400 bg-emerald-900 text-base">Neto a Pagar</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {planillaDatos.map((row, i) => (
                                            <tr key={i} className="hover:bg-emerald-50 transition-colors">
                                                <td className="p-4 font-bold text-gray-800">{row.nombre_completo}</td>
                                                <td className="p-4 text-center"><span className="bg-gray-100 border border-gray-200 text-gray-700 px-3 py-1 rounded-md text-xs font-bold">{row.employment_type}</span></td>
                                                <td className="p-4 text-center text-gray-600 font-mono">S/ {Number(row.salario_hora).toFixed(2)}</td>
                                                <td className="p-4 text-center text-blue-600 font-bold">{row.horas_trabajadas}h</td>
                                                <td className="p-4 text-center text-orange-500 font-bold">{row.horas_permisos_pagados}h</td>
                                                <td className="p-4 text-center text-gray-800 font-bold">S/ {Number(row.sueldoBruto).toFixed(2)}</td>
                                                <td className="p-4 text-center text-red-500 font-bold">- S/ {Number(row.total_adelantos).toFixed(2)}</td>
                                                <td className="p-4 text-center font-black text-xl text-emerald-700">
                                                    S/ {Number(row.netoAPagar).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* TABLA REPORTE HORAS BÁSICO (SE MANTIENE ABAJO SI HAY DATOS) */}
                        {reporteDatos.length > 0 && (
                            <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm mt-6">
                                <div className="bg-gray-100 p-2 font-bold text-gray-600 text-center text-xs uppercase tracking-wider">Desglose Básico de Horas</div>
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
                                        {reporteDatos.map((row, i) => (
                                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4 font-bold text-gray-800">{row.nombre_completo}</td>
                                                <td className="p-4 text-center text-gray-600 font-mono">{row.numero_documento}</td>
                                                <td className="p-4 text-center"><span className="bg-gray-100 border border-gray-200 text-gray-700 px-3 py-1 rounded-md text-xs font-bold">{row.cargo}</span></td>
                                                <td className="p-4 text-center font-black text-xl text-blue-600 flex items-center justify-center gap-3">
                                                    <span>{row.total_horas} <span className="text-sm font-bold text-gray-400">hrs</span></span>
                                                    <button 
                                                        onClick={() => handleAbrirDetalle(row)} 
                                                        className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 py-1 px-2 rounded-md transition-colors"
                                                        title="Ver desglose diario"
                                                    >
                                                        👁️ Ver Detalle
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ✨ EL NUEVO MEGA-MODAL DEL PERFIL ✨ */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                        
                        {/* Cabecera del Perfil */}
                        <div className="bg-slate-900 p-6 text-white flex justify-between items-end">
                            <div>
                                <h3 className="text-2xl font-black">{editingId ? `${formData.nombres} ${formData.apellidos}` : 'Registrar Nuevo Personal'}</h3>
                                {editingId && <p className="text-slate-400 font-medium mt-1">{formData.numero_documento} | {formData.employment_type}</p>}
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-3xl font-light">&times;</button>
                        </div>

                        {/* Pestañas (Solo si estamos editando) */}
                        {editingId && (
                            <div className="flex border-b bg-slate-50 overflow-x-auto">
                                <button onClick={() => setPerfilTab('general')} className={`flex-1 py-3 px-4 font-bold text-sm min-w-max ${perfilTab === 'general' ? 'border-b-2 border-blue-600 text-blue-700 bg-white' : 'text-slate-500 hover:bg-slate-100'}`}>Datos Generales</button>
                                <button onClick={() => setPerfilTab('docs')} className={`flex-1 py-3 px-4 font-bold text-sm min-w-max ${perfilTab === 'docs' ? 'border-b-2 border-blue-600 text-blue-700 bg-white' : 'text-slate-500 hover:bg-slate-100'}`}>Documentos CV/DNI</button>
                                <button onClick={() => setPerfilTab('incidencias')} className={`flex-1 py-3 px-4 font-bold text-sm min-w-max ${perfilTab === 'incidencias' ? 'border-b-2 border-blue-600 text-blue-700 bg-white' : 'text-slate-500 hover:bg-slate-100'}`}>Permisos y Faltas</button>
                                <button onClick={() => setPerfilTab('adelantos')} className={`flex-1 py-3 px-4 font-bold text-sm min-w-max ${perfilTab === 'adelantos' ? 'border-b-2 border-green-600 text-green-700 bg-white' : 'text-slate-500 hover:bg-slate-100'}`}>Adelantos S/</button>
                            </div>
                        )}

                        {/* CUERPO SCROLLABLE */}
                        <div className="p-6 overflow-y-auto flex-1 bg-white">
                            
                            {/* PESTAÑA 1: DATOS GENERALES */}
                            {perfilTab === 'general' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombres</label><input type="text" className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500" value={formData.nombres} onChange={e => setFormData({...formData, nombres: e.target.value})} /></div>
                                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Apellidos</label><input type="text" className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500" value={formData.apellidos} onChange={e => setFormData({...formData, apellidos: e.target.value})} /></div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo Doc</label>
                                            <select className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 bg-white" value={formData.tipo_documento_id} onChange={e => setFormData({...formData, tipo_documento_id: Number(e.target.value)})}>
                                                <option value={0} disabled>Seleccione...</option>
                                                {listaDocumentos.map(doc => <option key={doc.id} value={doc.id}>{doc.description}</option>)}
                                            </select>
                                        </div>
                                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Número</label><input type="text" className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500" value={formData.numero_documento} onChange={e => setFormData({...formData, numero_documento: e.target.value})} /></div>
                                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">F. Nacimiento</label><input type="date" className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500" value={formData.fecha_nacimiento} onChange={e => setFormData({...formData, fecha_nacimiento: e.target.value})} /></div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
                                        <div>
                                            <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Modalidad</label>
                                            <select className="w-full p-2 border border-blue-200 rounded-md font-bold text-blue-900 bg-white" value={formData.employment_type} onChange={e => setFormData({...formData, employment_type: e.target.value})}>
                                                <option value="FULL TIME">FULL TIME</option>
                                                <option value="PART TIME">PART TIME</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Cargo</label>
                                            <select className="w-full p-2 border border-blue-200 rounded-md font-bold text-blue-900 bg-white" value={formData.cargo_id} onChange={e => setFormData({...formData, cargo_id: Number(e.target.value)})}>
                                                <option value={0} disabled>Seleccione...</option>
                                                {listaCargos.map(c => <option key={c.id} value={c.id}>{c.description}</option>)}
                                            </select>
                                        </div>
                                        <div><label className="block text-xs font-bold text-blue-800 uppercase mb-1">Salario Hora (S/)</label><input type="number" step="0.10" className="w-full p-2 border border-blue-200 rounded-md font-bold text-blue-900" value={formData.salario_hora} onChange={e => setFormData({...formData, salario_hora: e.target.value})} /></div>
                                    </div>

                                    <div className="flex justify-end pt-4 border-t mt-6">
                                        <button onClick={handleGuardarEmpleado} disabled={loading} className="px-8 py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 shadow-md transition-all disabled:opacity-50">
                                            {loading ? 'Procesando...' : (editingId ? 'Guardar Cambios' : 'Crear Empleado')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* PESTAÑA 2: DOCUMENTOS */}
                            {perfilTab === 'docs' && editingId && (
                                <div className="space-y-6">
                                    <div className="bg-gray-50 p-4 rounded-xl border flex flex-col sm:flex-row gap-3 items-end">
                                        <div className="flex-1 w-full">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre (Ej: Copia DNI)</label>
                                            <input type="text" className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500" value={nuevoDocNombre} onChange={e => setNuevoDocNombre(e.target.value)} />
                                        </div>
                                        <div className="flex-1 w-full max-w-[150px]">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vence (Opcional)</label>
                                            <input type="date" className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500" value={nuevoDocVencimiento} onChange={e => setNuevoDocVencimiento(e.target.value)} />
                                        </div>
                                        <div className="flex-1 w-full">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Archivo (PDF/Img)</label>
                                            <input type="file" ref={docInputRef} className="w-full text-sm p-1.5 border rounded-md bg-white" />
                                        </div>
                                        <button 
                                            onClick={async () => {
                                                if(!nuevoDocNombre || !docInputRef.current?.files?.[0]) return alert("Falta nombre o archivo");
                                                const fd = new FormData(); 
                                                fd.append('file', docInputRef.current.files[0]); 
                                                fd.append('employeeId', String(editingId)); 
                                                fd.append('documentName', nuevoDocNombre);
                                                if(nuevoDocVencimiento) fd.append('expirationDate', nuevoDocVencimiento);
                                                
                                                setLoading(true); 
                                                const res = await subirDocumentoGeneral(fd);
                                                if(res.success) { 
                                                    setNuevoDocNombre(''); 
                                                    setNuevoDocVencimiento('');
                                                    if(docInputRef.current) docInputRef.current.value=''; 
                                                    const dr = await obtenerDocumentosGenerales(editingId); 
                                                    setListaDocsGenerales(dr.data); 
                                                } else {
                                                    alert(res.message);
                                                }
                                                setLoading(false);
                                            }} 
                                            disabled={loading} 
                                            className="bg-slate-800 text-white font-bold py-2 px-6 rounded-md hover:bg-slate-900 h-[38px] disabled:opacity-50"
                                        >
                                            {loading ? '...' : 'Subir'}
                                        </button>
                                    </div>
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="min-w-full text-sm text-left">
                                            <thead className="bg-slate-100 border-b">
                                                <tr>
                                                    <th className="p-3 font-bold text-gray-700">Documento</th>
                                                    <th className="p-3 font-bold text-gray-700 text-center">Tipo</th>
                                                    <th className="p-3 font-bold text-gray-700 text-center">Vencimiento</th>
                                                    <th className="p-3 font-bold text-gray-700 text-center">Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {listaDocsGenerales.map(d => {
                                                    const expDate = d.expiration_date ? new Date(d.expiration_date) : null;
                                                    const today = new Date();
                                                    let isExpiring = false;
                                                    if (expDate) {
                                                        const diffTime = expDate.getTime() - today.getTime();
                                                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                        isExpiring = diffDays <= 30;
                                                    }

                                                    return (
                                                        <tr key={d.id} className="hover:bg-slate-50">
                                                            <td className="p-3 font-medium text-gray-800">
                                                                {d.document_name}
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-[10px] uppercase font-bold">{d.document_type}</span>
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                {d.expiration_date ? (
                                                                    <div className="flex flex-col items-center">
                                                                        <span className="text-gray-600 font-mono text-xs">
                                                                            {new Date(d.expiration_date).toLocaleDateString('es-PE', {timeZone: 'UTC'})}
                                                                        </span>
                                                                        {isExpiring && (
                                                                            <span className="text-[9px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold border border-red-200 mt-1 uppercase">
                                                                                🔴 Vence pronto
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-gray-400 italic text-xs">No caduca</span>
                                                                )}
                                                            </td>
                                                            <td className="p-3 text-center flex justify-center gap-4">
                                                                <a href={d.file_url} target="_blank" className="text-blue-600 font-bold hover:underline">Ver</a>
                                                                <button 
                                                                    onClick={async () => { 
                                                                        if(confirm("¿Seguro que deseas eliminar este documento?")) { 
                                                                            await eliminarDocumentoGeneral(d.id, d.file_url); 
                                                                            const dr = await obtenerDocumentosGenerales(editingId); 
                                                                            setListaDocsGenerales(dr.data); 
                                                                        } 
                                                                    }} 
                                                                    className="text-red-500 font-bold hover:underline"
                                                                >
                                                                    Eliminar
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {listaDocsGenerales.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-400">Sin documentos registrados.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* PESTAÑA 3: INCIDENCIAS Y FALTAS */}
                            {perfilTab === 'incidencias' && editingId && (
                                <div className="space-y-6">
                                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex flex-col sm:flex-row gap-3 items-end">
                                        <div>
                                            <label className="block text-xs font-bold text-orange-800 uppercase mb-1">Tipo</label>
                                            <select className="p-2 border border-orange-200 bg-white rounded-md text-sm font-bold text-orange-900" value={nuevaIncidencia.incident_type} onChange={e => setNuevaIncidencia({...nuevaIncidencia, incident_type: e.target.value})}>
                                                <option value="VACACIONES">🏖️ Vacaciones</option>
                                                <option value="LICENCIA_CG">✅ Licencia Con Goce</option>
                                                <option value="LICENCIA_SG">❌ Licencia Sin Goce</option>
                                                <option value="AMONESTACION">⚠️ Amonestación</option>
                                                <option value="DIA_COMPENSABLE">♻️ Día Compensable</option>
                                                <option value="DIA_A_DESCONTAR">📉 Día a Descontar</option>
                                                <option value="PERMISO_SALUD">🏥 Permiso por Salud</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-orange-800 uppercase mb-1">Desde</label>
                                            <input type="date" className="p-2 border border-orange-200 bg-white rounded-md text-sm" value={nuevaIncidencia.start_date} onChange={e => setNuevaIncidencia({...nuevaIncidencia, start_date: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-orange-800 uppercase mb-1">Hasta (Opcional)</label>
                                            <input type="date" className="p-2 border border-orange-200 bg-white rounded-md text-sm" value={nuevaIncidencia.end_date} onChange={e => setNuevaIncidencia({...nuevaIncidencia, end_date: e.target.value})} />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-orange-800 uppercase mb-1">Detalle / Motivo</label>
                                            <input type="text" className="w-full p-2 border border-orange-200 bg-white rounded-md text-sm" placeholder="Ej: Viaje familiar / Cita médica" value={nuevaIncidencia.reason} onChange={e => setNuevaIncidencia({...nuevaIncidencia, reason: e.target.value})} />
                                        </div>
                                        <button 
                                            onClick={async () => {
                                                if(!nuevaIncidencia.start_date) return alert("Falta fecha de inicio");
                                                setLoading(true); 
                                                await crearIncidencia({...nuevaIncidencia, employee_id: editingId});
                                                const dr = await obtenerIncidencias(editingId); 
                                                setListaIncidencias(dr.data);
                                                setNuevaIncidencia({ incident_type: 'VACACIONES', start_date: '', end_date: '', reason: '' }); 
                                                setLoading(false);
                                            }} 
                                            disabled={loading} 
                                            className="bg-orange-600 text-white font-bold py-2 px-6 rounded-md hover:bg-orange-700 h-[38px] disabled:opacity-50"
                                        >
                                            Registrar
                                        </button>
                                    </div>

                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="min-w-full text-sm text-left">
                                            <thead className="bg-slate-100 border-b">
                                                <tr>
                                                    <th className="p-3 font-bold text-gray-700">Tipo</th>
                                                    <th className="p-3 font-bold text-gray-700">Fechas</th>
                                                    <th className="p-3 font-bold text-gray-700">Motivo</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {listaIncidencias.map(inc => (
                                                    <tr key={inc.id} className="hover:bg-slate-50">
                                                        <td className="p-3 font-black text-gray-700">{inc.incident_type.replace(/_/g, ' ')}</td>
                                                        <td className="p-3 text-gray-600 font-mono text-xs">
                                                            {new Date(inc.start_date).toLocaleDateString('es-PE', {timeZone: 'UTC'})} 
                                                            {inc.end_date && ` al ${new Date(inc.end_date).toLocaleDateString('es-PE', {timeZone: 'UTC'})}`}
                                                        </td>
                                                        <td className="p-3 italic text-gray-500">{inc.reason || '-'}</td>
                                                    </tr>
                                                ))}
                                                {listaIncidencias.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-gray-400">Sin registros de faltas, permisos o vacaciones.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* ✨ PESTAÑA 4: ADELANTOS DE SUELDO ✨ */}
                            {perfilTab === 'adelantos' && editingId && (
                                <div className="space-y-6">
                                    <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex flex-col sm:flex-row gap-3 items-end">
                                        <div>
                                            <label className="block text-xs font-bold text-green-800 uppercase mb-1">Monto (S/)</label>
                                            <input type="number" step="10" className="w-24 p-2 border border-green-200 bg-white rounded-md text-sm font-black text-green-900 focus:ring-2 focus:ring-green-500" value={nuevoAdelanto.amount} onChange={e => setNuevoAdelanto({...nuevoAdelanto, amount: e.target.value})} placeholder="0.00" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-green-800 uppercase mb-1">Fecha de Pago</label>
                                            <input type="date" className="p-2 border border-green-200 bg-white rounded-md text-sm focus:ring-2 focus:ring-green-500" value={nuevoAdelanto.requestDate} onChange={e => setNuevoAdelanto({...nuevoAdelanto, requestDate: e.target.value})} />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-green-800 uppercase mb-1">Voucher / Evidencia</label>
                                            <input type="file" ref={adelantoFileRef} className="w-full text-sm p-1.5 border border-green-200 rounded-md bg-white focus:ring-2 focus:ring-green-500" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-green-800 uppercase mb-1">Motivo (Opcional)</label>
                                            <input type="text" className="w-full p-2 border border-green-200 bg-white rounded-md text-sm focus:ring-2 focus:ring-green-500" placeholder="Ej: Urgencia familiar" value={nuevoAdelanto.reason} onChange={e => setNuevoAdelanto({...nuevoAdelanto, reason: e.target.value})} />
                                        </div>
                                        <button 
                                            onClick={async () => {
                                                if(!nuevoAdelanto.amount || !adelantoFileRef.current?.files?.[0]) return alert("Falta ingresar el monto o adjuntar el voucher.");
                                                
                                                const fd = new FormData(); 
                                                fd.append('file', adelantoFileRef.current.files[0]); 
                                                fd.append('employeeId', String(editingId)); 
                                                fd.append('amount', nuevoAdelanto.amount);
                                                fd.append('requestDate', nuevoAdelanto.requestDate);
                                                if(nuevoAdelanto.reason) fd.append('reason', nuevoAdelanto.reason);
                                                
                                                setLoading(true); 
                                                const res = await registrarAdelantoEmpleado(fd);
                                                if(res.success) { 
                                                    setNuevoAdelanto({ amount: '', requestDate: new Date().toISOString().split('T')[0], reason: '' });
                                                    if(adelantoFileRef.current) adelantoFileRef.current.value=''; 
                                                    const dr = await obtenerAdelantosEmpleado(editingId); 
                                                    setListaAdelantos(dr.data); 
                                                } else {
                                                    alert(res.message);
                                                }
                                                setLoading(false);
                                            }} 
                                            disabled={loading} 
                                            className="bg-green-600 text-white font-bold py-2 px-6 rounded-md hover:bg-green-700 h-[38px] disabled:opacity-50"
                                        >
                                            {loading ? '...' : 'Pagar'}
                                        </button>
                                    </div>

                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="min-w-full text-sm text-left">
                                            <thead className="bg-slate-100 border-b">
                                                <tr>
                                                    <th className="p-3 font-bold text-gray-700">Fecha</th>
                                                    <th className="p-3 font-bold text-gray-700">Monto</th>
                                                    <th className="p-3 font-bold text-gray-700">Motivo</th>
                                                    <th className="p-3 font-bold text-gray-700 text-center">Voucher</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {listaAdelantos.map(adv => (
                                                    <tr key={adv.id} className="hover:bg-slate-50">
                                                        <td className="p-3 text-gray-600 font-mono text-xs">
                                                            {new Date(adv.request_date).toLocaleDateString('es-PE', {timeZone: 'UTC'})}
                                                        </td>
                                                        <td className="p-3 font-black text-green-700 text-base">S/ {Number(adv.amount).toFixed(2)}</td>
                                                        <td className="p-3 italic text-gray-500">{adv.reason || 'Sin observación'}</td>
                                                        <td className="p-3 text-center">
                                                            <a href={adv.file_url} target="_blank" className="text-blue-600 font-bold hover:underline flex items-center justify-center gap-1">
                                                                👁️ Ver Evidencia
                                                            </a>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {listaAdelantos.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-400">Este empleado no tiene adelantos registrados.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}

            {isDispModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg">
                        <div className="border-b pb-3 mb-4 flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">Reglas de Disponibilidad</h3>
                                <p className="text-sm text-gray-500">Configura qué días y a qué hora puede trabajar {dispEmp.nombre}.</p>
                            </div>
                            <button onClick={() => setIsDispModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">&times;</button>
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
                            <button onClick={() => setIsDispModalOpen(false)} className="px-5 py-2 text-gray-600 bg-gray-100 font-bold rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
                            <button onClick={handleGuardarDisponibilidadTotal} disabled={loading} className="px-5 py-2 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 disabled:opacity-50 transition-colors">{loading ? 'Guardando...' : 'Guardar Reglas'}</button>
                        </div>
                    </div>
                </div>
            )}

            {modalTurno.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[80] p-4">
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

                        <div className="flex justify-between items-center mt-2 pt-4 border-t">
                            <div>
                                {modalTurno.existe && (
                                    <button onClick={handleEliminarTurnoCelda} disabled={loading} className="px-4 py-2 bg-red-100 text-red-600 font-bold rounded-xl hover:bg-red-200 transition-colors disabled:opacity-50">
                                        Eliminar
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setModalTurno({...modalTurno, isOpen: false})} className="px-5 py-2 text-gray-600 bg-gray-100 font-bold rounded-xl hover:bg-gray-200 transition-colors">
                                    Cancelar
                                </button>
                                <button onClick={() => handleGuardarTurnoCelda(false)} disabled={loading} className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                    {loading ? '...' : 'Guardar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isContratoModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[90] p-4">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-2xl">
                        <div className="flex justify-between items-center border-b pb-3 mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">Contratos PDF</h3>
                                <p className="text-sm text-gray-500">Historial de contratos de {contratoEmp.nombre}</p>
                            </div>
                            <button onClick={() => setIsContratoModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">&times;</button>
                        </div>

                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 mb-6">
                            <h4 className="text-sm font-bold text-purple-800 mb-3">Subir Nuevo Contrato</h4>
                            <div className="flex flex-col sm:flex-row gap-4 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Vencimiento del Contrato</label>
                                    <input 
                                        type="date" 
                                        className="w-full p-2 text-sm border rounded-md" 
                                        value={nuevoContratoFecha} 
                                        onChange={(e) => setNuevoContratoFecha(e.target.value)} 
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Archivo PDF</label>
                                    <input 
                                        type="file" 
                                        accept=".pdf" 
                                        ref={fileInputRef} 
                                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 bg-white border"
                                    />
                                </div>
                                <button 
                                    className="bg-purple-600 text-white font-bold py-2 px-6 rounded-md hover:bg-purple-700 text-sm h-[38px] disabled:opacity-50 transition-colors"
                                    onClick={handleSubirContrato}
                                    disabled={subiendoContrato}
                                >
                                    {subiendoContrato ? 'Subiendo...' : 'Subir e Historiar'}
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                            <table className="min-w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-100 border-b border-gray-200">
                                    <tr>
                                        <th className="p-3 font-bold text-gray-600">Fecha de Subida</th>
                                        <th className="p-3 font-bold text-gray-600">Vencimiento</th>
                                        <th className="p-3 font-bold text-gray-600 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {contratosLista.length === 0 ? (
                                        <tr><td colSpan={3} className="p-8 text-center text-gray-500">No hay contratos registrados.</td></tr>
                                    ) : (
                                        contratosLista.map((c, i) => (
                                            <tr key={c.id} className={i === 0 ? "bg-green-50" : "bg-white hover:bg-slate-50"}>
                                                <td className="p-3 font-medium text-gray-800">
                                                    {new Date(c.fecha_subida).toLocaleDateString('es-PE', {timeZone: 'UTC'})} 
                                                    {i === 0 && <span className="ml-2 text-[10px] bg-green-200 text-green-800 px-2 py-0.5 rounded uppercase font-bold">Vigente</span>}
                                                </td>
                                                <td className="p-3 text-gray-600">{new Date(c.fecha_vencimiento).toLocaleDateString('es-PE', {timeZone: 'UTC'})}</td>
                                                <td className="p-3 text-center flex items-center justify-center gap-3">
                                                    <a href={c.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline">
                                                        👁️ Ver PDF
                                                    </a>
                                                    <span className="text-gray-300">|</span>
                                                    <button 
                                                        onClick={() => handleEliminarContrato(c.id, c.file_url)}
                                                        className="text-red-500 hover:text-red-700 font-bold text-lg transition-colors"
                                                        title="Eliminar contrato"
                                                    >
                                                        🗑️
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {isDetalleModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4">
                    <div className="bg-white p-0 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="bg-blue-900 p-5 text-white">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold">Desglose de Horas</h3>
                                <button onClick={() => setIsDetalleModalOpen(false)} className="text-blue-200 hover:text-white text-2xl font-bold transition-colors">&times;</button>
                            </div>
                            <p className="text-sm text-blue-200 mt-1 font-medium">{detalleEmpSeleccionado?.nombre_completo}</p>
                            <p className="text-xs text-blue-300 mt-1">Del {reporteInicio} al {reporteFin}</p>
                        </div>

                        <div className="p-0 overflow-y-auto flex-1 bg-gray-50">
                            {cargandoDetalle ? (
                                <div className="p-10 text-center text-gray-500 font-bold">Cargando voucher de horas...</div>
                            ) : detalleHoras.length === 0 ? (
                                <div className="p-10 text-center text-gray-500 font-bold">No hay registros detallados en estas fechas.</div>
                            ) : (
                                <table className="min-w-full text-left text-sm whitespace-nowrap bg-white">
                                    <thead className="bg-gray-100 sticky top-0 border-b border-gray-200 shadow-sm">
                                        <tr>
                                            <th className="p-3 font-bold text-gray-600">Fecha</th>
                                            <th className="p-3 font-bold text-gray-600 text-center">Turno</th>
                                            <th className="p-3 font-bold text-gray-600 text-right">Horas</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {detalleHoras.map((dia, idx) => (
                                            <tr key={idx} className="hover:bg-blue-50 transition-colors">
                                                <td className="p-3 font-medium text-gray-800 capitalize">
                                                    {new Date(dia.fecha).toLocaleDateString('es-PE', { timeZone: 'UTC', weekday: 'short', day: '2-digit', month: 'short' })}
                                                </td>
                                                <td className="p-3 text-center text-gray-600 font-mono text-xs bg-gray-50">
                                                    {dia.hora_inicio} - {dia.hora_fin}
                                                </td>
                                                <td className="p-3 text-right font-black text-blue-600">
                                                    {dia.horas_totales} <span className="text-[10px] text-gray-400">h</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="bg-white p-4 border-t border-gray-200 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            <span className="text-sm font-bold text-gray-500">Total Auditado:</span>
                            <span className="text-xl font-black text-blue-800">
                                {detalleHoras.reduce((acc, curr) => acc + Number(curr.horas_totales), 0).toFixed(2)} hrs
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}