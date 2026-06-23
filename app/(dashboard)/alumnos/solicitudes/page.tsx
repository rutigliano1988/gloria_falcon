export const dynamic = "force-dynamic";

import Link from "next/link";
import { getSolicitudes, generarEnlaceSolicitud } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CopyLinkButton } from "./CopyLinkButton";
import { formatFecha } from "@/lib/utils";

const ESTADO_BADGE: Record<string, "secondary" | "success" | "destructive" | "warning"> = {
  PENDIENTE: "secondary",
  EN_REVISION: "warning",
  APROBADA: "success",
  RECHAZADA: "destructive",
};

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_REVISION: "En revisión",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
};

function GenerarEnlaceButton() {
  return (
    <form action={generarEnlaceSolicitud}>
      <Button type="submit" size="sm">
        <Plus className="mr-1 h-4 w-4" /> Generar Enlace
      </Button>
    </form>
  );
}

export default async function SolicitudesPage() {
  const solicitudes = await getSolicitudes();

  const pendientes = solicitudes.filter((s) => s.estado === "PENDIENTE").length;
  const enRevision = solicitudes.filter((s) => s.estado === "EN_REVISION").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Solicitudes de Inscripción</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Formularios enviados por padres y representantes
          </p>
        </div>
        <GenerarEnlaceButton />
      </div>

      {/* Resumen */}
      {(pendientes > 0 || enRevision > 0) && (
        <div className="flex gap-3 flex-wrap">
          {pendientes > 0 && (
            <div className="rounded-lg border bg-white px-4 py-2 text-sm">
              <span className="font-semibold text-gray-900">{pendientes}</span>{" "}
              <span className="text-gray-500">enlace{pendientes !== 1 ? "s" : ""} sin usar</span>
            </div>
          )}
          {enRevision > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm">
              <span className="font-semibold text-amber-800">{enRevision}</span>{" "}
              <span className="text-amber-700">pendiente{enRevision !== 1 ? "s" : ""} de revisión</span>
            </div>
          )}
        </div>
      )}

      {solicitudes.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center text-muted-foreground">
          <p className="font-medium">No hay solicitudes todavía.</p>
          <p className="text-sm mt-1">Generá un enlace y enviáselo a los padres.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Estudiante</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Estado</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Fecha</th>
                <th className="px-4 py-3 text-left">Acción</th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.map((s) => {
                const nombre =
                  s.primerApellido && s.primerNombre
                    ? `${s.primerApellido}${s.segundoApellido ? " " + s.segundoApellido : ""}, ${s.primerNombre}`
                    : null;

                return (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      {nombre ? (
                        <span className="font-medium text-gray-900">{nombre}</span>
                      ) : (
                        <span className="text-gray-400 italic">Sin datos aún</span>
                      )}
                      {/* Estado inline en mobile */}
                      <div className="mt-1 md:hidden">
                        <Badge variant={ESTADO_BADGE[s.estado]}>{ESTADO_LABEL[s.estado]}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge variant={ESTADO_BADGE[s.estado]}>{ESTADO_LABEL[s.estado]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {formatFecha(new Date(s.creadoEn))}
                    </td>
                    <td className="px-4 py-3">
                      {s.estado === "PENDIENTE" ? (
                        <CopyLinkButton token={s.token} />
                      ) : (
                        <Link href={`/alumnos/solicitudes/${s.id}`}>
                          <Button variant="outline" size="sm">Revisar</Button>
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

