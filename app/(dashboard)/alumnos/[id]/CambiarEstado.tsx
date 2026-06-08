"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cambiarEstadoAlumno } from "../actions";
import { useToast } from "@/hooks/use-toast";

type Estado = "ACTIVO" | "RETIRADO" | "EGRESADO";

export function CambiarEstado({ alumnoId, estadoActual }: { alumnoId: string; estadoActual: string }) {
  const { toast } = useToast();
  const [estado, setEstado] = useState<Estado>(estadoActual as Estado);
  const [loading, setLoading] = useState(false);

  if (estado === estadoActual && !loading) {
    return (
      <div className="flex items-center gap-2">
        <Select value={estado} onValueChange={(v) => setEstado(v as Estado)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVO">Activo</SelectItem>
            <SelectItem value="RETIRADO">Retirado</SelectItem>
            <SelectItem value="EGRESADO">Egresado</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={estado} onValueChange={(v) => setEstado(v as Estado)}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ACTIVO">Activo</SelectItem>
          <SelectItem value="RETIRADO">Retirado</SelectItem>
          <SelectItem value="EGRESADO">Egresado</SelectItem>
        </SelectContent>
      </Select>
      <Button
        size="sm"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          try {
            await cambiarEstadoAlumno(alumnoId, estado);
            toast({ title: "Estado actualizado" });
          } catch {
            toast({ title: "Error al actualizar", variant: "destructive" });
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? "..." : "Guardar"}
      </Button>
    </div>
  );
}
