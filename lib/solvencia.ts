import { TIPO_SERVICIO_LABELS, mesAnoToNum } from "./utils";

export type ServicioActivo = { tipo: keyof typeof TIPO_SERVICIO_LABELS };

export type InputSolvencia = {
  serviciosActivos: ServicioActivo[];
  descuentoMontoUsd: number;
  precioMensualidad: number;
  preciosServicios: Record<string, number>;
  mesesPasados: string[];
  conceptosPagados: Map<string, Set<string>>;
};

export type ResultadoSolvencia = {
  conceptosEsperados: string[];
  montoMensualUsd: number;
  mesesMorosos: string[];
  solvente: boolean;
};

export function calcularSolvencia({
  serviciosActivos,
  descuentoMontoUsd,
  precioMensualidad,
  preciosServicios,
  mesesPasados,
  conceptosPagados,
}: InputSolvencia): ResultadoSolvencia {
  const conceptosEsperados = [
    "Mensualidad",
    ...serviciosActivos.map((s) => TIPO_SERVICIO_LABELS[s.tipo]),
  ];

  const montoBase =
    precioMensualidad +
    serviciosActivos.reduce(
      (sum, s) => sum + (preciosServicios[TIPO_SERVICIO_LABELS[s.tipo]] ?? 0),
      0
    );
  const montoMensualUsd = Math.max(0, montoBase - descuentoMontoUsd);

  const mesesMorosos = mesesPasados.filter((mes) => {
    const pagados = conceptosPagados.get(mes) ?? new Set<string>();
    return !conceptosEsperados.every((c) => pagados.has(c));
  });

  return {
    conceptosEsperados,
    montoMensualUsd,
    mesesMorosos,
    solvente: mesesMorosos.length === 0,
  };
}
