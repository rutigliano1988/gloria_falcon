"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { parsePrismaError } from "@/lib/utils";
import { reinscribirAlumno } from "../actions";
import type { Grado, Seccion, AnoEscolar } from "@prisma/client";

type GradoConSecciones = Grado & { secciones: Seccion[] };

const SERVICIOS = [
  { valor: "ALMUERZO", label: "Almuerzo" },
  { valor: "RESGUARDO", label: "Resguardo" },
  { valor: "TAE_KWON_DO", label: "Tae-Kwon-Do" },
] as const;

interface Props {
  alumnoId: string;
  grados: GradoConSecciones[];
  anos: AnoEscolar[];
  anosInscritos: string[];
}

export function Reinscribir({ alumnoId, grados, anos, anosInscritos }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [anoEscolarId, setAnoEscolarId] = useState("");
  const [gradoId, setGradoId] = useState("");
  const [seccionId, setSeccionId] = useState("");
  const [descuento, setDescuento] = useState("");
  const [descuentoObs, setDescuentoObs] = useState("");
  const [servicios, setServicios] = useState<string[]>([]);

  const gradoSeleccionado = grados.find((g) => g.id === gradoId);

  const toggleServicio = (valor: string) =>
    setServicios((prev) =>
      prev.includes(valor) ? prev.filter((s) => s !== valor) : [...prev, valor]
    );

  const reset = () => {
    setAnoEscolarId("");
    setGradoId("");
    setSeccionId("");
    setDescuento("");
    setDescuentoObs("");
    setServicios([]);
  };

  const handleSubmit = async () => {
    if (!anoEscolarId || !gradoId) {
      toast({ title: "Selecciona el año escolar y el grado", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await reinscribirAlumno({
        alumnoId,
        anoEscolarId,
        gradoId,
        seccionId: seccionId || null,
        descuentoMontoUsd: descuento ? parseFloat(descuento) : null,
        descuentoObservacion: descuentoObs || null,
        servicios: servicios as ("ALMUERZO" | "RESGUARDO" | "TAE_KWON_DO")[],
      });
      toast({ title: "Alumno reinscrito exitosamente" });
      setOpen(false);
      reset();
      router.refresh();
    } catch (e: unknown) {
      toast({
        title: "Error al reinscribir",
        description: parsePrismaError(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm">
          Reinscribir
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva Inscripción</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label>Año Escolar *</Label>
            <Select value={anoEscolarId} onValueChange={setAnoEscolarId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {anos.map((a) => (
                  <SelectItem key={a.id} value={a.id} disabled={anosInscritos.includes(a.id)}>
                    {a.nombre}
                    {a.activo ? " (Activo)" : ""}
                    {anosInscritos.includes(a.id) ? " — ya inscrito" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Grado *</Label>
            <Select
              value={gradoId}
              onValueChange={(v) => { setGradoId(v); setSeccionId(""); }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {grados.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Sección</Label>
            <Select
              value={seccionId}
              onValueChange={setSeccionId}
              disabled={!gradoSeleccionado}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sección (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {gradoSeleccionado?.secciones.map((s) => (
                  <SelectItem key={s.id} value={s.id}>Sección {s.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Descuento / Beca ($)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={descuento}
                onChange={(e) => setDescuento(e.target.value)}
              />
            </div>
            <div>
              <Label>Observación del descuento</Label>
              <Input
                placeholder="Motivo..."
                value={descuentoObs}
                onChange={(e) => setDescuentoObs(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Servicios</Label>
            <div className="flex gap-2 mt-1 flex-wrap">
              {SERVICIOS.map((s) => (
                <button
                  key={s.valor}
                  type="button"
                  onClick={() => toggleServicio(s.valor)}
                  className={`rounded-full px-3 py-1 text-sm border transition-colors ${
                    servicios.includes(s.valor)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white border-input hover:bg-gray-50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Inscribiendo..." : "Reinscribir"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
