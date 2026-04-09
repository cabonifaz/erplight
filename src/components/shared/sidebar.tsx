'use client'

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Settings, 
  FileText,
  Truck,
  ClipboardList,
  Search,
  Building, 
  UserCog,
  ChevronDown, 
  Upload,      
  History      
} from "lucide-react";

// --- NUEVO: Le decimos a TypeScript cómo es un ítem del menú ---
interface MenuItem {
  label: string;
  icon: any; // Usamos 'any' por simplicidad con los iconos de lucide
  href?: string; // Opcional porque los dropdowns no tienen href
  isDropdown?: boolean; // Opcional
  subItems?: { href: string; label: string; icon: any }[]; // Opcional
}

// 1. ACTUALIZAMOS EL MENÚ BASE aplicando el tipo MenuItem
export const menuItems: MenuItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { 
    label: "Ventas & OC", 
    icon: ShoppingCart, 
    isDropdown: true, 
    subItems: [
      { href: "/ventas/carga", label: "Carga Diaria", icon: Upload },
      { href: "/ventas/reporte", label: "Reporte de Ventas", icon: History }
    ]
  },
  { href: "/compras/solicitudes", label: "Solicitudes Compra", icon: ClipboardList },
  { href: "/compras/registro", label: "Ingresar Facturas", icon: Truck },
  { 
    label: "Inventario", 
    icon: Package, 
    isDropdown: true, 
    subItems: [
      { href: "/inventario", label: "Stock Actual", icon: Package },
      { href: "/recetas", label: "Configurar Recetas", icon: Settings }
    ]
  },
  { href: "/clientes", label: "Clientes / Proveedores", icon: Users },
  { href: "/reportes", label: "Reportes", icon: FileText },
];

export function Sidebar({ user }: { user?: any }) {
  const pathname = usePathname();
  const [searchTerm, setSearchTerm] = useState("");
  
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({ "Ventas & OC": true });

  const toggleMenu = (label: string) => {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const adminItems: MenuItem[] = [
    { href: "/sucursales", label: "Sucursales", icon: Building },
    { href: "/usuarios", label: "Usuarios", icon: UserCog },
    { href: "/configuracion", label: "Configuración", icon: Settings }, 
  ];

  // --- LÓGICA DE SEGURIDAD ---
  
  // 1. Unimos los menús según el rol
  const allAvailableItems = user?.role === 'GERENTE GENERAL' 
    ? [...menuItems, ...adminItems] 
    : menuItems;

  // 2. Aplicamos el filtro de seguridad para ocultar opciones no permitidas
  const displayItems = allAvailableItems.filter(item => {
    // Regla: Solo Gerente General y Admin de Sucursal ven Ventas & OC
    if (item.label === "Ventas & OC") {
      return user?.role === "GERENTE GENERAL" || user?.role === "ADMIN_SUCURSAL";
    }
    return true; // Las demás opciones pasan normal
  });

  // 3. Filtramos por el término de búsqueda (ya habiendo ocultado lo que no deben ver)
  const filteredItems = displayItems.filter((item) => {
    const matchParent = item.label.toLowerCase().includes(searchTerm.toLowerCase());
    // Evitamos el error si subItems es undefined
    const matchChild = item.subItems ? item.subItems.some(sub => sub.label.toLowerCase().includes(searchTerm.toLowerCase())) : false;
    return matchParent || matchChild;
  });

  return (
    <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col h-screen fixed left-0 top-0 z-10">
      
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <span className="text-xl font-bold text-blue-700">GTERP Light</span>
      </div>
      
      <div className="p-3 pb-0">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar módulo..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {filteredItems.length === 0 ? (
           <div className="px-3 py-4 text-center">
             <p className="text-sm text-gray-400">No se encontraron opciones</p>
           </div>
        ) : (
          filteredItems.map((item) => {
            const Icon = item.icon;

            if (item.isDropdown) {
              const isOpen = openMenus[item.label] || searchTerm !== "";
              // Evitamos el error comprobando que subItems exista
              const isChildActive = item.subItems ? item.subItems.some(sub => pathname.startsWith(sub.href)) : false;

              return (
                <div key={item.label} className="space-y-1">
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors group",
                      isChildActive ? "text-blue-700 bg-blue-50/50" : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <div className="flex items-center">
                      <Icon className={cn("h-5 w-5 mr-3", isChildActive ? "text-blue-600" : "text-gray-400")} />
                      {item.label}
                    </div>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                  </button>
                  
                  {isOpen && item.subItems && (
                    <div className="pl-9 space-y-1 mt-1">
                      {item.subItems.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = pathname === sub.href;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={cn(
                              "flex items-center px-3 py-2 text-xs font-medium rounded-md transition-colors",
                              isSubActive ? "text-blue-700 bg-blue-50" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                            )}
                          >
                            <SubIcon className="h-4 w-4 mr-2 opacity-70" />
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = pathname.startsWith(item.href || '');
            return (
              <Link
                key={item.href || item.label}
                href={item.href || '#'}
                className={cn(
                  "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors group",
                  isActive 
                    ? "bg-blue-50 text-blue-700" 
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <Icon className={cn("h-5 w-5 mr-3", isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-500")} />
                {item.label}
              </Link>
            );
          })
        )}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                {user?.name ? user.name.substring(0, 2).toUpperCase() : 'AD'}
            </div>
            <div className="text-xs overflow-hidden">
                <p className="font-medium text-gray-900 truncate">
                  {user?.name || 'Usuario Conectado'}
                </p>
                <p className="text-gray-500 text-[10px] truncate">
                  {user?.role || 'Sistema ERP'}
                </p>
            </div>
        </div>
      </div>
    </aside>
  );
}