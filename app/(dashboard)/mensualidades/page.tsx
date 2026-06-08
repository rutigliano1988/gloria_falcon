import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMensualidadesData } from "./actions";
import { getMesAnoActual, getMesesAnoEscolar } from "@/lib/utils";
import { SolvenciaTable } from "./SolvenciaTable";
import { HistorialPagos } from "./HistorialPagos";
import { formatUSD, formatMesAno } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MensualidadesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const data = await getMensualidadesData(mes);

  const mesActual = getMesAnoActual();
  const mesesSelector = data.anoActivo
    ? getMesesAnoEscolar(data.anoActivo.nombre)
    : [];

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mensualidades</h1>
          {data.anoActivo && (
            <p className="text-sm text-gray-500">Año escolar: {data.anoActivo.nombre}</p>
          )}
        </div>
        <Link href="/mensualidades/nuevo">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Registrar Cobro
          </Button>
        </Link>
      </div>

      {/* Sin año activo */}
      {!data.anoActivo && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-amber-800 font-medium mb-1">No hay año escolar activo</p>
          <p className="text-amber-600 text-sm mb-4">
            Activa un año escolar en Configuración para comenzar.
          </p>
          <Link href="/configuracion">
            <Button variant="outline">Ir a Configuración</Button>
          </Link>
        </div>
      )}

      {data.anoActivo && (
        <>
          {/* Selector de mes */}
          <form method="GET" className="flex items-center gap-2">
            <select
              name="mes"
              defaultValue={data.mesAnoActual}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {mesesSelector.map((m) => {
                let label = m;
                try { label = formatMesAno(m); } catch { /* */ }
                const esFuturo = m > mesActual;
                return (
                  <option key={m} value={m} disabled={esFuturo}>
                    {label}{esFuturo ? " (futuro)" : ""}
                  </option>
                );
              })}
            </select>
            <Button type="submit" variant="outline" size="sm">
              Ver mes
            </Button>
            {mes && mes !== mesActual && (
              <Link href="/mensualidades">
                <Button variant="ghost" size="sm">
                  Mes actual
                </Button>
              </Link>
            )}
          </form>

          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Cobrado en{" "}
                  {(() => {
                    try { return formatMesAno(data.mesAnoActual); } catch { return data.mesAnoActual; }
                  })()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-900">
                  {formatUSD(data.totalCobradoMes)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Alumnos Solventes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {data.totalSolventes}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Alumnos Morosos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">
                  {data.totalMorosos}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de solvencia */}
          <SolvenciaTable alumnos={data.alumnos} mesAno={data.mesAnoActual} />

          {/* Historial */}
          <HistorialPagos pagos={data.pagosRecientes} />
        </>
      )}
    </div>
  );
}
