import { pool } from "@/lib/db";
import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, AlertCircle } from "lucide-react"; 
import { getBranches } from "@/actions/purchase-actions"; 
// IMPORTAMOS LA FUNCIÓN DEL CEREBRO QUE CREASTE HOY:
import { getInventoryStocks } from "@/actions/inventory-actions"; 
import { InventoryTable } from "./inventory-table";
import { InventoryActionsButton } from "@/components/modules/inventario/inventory-actions-button";
import { InventoryFilters } from "@/components/modules/inventario/inventory-filters";

interface SearchParamsType {
    query?: string;
    branchId?: string;
    minStock?: string;
    maxStock?: string;
    dateFrom?: string;
    page?: string;
}

export default async function InventoryPage(props: {
    searchParams: Promise<SearchParamsType>;
}) {
    // 1. Next.js 15: Esperar params
    const searchParams = await props.searchParams;
    const session = await auth();
    
    // Configuración de usuario y sucursal...
    const userRole = session?.user?.role?.toUpperCase() || "";
    let userBranchId = 0;
    if (session?.user?.email) {
        try {
            const query = `SELECT ub.branch_id FROM user_branches ub INNER JOIN users u ON ub.user_id = u.id WHERE u.email = ? LIMIT 1`;
            const [rows]: any = await pool.query(query, [session.user.email]);
            if (rows.length > 0) userBranchId = rows[0].branch_id;
        } catch (error) { console.error(error); }
    }

    // Listas auxiliares para los filtros desplegables
    const [productsList]: any = await pool.query("SELECT id, name, code FROM products WHERE status = 1 ORDER BY name ASC");
    const branches = await getBranches();

    // 2. CAPTURAMOS LOS FILTROS DE LA URL (Lo que manda tu botón Aplicar)
    const branch_id = searchParams.branchId && searchParams.branchId !== "ALL" ? Number(searchParams.branchId) : null;
    const search = searchParams.query || null;
    const min_stock = searchParams.minStock ? Number(searchParams.minStock) : null;
    const max_stock = searchParams.maxStock ? Number(searchParams.maxStock) : null;
    const updated_from = searchParams.dateFrom || null;

    // 3. LLAMAMOS AL "CEREBRO" CON TODOS LOS FILTROS
    const stocks = await getInventoryStocks({
        branch_id,
        search,
        min_stock,
        max_stock,
        updated_from
    });

    // Cálculos de KPI rápidos para el Header
    // (Ajustamos para leer el stock de forma segura)
    const criticalCount = stocks.filter((s: any) => s.stock_current <= (s.min_stock || 0)).length;
    // Omitimos expiringCount por ahora si no viene del SP, o lo dejamos en 0.
    const expiringCount = 0; 

    return (
        <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
            {/* HEADER CON INDICADORES */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Package className="w-6 h-6 text-blue-600" />
                        Inventario Inteligente
                    </h1>
                    <p className="text-gray-500 text-sm">Monitoreo de existencias y caducidad.</p>
                </div>
                
                {/* TARJETAS DE ALERTA RÁPIDA */}
                <div className="flex gap-3">
                    {criticalCount > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 shadow-sm animate-pulse">
                            <AlertCircle className="w-5 h-5" />
                            <div className="flex flex-col leading-none">
                                <span className="font-bold text-lg">{criticalCount}</span>
                                <span className="text-[10px] uppercase font-semibold">Stock Crítico</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <InventoryFilters 
                branches={branches} 
                products={productsList} 
                userBranchId={userBranchId}
                userRole={userRole}
            />

            <div className="flex items-center gap-3 bg-white p-2 rounded-lg border shadow-sm w-fit">
                <InventoryActionsButton 
                    branches={branches} 
                    userRole={userRole} 
                    userBranchId={userBranchId} 
                />
                <div className="h-6 w-px bg-gray-200 mx-1"></div>
                <span className="text-xs text-gray-400 font-medium px-2">
                    Total: {stocks.length} items
                </span>
            </div>
            
            <Card className="shadow-sm border-gray-200">
                <CardHeader className="bg-gray-50/50 border-b pb-4">
                    <CardTitle className="text-base font-medium text-gray-700">Tablero de Existencias</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {/* Pasamos los datos filtrados a la tabla */}
                    <InventoryTable stocks={stocks} />
                </CardContent>
            </Card>
        </div>
    );
}