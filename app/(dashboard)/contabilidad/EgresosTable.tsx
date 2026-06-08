"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatUSD, formatBS, formatFecha, FORMA_PAGO_LABELS } from "@/lib/utils";
import type { EgresoConDetalle } from "./actions";

interface Props {
  egresos: EgresoConDetalle[];
}

export function EgresosTable({ egresos }: Props) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = egresos.filter((e) => {
    const texto = `${e.categoria} ${e.descripcion ?? ""} ${e.proveedor ?? ""}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase());
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-sm text-gray-700">
          Detalle de Egresos{" "}
          <span className="text-gray-400 font-normal">({egresos.length})</span>
        </h3>
        <input
          type="text"
          placeholder="Buscar..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
        />
      </div>

      {filtrados.length === 0 ? (
        <p className="text-center py-8 text-sm text-gray-400">
          {busqueda ? "Sin resultados" : "No hay egresos en este período"}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">Fecha</th>
                <th className="text-left px-4 py-2.5">Categoría</th>
                <th className="text-left px-4 py-2.5 hidden md:table-cell">
                  Descripción
                </th>
                <th className="text-left px-4 py-2.5 hidden lg:table-cell">
                  Proveedor
                </th>
                <th className="text-right px-4 py-2.5">Monto</th>
                <th className="text-center px-4 py-2.5 hidden sm:table-cell">
                  Forma
                </th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                    {formatFecha(e.fecha)}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="secondary" className="text-xs">
                      {e.categoria}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 hidden md:table-cell">
                    {e.descripcion ?? (e.docenteNombre ? `Nómina — ${e.docenteNombre}` : "—")}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 hidden lg:table-cell">
                    {e.proveedor ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {e.montoUsd != null ? (
                      <span className="font-semibold text-red-600">
                        {formatUSD(e.montoUsd)}
                      </span>
                    ) : e.montoBs != null ? (
                      <span className="font-semibold text-red-600">
                        {formatBS(e.montoBs)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center hidden sm:table-cell">
                    {e.formaPago ? (
                      <Badge variant="secondary" className="text-xs">
                        {FORMA_PAGO_LABELS[e.formaPago] ?? e.formaPago}
                      </Badge>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {e.pagoDocenteId && (
                      <Link href={`/docentes/nomina/${e.pagoDocenteId}`}>
                        <Button size="sm" variant="ghost" className="text-xs">
                          Ver nómina
                        </Button>
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
