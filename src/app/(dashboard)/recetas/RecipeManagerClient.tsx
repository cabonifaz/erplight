'use client';

import { useState } from 'react';
import { 
  getRecetaDelProducto, 
  eliminarComponenteReceta,
  agregarComponenteReceta // Añadimos la acción para guardar
} from '@/actions/recipe-actions';

interface Producto {
  id: number;
  name: string;
}

interface RecipeManagerProps {
  productos: Producto[];
}

export default function RecipeManagerClient({ productos }: RecipeManagerProps) {
  // Estados para la vista principal
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [recetaActual, setRecetaActual] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Estados para el Modal de Agregar Componente
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedComponentId, setSelectedComponentId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar la receta cuando se elige un producto principal
  const handleSelectProduct = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const prodId = Number(e.target.value);
    setSelectedProductId(prodId);
    
    if (prodId) {
      setIsLoading(true);
      const data = await getRecetaDelProducto(prodId);
      setRecetaActual(data);
      setIsLoading(false);
    } else {
      setRecetaActual([]);
    }
  };

  // Eliminar un componente de la tabla
  const handleEliminarComponente = async (idRecipe: number) => {
    if (!confirm("¿Seguro que deseas quitar este componente de la receta?")) return;
    
    const res = await eliminarComponenteReceta(idRecipe);
    if (res.success && selectedProductId) {
      const data = await getRecetaDelProducto(selectedProductId);
      setRecetaActual(data);
    } else {
      alert(res.message);
    }
  };

  // Guardar el nuevo componente desde el modal
  const handleAgregarComponente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !selectedComponentId || !quantity) return;

    setIsSubmitting(true);
    const res = await agregarComponenteReceta(selectedProductId, Number(selectedComponentId), Number(quantity));
    
    if (res.success) {
      // Recargamos la tabla con los datos frescos
      const data = await getRecetaDelProducto(selectedProductId);
      setRecetaActual(data);
      
      // Cerramos y limpiamos el modal
      setIsModalOpen(false);
      setSelectedComponentId('');
      setQuantity('');
    } else {
      alert(res.message);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 relative">
      
      {/* Sección 1: Seleccionar el Producto Principal */}
      <div className="mb-8 bg-gray-50 p-4 rounded-md border border-gray-200">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          1. Selecciona el Producto a Configurar:
        </label>
        <select 
          className="w-full md:w-1/2 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          onChange={handleSelectProduct}
          defaultValue=""
        >
          <option value="" disabled>-- Busca un producto --</option>
          {productos.map((prod) => (
            <option key={prod.id} value={prod.id}>
              {prod.name}
            </option>
          ))}
        </select>
      </div>

      {/* Sección 2: La Receta del Producto Seleccionado */}
      {selectedProductId && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800">
              Componentes de la Receta
            </h2>
            <button 
              className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors shadow-sm font-medium"
              onClick={() => setIsModalOpen(true)}
            >
              + Agregar Componente
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Cargando receta...</div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="p-3 font-semibold text-gray-700">ID Insumo</th>
                    <th className="p-3 font-semibold text-gray-700">Descripción del Artículo</th>
                    <th className="p-3 font-semibold text-gray-700">Cantidad Necesaria</th>
                    <th className="p-3 font-semibold text-gray-700 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recetaActual.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-gray-500 italic">
                        Este producto aún no tiene componentes configurados.
                      </td>
                    </tr>
                  ) : (
                    recetaActual.map((item) => (
                      <tr key={item.id_recipe} className="hover:bg-gray-50">
                        <td className="p-3 text-gray-600">{item.component_id}</td>
                        <td className="p-3 font-medium text-gray-900">{item.component_name}</td>
                        <td className="p-3 text-gray-600">{item.quantity}</td>
                        <td className="p-3 text-center">
                          <button 
                            onClick={() => handleEliminarComponente(item.id_recipe)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                          >
                            Eliminar
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

      {/* Modal para Agregar Componente */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold mb-4">Agregar Insumo/Componente</h3>
            
            <form onSubmit={handleAgregarComponente}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Insumo a agregar:</label>
                <select 
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={selectedComponentId}
                  onChange={(e) => setSelectedComponentId(Number(e.target.value))}
                >
                  <option value="" disabled>-- Selecciona el insumo --</option>
                  {productos
                    // Filtramos para que no se pueda agregar a sí mismo como ingrediente
                    .filter(p => p.id !== selectedProductId) 
                    .map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad (Ej. 150 para gramos, 1 para unidades):
                </label>
                <input 
                  type="number" 
                  step="0.001" 
                  required
                  min="0.001"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : '')}
                  placeholder="0.00"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
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