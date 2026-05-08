'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { 
    obtenerNotificacionesCumpleanos, 
    obtenerNotificacionesGenerales,
    obtenerNotificacionesContratos // ✨ IMPORTAMOS LA NUEVA ACCIÓN
} from '@/actions/rrhh-actions';

interface NotificacionEstandar {
    id: string;
    icono: string;
    titulo: string;
    mensaje: string;
    subtexto?: string;
    resaltado?: boolean;
}

export default function NotificationBell() {
    const { data: session } = useSession();
    const [notificaciones, setNotificaciones] = useState<NotificacionEstandar[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const cargarNotificaciones = async () => {
            const rolCrudo = (session?.user as any)?.role || 'GERENTE GENERAL'; // ✨ Cambia el default a espacio
const rolUsuario = rolCrudo.toUpperCase().trim(); // ✨ QUITAMOS el .replace(' ', '_')
            const branchId = (session?.user as any)?.branch_id || 1;
            const userId = (session?.user as any)?.id; 
            
            let bandejaGenérica: NotificacionEstandar[] = [];

            // 1. CARGAMOS LOS CUMPLEAÑOS
            const resCumples = await obtenerNotificacionesCumpleanos(branchId, rolUsuario);
            if (resCumples.success && resCumples.data) {
                const cumplesFormateados = resCumples.data.map((n: any) => ({
                    id: `cumple-${n.id}`,
                    icono: n.cuando === 'HOY' ? '🎉' : '🎂',
                    titulo: '¡Cumpleaños!',
                    mensaje: `${n.nombre_completo} cumple años ${n.cuando === 'HOY' ? 'hoy' : 'mañana'}.`,
                    subtexto: n.nombre_sucursal,
                    resaltado: n.cuando === 'HOY'
                }));
                bandejaGenérica = [...bandejaGenérica, ...cumplesFormateados];
            }

            // ✨ 2. CARGAMOS ALERTAS DE CONTRATOS (Solo para Gerencias)
            const rolesAlertaContrato = ['GERENTE GENERAL', 'GERENTE DE LOGISTICA', 'ADMINISTRADOR GENERAL'];
            if (rolesAlertaContrato.includes(rolUsuario)) {
                const resContratos = await obtenerNotificacionesContratos();
                if (resContratos.success && resContratos.data) {
                    const contratosFormateados = resContratos.data.map((n: any) => ({
                        id: `contrato-${n.id}`,
                        icono: '📄',
                        titulo: 'Renovación Pendiente',
                        mensaje: `El contrato de ${n.nombre_completo} vence en ${n.dias_restantes} días.`,
                        subtexto: n.nombre_sucursal,
                        resaltado: true // Siempre resaltado en rojo/azul porque es urgente
                    }));
                    bandejaGenérica = [...bandejaGenérica, ...contratosFormateados];
                }
            }

            // 3. CARGAMOS LAS NOTIFICACIONES GENERALES DE LA BD
            if (userId) {
                const resGenerales = await obtenerNotificacionesGenerales(Number(userId));
                if (resGenerales.success && resGenerales.data) {
                    const generalesFormateadas = resGenerales.data.map((n: any) => {
                        const fechaFormateada = new Date(n.created_at).toLocaleString('es-PE', {
                            day: '2-digit', month: '2-digit', year: 'numeric', 
                            hour: '2-digit', minute: '2-digit', hour12: true
                        });
                        return {
                            id: `gen-${n.id}`,
                            icono: n.title.includes('Cierre') ? '🔒' : '🔔',
                            titulo: n.title,
                            mensaje: n.message,
                            subtexto: fechaFormateada,
                            resaltado: true 
                        };
                    });
                    bandejaGenérica = [...bandejaGenérica, ...generalesFormateadas];
                }
            }

            setNotificaciones(bandejaGenérica);
        };
        if (session) cargarNotificaciones();
    }, [session]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={modalRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="relative p-2 text-gray-400 hover:text-blue-600 transition-colors bg-gray-50 rounded-full hover:bg-blue-50 focus:outline-none"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {notificaciones.length > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 border-2 border-white rounded-full shadow-sm">
                        {notificaciones.length}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden transform opacity-100 scale-100 transition-all origin-top-right">
                    <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">🔔 Notificaciones</h3>
                        {notificaciones.length > 0 && <span className="bg-blue-100 text-blue-800 text-[10px] uppercase px-2 py-1 rounded-full font-black tracking-wider">{notificaciones.length} Nuevas</span>}
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto">
                        {notificaciones.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <p className="text-4xl mb-3">📭</p>
                                <p className="text-sm font-medium">No hay notificaciones nuevas.</p>
                                <p className="text-xs text-gray-400 mt-1">Estás al día con todo.</p>
                            </div>
                        ) : (
                            notificaciones.map((n) => (
                                <div key={n.id} className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors flex gap-4 items-start cursor-default ${n.resaltado ? 'bg-blue-50/40' : ''}`}>
                                    <div className="text-2xl flex-shrink-0 mt-0.5">{n.icono}</div>
                                    <div>
                                        <p className="text-sm text-gray-800 leading-snug">
                                            <span className="font-bold text-gray-900 mr-1 block mb-0.5">{n.titulo}</span> 
                                            {n.mensaje}
                                        </p>
                                        {n.subtexto && <p className="text-[10px] text-gray-400 mt-1.5 font-bold uppercase tracking-wider">{n.subtexto}</p>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}