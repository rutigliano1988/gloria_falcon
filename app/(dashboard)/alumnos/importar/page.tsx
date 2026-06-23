import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportarForm } from "./ImportarForm";

export default function ImportarAlumnosPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/alumnos">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Importar Alumnos</h1>
          <p className="text-sm text-gray-500">
            Carga múltiples alumnos desde un archivo CSV
          </p>
        </div>
      </div>

      <ImportarForm />
    </div>
  );
}
