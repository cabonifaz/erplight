'use client'

import { useState } from "react";
import { Search, Filter, X } from "lucide-react";

interface PurchaseFiltersProps {
    onFilterChange: (filters: any) => void;
    branches?: { id: number, name: string }[];
    availableRequests?: any[];
}

export function PurchaseRequestFilters({ onFilterChange, branches = [], availableRequests = [] }: PurchaseFiltersProps) {
    const defaultFilters = {
        branch_id: "",
        code: "",
        description: "",
        status_id: "", // 🔥 Nuevo campo
        start_date: "",
        end_date: ""
    };

    const [filters, setFilters] = useState(defaultFilters);

    const handleApply = () => {
        onFilterChange(filters);
    };

    const handleClear = () => {
        setFilters(defaultFilters);
        onFilterChange(defaultFilters); 
    };

    // Sugerencias únicas
    const uniqueDescriptions = Array.from(new Set(availableRequests.map(r => r.description).filter(Boolean)));
    const uniqueCodes = Array.from(new Set(availableRequests.map(r => `REQ-${r.id.toString().padStart(6, '0')}`)));

    // 🔥 Lista de estados (puedes traerlos de la DB, pero aquí los pongo fijos para rapidez)
    // Los IDs deben coincidir con los de tu tabla master_catalogs
  const statuses = [
        { id: 1, name: "PENDIENTE" },
        { id: 2, name: "APROBADO" },
        { id: 3, name: "RECHAZADO" },
        { id: 4, name: "COMPLETADO (SOLICITUD)" },
        { id: 7, name: "COMPRA REALIZADA" },
        { id: 8, name: "COMPLETADO (PAGOS)" },
        { id: 9, name: "VALIDADA" }
    ];

    return (
        <div className="bg-white p-5 rounded-xl border border-gray-200 mb-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <Search className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-800">Filtros Avanzados</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                {/* Sucursal */}
                <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-medium text-gray-500">Sucursal</label>
                    <select 
                        className="w-full h-10 px-3 rounded-md border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={filters.branch_id} 
                        onChange={(e) => setFilters({...filters, branch_id: e.target.value})}
                    >
                        <option value="">Todas</option>
                        {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>

                {/* Código */}
                <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-medium text-gray-500">Código</label>
                    <input 
                        type="text" 
                        list="code-suggestions"
                        placeholder="Ej. REQ-000004" 
                        className="w-full h-10 px-3 rounded-md border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={filters.code} 
                        onChange={(e) => setFilters({...filters, code: e.target.value})} 
                    />
                    <datalist id="code-suggestions">
                        {uniqueCodes.map((code, idx) => <option key={idx} value={code as string} />)}
                    </datalist>
                </div>

                {/* Descripción */}
                <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-medium text-gray-500">Descripción</label>
                    <input 
                        type="text" 
                        list="desc-suggestions"
                        placeholder="Buscar..." 
                        className="w-full h-10 px-3 rounded-md border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={filters.description} 
                        onChange={(e) => setFilters({...filters, description: e.target.value})} 
                    />
                    <datalist id="desc-suggestions">
                        {uniqueDescriptions.map((desc, idx) => <option key={idx} value={desc as string} />)}
                    </datalist>
                </div>

                {/* 🔥 NUEVO: Filtro de Estado */}
                <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-medium text-gray-500">Estado</label>
                    <select 
                        className="w-full h-10 px-3 rounded-md border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={filters.status_id} 
                        onChange={(e) => setFilters({...filters, status_id: e.target.value})}
                    >
                        <option value="">Cualquiera</option>
                        {statuses.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                {/* Rango de Fechas */}
                <div className="md:col-span-3 grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500">Desde</label>
                        <input type="date" className="w-full h-10 px-2 rounded-md border border-gray-200 bg-gray-50 text-sm" value={filters.start_date} onChange={(e) => setFilters({...filters, start_date: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500">Hasta</label>
                        <input type="date" className="w-full h-10 px-2 rounded-md border border-gray-200 bg-gray-50 text-sm" value={filters.end_date} onChange={(e) => setFilters({...filters, end_date: e.target.value})} />
                    </div>
                </div>

                {/* Botones */}
                <div className="md:col-span-1 flex gap-2">
                    <button onClick={handleApply} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-10 rounded-md flex items-center justify-center transition-colors">
                        <Filter className="w-4 h-4" />
                    </button>
                    <button onClick={handleClear} className="w-10 h-10 border border-red-200 text-red-500 hover:bg-red-50 rounded-md flex items-center justify-center">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}