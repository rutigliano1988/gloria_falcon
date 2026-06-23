import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSolicitudDetalle, getGradosYAnos } from "../actions";
import { getSessionUser } from "@/lib/auth";
import { ReviewForm } from "./ReviewForm";
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

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value || "—"}</p>
    </div>
  );
}

export default async function SolicitudDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [solicitud, { grados, anos, secciones }, sessionUser] = await Promise.all([
    getSolicitudDetalle(id),
    getGradosYAnos(),
    getSessionUser(),
  ]);

  if (!solicitud) notFound();

  const reps = Array.isArray(solicitud.representantes)
    ? (solicitud.representantes as Record<string, unknown>[])
    : [];
  const autorizados = Array.isArray(solicitud.autorizados)
    ? (solicitud.autorizados as Record<string, unknown>[])
    : [];
  const contactos = Array.isArray(solicitud.contactosEmergencia)
    ? (solicitud.contactosEmergencia as Record<string, unknown>[])
    : [];
  const salud = solicitud.datosSalud as Record<string, string | null> | null;

  const canApprove = sessionUser?.rol === "ADMIN";
  const canReview = solicitud.estado === "EN_REVISION";

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <Link href="/alumnos/solicitudes">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">
            {solicitud.primerApellido
              ? `${solicitud.primerApellido}${solicitud.segundoApellido ? " " + solicitud.segundoApellido : ""}, ${solicitud.primerNombre}`
              : "Solicitud sin datos"}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant={ESTADO_BADGE[solicitud.estado]}>{ESTADO_LABEL[solicitud.estado]}</Badge>
            <span className="text-xs text-muted-foreground">
              Recibida {formatFecha(new Date(solicitud.creadoEn))}
            </span>
          </div>
        </div>
      </div>

      {/* Datos del estudiante */}
      {solicitud.primerApellido && (
        <div className="rounded-xl border bg-white shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Datos del Estudiante</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Primer Apellido" value={solicitud.primerApellido} />
            <Field label="Segundo Apellido" value={solicitud.segundoApellido} />
            <Field label="Primer Nombre" value={solicitud.primerNombre} />
            <Field label="Segundo Nombre" value={solicitud.segundoNombre} />
            <Field label="Cédula Escolar" value={solicitud.cedulaEscolar} />
            <Field label="Sexo" value={solicitud.sexo === "M" ? "Masculino" : solicitud.sexo === "F" ? "Femenino" : null} />
            <Field label="Fecha de Nacimiento" value={solicitud.fechaNacimiento ? formatFecha(new Date(solicitud.fechaNacimiento)) : null} />
            <Field label="Municipio Nacimiento" value={solicitud.municipioNacimiento} />
            <Field label="Estado Nacimiento" value={solicitud.estadoNacimiento} />
            <Field label="Domicilio" value={solicitud.domicilio} />
            <Field label="Teléfono Hogar" value={solicitud.telefonoHogar} />
            <Field label="Procedencia" value={solicitud.procedencia} />
          </div>
        </div>
      )}

      {/* Representantes */}
      {reps.length > 0 && (
        <div className="rounded-xl border bg-white shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Representantes</h2>
          <div className="space-y-4">
            {reps.map((rep, i) => (
              <div key={i} className="border rounded-lg p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="col-span-full">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {String(rep.tipo)}
                  </span>
                </div>
                <Field label="Apellidos y Nombres" value={String(rep.apellidosNombres ?? "")} />
                <Field label="Cédula" value={rep.cedula as string} />
                <Field label="Celular" value={rep.telefonoCelular as string} />
                <Field label="Hab." value={rep.telefonoHab as string} />
                <Field label="Ocupación" value={rep.ocupacion as string} />
                <Field label="Email" value={rep.email as string} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Autorizados */}
      {autorizados.length > 0 && (
        <div className="rounded-xl border bg-white shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Personas Autorizadas para el Retiro</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {autorizados.map((a, i) => (
              <div key={i} className="flex gap-3">
                <Field label="Nombre" value={String(a.nombre ?? "")} />
                <Field label="Cédula" value={a.cedula as string} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contactos */}
      {contactos.length > 0 && (
        <div className="rounded-xl border bg-white shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Contactos de Emergencia</h2>
          <div className="space-y-2">
            {contactos.map((c, i) => (
              <div key={i} className="flex gap-6">
                <Field label="Nombre" value={String(c.nombre ?? "")} />
                <Field label="Teléfono" value={String(c.telefono ?? "")} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Salud */}
      {salud && (
        <div className="rounded-xl border bg-white shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Antecedentes de Salud</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Enfermedad/Condición" value={salud.enfermedadActual} />
            <Field label="Tratamiento" value={salud.tratamiento} />
            <Field label="Alergias a medicamentos" value={salud.alergiasMedicamentos} />
            <Field label="Medicamento para fiebre" value={salud.medicamentoFiebre} />
            <Field label="Teléfono seguro" value={salud.seguroSaludTelefono} />
          </div>
        </div>
      )}

      {/* Panel de revisión */}
      {canReview && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-1">Completar Inscripción</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Asigne el año escolar y grado para aprobar la inscripción.
          </p>
          <ReviewForm
            id={id}
            anos={anos}
            grados={grados}
            secciones={secciones}
            canApprove={canApprove}
          />
        </div>
      )}

      {/* Si ya fue aprobada */}
      {solicitud.estado === "APROBADA" && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="font-semibold text-green-800">Inscripción aprobada</p>
          {solicitud.anoEscolar && solicitud.grado && (
            <p className="text-sm text-green-700 mt-1">
              {solicitud.anoEscolar.nombre} — {solicitud.grado.nombre}
              {solicitud.seccion ? ` / ${solicitud.seccion.nombre}` : ""}
            </p>
          )}
          {solicitud.observaciones && (
            <p className="text-sm text-green-700 mt-1">{solicitud.observaciones}</p>
          )}
        </div>
      )}

      {solicitud.estado === "RECHAZADA" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="font-semibold text-red-800">Solicitud rechazada</p>
          {solicitud.observaciones && (
            <p className="text-sm text-red-700 mt-1">{solicitud.observaciones}</p>
          )}
        </div>
      )}
    </div>
  );
}
