import { getBranches, createBranch } from "@/actions/admin-actions";

export default async function SucursalesPage() {
    const branches = await getBranches();

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Gestión de Sucursales (Locales)</h1>

            {/* Formulario para crear sucursal */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold mb-4">Nueva Sucursal</h2>
                <form action={createBranch as any} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Local</label>
                        <input type="text" name="name" required placeholder="Ej: Almacén Piura" className="w-full border rounded-md p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">RUC</label>
                        <input type="text" name="ruc" required placeholder="1045..." maxLength={11} className="w-full border rounded-md p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social</label>
                        <input type="text" name="razon_social" required placeholder="Empresa S.A.C." className="w-full border rounded-md p-2" />
                    </div>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium">
                        Guardar Sucursal
                    </button>
                </form>
            </div>

            {/* Tabla de sucursales */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RUC</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Razón Social</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {branches.map((branch: any) => (
                            <tr key={branch.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{branch.id}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{branch.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{branch.ruc}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{branch.razon_social}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Activo</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}