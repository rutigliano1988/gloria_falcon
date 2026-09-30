import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "fs";
import path from "path";

// Toda tabla creada después de la migración genérica de RLS debe activar RLS
// en su propia migración (ver REVIEW.md, C2).

const DIR = path.resolve(__dirname, "../prisma/migrations");
const MIGRACION_RLS = "20260930120000_rls_y_permisos";

const migraciones = readdirSync(DIR)
  .filter((d) => existsSync(path.join(DIR, d, "migration.sql")))
  .sort();

describe("migraciones", () => {
  it("existe la migración de RLS", () => {
    expect(migraciones).toContain(MIGRACION_RLS);
  });

  it("las tablas nuevas activan RLS", () => {
    const posteriores = migraciones.filter((m) => m > MIGRACION_RLS);
    const sql = posteriores.map((m) => readFileSync(path.join(DIR, m, "migration.sql"), "utf8")).join("\n");
    const creadas = [...sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?"?(\w+)"?/gi)].map((m) => m[1]);
    const sinRls = creadas.filter(
      (t) => !new RegExp(`ALTER TABLE (?:ONLY )?(?:public\\.)?"?${t}"? ENABLE ROW LEVEL SECURITY`, "i").test(sql)
    );
    expect(sinRls).toEqual([]);
  });
});
