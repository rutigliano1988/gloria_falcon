import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDocenteById } from "../../actions";
import { DocenteForm } from "../../nuevo/DocenteForm";

export default async function EditarDocentePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const docente = await getDocenteById(id);
  if (!docente) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href={`/docentes/${id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Editar Docente</h1>
      </div>
      <DocenteForm docente={docente} />
    </div>
  );
}
