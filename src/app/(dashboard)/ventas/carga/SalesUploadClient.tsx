'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { processExcelSales, validateExcelSales, obtenerHistorialCargas } from '@/actions/sale-actions'; 

export default function SalesUploadClient({ sucursales }: { sucursales: any[] }) {
  // ✨ 1. FILTRO ANTI-DUPLICADOS DEFINITIVO
  const sucursalesUnicas = sucursales.filter((branch, index, self) =>
    index === self.findIndex((b) => b.id === branch.id)
  );

  // ✨ 2. AUTO-SELECCIÓN SI SOLO HAY UNA SUCURSAL
  const [fileData, setFileData] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState(
    sucursalesUnicas.length === 1 ? String(sucursalesUnicas[0].id) : ""
  );
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const [validationIssues, setValidationIssues] = useState<any[]>([]);

  // ✨ ESTADOS DEL HISTORIAL, BUSCADOR Y DETALLES
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historialCargas, setHistorialCargas] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // Formateador estricto de moneda
  const formatMoneda = (valor: number | string) => {
      return new Intl.NumberFormat('es-PE', { 
          style: 'currency', 
          currency: 'PEN',
          minimumFractionDigits: 2 
      }).format(Number(valor));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsValidated(false);
    setCanSubmit(false);
    setValidationIssues([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const workbook = XLSX.read(bstr, { type: 'binary' });
      const wsname = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'yyyy-mm-dd hh:mm:ss' });
      setFileData(data);
    };
    reader.readAsBinaryString(file);
  };

  const handleValidar = async () => {
    if (fileData.length === 0) return;
    if (!selectedBranch) return alert("Por favor, selecciona una sucursal antes de validar.");
    
    setIsProcessing(true);

    const cleanedData = fileData.map((row: any) => {
        const productKey = Object.keys(row).find(k => 
            ['producto / descripción', 'producto', 'descripcion', 'producto / descripcion'].some(word => 
                k.toLowerCase().trim() === word.toLowerCase()
            )
        );
        if (productKey) return { ...row, [productKey]: String(row[productKey]).toUpperCase().trim() };
        return row;
    });
    
    const response = await validateExcelSales({ data: cleanedData, branchId: Number(selectedBranch) });
    
    if (response.success) {
        setValidationIssues((response as any).issues);
        setCanSubmit((response as any).canProceed);
        setIsValidated(true);
    } else {
        alert("Error de validación: " + response.message);
    }
    setIsProcessing(false);
  };

 const handleIngresar = async () => {
    if (fileData.length === 0 || !canSubmit || !selectedBranch) return;
    
    setIsProcessing(true);
    
    const cleanedData = fileData.map((row: any) => {
        const productKey = Object.keys(row).find(k => 
            ['producto / descripción', 'producto', 'descripcion', 'producto / descripcion'].some(word => k.toLowerCase().trim() === word.toLowerCase())
        );
        if (productKey) return { ...row, [productKey]: String(row[productKey]).toUpperCase().trim() };
        return row;
    });
    
    const response = await processExcelSales({ data: cleanedData, branchId: Number(selectedBranch) });
    
    if (response.success) {
        alert("Carga completada exitosamente. El historial ha sido actualizado.");
        setFileData([]);
        setFileName(null);
        setIsValidated(false);
        setValidationIssues([]);
        setCanSubmit(false);
    } else {
        alert("Error: " + response.message);
    }
    setIsProcessing(false);
  };

  // Función para abrir el modal y cargar el historial
  const handleVerHistorial = async () => {
      setShowHistoryModal(true);
      setLoadingHistory(true);
      const response = await obtenerHistorialCargas();
      if (response.success) {
          setHistorialCargas(response.data);
      }
      setLoadingHistory(false);
  };

  // Lógica para filtrar la tabla en tiempo real
  const filteredHistorial = historialCargas.filter(log => 
      (log.sucursal || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.usuario || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.fecha_carga || "").includes(searchTerm)
  );

  const resumenPagos = fileData.reduce((acc, row) => {
      const findValue = (keywords: string[]) => {
        const exactKey = Object.keys(row).find(k => keywords.some(word => k.toLowerCase().trim() === word.toLowerCase()));
        return exactKey ? row[exactKey] : undefined;
      };

      const metodo = findValue(['metodo de pago', 'método de pago']) || 'Efectivo';
      const rawPrecioVenta = findValue(['precio de venta', 'valor de venta', 'total']);
      const rawPrecioUnitario = findValue(['precio unitario']);
      const cantidad = Number(findValue(['cantidad'])) || 1;

      const parsePrecio = (val: any) => Number(String(val || '0').trim().replace(',', '.')) || 0;
      const precioVentaParsed = parsePrecio(rawPrecioVenta);
      const precioUnitarioParsed = parsePrecio(rawPrecioUnitario);

      const monto = precioVentaParsed > 0 ? precioVentaParsed : (precioUnitarioParsed * cantidad);
      acc[metodo] = (acc[metodo] || 0) + monto;
      return acc;
  }, {} as Record<string, number>);
  
  const totalGeneral = Object.values(resumenPagos).reduce((sum: number, val: any) => sum + (val as number), 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 relative">
      
      <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Módulo de Carga Diaria</h2>
          <button 
              onClick={handleVerHistorial}
              className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-4 py-2 rounded-md font-semibold text-sm transition-colors flex items-center gap-2"
          >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Ver Historial de Cargas
          </button>
      </div>

      <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
        <label className="font-semibold text-gray-700 whitespace-nowrap">Sucursal de Venta:</label>
        <select 
          className={`p-2 border border-gray-300 rounded-md bg-gray-50 focus:ring-blue-500 focus:border-blue-500 flex-1 max-w-md ${sucursalesUnicas.length === 1 ? 'cursor-not-allowed opacity-80 font-bold' : 'cursor-pointer'}`}
          value={selectedBranch}
          disabled={sucursalesUnicas.length === 1} // 🔒 BLOQUEO ACTIVADO
          onChange={(e) => {
            setSelectedBranch(e.target.value);
            setIsValidated(false);
            setCanSubmit(false);
            setValidationIssues([]);
          }}
        >
          {/* Si hay más de una sucursal, mostramos el texto de ayuda por defecto */}
          {sucursalesUnicas.length !== 1 && (
            <option value="" disabled>-- Selecciona a qué sucursal pertenecen estas ventas --</option>
          )}
          {/* Renderizamos las opciones LIMPIAS */}
          {sucursalesUnicas.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className={`mb-8 p-6 border-2 border-dashed rounded-lg text-center transition-colors ${selectedBranch ? 'border-blue-300 bg-blue-50/30 hover:bg-blue-50' : 'border-gray-300 bg-gray-100 opacity-60'}`}>
        <label className={`flex flex-col items-center justify-center ${selectedBranch ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
          <svg className={`w-12 h-12 mb-3 ${selectedBranch ? 'text-blue-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span className={`text-lg font-medium ${selectedBranch ? 'text-blue-700' : 'text-gray-500'}`}>
            {fileName ? `Archivo cargado: ${fileName}` : "Haz clic para subir tu Excel"}
          </span>
          <span className="text-sm text-gray-500 mt-1">Soporta .xlsx, .xls</span>
          <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={!selectedBranch} />
        </label>
        {!selectedBranch && (
            <p className="mt-3 text-red-500 font-bold text-sm">
                 Debes seleccionar una sucursal arriba para habilitar la carga.
            </p>
        )}
      </div>

      {isValidated && validationIssues.length > 0 && (
        <div className="mb-6 p-4 rounded-md border bg-yellow-50 border-yellow-200">
          <h3 className="font-bold text-yellow-800 mb-2">Resultados de la Validación:</h3>
          <ul className="space-y-1 text-sm">
            {validationIssues.map((issue, idx) => (
              <li key={idx} className={issue.tipo === 'error' ? 'text-red-600 font-medium' : 'text-yellow-700'}>
                • <strong>{issue.producto}:</strong> {issue.mensaje}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isValidated && validationIssues.length === 0 && (
        <div className="mb-6 p-4 rounded-md border bg-green-50 border-green-200 text-green-800 font-medium flex items-center gap-2 shadow-sm animate-in fade-in">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          Validación exitosa. No hay duplicados y el inventario es correcto. Listo para ingresar.
        </div>
      )}

      {fileData.length > 0 && (
        <div className="mb-6 p-5 bg-blue-50 border border-blue-100 rounded-lg shadow-sm">
          <h3 className="text-lg font-bold text-blue-900 mb-3">Resumen de Venta por Ingresar</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(resumenPagos).map(([metodo, total]: [string, any]) => (
              <div key={metodo} className="bg-white p-3 rounded-md border border-blue-200 shadow-sm">
                <p className="text-sm text-gray-500 font-medium">{metodo}</p>
                <p className="text-xl font-bold text-gray-800">{formatMoneda(total)}</p>
              </div>
            ))}
            <div className="bg-blue-600 p-3 rounded-md shadow-sm text-white flex flex-col justify-center">
                <p className="text-sm font-medium opacity-80">Total General</p>
                <p className="text-xl font-bold">{formatMoneda(totalGeneral)}</p>
            </div>
          </div>
        </div>
      )}

      {fileData.length > 0 && (
        <div className="mt-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <h2 className="text-lg font-bold text-gray-800">
              Previsualización ({fileData.length} registros)
            </h2>
            
            <div className="flex gap-3 w-full sm:w-auto">
              <button 
                onClick={handleValidar} 
                disabled={isProcessing} 
                className="flex-1 sm:flex-none bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors shadow-sm font-medium disabled:opacity-50"
              >
                1. Procesar / Validar
              </button>
              
              <button 
                onClick={handleIngresar} 
                disabled={isProcessing || !isValidated || !canSubmit} 
                className="flex-1 sm:flex-none bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors shadow-sm font-medium disabled:opacity-50 disabled:bg-blue-300"
              >
                2. Ingresar Ventas
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-[500px] overflow-y-auto bg-white">
            <table className="min-w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-100 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  {Object.keys(fileData[0]).map((key) => (
                    <th key={key} className="p-3 font-semibold text-gray-700">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {fileData.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    {Object.values(row).map((val: any, i) => (
                      <td key={i} className="p-3 text-gray-600">{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ✨ EL MODAL DEL HISTORIAL CON BUSCADOR Y DETALLES ✨ */}
      {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
              <div className="bg-white w-full max-w-5xl max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                  
                  {/* Cabecera del Modal */}
                  <div className="flex justify-between items-center p-5 border-b bg-gray-50">
                      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                          {selectedLog ? "Detalle de Carga" : "Auditoría: Historial de Cargas Masivas"}
                      </h2>
                      <button onClick={() => { setShowHistoryModal(false); setSelectedLog(null); }} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-full transition-colors">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                  </div>

                  {/* Cuerpo del Modal */}
                  <div className="p-6 overflow-y-auto bg-white flex-1">
                      
                      {/* VISTA 1: LA TABLA PRINCIPAL CON BUSCADOR */}
                      {!selectedLog ? (
                          <>
                              {/* El Buscador */}
                              <div className="mb-4 relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                  </div>
                                  <input 
                                      type="text" 
                                      placeholder="Buscar por sucursal, usuario o fecha..." 
                                      className="pl-10 w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                                      value={searchTerm}
                                      onChange={(e) => setSearchTerm(e.target.value)}
                                  />
                              </div>

                              {loadingHistory ? (
                                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                                      <p>Cargando historial...</p>
                                  </div>
                              ) : filteredHistorial.length === 0 ? (
                                  <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                                      <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                                      <p className="text-lg font-medium">No se encontraron registros de carga.</p>
                                  </div>
                              ) : (
                                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                                      <table className="min-w-full text-left text-sm whitespace-nowrap">
                                          <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                                              <tr>
                                                  <th className="p-3 font-semibold">Fecha y Hora</th>
                                                  <th className="p-3 font-semibold">Sucursal Destino</th>
                                                  <th className="p-3 font-semibold">Usuario Responsable</th>
                                                  <th className="p-3 font-semibold text-center">Registros</th>
                                                  <th className="p-3 font-semibold text-center">Acciones</th>
                                              </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-200">
                                              {filteredHistorial.map((log) => (
                                                  <tr key={log.id} className="hover:bg-blue-50/50 transition-colors">
                                                      <td className="p-3 font-medium text-gray-800">{log.fecha_carga}</td>
                                                      <td className="p-3 text-gray-600">{log.sucursal}</td>
                                                      <td className="p-3 text-gray-600">{log.usuario}</td>
                                                      <td className="p-3 text-center">
                                                          <span className="bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full text-xs">
                                                              {new Intl.NumberFormat('es-PE').format(log.record_count)}
                                                          </span>
                                                      </td>
                                                      <td className="p-3 text-center">
                                                          <button 
                                                              onClick={() => setSelectedLog(log)}
                                                              className="text-blue-600 hover:text-blue-800 font-semibold text-xs border border-blue-200 hover:bg-blue-100 px-3 py-1.5 rounded transition-colors flex items-center justify-center gap-1 mx-auto"
                                                          >
                                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                                              Ver Detalles
                                                          </button>
                                                      </td>
                                                  </tr>
                                              ))}
                                          </tbody>
                                      </table>
                                  </div>
                              )}
                          </>
                      ) : (
                          
                          /* VISTA 2: EL DETALLE DE LA CARGA (RESUMEN DE DINERO) */
                          <div className="animate-in slide-in-from-right-4 duration-300">
                              <button 
                                  onClick={() => setSelectedLog(null)}
                                  className="mb-6 flex items-center gap-2 text-gray-500 hover:text-blue-600 font-medium transition-colors"
                              >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                                  Volver al listado
                              </button>

                              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 mb-6 flex flex-wrap justify-between items-center gap-4">
                                  <div>
                                      <p className="text-sm text-gray-500 font-medium mb-1">Sucursal de Venta</p>
                                      <p className="text-xl font-bold text-gray-800">{selectedLog.sucursal}</p>
                                  </div>
                                  <div>
                                      <p className="text-sm text-gray-500 font-medium mb-1">Fecha de Subida</p>
                                      <p className="text-lg font-bold text-gray-700">{selectedLog.fecha_carga}</p>
                                  </div>
                                  <div>
                                      <p className="text-sm text-gray-500 font-medium mb-1">Usuario</p>
                                      <p className="text-lg font-bold text-gray-700">{selectedLog.usuario}</p>
                                  </div>
                                  <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg text-center">
                                      <p className="text-xs font-bold uppercase tracking-wider mb-0.5">Filas Procesadas</p>
                                      <p className="text-2xl font-black">{new Intl.NumberFormat('es-PE').format(selectedLog.record_count)}</p>
                                  </div>
                              </div>

                              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                  Resumen de Ventas Ingresadas
                              </h3>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                      <p className="text-sm text-gray-500 font-bold mb-1">EFECTIVO</p>
                                      <p className="text-2xl font-black text-gray-800">{formatMoneda(selectedLog.total_efectivo)}</p>
                                  </div>
                                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                      <p className="text-sm text-gray-500 font-bold mb-1">YAPE</p>
                                      <p className="text-2xl font-black text-gray-800">{formatMoneda(selectedLog.total_yape)}</p>
                                  </div>
                                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                      <p className="text-sm text-gray-500 font-bold mb-1">PLIN</p>
                                      <p className="text-2xl font-black text-gray-800">{formatMoneda(selectedLog.total_plin)}</p>
                                  </div>
                                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                      <p className="text-sm text-gray-500 font-bold mb-1">TARJETA</p>
                                      <p className="text-2xl font-black text-gray-800">{formatMoneda(selectedLog.total_tarjeta)}</p>
                                  </div>
                                  
                                  <div className="col-span-2 md:col-span-4 mt-2 bg-gradient-to-r from-blue-600 to-indigo-700 p-5 rounded-xl shadow-md text-white flex justify-between items-center">
                                      <div>
                                          <p className="text-blue-100 font-bold text-sm uppercase tracking-wider mb-1">Facturación Total del Archivo</p>
                                          <p className="text-3xl font-black">{formatMoneda(selectedLog.total_general)}</p>
                                      </div>
                                      <svg className="w-12 h-12 text-white opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}