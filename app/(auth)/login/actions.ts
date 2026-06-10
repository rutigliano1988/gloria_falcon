"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function traducirError(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (m.includes("invalid login credentials") || m.includes("invalid credentials"))
    return "Correo o contraseña incorrectos.";
  if (m.includes("email not confirmed"))
    return "El correo no ha sido confirmado. Revise su bandeja de entrada.";
  if (m.includes("too many requests") || m.includes("rate limit"))
    return "Demasiados intentos fallidos. Espere unos minutos e intente de nuevo.";
  if (m.includes("user not found"))
    return "No existe una cuenta con ese correo.";
  if (m.includes("signup is disabled"))
    return "El registro de nuevas cuentas está desactivado.";
  return "Error al iniciar sesión. Verifique sus credenciales.";
}

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(traducirError(error.message))}`);
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
