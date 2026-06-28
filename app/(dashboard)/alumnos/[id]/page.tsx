import { notFound } from "next/navigation";
import Link from "next/link";
import { getAlumnoById, getGradosYAnosActivos } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { calcularEdad, formatFecha, PROCEDENCIA_LABELS, TIPO_SERVICIO_LABELS } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { CambiarEstado } from "./CambiarEstado";
import { Reinscribir } from "./Reinscribir";

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

export default async function AlumnoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [alumno, { grados, anos }] = await Promise.all([
    getAlumnoById(id),
    getGradosYAnosActivos(),
  ]);
  if (!alumno) notFound();

  const inscripcionActual = alumno.inscripciones[0];
  const anosInscritos = alumno.inscripciones.map((i) => i.anoEscolarId);
  const edad = calcularEdad(new Date(alumno.fechaNacimiento));

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/alumnos">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" /> Volver
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-semibold">
              {[alumno.primerApellido, alumno.segundoApellido, alumno.primerNombre, alumno.segundoNombre].filter(Boolean).join(" ")}
            </h2>
            <Badge variant={ESTADO_BADGE[alumno.estado]}>{ESTADO_LABEL[alumno.estado]}</Badge>
          </div>
          {alumno.cedulaEscolar && (
            <p className="text-sm text-muted-foreground">Cédula Escolar: {alumno.cedulaEscolar}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Reinscribir alumnoId={alumno.id} grados={grados} anos={anos} anosInscritos={anosInscritos} />
          <CambiarEstado alumnoId={alumno.id} estadoActual={alumno.estado} />
        </div>
      </div>

      {/* Inscripción actual */}
      {inscripcionActual && (
        <Card>
          <CardHeader><CardTitle className="text-base">Inscripción Actual</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
              <div><span className="text-muted-foreground">Año Escolar</span><p className="font-medium">{inscripcionActual.anoEscolar.nombre}</p></div>
              <div><span className="text-muted-foreground">Grado</span><p className="font-medium">{inscripcionActual.grado.nombre}</p></div>
              <div><span className="text-muted-foreground">Sección</span><p className="font-medium">{inscripcionActual.seccion?.nombre ?? "—"}</p></div>
              <div><span className="text-muted-foreground">Fecha Inscripción</span><p className="font-medium">{formatFecha(inscripcionActual.fechaInscripcion)}</p></div>
            </div>
            {(inscripcionActual.descuentoMontoUsd || inscripcionActual.servicios.length > 0) && (
              <>
                <Separator className="my-3" />
                <div className="flex flex-wrap gap-4 text-sm">
                  {inscripcionActual.descuentoMontoUsd && (
                    <div>
                      <span className="text-muted-foreground">Descuento</span>
                      <p className="font-medium text-green-700">${Number(inscripcionActual.descuentoMontoUsd).toFixed(2)}</p>
                      {inscripcionActual.descuentoObservacion && (
                        <p className="text-xs text-muted-foreground">{inscripcionActual.descuentoObservacion}</p>
                      )}
                    </div>
                  )}
                  {inscripcionActual.servicios.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">Servicios</span>
                      <div className="flex gap-1 mt-1">
                        {inscripcionActual.servicios.map((s: { id: string; tipo: string }) => (
                          <Badge key={s.id} variant="secondary">{TIPO_SERVICIO_LABELS[s.tipo]}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Datos personales */}
      <Card>
        <CardHeader><CardTitle className="text-base">Datos Personales</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-sm">
            <div><dt className="text-muted-foreground">Fecha de nacimiento</dt><dd>{formatFecha(alumno.fechaNacimiento)} ({edad} años)</dd></div>
            <div><dt className="text-muted-foreground">Sexo</dt><dd>{alumno.sexo === "M" ? "Masculino" : "Femenino"}</dd></div>
            <div><dt className="text-muted-foreground">Municipio</dt><dd>{alumno.municipioNacimiento ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Estado</dt><dd>{alumno.estadoNacimiento ?? "—"}</dd></div>
            <div className="col-span-2"><dt className="text-muted-foreground">Domicilio</dt><dd>{alumno.domicilio ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Teléfono hogar</dt><dd>{alumno.telefonoHogar ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Procedencia</dt><dd>{PROCEDENCIA_LABELS[alumno.procedencia]}</dd></div>
            {alumno.nombrePlantelOrigen && <div><dt className="text-muted-foreground">Plantel anterior</dt><dd>{alumno.nombrePlantelOrigen}</dd></div>}
          </dl>
        </CardContent>
      </Card>

      {/* Representantes */}
      {alumno.representantes.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Representantes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {alumno.representantes.map((rep: (typeof alumno.representantes)[number]) => (
              <div key={rep.id}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {rep.tipo === "MADRE" ? "Madre" : rep.tipo === "PADRE" ? "Padre" : "Tutor"}
                </p>
                <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 text-sm">
                  <div className="col-span-2"><dt className="text-muted-foreground">Nombre</dt><dd className="font-medium">{rep.apellidosNombres}</dd></div>
                  <div><dt className="text-muted-foreground">C.I.</dt><dd>{rep.cedula ?? "—"}</dd></div>
                  <div><dt className="text-muted-foreground">Fecha de nacimiento</dt><dd>{rep.fechaNacimiento ? formatFecha(rep.fechaNacimiento) : "—"}</dd></div>
                  <div><dt className="text-muted-foreground">Edad</dt><dd>{rep.fechaNacimiento ? `${calcularEdad(new Date(rep.fechaNacimiento))} años` : "—"}</dd></div>
                  <div><dt className="text-muted-foreground">Teléfono celular</dt><dd>{rep.telefonoCelular ?? "—"}</dd></div>
                  <div><dt className="text-muted-foreground">Teléfono habitación</dt><dd>{rep.telefonoHab ?? "—"}</dd></div>
                  <div><dt className="text-muted-foreground">Ocupación</dt><dd>{rep.ocupacion ?? "—"}</dd></div>
                  {rep.email && <div><dt className="text-muted-foreground">Correo</dt><dd>{rep.email}</dd></div>}
                </dl>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Autorizados */}
      {alumno.autorizadosRetiro.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Autorizados para Retiro</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {alumno.autorizadosRetiro.map((a: (typeof alumno.autorizadosRetiro)[number]) => (
                <div key={a.id} className="flex items-center gap-2 text-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-medium">{a.orden}</span>
                  <div>
                    <p className="font-medium">{a.nombre}</p>
                    {a.cedula && <p className="text-muted-foreground text-xs">C.I. {a.cedula}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Salud */}
      {alumno.saludAlumno && (
        <Card>
          <CardHeader><CardTitle className="text-base">Antecedentes de Salud</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {alumno.saludAlumno.enfermedadActual && (
              <div><span className="text-muted-foreground">Enfermedad: </span>{alumno.saludAlumno.enfermedadActual}</div>
            )}
            {alumno.saludAlumno.tratamiento && (
              <div><span className="text-muted-foreground">Tratamiento: </span>{alumno.saludAlumno.tratamiento}</div>
            )}
            {alumno.saludAlumno.alergiasMedicamentos && (
              <div><span className="text-muted-foreground">Alergias: </span>{alumno.saludAlumno.alergiasMedicamentos}</div>
            )}
            {alumno.saludAlumno.medicamentoFiebre && (
              <div><span className="text-muted-foreground">Medicamento fiebre: </span>{alumno.saludAlumno.medicamentoFiebre}</div>
            )}
            {alumno.saludAlumno.seguroSaludTelefono && (
              <div><span className="text-muted-foreground">Seguro (teléfono): </span>{alumno.saludAlumno.seguroSaludTelefono}</div>
            )}
            {!alumno.saludAlumno.enfermedadActual && !alumno.saludAlumno.alergiasMedicamentos && (
              <p className="text-muted-foreground">Sin antecedentes de salud registrados.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contactos emergencia */}
      {alumno.contactosEmergencia.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Contactos de Emergencia</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alumno.contactosEmergencia.map((c: (typeof alumno.contactosEmergencia)[number]) => (
                <div key={c.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                  <span>{c.nombre}</span>
                  <span className="text-muted-foreground">{c.telefono ?? "—"}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial de inscripciones */}
      {alumno.inscripciones.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Historial de Inscripciones</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alumno.inscripciones.map((ins: (typeof alumno.inscripciones)[number], i: number) => (
                <div key={ins.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                  <div className="flex items-center gap-2">
                    {i === 0 && <Badge variant="success">Actual</Badge>}
                    <span>{ins.anoEscolar.nombre}</span>
                  </div>
                  <span className="text-muted-foreground">{ins.grado.nombre} {ins.seccion ? `(${ins.seccion.nombre})` : ""}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
