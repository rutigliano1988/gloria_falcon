import { getGradosYAnosActivos } from "../actions";
import { FichaAlumnoForm } from "./FichaAlumnoForm";

export default async function NuevoAlumnoPage() {
  const { grados, anos } = await getGradosYAnosActivos();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Nueva Inscripción</h2>
        <p className="text-sm text-muted-foreground">
          Completa la ficha del alumno y los datos de inscripción.
        </p>
      </div>

      {grados.length === 0 || anos.length === 0 ? (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          <strong>Atención:</strong> Antes de inscribir alumnos debes configurar{" "}
          {grados.length === 0 ? "los grados" : ""}{" "}
          {grados.length === 0 && anos.length === 0 ? "y " : ""}
          {anos.length === 0 ? "un año escolar" : ""} en{" "}
          <a href="/configuracion" className="underline font-medium">Configuración</a>.
        </div>
      ) : (
        <FichaAlumnoForm grados={grados} anos={anos} />
      )}
    </div>
  );
}
