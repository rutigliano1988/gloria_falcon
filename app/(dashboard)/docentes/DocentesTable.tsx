"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CARGO_DOCENTE_LABELS, formatFecha } from "@/lib/utils";

type Docente = {
  id: string;
  primerApellido: string;
  segundoApellido: string | null;
  primerNombre: string;
  segundoNombre: string | null;
  cedula: string;
  cargo: string;
  estado: string;
  telefono: string | null;
  fechaIngreso: Date | null;
};

interface Props {
  docentes: Docente[];
}

export function DocentesTable({ docentes }: Props) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = docentes.filter((d) => {
    const nombre = `${d.primerApellido} ${d.primerNombre} ${d.cedula}`.toLowerCase();
    return nombre.includes(busqueda.toLowerCase());
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-sm text-gray-700">
          Personal ({docentes.length})
        </h3>
        <input
          type="text"
          placeholder="Buscar por nombre o cédula..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">Nombre</th>
              <th className="text-left px-4 py-2.5">Cédula</th>
              <th className="text-left px-4 py-2.5 hidden md:table-cell">Cargo</th>
              <th className="text-left px-4 py-2.5 hidden lg:table-cell">Ingreso</th>
              <th className="text-center px-4 py-2.5">Estado</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  {busqueda ? "Sin resultados" : "No hay docentes registrados"}
                </td>
              </tr>
            ) : (
              filtrados.map((d) => {
                const nombre = [d.primerApellido, d.segundoApellido, d.primerNombre, d.segundoNombre]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{nombre}</td>
                    <td className="px-4 py-2.5 font-mono text-gray-600">{d.cedula}</td>
                    <td className="px-4 py-2.5 text-gray-600 hidden md:table-cell">
                      {CARGO_DOCENTE_LABELS[d.cargo] ?? d.cargo}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 hidden lg:table-cell">
                      {d.fechaIngreso ? formatFecha(d.fechaIngreso) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge variant={d.estado === "ACTIVO" ? "success" : "secondary"}>
                        {d.estado === "ACTIVO" ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <Link href={`/docentes/${d.id}`}>
                          <Button size="sm" variant="outline">Ver</Button>
                        </Link>
                        <Link href={`/docentes/nomina/nuevo?docenteId=${d.id}`}>
                          <Button size="sm" variant="ghost">Nómina</Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {filtrados.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
          {filtrados.length} de {docentes.length} docente(s)
        </div>
      )}
    </div>
  );
}
