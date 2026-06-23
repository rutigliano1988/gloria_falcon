export const dynamic = "force-dynamic";

import Link from "next/link";
import { getAlumnos } from "./actions";
import { ALUMNOS_POR_PAGINA } from "./constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, ChevronLeft, ChevronRight } from "lucide-react";
import { calcularEdad, formatFecha } from "@/lib/utils";
import { AlumnosSearch } from "./AlumnosSearch";

const ESTADO_BADGE: Record<string, "success" | "destructive" | "secondary"> = {
  ACTIVO: "success",
  RETIRADO: "destructive",
  EGRESADO: "secondary",
};

const ESTADO_LABEL: Record<string, string> = {
  ACTIVO: "Activo",
  RETIRADO: "Retirado",
  EGRESADO: "Egresado",
};

export default async function AlumnosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; pagina?: string }>;
}) {
  const { q, estado, pagina: paginaStr } = await searchParams;
  const pagina = Math.max(1, parseInt(paginaStr ?? "1") || 1);
  const { alumnos, total, totalPaginas } = await getAlumnos(q, estado, pagina);

  const buildUrl = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (estado) params.set("estado", estado);
    params.set("pagina", String(p));
    return `/alumnos?${params.toString()}`;
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <AlumnosSearch defaultQ={q} defaultEstado={estado} />
        <div className="flex gap-2">
          <Link href="/alumnos/importar">
            <Button size="sm" variant="outline">
              <Upload className="mr-1 h-4 w-4" /> Importar CSV
            </Button>
          </Link>
          <Link href="/alumnos/nuevo">
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Nueva Inscripción
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Alumno</th>
              <th className="px-4 py-3 text-left">Cédula Escolar</th>
              <th className="px-4 py-3 text-left">Edad</th>
              <th className="px-4 py-3 text-left">Grado</th>
              <th className="px-4 py-3 text-left">Año Escolar</th>
              <th className="px-4 py-3 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>
            {alumnos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No se encontraron alumnos.{" "}
                  <Link href="/alumnos/nuevo" className="text-primary hover:underline">
                    Registrar el primero →
                  </Link>
                </td>
              </tr>
            ) : (
              alumnos.map((alumno) => {
                const inscripcion = alumno.inscripciones[0];
                const edad = calcularEdad(new Date(alumno.fechaNacimiento));
                return (
                  <tr key={alumno.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/alumnos/${alumno.id}`} className="hover:text-primary font-medium">
                        {[alumno.primerApellido, alumno.segundoApellido, alumno.primerNombre, alumno.segundoNombre].filter(Boolean).join(" ")}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{alumno.cedulaEscolar ?? "—"}</td>
                    <td className="px-4 py-3">{edad} años</td>
                    <td className="px-4 py-3">
                      {inscripcion
                        ? `${inscripcion.grado.nombre}${inscripcion.seccion ? " " + inscripcion.seccion.nombre : ""}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {inscripcion?.anoEscolar.nombre ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={ESTADO_BADGE[alumno.estado]}>
                        {ESTADO_LABEL[alumno.estado]}
                      </Badge>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer con paginación */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {total === 0
            ? "0 alumnos"
            : `${(pagina - 1) * ALUMNOS_POR_PAGINA + 1}–${Math.min(pagina * ALUMNOS_POR_PAGINA, total)} de ${total} alumno(s)`}
        </span>
        {totalPaginas > 1 && (
          <div className="flex items-center gap-1">
            <Link href={buildUrl(pagina - 1)}>
              <Button variant="outline" size="sm" disabled={pagina <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <span className="px-3 py-1">
              Página {pagina} de {totalPaginas}
            </span>
            <Link href={buildUrl(pagina + 1)}>
              <Button variant="outline" size="sm" disabled={pagina >= totalPaginas}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
