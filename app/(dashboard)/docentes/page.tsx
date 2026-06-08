import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDocentes } from "./actions";
import { DocentesTable } from "./DocentesTable";

export const dynamic = "force-dynamic";

export default async function DocentesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const { q, estado } = await searchParams;
  const docentes = await getDocentes(q, estado);

  const totalActivos = docentes.filter((d) => d.estado === "ACTIVO").length;
  const totalInactivos = docentes.filter((d) => d.estado === "INACTIVO").length;

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">Docentes y Nómina</h1>
        <Link href="/docentes/nuevo">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Docente
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 max-w-sm">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-gray-500">Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{totalActivos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-gray-500">Inactivos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-400">{totalInactivos}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <form method="GET" className="flex items-center gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre o cédula..."
          className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
        <select
          name="estado"
          defaultValue={estado ?? ""}
          className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos</option>
          <option value="ACTIVO">Activos</option>
          <option value="INACTIVO">Inactivos</option>
        </select>
        <Button type="submit" variant="outline" size="sm">Filtrar</Button>
        {(q || estado) && (
          <Link href="/docentes">
            <Button variant="ghost" size="sm">Limpiar</Button>
          </Link>
        )}
      </form>

      {/* Tabla */}
      <DocentesTable docentes={docentes} />
    </div>
  );
}
