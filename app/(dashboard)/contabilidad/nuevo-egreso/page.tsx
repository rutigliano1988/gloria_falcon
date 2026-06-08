import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEgresoFormData } from "../actions";
import { EgresoForm } from "./EgresoForm";

export default async function NuevoEgresoPage() {
  const { categorias, tasaActual } = await getEgresoFormData();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/contabilidad">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Registrar Egreso</h1>
          {tasaActual && (
            <p className="text-sm text-gray-500">
              Tasa BCV: {Number(tasaActual.tasa).toFixed(2)} Bs/$1
            </p>
          )}
        </div>
      </div>

      {categorias.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <p className="text-amber-800 font-medium mb-2">
            No hay categorías de egreso configuradas
          </p>
          <p className="text-amber-600 text-sm mb-4">
            Ve a Configuración para crear categorías (Electricidad, Agua, Papelería, etc.)
          </p>
          <Link href="/configuracion">
            <Button variant="outline">Ir a Configuración</Button>
          </Link>
        </div>
      ) : (
        <EgresoForm categorias={categorias} tasaActual={tasaActual} />
      )}
    </div>
  );
}
