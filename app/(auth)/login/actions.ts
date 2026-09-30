"use server";

import { createClient } from "@/lib/supabase/server";
import { parseRol } from "@/lib/roles";
import { redirect } from "next/navigation";

// Se redirige con un código, no con texto libre: la página solo muestra
// mensajes fijos (evita inyectar texto arbitrario en el login).
function codigoError(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (m.includes("invalid login credentials") || m.includes("invalid credentials"))
    return "credenciales";
  if (m.includes("email not confirmed")) return "no_confirmado";
  if (m.includes("too many requests") || m.includes("rate limit")) return "limite";
  return "desconocido";
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${codigoError(error.message)}`);
  }

  // Una cuenta sin rol asignado no puede entrar (denegar por defecto).
  if (!parseRol(data.user?.app_metadata)) {
    await supabase.auth.signOut();
    redirect("/login?error=sin_rol");
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
