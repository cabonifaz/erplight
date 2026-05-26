import { pool } from "@/lib/db";
import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertCircle } from "lucide-react"; 
import { getInventoryStocks } from "@/actions/inventory-actions"; 
import { InventoryTable } from "./inventory-table";
import { InventoryActionsButton } from "@/components/modules/inventario/inventory-actions-button";
import { InventoryFilters } from "@/components/modules/inventario/inventory-filters";

interface SearchParamsType {
    query?: string;
    branch_id?: string; 
    minStock?: string;
    maxStock?: string;
    dateFrom?: string;
    page?: string;
}

export default async function InventoryPage(props: {
    searchParams: Promise<SearchParamsType>;
}) {
    const searchParams = await props.searchParams;
    const session = await auth();
    
    const userRole = session?.user?.role?.toUpperCase() || "";
    const userId = session?.user?.id;

    let branches: any[] = [];
    let userDefaultBranchId = 0;
    
    if (userId) {
        try {
            if (['GERENTE GENERAL', 'ADMINISTRADOR GENERAL', 'GERENTE DE LOGISTICA'].includes(userRole)) {
                const [bRows]: any = await pool.query(`
                    SELECT id, name 
                    FROM branches 
                    WHERE status = 1
                `);
                branches = bRows;
            } else {
                const [bRows]: any = await pool.query(`
                    SELECT b.id, b.name 
                    FROM branches b
                    JOIN user_branches ub ON b.id = ub.branch_id
                    WHERE ub.user_id = ? AND b.status = 1
                `, [userId]);
                branches = bRows;
            }
            if (branches.length > 0) userDefaultBranchId = branches[0].id;
        } catch (error) { console.error("Error obteniendo sedes", error); }
    }

    const [productsResult]: any = await pool.query("CALL sp_listar_productos()");
    const productsList = productsResult[0] || [];

    const isRestricted = !['GERENTE GENERAL', 'GERENTE DE LOGISTICA', 'ADMINISTRADOR GENERAL'].includes(userRole);

    let finalBranchId = null;

    if (isRestricted) {
        finalBranchId = userDefaultBranchId;
    } else {
        finalBranchId = searchParams.branch_id && searchParams.branch_id !== "ALL" 
            ? Number(searchParams.branch_id) 
            : null;
    }

    // ✨ NUEVA CONSULTA: Obtenemos los Almacenes Físicos de la sede actual para pasarlos a la tabla
    const currentBranchIdForWarehouses = finalBranchId || userDefaultBranchId;
    let physicalWarehouses: any[] = [];
    
    if (currentBranchIdForWarehouses) {
        try {
            const [wRows]: any = await pool.query(`
                SELECT id, name 
                FROM warehouses 
                WHERE branch_id = ? AND status = 1
            `, [currentBranchIdForWarehouses]);
            physicalWarehouses = wRows;
        } catch (error) { 
            console.error("Error obteniendo almacenes físicos", error); 
        }
    }

    const search = searchParams.query || null;
    const min_stock = searchParams.minStock ? Number(searchParams.minStock) : null;
    const max_stock = searchParams.maxStock ? Number(searchParams.maxStock) : null;
    const updated_from = searchParams.dateFrom || null;

    const stocks = await getInventoryStocks({
        branch_id: finalBranchId, 
        search,
        min_stock,
        max_stock,
        updated_from
    });

    const criticalCount = stocks.filter((s: any) => s.stock_current <= (s.min_stock || 0)).length;

    return (
        <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Package className="w-6 h-6 text-primary" />
                        Inventario Inteligente Global
                    </h1>
                    <p className="text-gray-500 text-sm">Monitoreo de existencias y control unificado por sede principal.</p>
                </div>
                
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
                userBranchId={finalBranchId || userDefaultBranchId}
                userRole={userRole}
            />

            <div className="flex items-center gap-3 bg-white p-2 rounded-lg border shadow-sm w-fit">
                {userRole !== 'ALMACENERO' && (
                    <>
                        <InventoryActionsButton 
                            branches={branches} 
                            userRole={userRole} 
                            userBranchId={finalBranchId || userDefaultBranchId} 
                            productos={stocks} 
                        />
                        <div className="h-6 w-px bg-gray-200 mx-1"></div>
                    </>
                )}
                
                <span className="text-xs text-gray-400 font-medium px-2">
                    Total: {stocks.length} items
                </span>
            </div>
            
            <Card className="shadow-sm border-gray-200">
                <CardHeader className="bg-gray-50/50 border-b pb-4">
                    <CardTitle className="text-base font-medium text-gray-700">Tablero de Existencias Globales</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {/* ✨ CORRECCIÓN FINAL: Le pasamos los sub-almacenes a la tabla */}
                    <InventoryTable stocks={stocks} almacenes={physicalWarehouses} />
                </CardContent>
            </Card>
        </div>
    );
}