import { describe, it, expect } from "vitest";
import { parseRol, esRutaAdmin } from "../lib/roles";

describe("parseRol (denegar por defecto)", () => {
  it("acepta los roles válidos", () => {
    expect(parseRol({ rol: "ADMIN" })).toBe("ADMIN");
    expect(parseRol({ rol: "SECRETARIA" })).toBe("SECRETARIA");
  });

  it("un usuario sin rol NO es ADMIN", () => {
    expect(parseRol({})).toBeNull();
    expect(parseRol(undefined)).toBeNull();
    expect(parseRol(null)).toBeNull();
  });

  it("rechaza roles desconocidos o con otro formato", () => {
    expect(parseRol({ rol: "admin" })).toBeNull();
    expect(parseRol({ rol: "SUPERADMIN" })).toBeNull();
    expect(parseRol({ rol: ["ADMIN"] })).toBeNull();
    expect(parseRol("ADMIN")).toBeNull();
  });
});

describe("esRutaAdmin", () => {
  it("protege configuración, usuarios y nómina", () => {
    expect(esRutaAdmin("/configuracion")).toBe(true);
    expect(esRutaAdmin("/admin/usuarios")).toBe(true);
    expect(esRutaAdmin("/docentes/nomina/nuevo")).toBe(true);
    expect(esRutaAdmin("/docentes/nomina/abc123")).toBe(true);
    expect(esRutaAdmin("/api/nomina/abc123")).toBe(true);
  });

  it("no bloquea rutas de la secretaria", () => {
    expect(esRutaAdmin("/docentes")).toBe(false);
    expect(esRutaAdmin("/docentes/abc123")).toBe(false);
    expect(esRutaAdmin("/contabilidad")).toBe(false);
    expect(esRutaAdmin("/administracion-falsa")).toBe(false);
  });
});
