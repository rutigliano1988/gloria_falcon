import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getNominaFormData } from "../../actions";
import { NominaForm } from "./NominaForm";

export default async function NuevaNominaPage({
  searchParams,
}: {
  searchParams: Promise<{ docenteId?: string }>;
}) {
  const { docenteId } = await searchParams;
  const { docentes, tasaActual } = await getNominaFormData();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href={docenteId ? `/docentes/${docenteId}` : "/docentes"}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Registrar Pago de Nómina</h1>
          {tasaActual && (
            <p className="text-sm text-gray-500">
              Tasa BCV actual: {Number(tasaActual.tasa).toFixed(2)} Bs/$1
            </p>
          )}
        </div>
      </div>

      {docentes.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-amber-800 font-medium mb-3">No hay docentes activos registrados</p>
          <Link href="/docentes/nuevo">
            <Button variant="outline">Registrar Docente</Button>
          </Link>
        </div>
      ) : (
        <NominaForm
          docentes={docentes}
          tasaActual={tasaActual}
          docenteIdInicial={docenteId}
        />
      )}
    </div>
  );
}
