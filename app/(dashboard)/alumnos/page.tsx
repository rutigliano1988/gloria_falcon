import Link from "next/link";
import { getAlumnos } from "./actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
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
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const { q, estado } = await searchParams;
  const alumnos = await getAlumnos(q, estado);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <AlumnosSearch defaultQ={q} defaultEstado={estado} />
        <Link href="/alumnos/nuevo">
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" /> Nueva Inscripción
          </Button>
        </Link>
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

      <p className="text-xs text-muted-foreground">{alumnos.length} alumno(s) encontrado(s)</p>
    </div>
  );
}
