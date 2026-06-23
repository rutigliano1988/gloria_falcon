"use client";

import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cambiarEstadoAlumno } from "../actions";
import { useToast } from "@/hooks/use-toast";

type Estado = "ACTIVO" | "RETIRADO" | "EGRESADO";

const ESTADO_LABELS: Record<Estado, string> = {
  ACTIVO: "Activo",
  RETIRADO: "Retirado",
  EGRESADO: "Egresado",
};

export function CambiarEstado({
  alumnoId,
  estadoActual,
}: {
  alumnoId: string;
  estadoActual: string;
}) {
  const { toast } = useToast();
  const [estado, setEstado] = useState<Estado>(estadoActual as Estado);
  const [loading, setLoading] = useState(false);

  const hasChanged = estado !== estadoActual;
  const esDestructivo = estado === "RETIRADO" || estado === "EGRESADO";

  const handleGuardar = async () => {
    setLoading(true);
    try {
      await cambiarEstadoAlumno(alumnoId, estado);
      toast({ title: "Estado actualizado" });
    } catch {
      toast({ title: "Error al actualizar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={estado} onValueChange={(v) => setEstado(v as Estado)} disabled={loading}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ACTIVO">Activo</SelectItem>
          <SelectItem value="RETIRADO">Retirado</SelectItem>
          <SelectItem value="EGRESADO">Egresado</SelectItem>
        </SelectContent>
      </Select>

      {loading && (
        <Button size="sm" disabled>
          ...
        </Button>
      )}

      {!loading && hasChanged && (
        esDestructivo ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm">Guardar</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Confirmar cambio de estado?</AlertDialogTitle>
                <AlertDialogDescription>
                  El alumno pasará a{" "}
                  <strong>{ESTADO_LABELS[estado]}</strong>. Esto puede afectar
                  sus inscripciones y cobros activos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className={buttonVariants({ variant: "destructive" })}
                  onClick={handleGuardar}
                >
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button size="sm" onClick={handleGuardar}>
            Guardar
          </Button>
        )
      )}
    </div>
  );
}
