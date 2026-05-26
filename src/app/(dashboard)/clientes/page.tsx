import { getClients } from "@/actions/client-actions";
import { getProviders } from "@/actions/provider-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClientFormSheet } from "@/components/modules/clientes/client-form-sheet";
import { ClientActions } from "@/components/modules/clientes/client-actions";
import { ProviderFormSheet } from "@/components/providers/provider-form-sheet"; // ✨ NUEVO COMPONENTE INYECTADO
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users } from "lucide-react";

export default async function ClientsProvidersPage() {
  const [clients, providersRes] = await Promise.all([
    getClients(),
    getProviders()
  ]);
  
  const providers = providersRes.data || [];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* CABECERA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
             Directorio Comercial
          </h1>
          <p className="text-muted-foreground">Gestión unificada de clientes y proveedores estratégicos.</p>
        </div>
      </div>

      {/* SISTEMA DE PESTAÑAS */}
      <Tabs defaultValue="clientes" className="w-full">
        
        {/* BOTONES DE NAVEGACIÓN */}
        <div className="flex justify-between items-center mb-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="clientes" className="font-bold flex items-center gap-2">
                    <Users className="w-4 h-4" /> Clientes
                </TabsTrigger>
                <TabsTrigger value="proveedores" className="font-bold flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Proveedores
                </TabsTrigger>
            </TabsList>
        </div>

        {/* PESTAÑA 1: CLIENTES */}
        <TabsContent value="clientes" className="animate-in fade-in duration-300">
          <div className="flex justify-end mb-4">
               <ClientFormSheet mode="create" />
          </div>
          
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-2 border-b border-gray-100 bg-gray-50/50">
                <CardTitle className="text-lg font-semibold text-gray-700">Listado General de Clientes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="w-[300px]">Cliente</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead> 
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client: any) => (
                    <TableRow key={client.id} className="hover:bg-blue-50/30 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                            <span className="font-medium text-gray-900 text-sm">
                                {client.display_name || client.name || client.razon_social || client.business_name || "Sin Nombre"}
                            </span>
                            <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">
                                {client.client_type_desc || client.client_type || client.tipo_cliente || "CLIENTE"}
                            </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                            <span className="font-mono text-sm font-medium text-gray-700">
                                {client.doc_number || client.document_number || client.numero_documento || "S/N"}
                            </span>
                            <span className="text-xs text-gray-400">
                                {client.doc_internal_code || client.doc_type || client.document_type || client.tipo_documento || "DOC"}
                            </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                            {client.email ? (
                                <span className="text-xs text-gray-600 flex items-center gap-1 truncate max-w-[150px]">
                                    {client.email}
                                </span>
                            ) : <span className="text-xs text-gray-300">-</span>}
                            {client.phone ? (
                                <span className="text-xs text-gray-500">{client.phone}</span>
                            ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                            className={client.status === 1 
                                ? "bg-green-100 text-green-700 hover:bg-green-200 border-green-200 shadow-none" 
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200 border-gray-200 shadow-none"}
                        >
                          {client.status === 1 ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <ClientActions client={client} />
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {clients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                            <p className="font-medium">No hay clientes registrados</p>
                            <p className="text-sm text-gray-400">Utiliza el botón "Nuevo Cliente" para agregar uno.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PESTAÑA 2: PROVEEDORES */}
        <TabsContent value="proveedores" className="animate-in fade-in duration-300">
            <div className="flex justify-end mb-4">
                {/* ✨ BOTÓN CREAR FUNCIONAL */}
                <ProviderFormSheet mode="create" />
            </div>

            <Card className="shadow-sm border-gray-200">
                <CardHeader className="pb-2 border-b border-gray-100 bg-gray-50/50">
                    <CardTitle className="text-lg font-semibold text-gray-700">Listado General de Proveedores</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                                <TableHead className="w-[300px]">Proveedor</TableHead>
                                <TableHead>RUC</TableHead>
                                <TableHead>Dirección</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {providers.map((prov) => (
                                <TableRow key={prov.id} className="hover:bg-slate-50 transition-colors">
                                    <TableCell className="font-bold text-gray-800">{prov.name}</TableCell>
                                    <TableCell className="text-gray-600 font-mono text-sm">{prov.ruc}</TableCell>
                                    <TableCell className="text-gray-500 text-sm max-w-[200px] truncate" title={prov.address}>{prov.address || '-'}</TableCell>
                                    <TableCell>
                                        <Badge 
                                            className={prov.estado === 1 
                                                ? "bg-green-100 text-green-700 border-green-200 shadow-none hover:bg-green-200" 
                                                : "bg-gray-100 text-gray-600 border-gray-200 shadow-none hover:bg-gray-200"}
                                        >
                                            {prov.estado === 1 ? 'Activo' : 'Inactivo'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {/* ✨ BOTÓN EDITAR FUNCIONAL */}
                                        <ProviderFormSheet mode="edit" provider={prov} />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {providers.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="p-8 text-center text-gray-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <p className="font-medium">No hay proveedores registrados.</p>
                                            <p className="text-sm text-gray-400">Utiliza el botón "Nuevo Proveedor" para agregar uno.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}