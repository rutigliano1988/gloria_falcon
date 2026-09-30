// Cálculos financieros puros (sin BD): se usan en el servidor para NO confiar
// en montos enviados por el cliente, y se prueban en __tests__/finanzas.test.ts.

import { TIPO_SERVICIO_LABELS } from "./utils";

export const redondear2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const redondear4 = (n: number) => Math.round((n + Number.EPSILON) * 10000) / 10000;

export function montoBsDesdeUsd(usd: number, tasa: number): number {
  if (!(tasa > 0)) throw new Error("La tasa de cambio debe ser mayor a 0.");
  return redondear2(usd * tasa);
}

export function montoUsdDesdeBs(bs: number, tasa: number): number {
  if (!(tasa > 0)) throw new Error("La tasa de cambio debe ser mayor a 0.");
  return redondear2(bs / tasa);
}

export type ConceptoCalculado = { concepto: string; mesAno: string | null; montoUsd: number };

export const CONCEPTO_MENSUALIDAD = "Mensualidad";
export const CONCEPTO_DESCUENTO = "Descuento/Beca";

/** Conceptos que se esperan por mes según los servicios activos de la inscripción. */
export function conceptosEsperados(serviciosActivos: string[]): string[] {
  return [CONCEPTO_MENSUALIDAD, ...serviciosActivos.map((s) => TIPO_SERVICIO_LABELS[s] ?? s)];
}

/**
 * Conceptos de un cobro de mensualidades, calculados con los precios vigentes.
 * El descuento se aplica por mes (con su mesAno) y nunca deja un mes en negativo.
 */
export function calcularConceptosMensualidad(params: {
  meses: string[];
  serviciosActivos: string[];
  precios: Record<string, number>;
  descuentoMensualUsd: number;
}): ConceptoCalculado[] {
  const esperados = conceptosEsperados(params.serviciosActivos);
  for (const c of esperados) {
    if (!(params.precios[c] > 0)) {
      throw new Error(`No hay un precio activo configurado para "${c}".`);
    }
  }
  const conceptos: ConceptoCalculado[] = [];
  for (const mes of params.meses) {
    let subtotal = 0;
    for (const c of esperados) {
      const monto = redondear2(params.precios[c]);
      conceptos.push({ concepto: c, mesAno: mes, montoUsd: monto });
      subtotal += monto;
    }
    const descuento = redondear2(Math.min(Math.max(params.descuentoMensualUsd, 0), subtotal));
    if (descuento > 0) {
      conceptos.push({ concepto: CONCEPTO_DESCUENTO, mesAno: mes, montoUsd: -descuento });
    }
  }
  return conceptos;
}

export function totalConceptos(conceptos: { montoUsd: number }[]): number {
  return redondear2(conceptos.reduce((s, c) => s + c.montoUsd, 0));
}

/** Meses en los que ya se pagó alguno de los conceptos esperados (para bloquear cobros duplicados). */
export function mesesConCobroPrevio(
  meses: string[],
  pagados: { mesAno: string | null; concepto: string }[],
  esperados: string[]
): string[] {
  return meses.filter((m) => pagados.some((p) => p.mesAno === m && esperados.includes(p.concepto)));
}

/** Total neto de nómina, recalculado en el servidor. */
export function calcularTotalNomina(p: {
  baseBs: number;
  bonoBs: number;
  otros: { montoBs: number }[];
  deducciones: { montoBs: number }[];
}): number {
  const otros = p.otros.reduce((s, c) => s + c.montoBs, 0);
  const deducciones = p.deducciones.reduce((s, c) => s + c.montoBs, 0);
  return redondear2(p.baseBs + p.bonoBs + otros - deducciones);
}

/** Equivalente en USD de un egreso: usa el monto en USD o convierte con la tasa de SU día. */
export function egresoEnUsd(e: {
  montoUsd: number | null;
  montoBs: number | null;
  tasaDelDia: number | null;
}): number | null {
  if (e.montoUsd != null) return e.montoUsd;
  if (e.montoBs != null && e.tasaDelDia && e.tasaDelDia > 0) return montoUsdDesdeBs(e.montoBs, e.tasaDelDia);
  return null;
}
