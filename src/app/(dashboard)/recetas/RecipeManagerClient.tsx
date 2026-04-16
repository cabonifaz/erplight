'use client';

import { useState } from 'react';
import { 
  getRecetaDelMenu, 
  eliminarComponenteReceta,
  agregarComponenteRecetaMenu
} from '@/actions/recipe-actions';

interface ItemBase { id: number; name: string; }

interface RecipeManagerProps {
  insumos: ItemBase[];
  platos: ItemBase[];
}

export default function RecipeManagerClient({ insumos, platos }: RecipeManagerProps) {
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(null);
  const [recetaActual, setRecetaActual] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedComponentId, setSelectedComponentId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. CARGAR RECETA DEL MENÚ
  const handleSelectMenu = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const menuId = Number(e.target.value);
    setSelectedMenuId(menuId);
    
    if (menuId) {
      setIsLoading(true);
      const data = await getRecetaDelMenu(menuId);
      setRecetaActual(data);
      setIsLoading(false);
    } else {
      setRecetaActual([]);
    }
  };

  const handleEliminarComponente = async (idRecipe: number) => {
    if (!confirm("¿Seguro que deseas quitar este ingrediente de la receta?")) return;
    
    const res = await eliminarComponenteReceta(idRecipe);
    if (res.success && selectedMenuId) {
      const data = await getRecetaDelMenu(selectedMenuId);
      setRecetaActual(data);
    } else alert(res.message);
  };

  const handleAgregarComponente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMenuId || !selectedComponentId || !quantity) return;

    setIsSubmitting(true);
    const res = await agregarComponenteRecetaMenu(selectedMenuId, Number(selectedComponentId), Number(quantity));
    
    if (res.success) {
      const data = await getRecetaDelMenu(selectedMenuId);
      setRecetaActual(data);
      setIsModalOpen(false);
      setSelectedComponentId('');
      setQuantity('');
    } else alert(res.message);
    setIsSubmitting(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 relative">
      
      {/* ✨ EL DESPLEGABLE PRINCIPAL AHORA CARGA LOS PLATOS/COMBOS */}
      <div className="mb-8 bg-blue-50/50 p-6 rounded-xl border border-blue-100">
        <label className="block text-sm font-bold text-blue-900 mb-3 uppercase tracking-wider">
          1. Selecciona el Plato o Combo a Configurar:
        </label>
        <select 
          className="w-full md:w-1/2 p-3 border-2 border-blue-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-medium text-gray-800 shadow-sm"
          onChange={handleSelectMenu}
          defaultValue=""
        >
          <option value="" disabled>-- Selecciona un menú --</option>
          {platos.map((plato) => (
            <option key={plato.id} value={plato.id}>{plato.name}</option>
          ))}
        </select>
      </div>

      {/* Tabla de Componentes */}
      {selectedMenuId && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800">Ingredientes de la Receta</h2>
            <button 
              className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors shadow-sm font-bold"
              onClick={() => setIsModalOpen(true)}
            >
              + Agregar Ingrediente
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500 font-medium">Cargando receta...</div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
              <table className="min-w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-800 border-b border-gray-200 text-white">
                  <tr>
                    <th className="p-4 font-semibold">ID Insumo</th>
                    <th className="p-4 font-semibold">Ingrediente</th>
                    <th className="p-4 font-semibold">Cantidad Necesaria</th>
                    <th className="p-4 font-semibold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recetaActual.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500 font-medium bg-gray-50">
                        Este plato aún no tiene ingredientes configurados.
                      </td>
                    </tr>
                  ) : (
                    recetaActual.map((item) => (
                      <tr key={item.id_recipe} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 text-gray-500 font-mono text-xs">{item.component_id}</td>
                        <td className="p-4 font-bold text-gray-900">{item.ingrediente_nombre}</td>
                        <td className="p-4 font-medium text-blue-600">{item.quantity}</td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => handleEliminarComponente(item.id_recipe)}
                            className="text-red-500 hover:text-red-700 font-bold px-3 py-1 rounded transition-colors"
                          >
                            Quitar
                          </button>
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

      {/* ✨ EL MODAL AHORA CARGA SOLO INSUMOS (Materias primas) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-black text-gray-800 mb-6 border-b pb-3">Agregar Ingrediente</h3>
            
            <form onSubmit={handleAgregarComponente}>
              <div className="mb-5">
                <label className="block text-sm font-bold text-gray-700 mb-2">Insumo a agregar:</label>
                <select 
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                  value={selectedComponentId}
                  onChange={(e) => setSelectedComponentId(Number(e.target.value))}
                >
                  <option value="" disabled>-- Selecciona un insumo --</option>
                  {insumos.map((prod) => (
                    <option key={prod.id} value={prod.id}>{prod.name}</option>
                  ))}
                </select>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Cantidad (Ej. 150 para gramos, 1 para unidades):
                </label>
                <input 
                  type="number" 
                  step="0.001" 
                  required
                  min="0.001"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg font-mono"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : '')}
                  placeholder="0.000"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)} 
                  className="px-5 py-2.5 text-gray-600 bg-gray-100 font-bold rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Insumo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}