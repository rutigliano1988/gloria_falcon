"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
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
  ShieldCheck,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/(auth)/login/actions";
import type { Rol } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "SECRETARIA"] as Rol[] },
  { href: "/alumnos", label: "Alumnos", icon: Users, roles: ["ADMIN", "SECRETARIA"] as Rol[] },
  { href: "/alumnos/solicitudes", label: "Solicitudes", icon: ClipboardList, roles: ["ADMIN", "SECRETARIA"] as Rol[] },
  { href: "/mensualidades", label: "Mensualidades", icon: DollarSign, roles: ["ADMIN", "SECRETARIA"] as Rol[] },
  { href: "/ventas", label: "Ventas e Ingresos", icon: ShoppingCart, roles: ["ADMIN", "SECRETARIA"] as Rol[] },
  { href: "/docentes", label: "Docentes y Nómina", icon: GraduationCap, roles: ["ADMIN", "SECRETARIA"] as Rol[] },
  { href: "/contabilidad", label: "Contabilidad", icon: BookOpen, roles: ["ADMIN", "SECRETARIA"] as Rol[] },
  { href: "/reportes", label: "Reportes", icon: FileText, roles: ["ADMIN", "SECRETARIA"] as Rol[] },
  { href: "/configuracion", label: "Configuración", icon: Settings, roles: ["ADMIN"] as Rol[] },
  { href: "/admin/usuarios", label: "Usuarios", icon: ShieldCheck, roles: ["ADMIN"] as Rol[] },
];

interface SidebarProps {
  userEmail: string;
  rol: Rol;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ userEmail, rol, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  // Cerrar sidebar al navegar (mobile/tablet)
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      onClose?.();
    }
  }, [pathname, onClose]);

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(rol));

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-shrink-0 flex-col bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))]",
        // Mobile/tablet: fixed overlay con animación
        "fixed inset-y-0 left-0 z-30 transition-transform duration-300 ease-in-out",
        // Desktop: siempre visible, en el flujo flex
        "lg:relative lg:translate-x-0 lg:z-auto",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Logo */}
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
          {visibleItems.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/alumnos"
                ? pathname === "/alumnos" ||
                  (pathname.startsWith("/alumnos/") && !pathname.startsWith("/alumnos/solicitudes"))
                : pathname === href || pathname.startsWith(href + "/");
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
