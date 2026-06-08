"use client";

import { formatUSD, formatBS } from "@/lib/utils";
import type { DesgloseTipo } from "./actions";

const TIPO_LABELS: Record<string, string> = {
  MENSUALIDAD: "Mensualidades",
  INSCRIPCION: "Inscripciones",
  VENTA: "Ventas de productos",
  INGRESO_MANUAL: "Ingresos manuales",
};

interface Props {
  porTipo: DesgloseTipo;
  totalIngresosUsd: number;
  egresosPorCategoria: Record<string, number>;
  totalEgresosUsd: number;
  tasa: number;
}

function FilaResumen({
  label,
  montoUsd,
  tasa,
  esTotal = false,
}: {
  label: string;
  montoUsd: number;
  tasa: number;
  esTotal?: boolean;
}) {
  return (
    <tr className={esTotal ? "bg-gray-50 font-semibold" : "hover:bg-gray-50"}>
      <td className="px-4 py-2 text-sm">{label}</td>
      <td className="px-4 py-2 text-right text-sm font-mono">
        {formatUSD(montoUsd)}
      </td>
      <td className="px-4 py-2 text-right text-xs text-gray-400 font-mono">
        {tasa > 0 ? formatBS(montoUsd * tasa) : "—"}
      </td>
    </tr>
  );
}

export function ResumenContable({
  porTipo,
  totalIngresosUsd,
  egresosPorCategoria,
  totalEgresosUsd,
  tasa,
}: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Ingresos por tipo */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-green-50">
          <h3 className="font-semibold text-sm text-green-800">
            📥 Ingresos por tipo
          </h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Tipo</th>
              <th className="text-right px-4 py-2">USD</th>
              <th className="text-right px-4 py-2">Bs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {Object.entries(TIPO_LABELS).map(([tipo, label]) => (
              <FilaResumen
                key={tipo}
                label={label}
                montoUsd={porTipo[tipo as keyof DesgloseTipo] ?? 0}
                tasa={tasa}
              />
            ))}
            <FilaResumen
              label="TOTAL"
              montoUsd={totalIngresosUsd}
              tasa={tasa}
              esTotal
            />
          </tbody>
        </table>
        {tasa > 0 && (
          <p className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
            Tasa BCV: {tasa.toFixed(4)} Bs/$1
          </p>
        )}
      </div>

      {/* Egresos por categoría */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-red-50">
          <h3 className="font-semibold text-sm text-red-800">
            📤 Egresos por categoría
          </h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Categoría</th>
              <th className="text-right px-4 py-2">USD</th>
              <th className="text-right px-4 py-2">Bs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {Object.keys(egresosPorCategoria).length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-4 text-center text-sm text-gray-400"
                >
                  Sin egresos en este período
                </td>
              </tr>
            ) : (
              Object.entries(egresosPorCategoria)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, monto]) => (
                  <FilaResumen
                    key={cat}
                    label={cat}
                    montoUsd={monto}
                    tasa={tasa}
                  />
                ))
            )}
            <FilaResumen
              label="TOTAL"
              montoUsd={totalEgresosUsd}
              tasa={tasa}
              esTotal
            />
          </tbody>
        </table>
        {tasa > 0 && (
          <p className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
            Tasa BCV: {tasa.toFixed(4)} Bs/$1
          </p>
        )}
      </div>
    </div>
  );
}
