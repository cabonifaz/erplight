import RecipeManagerClient from "./RecipeManagerClient";
import { getProducts } from "@/actions/product-actions"; 
import { obtenerMenusParaRecetas } from "@/actions/recipe-actions"; // ✨ NUEVO

export default async function RecetasPage() {
  const insumos = await getProducts(); // Arroz, Queso, Salmón...
  const platos = await obtenerMenusParaRecetas(); // Combos, Makis...

  return (
    <div className="p-6 w-full max-w-6xl mx-auto">
      <div className="mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-800">Configuración de Recetas (BOM)</h1>
        <p className="text-gray-600">
          Define qué artículos componen tus productos para el cuadre automático de almacén.
        </p>
      </div>
      
      {/* Pasamos las DOS listas separadas */}
      <RecipeManagerClient insumos={insumos} platos={platos} />
    </div>
  );
}