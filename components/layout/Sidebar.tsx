"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  DollarSign,
  ShoppingCart,
  GraduationCap,
  BookOpen,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/(auth)/login/actions";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/alumnos", label: "Alumnos", icon: Users },
  { href: "/mensualidades", label: "Mensualidades", icon: DollarSign },
  { href: "/ventas", label: "Ventas e Ingresos", icon: ShoppingCart },
  { href: "/docentes", label: "Docentes y Nómina", icon: GraduationCap },
  { href: "/contabilidad", label: "Contabilidad", icon: BookOpen },
  { href: "/reportes", label: "Reportes", icon: FileText },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

interface SidebarProps {
  userEmail: string;
}

export function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))]">
      {/* Logo / Header */}
      <div className="flex flex-col items-center gap-1 border-b border-[hsl(var(--sidebar-border))] px-4 py-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
          <GraduationCap className="h-7 w-7 text-white" />
        </div>
        <span className="text-center text-sm font-semibold leading-tight text-white">
          Colegio Gloria Falcón
        </span>
        <span className="text-xs text-white/50">Administración</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-0.5 px-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-[hsl(var(--sidebar-accent))] text-white"
                      : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-[hsl(var(--sidebar-border))] px-4 py-3 space-y-2">
        {userEmail && (
          <p className="text-xs text-white/60 truncate" title={userEmail}>
            {userEmail}
          </p>
        )}
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-2 text-xs text-white/50 hover:text-white transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Cerrar sesión
          </button>
        </form>
        <p className="text-xs text-white/30">RIF J-00233812-1</p>
      </div>
    </aside>
  );
}
