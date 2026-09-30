// Lógica pura de roles: sin dependencias de servidor para poder usarla
// en proxy.ts, en server actions y en tests.

export const ROLES = ["ADMIN", "SECRETARIA"] as const;
export type Rol = (typeof ROLES)[number];

/**
 * Devuelve el rol del usuario solo si es uno de los roles válidos.
 * Un usuario sin rol (o con un rol desconocido) NO tiene acceso: se deniega
 * por defecto. Antes se trataba como ADMIN, lo que abría el sistema a
 * cualquier cuenta creada fuera del flujo de invitación.
 */
export function parseRol(appMetadata: unknown): Rol | null {
  if (!appMetadata || typeof appMetadata !== "object") return null;
  const rol = (appMetadata as Record<string, unknown>).rol;
  return typeof rol === "string" && (ROLES as readonly string[]).includes(rol)
    ? (rol as Rol)
    : null;
}

/** Rutas reservadas al ADMIN (filtro previo en proxy.ts; la autorización real está en cada acción). */
export const ADMIN_PATHS = ["/configuracion", "/admin", "/docentes/nomina", "/api/nomina"];

export function esRutaAdmin(pathname: string): boolean {
  return ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
