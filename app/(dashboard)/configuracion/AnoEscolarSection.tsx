"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, CheckCircle } from "lucide-react";
import { formatFecha, parsePrismaError } from "@/lib/utils";
import { crearAnoEscolar, activarAnoEscolar } from "./actions";
import { useToast } from "@/hooks/use-toast";
import type { AnoEscolar, Lapso } from "@prisma/client";

type AnoConLapsos = AnoEscolar & { lapsos: Lapso[] };

const LAPSOS_DEFAULT = [
  { nombre: "1er Lapso", fechaInicio: "", fechaFin: "" },
  { nombre: "2do Lapso", fechaInicio: "", fechaFin: "" },
  { nombre: "3er Lapso", fechaInicio: "", fechaFin: "" },
];

export function AnoEscolarSection({ anos }: { anos: AnoConLapsos[] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nombre, setNombre] = useState("");
  const [lapsos, setLapsos] = useState(LAPSOS_DEFAULT);

  const handleCreate = async () => {
    if (!nombre || lapsos.some((l) => !l.fechaInicio || !l.fechaFin)) {
      toast({ title: "Faltan datos", description: "Completa el nombre y todas las fechas", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await crearAnoEscolar({ nombre, lapsos });
      toast({ title: "Año escolar creado", variant: "default" });
      setOpen(false);
      setNombre("");
      setLapsos(LAPSOS_DEFAULT);
    } catch (e: unknown) {
      toast({ title: "Error", description: parsePrismaError(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleActivar = async (id: string) => {
    await activarAnoEscolar(id);
    toast({ title: "Año escolar activado" });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Años Escolares</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Nuevo año
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Crear Año Escolar</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>Nombre (ej. 2026-2027)</Label>
                <Input
                  placeholder="2026-2027"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Lapsos</p>
                {lapsos.map((lapso, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2 items-end">
                    <div>
                      <Label className="text-xs">{lapso.nombre}</Label>
                      <Input
                        readOnly
                        value={lapso.nombre}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Inicio</Label>
                      <Input
                        type="date"
                        value={lapso.fechaInicio}
                        onChange={(e) => {
                          const copy = [...lapsos];
                          copy[i] = { ...copy[i], fechaInicio: e.target.value };
                          setLapsos(copy);
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Fin</Label>
                      <Input
                        type="date"
                        value={lapso.fechaFin}
                        onChange={(e) => {
                          const copy = [...lapsos];
                          copy[i] = { ...copy[i], fechaFin: e.target.value };
                          setLapsos(copy);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={handleCreate} disabled={loading} className="w-full">
                {loading ? "Guardando..." : "Crear año escolar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {anos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay años escolares registrados.</p>
        ) : (
          <div className="space-y-3">
            {anos.map((ano) => (
              <div key={ano.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{ano.nombre}</span>
                    {ano.activo && <Badge variant="success">Activo</Badge>}
                  </div>
                  <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                    {ano.lapsos.map((l) => (
                      <span key={l.id}>
                        {l.nombre}: {formatFecha(l.fechaInicio)} — {formatFecha(l.fechaFin)}
                      </span>
                    ))}
                  </div>
                </div>
                {!ano.activo && (
                  <Button variant="outline" size="sm" onClick={() => handleActivar(ano.id)}>
                    <CheckCircle className="mr-1 h-3.5 w-3.5" /> Activar
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
