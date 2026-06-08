import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getPagoById, getConfigColegio } from "../actions";
import { formatUSD, formatBS, formatFecha, FORMA_PAGO_LABELS } from "@/lib/utils";

export default async function DetallePagoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [pago, config] = await Promise.all([getPagoById(id), getConfigColegio()]);

  if (!pago) notFound();

  const inscripcion = pago.alumno?.inscripciones?.[0];
  const alumnoNombre = pago.alumno
    ? [
        pago.alumno.primerApellido,
        pago.alumno.segundoApellido,
        pago.alumno.primerNombre,
        pago.alumno.segundoNombre,
      ]
        .filter(Boolean)
        .join(" ")
    : "—";

  const totalUsd = Number(pago.montoUsd);
  const totalBs = pago.montoBs ? Number(pago.montoBs) : null;
  const tasa = pago.tasaCambio ? Number(pago.tasaCambio.tasa) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/mensualidades">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">
                Recibo N°{" "}
                {pago.numeroRecibo ?? id.slice(-6).toUpperCase()}
              </h1>
              <Badge variant="success">MENSUALIDAD</Badge>
            </div>
            <p className="text-sm text-gray-500">
              {formatFecha(pago.fechaPago)}
              {pago.anoEscolar ? ` · ${pago.anoEscolar.nombre}` : ""}
            </p>
          </div>
        </div>
        <a href={`/api/recibo/${pago.id}`} target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Descargar PDF
          </Button>
        </a>
      </div>

      {/* Datos del colegio */}
      {config && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="font-semibold text-sm text-gray-700">{config.nombre}</p>
          <p className="text-xs text-gray-500">RIF: {config.rif} · {config.telefonos}</p>
          <p className="text-xs text-gray-500">{config.direccion}</p>
        </div>
      )}

      {/* Datos del alumno */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Alumno
        </h3>
        <p className="font-semibold text-gray-900 text-base">{alumnoNombre}</p>
        {inscripcion && (
          <p className="text-sm text-gray-500 mt-1">
            {inscripcion.grado.nombre}
            {inscripcion.seccion ? ` — Sección ${inscripcion.seccion.nombre}` : ""}
          </p>
        )}
      </div>

      {/* Tabla de conceptos */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Detalle del Pago
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-5 py-2.5">Concepto</th>
              <th className="text-center px-5 py-2.5">Mes / Año</th>
              <th className="text-right px-5 py-2.5">Monto USD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pago.conceptos.map((c, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-5 py-2.5">{c.concepto}</td>
                <td className="px-5 py-2.5 text-center text-gray-500">
                  {c.mesAno ?? "—"}
                </td>
                <td className="px-5 py-2.5 text-right font-mono">
                  {formatUSD(Number(c.montoUsd))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-blue-50 font-semibold">
              <td className="px-5 py-3 text-blue-800">TOTAL</td>
              <td></td>
              <td className="px-5 py-3 text-right text-blue-800 font-bold text-base">
                {formatUSD(totalUsd)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Datos del pago */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
          Datos del Pago
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase mb-0.5">Forma</p>
            <p className="text-sm font-medium">
              {FORMA_PAGO_LABELS[pago.formaPago] ?? pago.formaPago}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase mb-0.5">Moneda</p>
            <p className="text-sm font-medium">{pago.monedaPagada}</p>
          </div>
          {tasa && (
            <div>
              <p className="text-xs text-gray-400 uppercase mb-0.5">Tasa BCV</p>
              <p className="text-sm font-medium">{tasa.toFixed(4)} Bs/$1</p>
            </div>
          )}
          {totalBs && (
            <div>
              <p className="text-xs text-gray-400 uppercase mb-0.5">Total Bs</p>
              <p className="text-sm font-semibold text-green-700">
                {formatBS(totalBs)}
              </p>
            </div>
          )}
          {pago.numeroReferencia && (
            <div>
              <p className="text-xs text-gray-400 uppercase mb-0.5">Referencia</p>
              <p className="text-sm font-medium font-mono">{pago.numeroReferencia}</p>
            </div>
          )}
        </div>
        {pago.observaciones && (
          <>
            <Separator className="my-4" />
            <div>
              <p className="text-xs text-gray-400 uppercase mb-0.5">Observaciones</p>
              <p className="text-sm text-gray-600">{pago.observaciones}</p>
            </div>
          </>
        )}
      </div>

      {/* Firma */}
      <div className="flex justify-around pt-4 pb-2">
        <div className="text-center w-40">
          <div className="border-t border-gray-300 mb-2" />
          <p className="text-xs text-gray-400">Sello / Administración</p>
        </div>
        <div className="text-center w-40">
          <div className="border-t border-gray-300 mb-2" />
          <p className="text-xs text-gray-400">Recibido por</p>
        </div>
      </div>
    </div>
  );
}
