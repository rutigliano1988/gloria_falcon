"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil } from "lucide-react";
import { formatUSD } from "@/lib/utils";
import { crearProducto, actualizarProducto, toggleProducto } from "./actions";
import { useToast } from "@/hooks/use-toast";
import type { Producto } from "@prisma/client";

export function ProductosSection({ productos }: { productos: Producto[] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nombre: "", precioUsd: "" });

  const handleSubmit = async () => {
    const precio = parseFloat(form.precioUsd);
    if (!form.nombre || isNaN(precio) || precio <= 0) {
      toast({ title: "Datos inválidos", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (editando) {
        await actualizarProducto(editando.id, { nombre: form.nombre, precioUsd: precio });
        toast({ title: "Producto actualizado" });
      } else {
        await crearProducto({ nombre: form.nombre, precioUsd: precio });
        toast({ title: "Producto creado" });
      }
      setOpen(false);
      setEditando(null);
      setForm({ nombre: "", precioUsd: "" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (p: Producto) => {
    setEditando(p);
    setForm({ nombre: p.nombre, precioUsd: String(Number(p.precioUsd)) });
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Productos y Precios</CardTitle>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditando(null); setForm({ nombre: "", precioUsd: "" }); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Producto</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editando ? "Editar producto" : "Nuevo producto"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label>Nombre del producto</Label>
                <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div>
                <Label>Precio en USD ($)</Label>
                <Input type="number" step="0.01" value={form.precioUsd} onChange={(e) => setForm({ ...form, precioUsd: e.target.value })} />
              </div>
              <Button onClick={handleSubmit} disabled={loading} className="w-full">
                {loading ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {productos.map((p) => (
            <div key={p.id} className={`flex items-center justify-between rounded p-2 text-sm ${p.activo ? "" : "opacity-50"}`}>
              <span className={p.activo ? "" : "line-through text-muted-foreground"}>{p.nombre}</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-green-700">{formatUSD(Number(p.precioUsd))}</span>
                <button onClick={() => openEdit(p)} className="text-muted-foreground hover:text-foreground">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => toggleProducto(p.id, !p.activo)}>
                  {p.activo ? "Ocultar" : "Activar"}
                </Button>
              </div>
            </div>
          ))}
          {productos.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay productos registrados.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
