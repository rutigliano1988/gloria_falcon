"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
      <div className="rounded-full bg-red-100 p-4">
        <AlertTriangle className="h-8 w-8 text-red-600" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-gray-900">Ocurrió un error inesperado</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          {error.message || "No se pudo cargar esta sección. Por favor intenta de nuevo."}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground font-mono">Código: {error.digest}</p>
        )}
      </div>
      <Button variant="outline" onClick={unstable_retry}>
        Intentar de nuevo
      </Button>
    </div>
  );
}
