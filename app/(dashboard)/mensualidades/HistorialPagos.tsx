"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatUSD, formatFecha, FORMA_PAGO_LABELS, formatMesAno } from "@/lib/utils";
import type { PagoConDetalles } from "./actions";

interface Props {
  pagos: PagoConDetalles[];
}

const MONEDA_LABELS: Record<string, string> = {
  USD: "$",
  BS: "Bs",
};

export function HistorialPagos({ pagos }: Props) {
  if (pagos.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-sm text-gray-700">Historial de Pagos</h3>
        </div>
        <p className="text-center py-8 text-gray-400 text-sm">
          No hay pagos registrados todavía
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-sm text-gray-700">
          Historial de Pagos{" "}
          <span className="text-gray-400 font-normal">({pagos.length} recientes)</span>
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">Recibo</th>
              <th className="text-left px-4 py-2.5">Fecha</th>
              <th className="text-left px-4 py-2.5">Alumno</th>
              <th className="text-left px-4 py-2.5 hidden md:table-cell">Conceptos</th>
              <th className="text-right px-4 py-2.5">Monto</th>
              <th className="text-center px-4 py-2.5 hidden sm:table-cell">Forma</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pagos.map((pago) => {
              const meses = [
                ...new Set(
                  pago.conceptos
                    .filter((c) => c.mesAno)
                    .map((c) => {
                      try { return formatMesAno(c.mesAno!); } catch { return c.mesAno!; }
                    })
                ),
              ].join(", ");

              return (
                <tr key={pago.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                      {pago.numeroRecibo ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                    {formatFecha(pago.fechaPago)}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">
                    {pago.alumnoNombre ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs hidden md:table-cell">
                    {meses || pago.conceptos.map((c) => c.concepto).join(", ")}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    <span className="font-semibold">{formatUSD(pago.montoUsd)}</span>
                    {pago.montoBs && (
                      <span className="block text-xs text-gray-400">
                        {new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2 }).format(pago.montoBs)} Bs
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center hidden sm:table-cell">
                    <Badge variant="secondary" className="text-xs whitespace-nowrap">
                      {FORMA_PAGO_LABELS[pago.formaPago] ?? pago.formaPago}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <Link href={`/mensualidades/${pago.id}`}>
                      <Button size="sm" variant="ghost">
                        Ver
                      </Button>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
