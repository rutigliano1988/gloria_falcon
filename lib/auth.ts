import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type Rol = "ADMIN" | "SECRETARIA";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Usuarios sin rol explícito se tratan como ADMIN (retrocompatibilidad)
  const rol = (user.app_metadata?.rol ?? "ADMIN") as Rol;

  return {
    id: user.id,
    email: user.email ?? "",
    rol,
  };
}

export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.rol !== "ADMIN") redirect("/dashboard");
  return user;
}
