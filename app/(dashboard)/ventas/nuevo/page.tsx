import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getVentaFormData } from "../actions";
import { VentaForm } from "./VentaForm";

export default async function NuevaVentaPage() {
  const { productos, tasaActual } = await getVentaFormData();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/ventas">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Registrar Venta / Ingreso</h1>
          {tasaActual && (
            <p className="text-sm text-gray-500">
              Tasa BCV: {Number(tasaActual.tasa).toFixed(2)} Bs/$1
            </p>
          )}
        </div>
      </div>

      <VentaForm productos={productos} tasaActual={tasaActual} />
    </div>
  );
}
