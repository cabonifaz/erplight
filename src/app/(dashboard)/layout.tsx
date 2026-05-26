import { Sidebar } from "@/components/shared/sidebar";
import { Header } from "@/components/shared/header";
import { auth } from "@/auth"; 

// Lo dejamos comentado para que no inyecte el color rojo, 
// pero lo conservas por si a futuro quieres vender el sistema como "Marca Blanca"
// import { DynamicTheme } from "@/components/shared/dynamic-theme";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  const logoRutaActual = "/mr_sushi_logo.webp"; 

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Motor de tema APAGADO para recuperar el azul original */}
      {/* <DynamicTheme logoUrl={logoRutaActual} /> */}

      {/* Le pasamos el user al Sidebar */}
      <Sidebar user={session?.user} />
      
      <div className="flex flex-col md:ml-64 min-h-screen">
        <Header user={session?.user} />
        
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}