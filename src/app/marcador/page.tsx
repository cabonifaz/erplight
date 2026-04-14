'use client';

import { useState, useEffect, useRef } from 'react';
import { marcarAsistenciaPorDocumento, verificarEstadoKiosko } from '@/actions/rrhh-actions'; // ✨ Actualizado

export default function KioskoMarcadorPage() {
    const [horaActual, setHoraActual] = useState(new Date());
    const [documento, setDocumento] = useState('');
    const [loading, setLoading] = useState(false);
    
    // ✨ NUEVO ESTADO PARA EL BOTÓN
    const [estadoBoton, setEstadoBoton] = useState<'ESPERANDO' | 'PENDIENTE_ENTRADA' | 'PENDIENTE_SALIDA' | 'COMPLETADO' | 'DESCONOCIDO'>('ESPERANDO');
    const [alerta, setAlerta] = useState({ visible: false, texto: '', tipo: '' });
    
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const timer = setInterval(() => setHoraActual(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // ✨ EFECTO EN VIVO: Vigila lo que escribes
    useEffect(() => {
        const checkEstado = async () => {
            // Si el documento tiene 8 o más caracteres (DNI/CE), verificamos su estado
            if (documento.trim().length >= 8) {
                const res = await verificarEstadoKiosko(documento.trim());
                if (res.success) setEstadoBoton(res.estado);
            } else {
                setEstadoBoton('ESPERANDO'); // Volvemos al azul normal si borra
            }
        };
        
        // Un pequeño retraso para no saturar la BD mientras teclea rápido
        const timeoutId = setTimeout(() => checkEstado(), 300);
        return () => clearTimeout(timeoutId);
    }, [documento]);

    const handleMarcar = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!documento.trim()) {
            mostrarAlerta('Ingresa un número de documento válido.', 'error');
            return;
        }

        setLoading(true);
        const res = await marcarAsistenciaPorDocumento(documento.trim());
        
        if (res.success) {
            const tipoAlerta = res.resultado === 'ENTRADA' ? 'success' : 
                               res.resultado === 'SALIDA' ? 'warning' : 'info';
            mostrarAlerta(res.message, tipoAlerta);
            setDocumento(''); 
            setEstadoBoton('ESPERANDO'); // Reiniciamos el botón
        } else {
            mostrarAlerta(res.message, 'error');
            setDocumento('');
            setEstadoBoton('ESPERANDO');
        }
        
        setLoading(false);
        inputRef.current?.focus(); 
    };

    const mostrarAlerta = (texto: string, tipo: string) => {
        setAlerta({ visible: true, texto, tipo });
        setTimeout(() => setAlerta({ visible: false, texto: '', tipo: '' }), 4000);
    };

    // ✨ LÓGICA DE COLORES Y TEXTOS DEL BOTÓN
    const getBotonConfig = () => {
        if (loading) return { texto: 'VERIFICANDO...', clase: 'bg-gray-400 text-white cursor-wait' };
        
        switch (estadoBoton) {
            case 'PENDIENTE_ENTRADA': return { texto: 'MARCAR ENTRADA', clase: 'bg-blue-600 hover:bg-blue-700 text-white' };
            case 'PENDIENTE_SALIDA': return { texto: 'MARCAR SALIDA', clase: 'bg-red-600 hover:bg-red-700 text-white' };
            case 'COMPLETADO': return { texto: '✅ TURNO COMPLETADO', clase: 'bg-gray-300 text-gray-600 cursor-not-allowed' };
            case 'DESCONOCIDO': return { texto: '❌ DOC. NO ENCONTRADO', clase: 'bg-gray-800 text-white cursor-not-allowed' };
            default: return { texto: 'MARCAR ASISTENCIA', clase: 'bg-blue-600 hover:bg-blue-700 text-white opacity-50' };
        }
    };

    const btnConfig = getBotonConfig();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="text-center mb-10">
                <h1 className="text-3xl font-extrabold text-blue-800 tracking-tight mb-2">Control de Asistencia</h1>
                <p className="text-gray-500 font-medium">Marcador</p>
            </div>

            <div className="bg-gray-900 text-white p-10 rounded-3xl shadow-xl mb-12 text-center w-full max-w-md border-4 border-gray-800">
                <p className="text-7xl font-mono tracking-widest font-bold drop-shadow-md">
                    {horaActual.toLocaleTimeString('es-PE', { hour12: false })}
                </p>
                <p className="text-gray-400 mt-4 font-medium text-lg capitalize">
                    {horaActual.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>

            <form onSubmit={handleMarcar} className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                <label className="block text-gray-700 font-bold mb-3 text-center text-lg">
                    Número de Documento (DNI/CE)
                </label>
                
                <input 
                    ref={inputRef}
                    type="text" 
                    className="w-full text-center text-3xl tracking-widest p-4 border-2 border-gray-300 rounded-xl mb-6 bg-gray-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                    placeholder=""
                    value={documento}
                    onChange={(e) => setDocumento(e.target.value)}
                    disabled={loading}
                    autoComplete="off"
                />

                <button 
                    type="submit"
                    disabled={loading || estadoBoton === 'ESPERANDO' || estadoBoton === 'COMPLETADO' || estadoBoton === 'DESCONOCIDO'}
                    className={`w-full py-5 font-extrabold text-2xl rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 ${btnConfig.clase}`}
                >
                    {btnConfig.texto}
                </button>
            </form>

            {alerta.visible && (
                <div className={`fixed bottom-10 px-8 py-4 rounded-xl shadow-2xl text-lg font-bold text-white transition-all transform translate-y-0 ${
                    alerta.tipo === 'success' ? 'bg-green-600' :
                    alerta.tipo === 'warning' ? 'bg-orange-500' :
                    alerta.tipo === 'error' ? 'bg-red-600' :
                    'bg-blue-600'
                }`}>
                    {alerta.texto}
                </div>
            )}
        </div>
    );
}