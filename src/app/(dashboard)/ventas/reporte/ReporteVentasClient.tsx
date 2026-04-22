'use client'

import { useState, useEffect } from "react";
import { getReporteVentas, obtenerLimiteDiasReporte } from "@/actions/sale-actions";

export default function ReporteVentasClient({ sucursales, metodosPago }: { sucursales: any[], metodosPago: any[] }) {
  const [ventas, setVentas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // ✨ NUEVO ESTADO: Guardará el límite máximo de días configurado en BD
  const [maxDiasPermitidos, setMaxDiasPermitidos] = useState<number | null>(null);

  // Estados de los Filtros
  const [filtros, setFiltros] = useState({
    branchId: "",
    fechaInicio: "",
    fechaFin: "",
    metodoPago: ""
  });

  // ✨ NUEVO: Cargar configuración al montar el componente
  useEffect(() => {
    const cargarConfiguracion = async () => {
        const res = await obtenerLimiteDiasReporte();
        if (res.success) {
            setMaxDiasPermitidos(res.maxDias);
        } else {
            // Fallback seguro de 31 días si algo falla en BD
            setMaxDiasPermitidos(31);
        }
    };
    cargarConfiguracion();
  }, []);

  const handleBuscar = async () => {
    // ✨ REGLAS DE VALIDACIÓN ESTRICTAS
    
    // 1. Fechas obligatorias
    if (!filtros.fechaInicio || !filtros.fechaFin) {
        alert("Es obligatorio seleccionar una Fecha de Inicio y una Fecha de Fin para generar el reporte.");
        return;
    }

    const dateInicio = new Date(filtros.fechaInicio);
    const dateFin = new Date(filtros.fechaFin);

    // 2. Coherencia cronológica
    if (dateInicio > dateFin) {
        alert("La Fecha de Inicio no puede ser posterior a la Fecha de Fin.");
        return;
    }

    // 3. Rango máximo permitido por BD
    if (maxDiasPermitidos !== null) {
        const diffTime = Math.abs(dateFin.getTime() - dateInicio.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Le sumamos 1 al diffDays porque si piden del 1 al 1, es 1 día entero (no 0).
        if ((diffDays + 1) > maxDiasPermitidos) {
            alert(`El rango seleccionado (${diffDays + 1} días) supera el límite máximo permitido de ${maxDiasPermitidos} días configurado en el sistema.`);
            return;
        }
    }

    // Si pasa las validaciones, procede con la búsqueda
    setIsLoading(true);
    setHasSearched(true);
    
    const response = await getReporteVentas({
      branchId: filtros.branchId ? Number(filtros.branchId) : null,
      fechaInicio: filtros.fechaInicio || null,
      fechaFin: filtros.fechaFin || null,
      metodoPago: filtros.metodoPago || null
    });

    if (response.success) {
      setVentas(response.data);
    } else {
      alert("Error al obtener el reporte: " + response.message);
    }
    
    setIsLoading(false);
  };

  // Calculamos el total previniendo errores de NaN por comas en los decimales
  const totalMonto = ventas.reduce((sum, v) => {
    const valorLimpio = String(v.precio_total || '0').replace(',', '.');
    return sum + Number(valorLimpio);
  }, 0);

  return (
    <div className="space-y-6">
      
      {/* 🔍 CAJA DE FILTROS */}
      <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm relative">
        {/* ✨ Etiqueta visual informativa del límite */}
        {maxDiasPermitidos && (
            <div className="absolute -top-3 left-4 bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide border border-blue-200">
                Rango máximo: {maxDiasPermitidos} días
            </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mt-2">
          
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Sucursal</label>
            <select 
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              value={filtros.branchId}
              onChange={e => setFiltros({...filtros, branchId: e.target.value})}
            >
              <option value="">Todas las sucursales</option>
              {sucursales.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Método de Pago</label>
            <select 
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              value={filtros.metodoPago}
              onChange={e => setFiltros({...filtros, metodoPago: e.target.value})}
            >
              <option value="">Todos los métodos</option>
              {metodosPago.map(mp => (
                <option key={mp.code} value={mp.code}>{mp.description}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Fecha Inicio <span className="text-red-500">*</span></label>
            <input 
              type="date" 
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              value={filtros.fechaInicio}
              onChange={e => setFiltros({...filtros, fechaInicio: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Fecha Fin <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <input 
                type="date" 
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                value={filtros.fechaFin}
                onChange={e => setFiltros({...filtros, fechaFin: e.target.value})}
              />
              <button 
                onClick={handleBuscar}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isLoading ? '...' : 'Buscar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 💰 TARJETAS DE RESUMEN */}
      {ventas.length > 0 && (
        <div className="grid grid-cols-2 gap-4 animate-in fade-in">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg shadow-sm">
                <p className="text-sm font-medium text-blue-800">Total Recaudado (Filtro Actual)</p>
                <p className="text-2xl font-bold text-blue-900">S/ {new Intl.NumberFormat('es-PE').format(totalMonto)}</p>
            </div>
            <div className="bg-green-50 border border-green-100 p-4 rounded-lg shadow-sm">
                <p className="text-sm font-medium text-green-800">Productos Vendidos</p>
                <p className="text-2xl font-bold text-green-900">{new Intl.NumberFormat('es-PE').format(ventas.length)} items</p>
            </div>
        </div>
      )}

      {/* 📊 TABLA DE RESULTADOS */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="min-w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-gray-100 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-3 font-bold text-gray-700">Fecha</th>
                <th className="p-3 font-bold text-gray-700">Documento</th>
                <th className="p-3 font-bold text-gray-700">Correlativo</th>
                <th className="p-3 font-bold text-gray-700">Cliente / RUC</th>
                <th className="p-3 font-bold text-gray-700">Producto</th>
                <th className="p-3 font-bold text-gray-700 text-center">Cant.</th>
                <th className="p-3 font-bold text-gray-700 text-right">Total (S/)</th>
                <th className="p-3 font-bold text-gray-700">Pago</th>
                <th className="p-3 font-bold text-gray-700">Sucursal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ventas.length === 0 && hasSearched ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-500">No se encontraron ventas con estos filtros.</td>
                </tr>
              ) : ventas.length === 0 && !hasSearched ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path></svg>
                    Selecciona un rango de fechas y presiona Buscar.
                  </td>
                </tr>
              ) : (
                ventas.map((v, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                    <td className="p-3 text-gray-600">{new Date(v.sale_date).toLocaleString('es-PE')}</td>
                    <td className="p-3 font-medium text-gray-700">{v.document_type || '-'}</td>
                    <td className="p-3 text-blue-700 font-bold">{v.document_number || '-'}</td>
                    <td className="p-3 text-gray-600">{v.client_document || '-'}</td>
                    <td className="p-3 font-bold text-gray-900">{v.producto}</td>
                    <td className="p-3 text-center">
                        <span className="bg-gray-100 text-gray-800 font-bold px-2 py-0.5 rounded-md">
                            {v.cantidad}
                        </span>
                    </td>
                    <td className="p-3 font-black text-blue-600 text-right">{new Intl.NumberFormat('es-PE', {minimumFractionDigits: 2}).format(Number(v.precio_total || 0))}</td>
                    <td className="p-3">
                      <span className="px-2 py-1 bg-white text-gray-700 rounded-md text-[10px] font-bold uppercase tracking-wider border border-gray-300 shadow-sm">
                        {v.payment_method}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500 text-xs font-medium">{v.sucursal}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}