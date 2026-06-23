import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getDocenteById } from "../actions";
import { ToggleEstadoDocente } from "./ToggleEstadoDocente";
import { CARGO_DOCENTE_LABELS, FORMA_PAGO_LABELS, formatFecha, formatBS, MESES } from "@/lib/utils";

export default async function DetalleDocentePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const docente = await getDocenteById(id);
  if (!docente) notFound();

  const nombre = [
    docente.primerApellido,
    docente.segundoApellido,
    docente.primerNombre,
    docente.segundoNombre,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/docentes">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{nombre}</h1>
              <Badge variant={docente.estado === "ACTIVO" ? "success" : "secondary"}>
                {docente.estado === "ACTIVO" ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            <p className="text-sm text-gray-500">
              {CARGO_DOCENTE_LABELS[docente.cargo] ?? docente.cargo} · C.I. {docente.cedula}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/docentes/nomina/nuevo?docenteId=${docente.id}`}>
            <Button size="sm">
              <FileText className="h-4 w-4 mr-1" />
              Registrar Nómina
            </Button>
          </Link>
          <Link href={`/docentes/${docente.id}/editar`}>
            <Button size="sm" variant="outline">
              <PenLine className="h-4 w-4 mr-1" />
              Editar
            </Button>
          </Link>
        </div>
      </div>

      {/* Datos personales */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
          Datos del Docente
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {docente.telefono && (
            <div>
              <p className="text-xs text-gray-400 uppercase mb-0.5">Teléfono</p>
              <p className="text-sm">{docente.telefono}</p>
            </div>
          )}
          {docente.email && (
            <div>
              <p className="text-xs text-gray-400 uppercase mb-0.5">Correo</p>
              <p className="text-sm">{docente.email}</p>
            </div>
          )}
          {docente.gradosAsignados && (
            <div>
              <p className="text-xs text-gray-400 uppercase mb-0.5">Grados asignados</p>
              <p className="text-sm">{docente.gradosAsignados}</p>
            </div>
          )}
          {docente.fechaIngreso && (
            <div>
              <p className="text-xs text-gray-400 uppercase mb-0.5">Fecha de ingreso</p>
              <p className="text-sm">{formatFecha(docente.fechaIngreso)}</p>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Toggle estado */}
        <ToggleEstadoDocente
          docenteId={docente.id}
          estadoActual={docente.estado as "ACTIVO" | "INACTIVO"}
          nombre={nombre}
        />
      </div>

      {/* Historial de nómina */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Historial de Nómina
          </h3>
          <Link href={`/docentes/nomina/nuevo?docenteId=${docente.id}`}>
            <Button size="sm" variant="outline">+ Registrar</Button>
          </Link>
        </div>
        {docente.pagosDocente.length === 0 ? (
          <p className="text-center py-8 text-gray-400 text-sm">
            No hay pagos registrados
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">Período</th>
                <th className="text-left px-4 py-2.5">Fecha</th>
                <th className="text-right px-4 py-2.5">Total Bs</th>
                <th className="text-center px-4 py-2.5 hidden sm:table-cell">Forma</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {docente.pagosDocente.map((p: (typeof docente.pagosDocente)[number]) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium">
                    {MESES[(p.periodoMes - 1)] ?? p.periodoMes} {p.periodoAno}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{formatFecha(p.fechaPago)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {formatBS(Number(p.totalBs))}
                  </td>
                  <td className="px-4 py-2.5 text-center hidden sm:table-cell">
                    <Badge variant="secondary" className="text-xs">
                      {FORMA_PAGO_LABELS[p.formaPago] ?? p.formaPago}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <Link href={`/docentes/nomina/${p.id}`}>
                      <Button size="sm" variant="ghost">Ver</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
