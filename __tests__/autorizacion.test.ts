import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";

// Red de seguridad estática: toda server action exportada debe verificar
// sesión/rol como primera instrucción. proxy.ts NO basta (ver REVIEW.md, A1).

const RAIZ = path.resolve(__dirname, "..");
// Acciones públicas a propósito (formulario de inscripción por token y login).
const PUBLICAS = new Set([
  "app/(public)/inscripcion/[token]/actions.ts",
  "app/(auth)/login/actions.ts",
]);
// Acciones que deben exigir ADMIN.
const SOLO_ADMIN: Record<string, string[]> = {
  "app/(dashboard)/configuracion/actions.ts": ["*"],
  "app/(dashboard)/admin/usuarios/actions.ts": ["*"],
  "app/(dashboard)/alumnos/solicitudes/actions.ts": ["aprobarSolicitud", "rechazarSolicitud"],
  "app/(dashboard)/docentes/actions.ts": ["getNominaFormData", "registrarPagoNomina", "getPagoNominaById"],
};

function archivosUseServer(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) return archivosUseServer(p);
    if (!/\.tsx?$/.test(f)) return [];
    return readFileSync(p, "utf8").trimStart().startsWith('"use server"') ? [p] : [];
  });
}

function primeraInstruccion(src: string, nombre: string): string {
  const i = src.indexOf(`export async function ${nombre}(`);
  let j = src.indexOf("(", i) + 1;
  for (let d = 1; d > 0; j++) d += src[j] === "(" ? 1 : src[j] === ")" ? -1 : 0;
  let angulo = 0;
  while (!(src[j] === "{" && angulo === 0)) {
    if (src[j] === "<") angulo++;
    if (src[j] === ">") angulo--;
    j++;
  }
  return src.slice(j + 1).trimStart().split("\n")[0];
}

const archivos = archivosUseServer(path.join(RAIZ, "app"))
  .map((p) => path.relative(RAIZ, p).split(path.sep).join("/"))
  .filter((p) => !PUBLICAS.has(p));

describe("autorización en server actions", () => {
  it("encuentra los archivos de acciones", () => {
    expect(archivos.length).toBeGreaterThanOrEqual(10);
  });

  for (const archivo of archivos) {
    const src = readFileSync(path.join(RAIZ, archivo), "utf8");
    const nombres = [...src.matchAll(/export async function (\w+)\(/g)].map((m) => m[1]);
    for (const nombre of nombres) {
      it(`${archivo} › ${nombre} verifica permisos al inicio`, () => {
        const linea = primeraInstruccion(src, nombre);
        const admin = SOLO_ADMIN[archivo];
        const exigeAdmin = admin && (admin.includes("*") || admin.includes(nombre));
        const patron = exigeAdmin
          ? /await requireAdmin\(\)|await requireRole\("ADMIN"\)/
          : /await (requireUser|requireAdmin|requireRole)\(/;
        expect(linea).toMatch(patron);
      });
    }
  }
});
