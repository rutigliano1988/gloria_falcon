"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatUSD, formatFecha, FORMA_PAGO_LABELS } from "@/lib/utils";
import type { VentaResumen } from "./actions";

interface Props {
  ventas: VentaResumen[];
}

const TIPO_LABELS: Record<string, string> = {
  VENTA: "Venta",
  INGRESO_MANUAL: "Ingreso",
};

export function VentasHistorial({ ventas }: Props) {
  if (ventas.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-400 text-sm">
        No hay registros todavía
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-sm text-gray-700">
          Historial{" "}
          <span className="text-gray-400 font-normal">({ventas.length} registros)</span>
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">Recibo</th>
              <th className="text-left px-4 py-2.5">Fecha</th>
              <th className="text-center px-4 py-2.5">Tipo</th>
              <th className="text-left px-4 py-2.5 hidden md:table-cell">Conceptos</th>
              <th className="text-right px-4 py-2.5">Monto</th>
              <th className="text-center px-4 py-2.5 hidden sm:table-cell">Forma</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ventas.map((v) => (
              <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2.5">
                  <span className="font-mono text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">
                    {v.numeroRecibo ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                  {formatFecha(v.fechaPago)}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <Badge variant={v.tipo === "VENTA" ? "success" : "secondary"}>
                    {TIPO_LABELS[v.tipo] ?? v.tipo}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-gray-500 text-xs hidden md:table-cell">
                  {v.conceptos
                    .slice(0, 2)
                    .map((c) => c.concepto)
                    .join(", ")}
                  {v.conceptos.length > 2 && ` +${v.conceptos.length - 2}`}
                </td>
                <td className="px-4 py-2.5 text-right font-mono">
                  <span className="font-semibold">{formatUSD(v.montoUsd)}</span>
                  {v.montoBs && (
                    <span className="block text-xs text-gray-400">
                      {new Intl.NumberFormat("es-VE", {
                        minimumFractionDigits: 2,
                      }).format(v.montoBs)}{" "}
                      Bs
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center hidden sm:table-cell">
                  <Badge variant="secondary" className="text-xs">
                    {FORMA_PAGO_LABELS[v.formaPago] ?? v.formaPago}
                  </Badge>
                </td>
                <td className="px-4 py-2.5">
                  <Link href={`/ventas/${v.id}`}>
                    <Button size="sm" variant="ghost">Ver</Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
