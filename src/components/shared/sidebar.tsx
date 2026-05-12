'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image"; 
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, ShoppingCart, Package, Users, Settings, FileText,
  Truck, ClipboardList, Search, Building, UserCog, ChevronDown, 
  Upload, History, TrendingUp, BarChart, Globe, CalendarDays,
  Building2, Briefcase, Lock
} from "lucide-react";
import { getLogoUrl } from "@/actions/client-actions"; 

// ✨ IMPORTAMOS LA NUEVA FUNCIÓN (Asegúrate de que la ruta coincida con tu estructura)
import { getPermisosMenu } from "@/actions/menu-actions"; 

interface MenuItem {
  label: string;
  icon: any; 
  href?: string; 
  isDropdown?: boolean; 
  subItems?: { href: string; label: string; icon: any }[]; 
}

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

  { 
    label: "Inventario", 
    icon: Package, 
    isDropdown: true, 
    subItems: [
      { href: "/inventario", label: "Stock Actual", icon: Package },
      { href: "/inventario/almacenes", label: "Gestión de Almacenes", icon: Users }, // ✨ NUEVA PANTALLA
      { href: "/inventario/cierre", label: "Cierre de Almacén", icon: Lock }, 
      { href: "/recetas", label: "Configurar Recetas", icon: Settings }
    ]
  },
  { href: "/clientes", label: "Clientes / Proveedores", icon: Users },
  { href: "/rrhh", label: "RRHH", icon: Briefcase },
  { 
    label: "Reportes", 
    icon: BarChart, 
    isDropdown: true, 
    subItems: [
      { href: "/reportes/dashboard-corporativo", label: "Dashboard Corporativo", icon: Building2 }, 
      { href: "/reportes/cierre", label: "Cierres Diarios", icon: FileText },
      { href: "/reportes/cierre-mensual", label: "Cierre Mensual", icon: CalendarDays },
      { href: "/reportes/proyecciones", label: "Proyección Ventas", icon: TrendingUp },
      { href: "/reportes/proyecciones-global", label: "Proyección Global", icon: Globe }
    ]
  },
];

export function Sidebar({ user }: { user?: any }) {
  const pathname = usePathname();
  const [searchTerm, setSearchTerm] = useState("");
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({ "Ventas & OC": true });
  const [logoUrl, setLogoUrl] = useState<string>(""); 
  
  // ✨ ESTADO PARA LOS PERMISOS DINÁMICOS
  const [allowedMenus, setAllowedMenus] = useState<string[] | null>(null);

  useEffect(() => {
      const fetchData = async () => {
          // Cargar el Logo
          const resLogo = await getLogoUrl();
          if (resLogo.success && resLogo.url) {
              setLogoUrl(resLogo.url);
          }

          // ✨ Cargar los permisos desde la Base de Datos según el ROL
          if (user?.role) {
              const resPermisos = await getPermisosMenu(user.role.toUpperCase().trim());
              if (resPermisos.success) {
                  setAllowedMenus(resPermisos.data);
              } else {
                  setAllowedMenus([]); 
              }
          } else {
              setAllowedMenus([]);
          }
      };
      fetchData();
  }, [user?.role]);

  const toggleMenu = (label: string) => {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const adminItems: MenuItem[] = [
    { href: "/sucursales", label: "Sucursales", icon: Building },
    { href: "/usuarios", label: "Usuarios", icon: UserCog },
    { 
      label: "Configuración", 
      icon: Settings, 
      isDropdown: true, 
      subItems: [
        { href: "/configuracion", label: "Ajustes Generales", icon: Settings },
        { href: "/configuracion/calendario", label: "Calendario Festivos", icon: CalendarDays }
      ]
    }, 
  ];

  const allAvailableItems = [...menuItems, ...adminItems];

  // ✨ AQUÍ OCURRE LA MAGIA: Filtramos usando los datos de la BD
  const displayItems = allAvailableItems.filter(item => {
    // Si aún no cargan los permisos, no mostramos nada
    if (!allowedMenus) return false; 

    const itemLabel = item.label;
    const itemHref = item.href || "";
    
    // Normalizamos 'Configuración' por si acaso (sin tilde) para que coincida con la BD
    const labelToCheck = itemLabel === "Configuración" ? "Configuracion" : itemLabel;

    // Verificamos si la ruta (/dashboard) o la etiqueta (Ventas & OC) están en la lista permitida
    return allowedMenus.includes(itemHref) || allowedMenus.includes(labelToCheck);
    
  }).map(item => {
    const rol = user?.role?.toUpperCase().trim() || "";

    // Mantenemos las reglas internas para ocultar sub-menús específicos
    if (item.label === "Reportes" && item.subItems) {
      const isPrivileged = rol === "GERENTE GENERAL" || rol === "CEO" || rol === "ADMINISTRADOR GENERAL";
      if (!isPrivileged) {
        return {
          ...item,
          subItems: item.subItems.filter(sub => 
            sub.label !== "Dashboard Corporativo" && 
            sub.label !== "Proyección Global"
          )
        };
      }
    }

    if (item.label === "Inventario" && item.subItems) {
      if (rol === "ALMACENERO" || rol === "ADMIN_SUCURSAL") {
        return {
          ...item,
          subItems: item.subItems.filter(sub => sub.label !== "Configurar Recetas")
        };
      }
    }

    return item;
  });

  const filteredItems = displayItems.filter((item) => {
    const matchParent = item.label.toLowerCase().includes(searchTerm.toLowerCase());
    const matchChild = item.subItems ? item.subItems.some(sub => sub.label.toLowerCase().includes(searchTerm.toLowerCase())) : false;
    return matchParent || matchChild;
  });

  // ✨ PANTALLA DE CARGA MIENTRAS BUSCA LOS PERMISOS
  if (allowedMenus === null) {
      return (
          <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col h-screen fixed left-0 top-0 z-10 justify-center items-center">
              <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-gray-500 font-medium animate-pulse">Cargando permisos...</span>
              </div>
          </aside>
      );
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col h-screen fixed left-0 top-0 z-10">
      
      <div className="h-16 flex items-center justify-center px-4 border-b border-gray-200">
          {logoUrl ? (
              <Image 
                  src={logoUrl} 
                  alt="Logo Empresa" 
                  width={200}        
                  height={55}        
                  className="object-contain max-h-[60px] w-auto" 
                  priority 
              />
          ) : (
              <span className="text-xl font-bold text-blue-700"></span>
          )}
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
             <p className="text-sm text-gray-400">No tienes módulos asignados.</p>
           </div>
        ) : (
          filteredItems.map((item) => {
            const Icon = item.icon;

            if (item.isDropdown) {
              const isOpen = openMenus[item.label] || searchTerm !== "";
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