import "server-only";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { parseRol, type Rol } from "@/lib/roles";

export type { Rol } from "@/lib/roles";

export type SessionUser = { id: string; email: string; rol: Rol };

/**
 * Usuario autenticado con un rol válido, o null.
 * Un usuario autenticado sin rol válido se trata como no autorizado.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  const rol = parseRol(user.app_metadata);
  if (!rol) return null;

  return { id: user.id, email: user.email ?? "", rol };
}

/**
 * Exige sesión con rol válido. Usar al inicio de CADA server action y de
 * cada lectura de datos: proxy.ts es solo un filtro previo.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Exige uno de los roles indicados. */
export async function requireRole(...roles: Rol[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.rol)) redirect("/dashboard");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  return requireRole("ADMIN");
}

/** Para Route Handlers: devuelve el usuario o una respuesta 401/403. */
export async function authorizeApi(
  ...roles: Rol[]
): Promise<{ user: SessionUser; response?: never } | { user?: never; response: Response }> {
  const user = await getSessionUser();
  if (!user) {
    return { response: Response.json({ error: "No autorizado" }, { status: 401 }) };
  }
  if (roles.length > 0 && !roles.includes(user.rol)) {
    return { response: Response.json({ error: "Prohibido" }, { status: 403 }) };
  }
  return { user };
}
