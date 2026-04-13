'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { processExcelSales, validateExcelSales } from '@/actions/sale-actions'; 

// 1. Recibimos las sucursales como props
export default function SalesUploadClient({ sucursales }: { sucursales: any[] }) {
  const [fileData, setFileData] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  
  // 2. Nuevo estado para guardar la sucursal seleccionada
  const [selectedBranch, setSelectedBranch] = useState("");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const [validationIssues, setValidationIssues] = useState<any[]>([]);

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
      // Leemos el Excel respetando el formato de fecha y hora
      const data = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'yyyy-mm-dd hh:mm:ss' });
      setFileData(data);
    };
    reader.readAsBinaryString(file);
  };

  const handleValidar = async () => {
    if (fileData.length === 0) return;
    if (!selectedBranch) {
        alert("Por favor, selecciona una sucursal antes de validar.");
        return;
    }
    
    setIsProcessing(true);

    // ✨ NORMALIZACIÓN: Convertimos los nombres de los productos del Excel a MAYÚSCULAS
    // para que coincidan con la base de datos que actualizamos con UPPER()
    const cleanedData = fileData.map((row: any) => {
        // Buscamos la columna del producto (independientemente de cómo se escriba el encabezado)
        const productKey = Object.keys(row).find(k => 
            ['producto / descripción', 'producto', 'descripcion', 'producto / descripcion'].some(word => 
                k.toLowerCase().trim() === word.toLowerCase()
            )
        );

        if (productKey) {
            return {
                ...row,
                [productKey]: String(row[productKey]).toUpperCase().trim()
            };
        }
        return row;
    });
    
    // Enviamos la data ya normalizada (en MAYÚSCULAS)
    const response = await validateExcelSales({ 
        data: cleanedData, 
        branchId: Number(selectedBranch) 
    });
    
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
    if (fileData.length === 0 || !canSubmit) return;
    
    // Validación de seguridad por si acaso
    if (!selectedBranch) {
        alert("Por favor, selecciona una sucursal.");
        return;
    }
    
    setIsProcessing(true);
    
    // ✨ APLICAMOS LA MISMA LIMPIEZA ESTRICTA QUE EN LA VALIDACIÓN
    const cleanedData = fileData.map((row: any) => {
        const productKey = Object.keys(row).find(k => 
            ['producto / descripción', 'producto', 'descripcion', 'producto / descripcion'].some(word => 
                k.toLowerCase().trim() === word.toLowerCase()
            )
        );

        if (productKey) {
            return {
                ...row,
                [productKey]: String(row[productKey]).toUpperCase().trim()
            };
        }
        return row;
    });
    
    // Enviamos al backend la data LIMPIA (cleanedData) en lugar del crudo
    const response = await processExcelSales({ data: cleanedData, branchId: Number(selectedBranch) });
    
    if (response.success) {
        alert("¡Éxito! " + response.message);
        setFileData([]);
        setFileName(null);
        setIsValidated(false);
        setValidationIssues([]);
        setCanSubmit(false); // Reseteamos también el botón
    } else {
        alert("Error: " + response.message);
    }
    setIsProcessing(false);
  };

 // ✨ Calcular totales agrupados haciendo una búsqueda inteligente de columnas (ignora espacios y mayúsculas)
  const resumenPagos = fileData.reduce((acc, row) => {
    // Función para encontrar el valor de una columna sin importar si tiene espacios extra o mayúsculas
    const findValue = (keywords: string[]) => {
        const exactKey = Object.keys(row).find(k => 
            keywords.some(word => k.toLowerCase().trim() === word.toLowerCase())
        );
        return exactKey ? row[exactKey] : undefined;
    };

    const metodo = findValue(['metodo de pago', 'método de pago']) || 'Efectivo';
    const rawPrecioVenta = findValue(['precio de venta', 'valor de venta', 'total']);
    const rawPrecioUnitario = findValue(['precio unitario']);
    const cantidad = Number(findValue(['cantidad'])) || 1;

    // Limpiador estricto de números (cambia comas a puntos)
    const parsePrecio = (val: any) => Number(String(val || '0').trim().replace(',', '.')) || 0;

    const precioVentaParsed = parsePrecio(rawPrecioVenta);
    const precioUnitarioParsed = parsePrecio(rawPrecioUnitario);

    // Prioriza el Precio de Venta (41.89). Si está vacío, usa Unitario * Cantidad
    const monto = precioVentaParsed > 0 ? precioVentaParsed : (precioUnitarioParsed * cantidad);

    acc[metodo] = (acc[metodo] || 0) + monto;
    return acc;
  }, {} as Record<string, number>);
  
  const totalGeneral = Object.values(resumenPagos).reduce((sum: number, val: any) => sum + (val as number), 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      
      {/* 🏢 NUEVO: SELECTOR DE SUCURSAL */}
      <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
        <label className="font-semibold text-gray-700 whitespace-nowrap">Sucursal de Venta:</label>
        <select 
          className="p-2 border border-gray-300 rounded-md bg-gray-50 focus:ring-blue-500 focus:border-blue-500 flex-1 max-w-md cursor-pointer"
          value={selectedBranch}
          onChange={(e) => {
            setSelectedBranch(e.target.value);
            // Si cambia la sucursal, borramos las validaciones anteriores porque el inventario es distinto
            setIsValidated(false);
            setCanSubmit(false);
            setValidationIssues([]);
          }}
        >
          <option value="" disabled>-- Selecciona a qué sucursal pertenecen estas ventas --</option>
          {sucursales?.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Zona de Carga de Archivo */}
      <div className="mb-8 p-6 border-2 border-dashed border-gray-300 rounded-lg text-center bg-gray-50 hover:bg-gray-100 transition-colors">
        <label className="cursor-pointer flex flex-col items-center justify-center">
          <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span className="text-lg font-medium text-gray-700">
            {fileName ? `Archivo cargado: ${fileName}` : "Haz clic para subir tu Excel"}
          </span>
          <span className="text-sm text-gray-500 mt-1">Soporta .xlsx, .xls</span>
          <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
        </label>
      </div>

      {/* RESULTADOS DE VALIDACIÓN */}
      {isValidated && validationIssues.length > 0 && (
        <div className="mb-6 p-4 rounded-md border bg-yellow-50 border-yellow-200">
          <h3 className="font-bold text-yellow-800 mb-2">Resultados de la Validación (Sucursal Seleccionada):</h3>
          <ul className="space-y-1 text-sm">
            {validationIssues.map((issue, idx) => (
              <li key={idx} className={issue.tipo === 'error' ? 'text-red-600 font-medium' : 'text-yellow-700'}>
                • <strong>{issue.producto}:</strong> {issue.mensaje}
              </li>
            ))}
          </ul>
          {!canSubmit && (
            <p className="mt-3 text-red-600 font-bold text-sm">
              Corrige los errores de inventario en la sucursal seleccionada antes de ingresar las ventas.
            </p>
          )}
        </div>
      )}

      {isValidated && validationIssues.length === 0 && (
        <div className="mb-6 p-4 rounded-md border bg-green-50 border-green-200 text-green-800 font-medium">
          ✅ Validación exitosa. Todos los productos tienen stock en esta sucursal. Listo para ingresar.
        </div>
      )}

      {/* CUADRO DE RESUMEN DE DINERO */}
      {fileData.length > 0 && (
        <div className="mb-6 p-5 bg-blue-50 border border-blue-100 rounded-lg shadow-sm">
          <h3 className="text-lg font-bold text-blue-900 mb-3">Resumen de Venta por Ingresar</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(resumenPagos).map(([metodo, total]: [string, any]) => (
              <div key={metodo} className="bg-white p-3 rounded-md border border-blue-200 shadow-sm">
                <p className="text-sm text-gray-500 font-medium">{metodo}</p>
                <p className="text-xl font-bold text-gray-800">S/ {(total as number).toFixed(2)}</p>
              </div>
            ))}
            <div className="bg-blue-600 p-3 rounded-md shadow-sm text-white flex flex-col justify-center">
                <p className="text-sm font-medium opacity-80">Total General</p>
                <p className="text-xl font-bold">S/ {totalGeneral.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Previsualización y Botones */}
      {fileData.length > 0 && (
        <div>
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

          <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-[500px] overflow-y-auto">
            <table className="min-w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-100 border-b border-gray-200 sticky top-0">
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
    </div>
  );
}