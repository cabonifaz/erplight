import { auth } from "@/auth";
import { pool } from "@/lib/db"; 
import { getPurchaseRequests, getBranches } from "@/actions/purchase-actions";
import PurchaseRequestsClient from "./purchase-requests-client"; 

export default async function PurchaseRequestsPage() {
  // Cargamos los datos de arranque
  const initialRequests = await getPurchaseRequests();
  const branches = await getBranches();
  
  const session = await auth();
  const userRole = (session?.user as any)?.role || '';
  const userId = Number(session?.user?.id) || 0;
  
  let userBranchId: number | undefined = undefined;

  // Verificamos sucursal de forma segura en el servidor mediante SP
  if (userId > 0) {
      try {
          const [rows]: any = await pool.query("CALL sp_obtener_sucursal_principal_usuario(?)", [userId]);
          if (rows[0] && rows[0].length > 0) {
              userBranchId = rows[0][0].branch_id;
          }
      } catch (error) {
          console.error("Error obteniendo sucursal del usuario:", error);
      }
  }

  // Renderizamos el componente cliente pasándole los datos iniciales y el ID
  return (
    <PurchaseRequestsClient 
        initialRequests={initialRequests} 
        branches={branches}
        userRole={userRole}
        userBranchId={userBranchId}
        userId={userId} // ✨ Enviamos el ID al cliente
    />
  );
}