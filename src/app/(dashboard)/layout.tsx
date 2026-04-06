import { Sidebar } from "@/components/shared/sidebar";
import { Header } from "@/components/shared/header";
import { auth } from "@/auth"; 

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 👇 Le pasamos el user al Sidebar 👇 */}
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