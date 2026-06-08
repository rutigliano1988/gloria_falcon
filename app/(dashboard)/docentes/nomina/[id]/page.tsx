import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getPagoNominaById } from "../../actions";
import { getConfigColegio } from "@/app/(dashboard)/mensualidades/actions";
import { formatBS, formatFecha, FORMA_PAGO_LABELS, CARGO_DOCENTE_LABELS, MESES } from "@/lib/utils";

export default async function DetalleNominaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [pago, config] = await Promise.all([
    getPagoNominaById(id),
    getConfigColegio(),
  ]);

  if (!pago) notFound();

  const docente = pago.docente;
  const nombreDocente = [
    docente.primerApellido,
    docente.segundoApellido,
    docente.primerNombre,
    docente.segundoNombre,
  ]
    .filter(Boolean)
    .join(" ");

  const otrosConceptos = (pago.otrosConceptos as { descripcion: string; montoBs: number }[] | null) ?? [];
  const deducciones = (pago.deducciones as { descripcion: string; montoBs: number }[] | null) ?? [];
  const tasa = pago.tasaCambio ? Number(pago.tasaCambio.tasa) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/docentes/${docente.id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Comprobante de Nómina
            </h1>
            <p className="text-sm text-gray-500">
              {MESES[pago.periodoMes - 1]} {pago.periodoAno} · {formatFecha(pago.fechaPago)}
            </p>
          </div>
        </div>
        <a href={`/api/nomina/${pago.id}`} target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Descargar PDF
          </Button>
        </a>
      </div>

      {/* Datos colegio */}
      {config && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="font-semibold text-sm text-gray-700">{config.nombre}</p>
          <p className="text-xs text-gray-500">RIF: {config.rif} · {config.telefonos}</p>
        </div>
      )}

      {/* Datos del docente */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Docente</h3>
        <p className="font-semibold text-base text-gray-900">{nombreDocente}</p>
        <p className="text-sm text-gray-500">
          {CARGO_DOCENTE_LABELS[docente.cargo] ?? docente.cargo} · C.I. {docente.cedula}
        </p>
      </div>

      {/* Conceptos */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Detalle</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-5 py-2.5">Concepto</th>
              <th className="text-right px-5 py-2.5">Monto Bs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="px-5 py-2.5">Base mensual</td>
              <td className="px-5 py-2.5 text-right font-mono">{formatBS(Number(pago.baseBs))}</td>
            </tr>
            {pago.bonoUsd && (
              <tr>
                <td className="px-5 py-2.5 text-gray-600">
                  Bono USD {Number(pago.bonoUsd).toFixed(2)}
                  {tasa ? ` × ${tasa.toFixed(4)} Bs/$` : ""}
                </td>
                <td className="px-5 py-2.5 text-right font-mono">
                  {formatBS(Number(pago.bonoBsEquivalente ?? 0))}
                </td>
              </tr>
            )}
            {otrosConceptos.map((c, i) => (
              <tr key={i}>
                <td className="px-5 py-2.5 text-gray-600">{c.descripcion}</td>
                <td className="px-5 py-2.5 text-right font-mono">{formatBS(c.montoBs)}</td>
              </tr>
            ))}
            {deducciones.map((d, i) => (
              <tr key={i} className="text-red-600">
                <td className="px-5 py-2.5">{d.descripcion}</td>
                <td className="px-5 py-2.5 text-right font-mono">- {formatBS(d.montoBs)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-blue-50 font-semibold">
              <td className="px-5 py-3 text-blue-800">TOTAL NETO</td>
              <td className="px-5 py-3 text-right text-blue-800 font-bold text-base">
                {formatBS(Number(pago.totalBs))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Datos del pago */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Datos del Pago</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase mb-0.5">Forma</p>
            <p className="text-sm font-medium">{FORMA_PAGO_LABELS[pago.formaPago] ?? pago.formaPago}</p>
          </div>
          {pago.numeroReferencia && (
            <div>
              <p className="text-xs text-gray-400 uppercase mb-0.5">Referencia</p>
              <p className="text-sm font-mono">{pago.numeroReferencia}</p>
            </div>
          )}
          {tasa && (
            <div>
              <p className="text-xs text-gray-400 uppercase mb-0.5">Tasa BCV</p>
              <p className="text-sm">{tasa.toFixed(4)} Bs/$1</p>
            </div>
          )}
        </div>
      </div>

      {/* Firmas */}
      <div className="flex justify-around pt-4 pb-2">
        <div className="text-center w-44">
          <div className="border-t border-gray-300 mb-2" />
          <p className="text-xs text-gray-400">Firma del Docente</p>
        </div>
        <div className="text-center w-44">
          <div className="border-t border-gray-300 mb-2" />
          <p className="text-xs text-gray-400">Sello / Administración</p>
        </div>
      </div>
    </div>
  );
}
