"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Search } from "lucide-react";

interface Props {
  defaultQ?: string;
  defaultEstado?: string;
}

export function AlumnosSearch({ defaultQ = "", defaultEstado = "" }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(defaultQ);
  const [estado, setEstado] = useState(defaultEstado);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigate = (newQ: string, newEstado: string) => {
    const params = new URLSearchParams();
    if (newQ) params.set("q", newQ);
    if (newEstado) params.set("estado", newEstado);
    const qs = params.toString();
    router.push(`/alumnos${qs ? "?" + qs : ""}`);
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQ(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => navigate(val, estado), 350);
  };

  const handleEstadoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setEstado(val);
    navigate(q, val);
  };

  return (
    <form
      className="flex flex-1 items-center gap-2"
      onSubmit={(e) => { e.preventDefault(); navigate(q, estado); }}
    >
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={handleQueryChange}
          placeholder="Buscar por nombre o cédula..."
          className="flex h-9 w-full rounded-md border border-input bg-white pl-8 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      <select
        value={estado}
        onChange={handleEstadoChange}
        className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="">Todos los estados</option>
        <option value="ACTIVO">Activos</option>
        <option value="RETIRADO">Retirados</option>
        <option value="EGRESADO">Egresados</option>
      </select>
    </form>
  );
}
