import { pool } from "@/lib/db";
import { auth } from "@/auth"; // <-- Importamos la sesión de seguridad
import ReporteVentasClient from "./ReporteVentasClient";

export default async function ReporteVentasPage() {
  const session = await auth();
  const role = session?.user?.role;
  const userId = session?.user?.id;

  const connection = await pool.getConnection();
  let sucursales = [];
  let metodosPago = [];
  
  try {
    // 1. FILTRO DE SUCURSALES POR ROL
    if (role === 'GERENTE GENERAL') {
      // Si es Gerente, le damos todas las sucursales
      const [br]: any = await connection.query("SELECT id, name FROM branches WHERE status = 1");
      sucursales = br;
    } else {
      // Si es Admin Sucursal o Admin Zonal, le damos SOLO las que tiene asignadas
      const [br]: any = await connection.query(`
        SELECT b.id, b.name 
        FROM branches b
        INNER JOIN user_branches ub ON b.id = ub.branch_id
        WHERE ub.user_id = ? AND b.status = 1
      `, [userId]);
      sucursales = br;
    }
    
    // 2. Traemos los métodos de pago (Esto es igual para todos)
    const [mp]: any = await connection.query("SELECT code, description FROM master_catalogs WHERE category = 'METODO_PAGO' AND status = 1");
    metodosPago = mp;

  } finally {
    connection.release();
  }

  return (
    <div className="p-6 w-full max-w-7xl mx-auto">
      <div className="mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-800">Reporte de Ventas</h1>
        <p className="text-gray-600">
          Consulta y filtra el historial de ventas por sucursal, fecha y método de pago.
        </p>
      </div>
      
      {/* Llamamos al componente interactivo y le pasamos los catálogos ya filtrados */}
      <ReporteVentasClient sucursales={sucursales} metodosPago={metodosPago} />
    </div>
  );
}