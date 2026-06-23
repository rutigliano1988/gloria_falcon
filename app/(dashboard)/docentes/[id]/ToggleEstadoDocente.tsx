"use client";

import { useState } from "react";
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
import { buttonVariants } from "@/components/ui/button";
import { toggleEstadoDocente } from "../actions";
import { useToast } from "@/hooks/use-toast";

interface Props {
  docenteId: string;
  estadoActual: "ACTIVO" | "INACTIVO";
  nombre: string;
}

export function ToggleEstadoDocente({ docenteId, estadoActual, nombre }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    const nuevoEstado = estadoActual === "ACTIVO" ? "INACTIVO" : "ACTIVO";
    setLoading(true);
    try {
      await toggleEstadoDocente(docenteId, nuevoEstado);
      toast({
        title:
          estadoActual === "ACTIVO"
            ? "Docente marcado como inactivo"
            : "Docente reactivado",
      });
    } catch {
      toast({ title: "Error al actualizar estado", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (estadoActual === "INACTIVO") {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={handleToggle}
        className="text-xs px-3 py-1.5 rounded-md border border-green-200 text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
      >
        {loading ? "..." : "Reactivar Docente"}
      </button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {loading ? "..." : "Marcar como Inactivo"}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Marcar docente como inactivo?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{nombre}</strong> dejará de aparecer en el listado activo y no podrá
            recibir pagos de nómina. Puedes reactivarlo en cualquier momento.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: "destructive" })}
            onClick={handleToggle}
          >
            Marcar como inactivo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
