import { pool } from "@/lib/db";
import { auth } from "@/auth";
import CierreClient from "./CierreClient";

export default async function CierreInventarioPage() {
  const session = await auth();
  const role = session?.user?.role;
  const userId = session?.user?.id;

  const connection = await pool.getConnection();
  let sucursales = [];
  
  try {
    // Aplicamos tu misma regla de seguridad de roles
    if (role === 'GERENTE GENERAL' || role === 'GERENTE DE LOGISTICA') {
      const [br]: any = await connection.query("SELECT id, name FROM branches WHERE status = 1");
      sucursales = br;
    } else {
      const [br]: any = await connection.query(`
        SELECT b.id, b.name FROM branches b
        INNER JOIN user_branches ub ON b.id = ub.branch_id
        WHERE ub.user_id = ? AND b.status = 1
      `, [userId]);
      sucursales = br;
    }
  } finally {
    connection.release();
  }

  return (
    <div className="p-6 w-full max-w-7xl mx-auto">
      <div className="mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-800">Cierre de Inventario Diario</h1>
        <p className="text-gray-600">
          Analiza la rotación de tus productos. Los elementos en rojo indican un sobre-stock excesivo en comparación con tus ventas.
        </p>
      </div>
      <CierreClient sucursales={sucursales} />
    </div>
  );
}