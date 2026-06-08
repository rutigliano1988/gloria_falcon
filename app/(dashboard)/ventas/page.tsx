import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getVentasData } from "./actions";
import { VentasHistorial } from "./VentasHistorial";
import { formatUSD } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  const { ventas, totalVentasMes, totalIngresosMes, totalMes } =
    await getVentasData(tipo);

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">Ventas e Ingresos</h1>
        <Link href="/ventas/nuevo">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Registrar Ingreso
          </Button>
        </Link>
      </div>

      {/* Stats del mes */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-gray-500">
              Ventas del mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">
              {formatUSD(totalVentasMes)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-gray-500">
              Ingresos manuales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">
              {formatUSD(totalIngresosMes)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total del mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatUSD(totalMes)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2">
        <Link href="/ventas">
          <Button
            variant={!tipo ? "default" : "outline"}
            size="sm"
          >
            Todos
          </Button>
        </Link>
        <Link href="/ventas?tipo=VENTA">
          <Button
            variant={tipo === "VENTA" ? "default" : "outline"}
            size="sm"
          >
            Ventas
          </Button>
        </Link>
        <Link href="/ventas?tipo=INGRESO_MANUAL">
          <Button
            variant={tipo === "INGRESO_MANUAL" ? "default" : "outline"}
            size="sm"
          >
            Ingresos manuales
          </Button>
        </Link>
      </div>

      {/* Historial */}
      <VentasHistorial ventas={ventas} />
    </div>
  );
}
