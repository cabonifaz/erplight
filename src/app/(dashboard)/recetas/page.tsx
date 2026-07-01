import RecipeManagerClient from "./RecipeManagerClient";
import { getProducts } from "@/actions/product-actions"; 
import { obtenerMenusParaRecetas } from "@/actions/recipe-actions"; 
// ✨ 1. Importamos el componente del modal (Asegúrate de que la ruta sea correcta)
import { CreateMenuModal } from "@/components/modules/recetas/create-menu-modal"; 

export default async function RecetasPage() {
  const insumos = await getProducts(); // Arroz, Queso, Salmón...
  const platos = await obtenerMenusParaRecetas(); // Combos, Makis...

  return (
    <div className="p-6 w-full max-w-6xl mx-auto">
      
      {/* ✨ 2. Modificamos el div contenedor con flexbox para alinear texto y botón */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Configuración de Recetas (BOM)</h1>
          <p className="text-gray-600">
            Define qué artículos componen tus productos para el cuadre automático de almacén.
          </p>
        </div>
        
        {/* ✨ 3. Inyectamos el Modal aquí */}
        <div className="shrink-0">
          <CreateMenuModal />
        </div>
      </div>
      
      {/* Pasamos las DOS listas separadas */}
      <RecipeManagerClient insumos={insumos} platos={platos} />
    </div>
  );
}