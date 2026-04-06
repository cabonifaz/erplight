import { getUsers, getBranches } from "@/actions/admin-actions";
import UsuariosClient from "./UsuariosClient";

export default async function UsuariosPage() {
    const users = await getUsers();
    const branches = await getBranches();

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Gestión de Usuarios y Roles</h1>
            
            {/* Le pasamos los datos al componente interactivo */}
            <UsuariosClient users={users} branches={branches} />
        </div>
    );
}