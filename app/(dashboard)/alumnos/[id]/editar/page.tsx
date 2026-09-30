import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAlumnoById } from "../../actions";
import { EditarAlumnoForm, type FichaEdicion } from "./EditarAlumnoForm";

const fechaIso = (f: Date | null) => (f ? f.toISOString().slice(0, 10) : "");

export default async function EditarAlumnoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const alumno = await getAlumnoById(id);
  if (!alumno) notFound();

  const s = alumno.saludAlumno;
  const ficha: FichaEdicion = {
    id: alumno.id,
    datos: {
      primerApellido: alumno.primerApellido,
      segundoApellido: alumno.segundoApellido ?? "",
      primerNombre: alumno.primerNombre,
      segundoNombre: alumno.segundoNombre ?? "",
      cedulaEscolar: alumno.cedulaEscolar ?? "",
      municipioNacimiento: alumno.municipioNacimiento ?? "",
      estadoNacimiento: alumno.estadoNacimiento ?? "",
      sexo: alumno.sexo,
      fechaNacimiento: fechaIso(alumno.fechaNacimiento),
      domicilio: alumno.domicilio ?? "",
      telefonoHogar: alumno.telefonoHogar ?? "",
      procedencia: alumno.procedencia,
      nombrePlantelOrigen: alumno.nombrePlantelOrigen ?? "",
    },
    salud: {
      enfermedadActual: s?.enfermedadActual ?? "",
      tratamiento: s?.tratamiento ?? "",
      alergiasMedicamentos: s?.alergiasMedicamentos ?? "",
      medicamentoFiebre: s?.medicamentoFiebre ?? "",
      seguroSaludTelefono: s?.seguroSaludTelefono ?? "",
    },
    representantes: alumno.representantes.map((r) => ({
      id: r.id,
      clave: r.id,
      tipo: r.tipo,
      apellidosNombres: r.apellidosNombres,
      fechaNacimiento: fechaIso(r.fechaNacimiento),
      cedula: r.cedula ?? "",
      telefonoHab: r.telefonoHab ?? "",
      telefonoCelular: r.telefonoCelular ?? "",
      ocupacion: r.ocupacion ?? "",
      telefonoOficina: r.telefonoOficina ?? "",
      email: r.email ?? "",
    })),
    autorizados: alumno.autorizadosRetiro.map((a) => ({ nombre: a.nombre, cedula: a.cedula ?? "" })),
    contactos: alumno.contactosEmergencia.map((c) => ({ nombre: c.nombre, telefono: c.telefono ?? "" })),
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/alumnos/${alumno.id}`}>
          <Button variant="outline" size="sm"><ArrowLeft className="mr-1 h-4 w-4" /> Volver</Button>
        </Link>
        <div>
          <h2 className="text-lg font-semibold">Editar datos del alumno</h2>
          <p className="text-sm text-muted-foreground">
            Corrige los datos personales, de los representantes y de salud. Los datos de inscripción se gestionan desde la ficha.
          </p>
        </div>
      </div>
      <EditarAlumnoForm ficha={ficha} />
    </div>
  );
}
