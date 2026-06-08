"use client";

import { usePathname } from "next/navigation";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/alumnos": "Alumnos e Inscripciones",
  "/mensualidades": "Mensualidades y Cobros",
  "/ventas": "Ventas e Ingresos",
  "/docentes": "Docentes y Nómina",
  "/contabilidad": "Contabilidad",
  "/reportes": "Reportes",
  "/configuracion": "Configuración",
};

export function Header() {
  const pathname = usePathname();
  const segment = "/" + pathname.split("/")[1];
  const title = titles[segment] ?? "Sistema de Gestión";

  return (
    <header className="flex h-14 items-center border-b bg-white px-6">
      <h1 className="text-base font-semibold text-foreground">{title}</h1>
    </header>
  );
}
