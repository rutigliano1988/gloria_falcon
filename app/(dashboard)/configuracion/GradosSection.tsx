"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { crearGrado, crearSeccion, toggleGrado } from "./actions";
import { useToast } from "@/hooks/use-toast";
import { parsePrismaError } from "@/lib/utils";
import type { Grado, Seccion } from "@prisma/client";

type GradoConSecciones = Grado & { secciones: Seccion[] };

export function GradosSection({ grados }: { grados: GradoConSecciones[] }) {
  const { toast } = useToast();
  const [openGrado, setOpenGrado] = useState(false);
  const [openSeccion, setOpenSeccion] = useState(false);
  const [loading, setLoading] = useState(false);

  const [nuevoGrado, setNuevoGrado] = useState({ nombre: "", nivel: "PRIMARIA", orden: 1 });
  const [nuevaSeccion, setNuevaSeccion] = useState({ nombre: "", gradoId: "" });

  const handleCrearGrado = async () => {
    if (!nuevoGrado.nombre) {
      toast({ title: "El nombre es obligatorio", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await crearGrado({ nombre: nuevoGrado.nombre, nivel: nuevoGrado.nivel as "PREESCOLAR" | "PRIMARIA", orden: nuevoGrado.orden });
      toast({ title: "Grado creado" });
      setOpenGrado(false);
      setNuevoGrado({ nombre: "", nivel: "PRIMARIA", orden: 1 });
    } catch (e: unknown) {
      toast({ title: "Error", description: parsePrismaError(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCrearSeccion = async () => {
    if (!nuevaSeccion.nombre || !nuevaSeccion.gradoId) {
      toast({ title: "Completa todos los campos", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await crearSeccion(nuevaSeccion);
      toast({ title: "Sección creada" });
      setOpenSeccion(false);
      setNuevaSeccion({ nombre: "", gradoId: "" });
    } catch {
      toast({ title: "Error al crear sección", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Grados y Secciones</CardTitle>
        <div className="flex gap-2">
          <Dialog open={openSeccion} onOpenChange={setOpenSeccion}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="mr-1 h-4 w-4" /> Sección
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Agregar Sección</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <div>
                  <Label>Grado</Label>
                  <Select value={nuevaSeccion.gradoId} onValueChange={(v) => setNuevaSeccion({ ...nuevaSeccion, gradoId: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar grado" /></SelectTrigger>
                    <SelectContent>
                      {grados.map((g) => <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nombre de sección (ej. A)</Label>
                  <Input value={nuevaSeccion.nombre} onChange={(e) => setNuevaSeccion({ ...nuevaSeccion, nombre: e.target.value })} />
                </div>
                <Button onClick={handleCrearSeccion} disabled={loading} className="w-full">
                  {loading ? "Guardando..." : "Crear sección"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={openGrado} onOpenChange={setOpenGrado}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> Grado
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Agregar Grado</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <div>
                  <Label>Nombre (ej. 1º Grado)</Label>
                  <Input value={nuevoGrado.nombre} onChange={(e) => setNuevoGrado({ ...nuevoGrado, nombre: e.target.value })} />
                </div>
                <div>
                  <Label>Nivel</Label>
                  <Select value={nuevoGrado.nivel} onValueChange={(v) => setNuevoGrado({ ...nuevoGrado, nivel: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PREESCOLAR">Preescolar</SelectItem>
                      <SelectItem value="PRIMARIA">Primaria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Orden de aparición</Label>
                  <Input type="number" value={nuevoGrado.orden} onChange={(e) => setNuevoGrado({ ...nuevoGrado, orden: Number(e.target.value) })} />
                </div>
                <Button onClick={handleCrearGrado} disabled={loading} className="w-full">
                  {loading ? "Guardando..." : "Crear grado"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {grados.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay grados registrados.</p>
        ) : (
          <div className="space-y-2">
            {grados.map((grado) => (
              <div key={grado.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{grado.nombre}</span>
                    <Badge variant={grado.nivel === "PREESCOLAR" ? "secondary" : "outline"}>
                      {grado.nivel === "PREESCOLAR" ? "Preescolar" : "Primaria"}
                    </Badge>
                    {!grado.activo && <Badge variant="destructive">Inactivo</Badge>}
                  </div>
                  <div className="mt-1 flex gap-1.5 flex-wrap">
                    {grado.secciones.map((s) => (
                      <span key={s.id} className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
                        Sección {s.nombre}
                      </span>
                    ))}
                    {grado.secciones.length === 0 && (
                      <span className="text-xs text-muted-foreground">Sin secciones</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleGrado(grado.id, !grado.activo)}
                >
                  {grado.activo ? "Desactivar" : "Activar"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
