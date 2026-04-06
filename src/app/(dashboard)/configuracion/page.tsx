import { auth } from "@/auth"; // Asegúrate de que esta ruta sea la correcta a tu auth
import { redirect } from "next/navigation";
import { getUsers, getApprovalLimits } from "@/actions/admin-actions";
import ConfigClient from "./ConfigClient";

export default async function ConfiguracionPage() {
    const session = await auth();
    
    // 🛡️ BARRERA DE SEGURIDAD ABSOLUTA
    // Si algún intruso intenta entrar por la URL, lo pateamos al inicio
    if (session?.user?.role !== 'GERENTE GENERAL') {
        redirect("/dashboard"); 
    }

    // Traemos a todos los usuarios y los límites actuales
    const users = await getUsers();
    const limits = await getApprovalLimits();

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Configuración Global</h1>
                <p className="text-sm text-gray-500">Gestión de límites de aprobación y políticas de la empresa.</p>
            </div>
            
            <ConfigClient users={users} limits={limits} />
        </div>
    );
}