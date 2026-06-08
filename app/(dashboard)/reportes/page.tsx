import { getAlumnosActivos } from "./actions";
import { ReportesCliente } from "./ReportesCliente";

export const dynamic = "force-dynamic";

export default async function ReportesPage() {
  const alumnos = await getAlumnosActivos();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Reportes y PDFs</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Genera reportes en PDF para consulta e impresión
        </p>
      </div>

      <ReportesCliente alumnos={alumnos} />
    </div>
  );
}
