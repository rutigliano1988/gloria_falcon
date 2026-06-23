import { prisma } from "@/lib/prisma";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export async function TasaStaleAlert() {
  const ultimaTasa = await prisma.tasaCambio.findFirst({
    orderBy: { fechaRegistro: "desc" },
    select: { fechaRegistro: true },
  });

  if (!ultimaTasa) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600" />
        <span>
          No hay tasa de cambio registrada.{" "}
          <Link
            href="/configuracion"
            className="font-medium underline underline-offset-2 hover:text-amber-900"
          >
            Registrar ahora →
          </Link>
        </span>
      </div>
    );
  }

  const diasSinActualizar = Math.floor(
    (Date.now() - new Date(ultimaTasa.fechaRegistro).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diasSinActualizar < 3) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600" />
      <span>
        La tasa de cambio tiene{" "}
        <strong>
          {diasSinActualizar} {diasSinActualizar === 1 ? "día" : "días"}
        </strong>{" "}
        sin actualizar.{" "}
        <Link
          href="/configuracion"
          className="font-medium underline underline-offset-2 hover:text-amber-900"
        >
          Actualizar ahora →
        </Link>
      </span>
    </div>
  );
}
