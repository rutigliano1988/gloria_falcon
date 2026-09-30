import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { esRutaAdmin, parseRol } from "@/lib/roles";

// Filtro previo (optimista). La autorización real se hace dentro de cada
// server action y route handler con lib/auth.ts.

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/^﻿/, "");
  const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").replace(/^﻿/, "");

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() verifica con el servidor de Supabase — más seguro que getSession()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname.startsWith("/login");
  const isPublic = isLoginPage || pathname.startsWith("/inscripcion/");
  // Denegar por defecto: una sesión sin rol válido no da acceso a nada.
  const rol = user ? parseRol(user.app_metadata) : null;

  if (!rol) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autorizado" }, { status: user ? 403 : 401 });
    }
    if (isPublic) return supabaseResponse;
    const url = new URL("/login", request.url);
    if (user) url.searchParams.set("error", "sin_rol");
    return NextResponse.redirect(url);
  }

  if (isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (esRutaAdmin(pathname) && rol !== "ADMIN") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Prohibido" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|logo\\.jpg|logo\\.png).*)",
  ],
};
