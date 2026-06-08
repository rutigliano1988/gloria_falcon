"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatUSD, formatMesAno } from "@/lib/utils";
import type { AlumnoConSolvencia } from "./actions";

interface Props {
  alumnos: AlumnoConSolvencia[];
  mesAno: string;
}

export function SolvenciaTable({ alumnos, mesAno }: Props) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = alumnos.filter((a) =>
    a.nombreCompleto.toLowerCase().includes(busqueda.toLowerCase())
  );

  const label = (() => {
    try {
      return formatMesAno(mesAno);
    } catch {
      return mesAno;
    }
  })();

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-sm text-gray-700">
          Solvencia — {label}
        </h3>
        <input
          type="text"
          placeholder="Buscar alumno..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">Alumno</th>
              <th className="text-left px-4 py-2.5">Grado</th>
              <th className="text-left px-4 py-2.5 hidden md:table-cell">Servicios</th>
              <th className="text-right px-4 py-2.5">Monto/mes</th>
              <th className="text-center px-4 py-2.5">Estado</th>
              <th className="text-left px-4 py-2.5 hidden lg:table-cell">Meses morosos</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  {busqueda ? "Sin resultados para la búsqueda" : "No hay alumnos inscritos en el año activo"}
                </td>
              </tr>
            ) : (
              filtrados.map((alumno) => (
                <tr key={alumno.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-gray-900">
                    {alumno.nombreCompleto}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {alumno.grado}
                    {alumno.seccion ? ` ${alumno.seccion}` : ""}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 hidden md:table-cell">
                    {alumno.serviciosActivos.join(", ")}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {formatUSD(alumno.montoMensualUsd)}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <Badge variant={alumno.solvente ? "success" : "destructive"}>
                      {alumno.solvente ? "Solvente" : "Moroso"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-red-500 hidden lg:table-cell">
                    {alumno.mesesMorosos.length > 0
                      ? alumno.mesesMorosos.slice(0, 3).map((m) => {
                          try { return formatMesAno(m); } catch { return m; }
                        }).join(", ") +
                        (alumno.mesesMorosos.length > 3
                          ? ` +${alumno.mesesMorosos.length - 3}`
                          : "")
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <Link href={`/mensualidades/nuevo?alumnoId=${alumno.id}`}>
                      <Button size="sm" variant="outline">
                        Cobrar
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
        {filtrados.length} de {alumnos.length} alumno(s)
      </div>
    </div>
  );
}
