"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatFecha } from "@/lib/utils";
import { registrarTasa } from "./actions";
import { useToast } from "@/hooks/use-toast";
import type { TasaCambio } from "@prisma/client";

export function TasaCambioSection({ tasas }: { tasas: TasaCambio[] }) {
  const { toast } = useToast();
  const [tasa, setTasa] = useState("");
  const [loading, setLoading] = useState(false);

  const tasaActual = tasas[0];

  const handleRegistrar = async () => {
    const valor = parseFloat(tasa);
    if (isNaN(valor) || valor <= 0) {
      toast({ title: "Tasa inválida", description: "Ingresa un valor positivo", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await registrarTasa({ tasa: valor });
      toast({ title: "Tasa registrada", description: `Bs ${valor.toFixed(2)} por $1` });
      setTasa("");
    } catch {
      toast({ title: "Error al registrar tasa", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tasa de Cambio BCV</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tasaActual && (
          <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
            <p className="text-sm font-medium text-blue-800">Tasa actual</p>
            <p className="text-2xl font-bold text-blue-900">
              Bs {Number(tasaActual.tasa).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Registrada el {formatFecha(tasaActual.fechaRegistro)}
            </p>
          </div>
        )}

        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label>Nueva tasa (Bs por $1)</Label>
            <Input
              type="number"
              step="0.0001"
              placeholder="Ej: 45.2500"
              value={tasa}
              onChange={(e) => setTasa(e.target.value)}
            />
          </div>
          <Button onClick={handleRegistrar} disabled={loading}>
            {loading ? "Guardando..." : "Registrar"}
          </Button>
        </div>

        {tasas.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Historial reciente</p>
            <div className="space-y-1">
              {tasas.slice(0, 8).map((t) => (
                <div key={t.id} className="flex items-center justify-between text-xs border-b pb-1 last:border-0">
                  <span className="text-muted-foreground">{formatFecha(t.fechaRegistro)}</span>
                  <span className="font-medium">
                    Bs {Number(t.tasa).toLocaleString("es-VE", { minimumFractionDigits: 2 })} / $1
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
