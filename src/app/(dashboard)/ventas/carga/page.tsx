import { pool } from "@/lib/db";
import { auth } from "@/auth"; // <-- Importamos la sesión para saber quién entró
import SalesUploadClient from "./SalesUploadClient";

export default async function CargaVentasPage() {
  const session = await auth();
  const role = session?.user?.role;
  const userId = session?.user?.id;

  const connection = await pool.getConnection();
  let sucursales = [];
  
  try {
    if (role === 'GERENTE GENERAL') {
      // 1. Si es el Gerente, le traemos TODAS las sucursales activas
      const [rows]: any = await connection.query("SELECT id, name FROM branches WHERE status = 1");
      sucursales = rows;
    } else {
      // 2. Si es Admin de Sucursal o Admin Zonal, cruzamos la info con sus sucursales asignadas
      const [rows]: any = await connection.query(`
        SELECT b.id, b.name 
        FROM branches b
        INNER JOIN user_branches ub ON b.id = ub.branch_id
        WHERE ub.user_id = ? AND b.status = 1
      `, [userId]);
      sucursales = rows;
    }
  } finally {
    connection.release();
  }

  return (
    <div className="p-6 w-full max-w-7xl mx-auto">
      <div className="mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-800">Carga de Ventas Diarias</h1>
        <p className="text-gray-600">
          Sube el archivo Excel con las ventas del día. El sistema descontará automáticamente los insumos del almacén de la sucursal seleccionada.
        </p>
      </div>
      
      {/* Le pasamos las sucursales ya filtradas al cliente */}
      <SalesUploadClient sucursales={sucursales} />
    </div>
  );
}