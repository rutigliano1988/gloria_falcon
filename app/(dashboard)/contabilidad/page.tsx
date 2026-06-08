import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getContabilidadData } from "./actions";
import { ResumenContable } from "./ResumenContable";
import { EgresosTable } from "./EgresosTable";
import { formatUSD, MESES } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ContabilidadPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string }>;
}) {
  const { mes: mesParam, ano: anoParam } = await searchParams;
  const mes = mesParam ? parseInt(mesParam) : undefined;
  const ano = anoParam ? parseInt(anoParam) : undefined;

  const data = await getContabilidadData(mes, ano);

  const hoy = new Date();
  const anos = Array.from(
    { length: 5 },
    (_, i) => hoy.getFullYear() - i
  );

  const balancePositivo = data.balance >= 0;

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Contabilidad</h1>
          <p className="text-sm text-gray-500">
            {MESES[data.mes - 1]} {data.ano}
          </p>
        </div>
        <Link href="/contabilidad/nuevo-egreso">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Registrar Egreso
          </Button>
        </Link>
      </div>

      {/* Selector de período */}
      <form method="GET" className="flex items-center gap-2">
        <select
          name="mes"
          defaultValue={data.mes}
          className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {MESES.map((m, i) => (
            <option key={i + 1} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select
          name="ano"
          defaultValue={data.ano}
          className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {anos.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm">
          Ver período
        </Button>
      </form>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Ingresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatUSD(data.totalIngresosUsd)}
            </p>
            {data.tasa > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {new Intl.NumberFormat("es-VE", { minimumFractionDigits: 0 }).format(
                  data.totalIngresosUsd * data.tasa
                )}{" "}
                Bs
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Egresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {formatUSD(data.totalEgresosUsd)}
            </p>
            {data.tasa > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {new Intl.NumberFormat("es-VE", { minimumFractionDigits: 0 }).format(
                  data.totalEgresosUsd * data.tasa
                )}{" "}
                Bs
              </p>
            )}
          </CardContent>
        </Card>

        <Card
          className={balancePositivo ? "border-green-200" : "border-red-200"}
        >
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-gray-500">
              Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${
                balancePositivo ? "text-green-700" : "text-red-700"
              }`}
            >
              {balancePositivo ? "+" : ""}
              {formatUSD(data.balance)}
            </p>
            {data.tasa > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {balancePositivo ? "+" : ""}
                {new Intl.NumberFormat("es-VE", { minimumFractionDigits: 0 }).format(
                  data.balance * data.tasa
                )}{" "}
                Bs
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Desglose */}
      <ResumenContable
        porTipo={data.porTipo}
        totalIngresosUsd={data.totalIngresosUsd}
        egresosPorCategoria={data.egresosPorCategoria}
        totalEgresosUsd={data.totalEgresosUsd}
        tasa={data.tasa}
      />

      {/* Tabla de egresos */}
      <EgresosTable egresos={data.egresos} />
    </div>
  );
}
