import "server-only";
import { prisma } from "@/lib/prisma";
import { egresoEnUsd, redondear2 } from "@/lib/finanzas";

/**
 * Totales de ingresos y egresos (en USD) de un período, excluyendo anulados.
 * Única fuente para dashboard y gráficas, con la misma conversión que
 * contabilidad: cada egreso con su tasa (aplicada o la de su día).
 */
export async function totalesPeriodo(inicio: Date, fin: Date) {
  const [ingresos, egresos, tasaActual] = await Promise.all([
    prisma.pago.aggregate({
      where: { fechaPago: { gte: inicio, lte: fin }, deletedAt: null },
      _sum: { montoUsd: true },
    }),
    prisma.egreso.findMany({
      where: { fecha: { gte: inicio, lte: fin }, deletedAt: null },
      select: { montoUsd: true, montoBs: true, tasaAplicada: true, tasaCambio: { select: { tasa: true } } },
    }),
    prisma.tasaCambio.findFirst({ orderBy: { fechaRegistro: "desc" }, select: { tasa: true } }),
  ]);

  const tasaFallback = tasaActual ? Number(tasaActual.tasa) : null;
  const egresosUsd = egresos.reduce((s, e) => {
    const usd = egresoEnUsd({
      montoUsd: e.montoUsd != null ? Number(e.montoUsd) : null,
      montoBs: e.montoBs != null ? Number(e.montoBs) : null,
      tasaDelDia: e.tasaAplicada ? Number(e.tasaAplicada) : e.tasaCambio ? Number(e.tasaCambio.tasa) : tasaFallback,
    });
    return s + (usd ?? 0);
  }, 0);

  const ingresosUsd = Number(ingresos._sum.montoUsd ?? 0);
  return {
    ingresosUsd: redondear2(ingresosUsd),
    egresosUsd: redondear2(egresosUsd),
    balanceUsd: redondear2(ingresosUsd - egresosUsd),
  };
}
