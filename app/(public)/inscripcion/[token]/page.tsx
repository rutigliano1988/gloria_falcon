import { GraduationCap } from "lucide-react";
import { getSolicitudPorToken } from "./actions";
import { InscripcionForm } from "./InscripcionForm";

const ESTADO_MSG: Record<string, { titulo: string; detalle: string }> = {
  EN_REVISION: {
    titulo: "Formulario ya enviado",
    detalle: "Esta solicitud ya fue completada y está siendo revisada por el personal del colegio.",
  },
  APROBADA: {
    titulo: "Inscripción aprobada",
    detalle: "La inscripción del estudiante fue aprobada. Contacte al colegio para más información.",
  },
  RECHAZADA: {
    titulo: "Solicitud no aprobada",
    detalle: "Esta solicitud no fue aprobada. Contacte al colegio para más información.",
  },
};

export default async function InscripcionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const solicitud = await getSolicitudPorToken(token);

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-xs text-gray-500 leading-none">Formulario de Preinscripción</p>
            <p className="font-bold text-gray-900 leading-tight">Colegio Gloria Falcón</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {!solicitud ? (
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-8 text-center">
            <p className="text-xl font-bold text-gray-900 mb-2">Enlace inválido</p>
            <p className="text-gray-500">Este enlace no existe o ya expiró. Contacte al colegio para obtener uno nuevo.</p>
          </div>
        ) : solicitud.estado !== "PENDIENTE" ? (
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-8 text-center">
            <p className="text-xl font-bold text-gray-900 mb-2">
              {ESTADO_MSG[solicitud.estado]?.titulo ?? "Solicitud procesada"}
            </p>
            <p className="text-gray-500">
              {ESTADO_MSG[solicitud.estado]?.detalle}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Ficha de Preinscripción</h1>
              <p className="text-gray-500 mt-1">
                Complete el formulario con los datos del estudiante. El personal del colegio
                revisará la información y finalizará la inscripción.
              </p>
            </div>
            <InscripcionForm token={token} />
          </>
        )}
      </div>
    </div>
  );
}
