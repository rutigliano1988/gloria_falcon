"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

const SECTION_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  alumnos: "Alumnos",
  mensualidades: "Mensualidades",
  ventas: "Ventas",
  docentes: "Docentes",
  contabilidad: "Contabilidad",
  reportes: "Reportes",
  configuracion: "Configuración",
  admin: "Administración",
};

const SUB_LABELS: Record<string, string> = {
  nuevo: "Nuevo",
  editar: "Editar",
  nomina: "Nómina",
  "nuevo-egreso": "Nuevo egreso",
  importar: "Importar",
  usuarios: "Usuarios",
};

export function Header() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const section = segments[0] ?? "dashboard";
  const sectionTitle = SECTION_TITLES[section] ?? "Sistema de Gestión";
  const subLabel =
    segments.length > 1 ? (SUB_LABELS[segments[1]] ?? "Detalle") : null;

  return (
    <header className="flex h-14 items-center border-b bg-white px-6">
      {subLabel ? (
        <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
          <Link
            href={`/${section}`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {sectionTitle}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-semibold text-foreground">{subLabel}</span>
        </nav>
      ) : (
        <h1 className="text-base font-semibold text-foreground">{sectionTitle}</h1>
      )}
    </header>
  );
}
