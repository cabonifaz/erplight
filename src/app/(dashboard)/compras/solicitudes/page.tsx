import { auth } from "@/auth";
import { pool } from "@/lib/db"; 
import { getPurchaseRequests, getBranches } from "@/actions/purchase-actions";
import PurchaseRequestsClient from "./purchase-requests-client"; // <-- Importamos la vista cliente

export default async function PurchaseRequestsPage() {
  // Cargamos los datos de arranque
  const initialRequests = await getPurchaseRequests();
  const branches = await getBranches();
  
  const session = await auth();
  const userRole = session?.user?.role || '';
  let userBranchId: number | undefined = undefined;

  // Verificamos sucursal de forma segura en el servidor
  if (session?.user?.email) {
      try {
          const query = `
            SELECT ub.branch_id 
            FROM user_branches ub
            INNER JOIN users u ON ub.user_id = u.id
            WHERE u.email = ?
            LIMIT 1
          `;
          const [rows]: any = await pool.query(query, [session.user.email]);
          if (rows.length > 0) {
              userBranchId = rows[0].branch_id;
          }
      } catch (error) {
          console.error("Error obteniendo sucursal del usuario:", error);
      }
  }

  // Renderizamos el componente cliente pasándole los datos iniciales
  return (
    <PurchaseRequestsClient 
        initialRequests={initialRequests} 
        branches={branches}
        userRole={userRole}
        userBranchId={userBranchId}
    />
  );
}