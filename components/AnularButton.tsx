"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

/**
 * Anulación con motivo obligatorio. `accion` es una server action ya ligada al
 * registro (p. ej. anularPago.bind(null, id)); la autorización se valida en el servidor.
 */
export function AnularButton({
  accion,
  descripcion,
}: {
  accion: (motivo: string) => Promise<{ ok: boolean; error?: string }>;
  descripcion: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [isPending, startTransition] = useTransition();

  const confirmar = () => {
    startTransition(async () => {
      try {
        const r = await accion(motivo);
        if (!r.ok) {
          toast({ title: "No se pudo anular", description: r.error, variant: "destructive" });
          return;
        }
        toast({ title: "Registro anulado" });
        setOpen(false);
        router.refresh();
      } catch {
        toast({ title: "No se pudo anular", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50">
          Anular
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Anular {descripcion}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          El registro no se borra: queda marcado como anulado, sale de los totales y
          conserva su número. Esta acción queda registrada en la auditoría.
        </p>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          maxLength={300}
          placeholder="Motivo de la anulación (obligatorio)"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={confirmar} disabled={isPending || motivo.trim().length < 5}>
            {isPending ? "Anulando..." : "Confirmar anulación"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
