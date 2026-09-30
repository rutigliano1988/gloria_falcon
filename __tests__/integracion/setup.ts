// Utilidades para tests de integración contra un Postgres real.
// Se ejecutan solo si TEST_DATABASE_URL está definida (p. ej. en CI con un
// servicio postgres y `prisma migrate deploy`). NUNCA apuntar a producción.
import { vi } from "vitest";

export const TEST_DB = process.env.TEST_DATABASE_URL;

if (TEST_DB) {
  if (/supabase\.co|pooler\.supabase/.test(TEST_DB)) {
    throw new Error("TEST_DATABASE_URL no puede apuntar a Supabase: usa una base local de pruebas.");
  }
  process.env.DATABASE_URL = TEST_DB;
}

export const usuarioActual = { id: "u-test", email: "test@colegio.local", rol: "ADMIN" as "ADMIN" | "SECRETARIA" };

export function mockearEntornoNext() {
  vi.mock("server-only", () => ({}));
  vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
  vi.mock("next/navigation", () => ({
    redirect: vi.fn((url: string) => {
      throw Object.assign(new Error(`NEXT_REDIRECT:${url}`), { digest: "NEXT_REDIRECT" });
    }),
  }));
  vi.mock("@/lib/audit", () => ({ registrarAudit: vi.fn() }));
  vi.mock("@/lib/auth", () => ({
    requireUser: vi.fn(async () => usuarioActual),
    requireAdmin: vi.fn(async () => {
      if (usuarioActual.rol !== "ADMIN") throw new Error("NEXT_REDIRECT:/dashboard");
      return usuarioActual;
    }),
    requireRole: vi.fn(async (...roles: string[]) => {
      if (!roles.includes(usuarioActual.rol)) throw new Error("NEXT_REDIRECT:/dashboard");
      return usuarioActual;
    }),
  }));
}
