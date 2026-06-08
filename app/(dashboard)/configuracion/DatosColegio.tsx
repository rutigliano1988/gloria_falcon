"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { guardarConfigColegio } from "./actions";
import { useToast } from "@/hooks/use-toast";

const DEFAULTS = {
  nombre: "Unidad Educativa Colegio \"Gloria Falcón\"",
  rif: "J-00233812-1",
  direccion: "Av. París Qta. María Teresa Nº 10-06, California Norte",
  telefonos: "(0212) 272.22.97 / 271.95.09 / (0424) 160.44.94",
  correo: "colegiogloriafalcon@gmail.com",
};

type ConfigColegio = {
  clave: string;
  valor: unknown;
} | null;

export function DatosColegio({ config }: { config: ConfigColegio }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const saved = config?.valor as typeof DEFAULTS | undefined;
  const [form, setForm] = useState(saved ?? DEFAULTS);

  const handleGuardar = async () => {
    setLoading(true);
    try {
      await guardarConfigColegio(form);
      toast({ title: "Datos del colegio guardados" });
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Datos del Colegio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Nombre completo</Label>
          <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </div>
        <div>
          <Label>RIF</Label>
          <Input value={form.rif} onChange={(e) => setForm({ ...form, rif: e.target.value })} />
        </div>
        <div>
          <Label>Dirección</Label>
          <Textarea rows={2} value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
        </div>
        <div>
          <Label>Teléfonos</Label>
          <Input value={form.telefonos} onChange={(e) => setForm({ ...form, telefonos: e.target.value })} />
        </div>
        <div>
          <Label>Correo electrónico</Label>
          <Input value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} />
        </div>
        <Button onClick={handleGuardar} disabled={loading} className="w-full">
          {loading ? "Guardando..." : "Guardar datos"}
        </Button>
      </CardContent>
    </Card>
  );
}
