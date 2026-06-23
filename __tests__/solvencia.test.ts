import { describe, it, expect } from "vitest";
import { calcularSolvencia } from "../lib/solvencia";

const PRECIOS_BASE = {
  precioMensualidad: 50,
  preciosServicios: {
    Almuerzo: 20,
    Resguardo: 15,
    "Tae-Kwon-Do": 10,
  },
};

describe("calcularSolvencia", () => {
  it("alumno sin servicios, pagó todos los meses → solvente", () => {
    const meses = ["09/2024", "10/2024", "11/2024"];
    const conceptosPagados = new Map([
      ["09/2024", new Set(["Mensualidad"])],
      ["10/2024", new Set(["Mensualidad"])],
      ["11/2024", new Set(["Mensualidad"])],
    ]);

    const result = calcularSolvencia({
      serviciosActivos: [],
      descuentoMontoUsd: 0,
      ...PRECIOS_BASE,
      mesesPasados: meses,
      conceptosPagados,
    });

    expect(result.solvente).toBe(true);
    expect(result.mesesMorosos).toHaveLength(0);
    expect(result.montoMensualUsd).toBe(50);
  });

  it("alumno con almuerzo, pagó mensualidad pero no almuerzo → moroso", () => {
    const meses = ["09/2024"];
    const conceptosPagados = new Map([
      ["09/2024", new Set(["Mensualidad"])],
    ]);

    const result = calcularSolvencia({
      serviciosActivos: [{ tipo: "ALMUERZO" }],
      descuentoMontoUsd: 0,
      ...PRECIOS_BASE,
      mesesPasados: meses,
      conceptosPagados,
    });

    expect(result.solvente).toBe(false);
    expect(result.mesesMorosos).toContain("09/2024");
    expect(result.conceptosEsperados).toContain("Almuerzo");
  });

  it("alumno con descuento, monto mensual se descuenta correctamente", () => {
    const result = calcularSolvencia({
      serviciosActivos: [{ tipo: "ALMUERZO" }],
      descuentoMontoUsd: 10,
      ...PRECIOS_BASE,
      mesesPasados: [],
      conceptosPagados: new Map(),
    });

    expect(result.montoMensualUsd).toBe(60);
  });

  it("descuento mayor al monto → montoMensualUsd no puede ser negativo", () => {
    const result = calcularSolvencia({
      serviciosActivos: [],
      descuentoMontoUsd: 100,
      ...PRECIOS_BASE,
      mesesPasados: [],
      conceptosPagados: new Map(),
    });

    expect(result.montoMensualUsd).toBe(0);
  });

  it("sin meses pasados → solvente (año no comenzó)", () => {
    const result = calcularSolvencia({
      serviciosActivos: [],
      descuentoMontoUsd: 0,
      ...PRECIOS_BASE,
      mesesPasados: [],
      conceptosPagados: new Map(),
    });

    expect(result.solvente).toBe(true);
    expect(result.mesesMorosos).toHaveLength(0);
  });

  it("pagó algunos meses pero no todos → moroso en meses pendientes", () => {
    const meses = ["09/2024", "10/2024", "11/2024"];
    const conceptosPagados = new Map([
      ["09/2024", new Set(["Mensualidad"])],
      ["10/2024", new Set(["Mensualidad"])],
    ]);

    const result = calcularSolvencia({
      serviciosActivos: [],
      descuentoMontoUsd: 0,
      ...PRECIOS_BASE,
      mesesPasados: meses,
      conceptosPagados,
    });

    expect(result.solvente).toBe(false);
    expect(result.mesesMorosos).toEqual(["11/2024"]);
  });

  it("alumno con múltiples servicios, pagó todo → solvente", () => {
    const meses = ["09/2024"];
    const conceptosPagados = new Map([
      ["09/2024", new Set(["Mensualidad", "Almuerzo", "Resguardo"])],
    ]);

    const result = calcularSolvencia({
      serviciosActivos: [{ tipo: "ALMUERZO" }, { tipo: "RESGUARDO" }],
      descuentoMontoUsd: 0,
      ...PRECIOS_BASE,
      mesesPasados: meses,
      conceptosPagados,
    });

    expect(result.solvente).toBe(true);
    expect(result.montoMensualUsd).toBe(85);
  });
});
