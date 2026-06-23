"use client";

import { useState, useTransition } from "react";
import { aprobarSolicitud, rechazarSolicitud } from "../actions";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

interface Props {
  id: string;
  anos: { id: string; nombre: string }[];
  grados: { id: string; nombre: string }[];
  secciones: { id: string; nombre: string; gradoId: string }[];
  canApprove: boolean;
}

export function ReviewForm({ id, anos, grados, secciones, canApprove }: Props) {
  const [isPending, startTransition] = useTransition();
  const [anoId, setAnoId] = useState("");
  const [gradoId, setGradoId] = useState("");
  const [seccionId, setSeccionId] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState("");
  const [action, setAction] = useState<"aprobar" | "rechazar" | null>(null);

  const seccionesDelGrado = secciones.filter((s) => s.gradoId === gradoId);

  const handleAprobar = () => {
    if (!anoId || !gradoId) {
      setError("Debe seleccionar Año Escolar y Grado para aprobar.");
      return;
    }
    setError("");
    setAction("aprobar");
    startTransition(async () => {
      try {
        await aprobarSolicitud(id, { anoEscolarId: anoId, gradoId, seccionId: seccionId || undefined, observaciones });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al aprobar la solicitud");
        setAction(null);
      }
    });
  };

  const handleRechazar = () => {
    setAction("rechazar");
    startTransition(async () => {
      await rechazarSolicitud(id, observaciones);
    });
  };

  if (!canApprove) {
    return (
      <p className="text-sm text-muted-foreground">
        Solo los administradores pueden aprobar o rechazar solicitudes.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Año Escolar *</label>
          <select
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={anoId} onChange={(e) => setAnoId(e.target.value)}
          >
            <option value="">Seleccionar...</option>
            {anos.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Grado *</label>
          <select
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={gradoId} onChange={(e) => { setGradoId(e.target.value); setSeccionId(""); }}
          >
            <option value="">Seleccionar...</option>
            {grados.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sección</label>
          <select
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={seccionId} onChange={(e) => setSeccionId(e.target.value)}
            disabled={!gradoId}
          >
            <option value="">Sin sección</option>
            {seccionesDelGrado.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
        <textarea
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={2} value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder="Notas internas (opcionales)" />
      </div>

      <div className="flex gap-3 flex-wrap">
        <Button
          onClick={handleAprobar}
          disabled={isPending}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle2 className="mr-1.5 h-4 w-4" />
          {isPending && action === "aprobar" ? "Aprobando..." : "Aprobar e inscribir"}
        </Button>
        <Button
          variant="outline"
          onClick={handleRechazar}
          disabled={isPending}
          className="border-red-300 text-red-600 hover:bg-red-50"
        >
          <XCircle className="mr-1.5 h-4 w-4" />
          {isPending && action === "rechazar" ? "Rechazando..." : "Rechazar"}
        </Button>
      </div>
    </div>
  );
}
