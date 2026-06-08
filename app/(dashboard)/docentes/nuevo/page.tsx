import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocenteForm } from "./DocenteForm";

export default function NuevoDocentePage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/docentes">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Nuevo Docente</h1>
      </div>
      <DocenteForm />
    </div>
  );
}
