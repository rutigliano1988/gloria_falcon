"use client";

import { useRef } from "react";
import { Search } from "lucide-react";

interface Props {
  defaultQ?: string;
  defaultEstado?: string;
}

export function AlumnosSearch({ defaultQ = "", defaultEstado = "" }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => formRef.current?.submit(), 350);
  };

  return (
    <form
      ref={formRef}
      method="GET"
      action="/alumnos"
      className="flex flex-1 items-center gap-2"
    >
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          name="q"
          defaultValue={defaultQ}
          onChange={handleQueryChange}
          placeholder="Buscar por nombre o cédula..."
          className="flex h-9 w-full rounded-md border border-input bg-white pl-8 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      <select
        name="estado"
        defaultValue={defaultEstado}
        onChange={() => formRef.current?.submit()}
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
