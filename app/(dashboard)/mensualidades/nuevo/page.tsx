import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPagoFormData } from "../actions";
import { RegistrarPagoForm } from "./RegistrarPagoForm";

export default async function NuevoPagoPage({
  searchParams,
}: {
  searchParams: Promise<{ alumnoId?: string }>;
}) {
  const { alumnoId } = await searchParams;
  const { alumnos, anoActivo, tasaActual, productos } = await getPagoFormData();

  if (!anoActivo) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-amber-800 font-medium mb-1">No hay año escolar activo</p>
          <p className="text-amber-600 text-sm mb-4">
            Configura y activa un año escolar antes de registrar cobros.
          </p>
          <Link href="/configuracion">
            <Button variant="outline">Ir a Configuración</Button>
          </Link>
        </div>
      </div>
    );
  }

  const alumnosInscritos = alumnos.filter((a) => a.inscripciones.length > 0);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/mensualidades">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Registrar Cobro</h1>
          <p className="text-sm text-gray-500">
            Año escolar: {anoActivo.nombre}
            {tasaActual ? ` · Tasa BCV: ${Number(tasaActual.tasa).toFixed(2)} Bs/$` : ""}
          </p>
        </div>
      </div>

      {alumnosInscritos.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500 mb-3">
            No hay alumnos inscritos en el año escolar activo.
          </p>
          <Link href="/alumnos/nuevo">
            <Button variant="outline">Inscribir Alumno</Button>
          </Link>
        </div>
      ) : (
        <RegistrarPagoForm
          alumnos={alumnosInscritos}
          anoActivo={anoActivo}
          tasaActual={tasaActual}
          productos={productos}
          alumnoIdInicial={alumnoId}
        />
      )}
    </div>
  );
}
