import { describe, it, expect } from "vitest";
import {
  calcularConceptosMensualidad,
  totalConceptos,
  mesesConCobroPrevio,
  calcularTotalNomina,
  egresoEnUsd,
  montoBsDesdeUsd,
  conceptosEsperados,
} from "../lib/finanzas";

const precios = { Mensualidad: 50, Almuerzo: 20, Resguardo: 15, "Tae-Kwon-Do": 10 };

describe("calcularConceptosMensualidad", () => {
  it("usa los precios del servidor por mes y servicio", () => {
    const c = calcularConceptosMensualidad({
      meses: ["09/2026", "10/2026"], serviciosActivos: ["ALMUERZO"], precios, descuentoMensualUsd: 0,
    });
    expect(c).toHaveLength(4);
    expect(totalConceptos(c)).toBe(140);
  });

  it("aplica el descuento por mes, con su mes (cuenta en 'Cobrado en el mes')", () => {
    const c = calcularConceptosMensualidad({
      meses: ["09/2026"], serviciosActivos: [], precios, descuentoMensualUsd: 10,
    });
    expect(c).toContainEqual({ concepto: "Descuento/Beca", mesAno: "09/2026", montoUsd: -10 });
    expect(totalConceptos(c)).toBe(40);
  });

  it("el descuento nunca deja un mes en negativo", () => {
    const c = calcularConceptosMensualidad({
      meses: ["09/2026"], serviciosActivos: [], precios, descuentoMensualUsd: 999,
    });
    expect(totalConceptos(c)).toBe(0);
  });

  it("falla si falta el precio de un concepto (p. ej. producto renombrado o inactivo)", () => {
    expect(() =>
      calcularConceptosMensualidad({ meses: ["09/2026"], serviciosActivos: [], precios: {}, descuentoMensualUsd: 0 })
    ).toThrow(/Mensualidad/);
  });
});

describe("mesesConCobroPrevio", () => {
  it("detecta meses ya cobrados para los conceptos esperados", () => {
    const esperados = conceptosEsperados(["ALMUERZO"]);
    const pagados = [
      { mesAno: "09/2026", concepto: "Mensualidad" },
      { mesAno: "10/2026", concepto: "Concepto adicional" },
    ];
    expect(mesesConCobroPrevio(["09/2026", "10/2026"], pagados, esperados)).toEqual(["09/2026"]);
  });
});

describe("calcularTotalNomina", () => {
  it("base + bono + otros − deducciones", () => {
    expect(
      calcularTotalNomina({ baseBs: 1000, bonoBs: 365.5, otros: [{ montoBs: 100 }], deducciones: [{ montoBs: 50.25 }] })
    ).toBe(1415.25);
  });
});

describe("conversiones", () => {
  it("Bs desde USD redondea a 2 decimales", () => {
    expect(montoBsDesdeUsd(10.333, 36.5)).toBe(377.15);
  });

  it("un egreso en Bs se convierte con la tasa de su día, no la actual", () => {
    expect(egresoEnUsd({ montoUsd: null, montoBs: 730, tasaDelDia: 36.5 })).toBe(20);
    expect(egresoEnUsd({ montoUsd: 15, montoBs: 999, tasaDelDia: 1 })).toBe(15);
    expect(egresoEnUsd({ montoUsd: null, montoBs: 100, tasaDelDia: null })).toBeNull();
  });
});
