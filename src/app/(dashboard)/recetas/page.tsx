import RecipeManagerClient from "./RecipeManagerClient";
// Asumo que tienes una función similar en tus actions de productos para listar todos.
// Si se llama diferente, solo ajusta la importación.
import { getProducts } from "@/actions/product-actions"; 

export default async function RecetasPage() {
  // Traemos todos los artículos del maestro de productos
  const productos = await getProducts();

  return (
    <div className="p-6 w-full max-w-6xl mx-auto">
      <div className="mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-800">Configuración de Recetas (BOM)</h1>
        <p className="text-gray-600">
          Define qué artículos componen tus productos para el cuadre automático de almacén.
        </p>
      </div>
      
      {/* Pasamos los productos al componente cliente interactivo */}
      <RecipeManagerClient productos={productos} />
    </div>
  );
}