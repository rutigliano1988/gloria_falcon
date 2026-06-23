import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { formatUSD } from "@/lib/utils";
import Link from "next/link";
import { TasaStaleAlert } from "@/components/TasaStaleAlert";
import { BalanceChart } from "@/components/BalanceChart";
import type { BalanceDataPoint } from "@/components/BalanceChart";

const MESES_CORTO = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

async function getDashboardData() {
  const [
    totalActivos,
    totalRetirados,
    totalEgresados,
    anoActivo,
  ] = await Promise.all([
    prisma.alumno.count({ where: { estado: "ACTIVO" } }),
    prisma.alumno.count({ where: { estado: "RETIRADO" } }),
    prisma.alumno.count({ where: { estado: "EGRESADO" } }),
    prisma.anoEscolar.findFirst({ where: { activo: true } }),
  ]);

  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);

  const [ingresosMes, egresosMes] = await Promise.all([
    prisma.pago.aggregate({
      where: { fechaPago: { gte: inicioMes, lte: finMes } },
      _sum: { montoUsd: true },
    }),
    prisma.egreso.aggregate({
      where: { fecha: { gte: inicioMes, lte: finMes } },
      _sum: { montoUsd: true },
    }),
  ]);

  const ingresos = Number(ingresosMes._sum.montoUsd ?? 0);
  const egresos = Number(egresosMes._sum.montoUsd ?? 0);

  return {
    totalActivos,
    totalRetirados,
    totalEgresados,
    anoActivo,
    ingresosMes: ingresos,
    egresosMes: egresos,
    balanceMes: ingresos - egresos,
  };
}

async function getUltimos6MesesData(): Promise<BalanceDataPoint[]> {
  const hoy = new Date();
  return Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - (5 - i), 1);
      const inicio = new Date(d.getFullYear(), d.getMonth(), 1);
      const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const label = `${MESES_CORTO[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;

      return Promise.all([
        prisma.pago.aggregate({
          where: { fechaPago: { gte: inicio, lte: fin }, deletedAt: null },
          _sum: { montoUsd: true },
        }),
        prisma.egreso.aggregate({
          where: { fecha: { gte: inicio, lte: fin }, deletedAt: null },
          _sum: { montoUsd: true },
        }),
      ]).then(([ing, egr]) => ({
        mes: label,
        ingresos: Number(ing._sum.montoUsd ?? 0),
        egresos: Number(egr._sum.montoUsd ?? 0),
      }));
    })
  );
}

export default async function DashboardPage() {
  const [data, chartData] = await Promise.all([
    getDashboardData(),
    getUltimos6MesesData(),
  ]);

  return (
    <div className="space-y-6">
      <TasaStaleAlert />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alumnos Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalActivos}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.totalRetirados} retirados · {data.totalEgresados} egresados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos del Mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{formatUSD(data.ingresosMes)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Egresos del Mes</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatUSD(data.egresosMes)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Balance del Mes</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.balanceMes >= 0 ? "text-green-700" : "text-red-600"}`}>
              {formatUSD(data.balanceMes)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ingresos vs Egresos — Últimos 6 meses</CardTitle>
        </CardHeader>
        <CardContent>
          <BalanceChart data={chartData} />
        </CardContent>
      </Card>

      {/* Año escolar activo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Año Escolar Activo</CardTitle>
        </CardHeader>
        <CardContent>
          {data.anoActivo ? (
            <div className="flex items-center gap-3">
              <Badge variant="success">{data.anoActivo.nombre}</Badge>
              <span className="text-sm text-muted-foreground">Año escolar en curso</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Badge variant="warning">Sin año activo</Badge>
              <Link href="/configuracion" className="text-sm text-primary hover:underline">
                Configurar año escolar →
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accesos rápidos */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Accesos rápidos
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link
            href="/mensualidades/nuevo"
            className="flex items-center gap-3 rounded-lg border bg-white p-4 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100">
              <TrendingUp className="h-4 w-4 text-green-700" />
            </div>
            <div>
              <p className="text-sm font-medium">Registrar pago</p>
              <p className="text-xs text-muted-foreground">Mensualidad / servicio</p>
            </div>
          </Link>
          <Link
            href="/alumnos/nuevo"
            className="flex items-center gap-3 rounded-lg border bg-white p-4 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100">
              <Users className="h-4 w-4 text-blue-700" />
            </div>
            <div>
              <p className="text-sm font-medium">Nueva inscripción</p>
              <p className="text-xs text-muted-foreground">Alumno nuevo o reinscripción</p>
            </div>
          </Link>
          <Link
            href="/contabilidad/nuevo-egreso"
            className="flex items-center gap-3 rounded-lg border bg-white p-4 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100">
              <TrendingDown className="h-4 w-4 text-red-700" />
            </div>
            <div>
              <p className="text-sm font-medium">Registrar gasto</p>
              <p className="text-xs text-muted-foreground">Egreso operativo</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
