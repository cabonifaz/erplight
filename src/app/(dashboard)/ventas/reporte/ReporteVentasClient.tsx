'use client'

import { useState } from "react";
import { getReporteVentas } from "@/actions/sale-actions";

export default function ReporteVentasClient({ sucursales, metodosPago }: { sucursales: any[], metodosPago: any[] }) {
  const [ventas, setVentas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Estados de los Filtros
  const [filtros, setFiltros] = useState({
    branchId: "",
    fechaInicio: "",
    fechaFin: "",
    metodoPago: ""
  });

  const handleBuscar = async () => {
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
      <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          
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
            <label className="block text-xs font-medium text-gray-500 mb-1">Fecha Inicio</label>
            <input 
              type="date" 
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              value={filtros.fechaInicio}
              onChange={e => setFiltros({...filtros, fechaInicio: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Fecha Fin</label>
            <div className="flex gap-2">
              <input 
                type="date" 
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                value={filtros.fechaFin}
                onChange={e => setFiltros({...filtros, fechaFin: e.target.value})}
              />
              <button 
                onClick={handleBuscar}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 💰 TARJETAS DE RESUMEN */}
      {ventas.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                <p className="text-sm font-medium text-blue-800">Total Recaudado (Filtro Actual)</p>
                <p className="text-2xl font-bold text-blue-900">S/ {totalMonto.toFixed(2)}</p>
            </div>
            <div className="bg-green-50 border border-green-100 p-4 rounded-lg">
                <p className="text-sm font-medium text-green-800">Productos Vendidos</p>
                <p className="text-2xl font-bold text-green-900">{ventas.length} items</p>
            </div>
        </div>
      )}

      {/* 📊 TABLA DE RESULTADOS (ESPEJO DEL EXCEL) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="min-w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-gray-100 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="p-3 font-semibold text-gray-700">Fecha</th>
                <th className="p-3 font-semibold text-gray-700">Documento</th>
                <th className="p-3 font-semibold text-gray-700">Correlativo</th>
                <th className="p-3 font-semibold text-gray-700">Cliente / RUC</th>
                <th className="p-3 font-semibold text-gray-700">Producto</th>
                <th className="p-3 font-semibold text-gray-700 text-center">Cant.</th>
                <th className="p-3 font-semibold text-gray-700 text-right">Total (S/)</th>
                <th className="p-3 font-semibold text-gray-700">Pago</th>
                <th className="p-3 font-semibold text-gray-700">Sucursal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ventas.length === 0 && hasSearched ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-500">No se encontraron ventas.</td>
                </tr>
              ) : ventas.length === 0 && !hasSearched ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-500">Aplica los filtros y presiona Buscar.</td>
                </tr>
              ) : (
                ventas.map((v, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 text-gray-600">{new Date(v.sale_date).toLocaleString('es-PE')}</td>
                    <td className="p-3 font-medium text-gray-700">{v.document_type || '-'}</td>
                    <td className="p-3 text-blue-700 font-medium">{v.document_number || '-'}</td>
                    <td className="p-3 text-gray-600">{v.client_document || '-'}</td>
                    <td className="p-3 font-medium text-gray-900">{v.producto}</td>
                    <td className="p-3 text-center text-gray-800">{v.cantidad}</td>
                    <td className="p-3 font-bold text-gray-900 text-right">{Number(v.precio_total || 0).toFixed(2)}</td>
                    <td className="p-3">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-[10px] font-bold uppercase tracking-wider border border-gray-200">
                        {v.payment_method}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500">{v.sucursal}</td>
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