"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { crearCategoriaEgreso, toggleCategoriaEgreso } from "./actions";
import { useToast } from "@/hooks/use-toast";
import type { CategoriaEgreso } from "@prisma/client";

export function CategoriasEgreso({ categorias }: { categorias: CategoriaEgreso[] }) {
  const { toast } = useToast();
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCrear = async () => {
    if (!nombre.trim()) return;
    setLoading(true);
    try {
      await crearCategoriaEgreso(nombre.trim());
      toast({ title: "Categoría creada" });
      setNombre("");
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Categorías de Egresos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Ej: Electricidad"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCrear()}
          />
          <Button size="sm" onClick={handleCrear} disabled={loading}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1">
          {categorias.map((cat) => (
            <div key={cat.id} className={`flex items-center justify-between rounded p-2 text-sm ${cat.activo ? "" : "opacity-50"}`}>
              <span className={cat.activo ? "" : "line-through text-muted-foreground"}>{cat.nombre}</span>
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => toggleCategoriaEgreso(cat.id, !cat.activo)}>
                {cat.activo ? "Desactivar" : "Activar"}
              </Button>
            </div>
          ))}
          {categorias.length === 0 && (
            <p className="text-xs text-muted-foreground">Sin categorías. Agrega las categorías de gastos operativos.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
