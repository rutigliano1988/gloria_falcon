import { describe, it, expect } from "vitest";
import {
  mesAnoToNum,
  getMesesAnoEscolar,
  getMesAnoActual,
  calcularEdad,
  parsePrismaError,
  formatMesAno,
} from "../lib/utils";

describe("mesAnoToNum", () => {
  it("convierte formato MM/YYYY a número comparable", () => {
    expect(mesAnoToNum("09/2024")).toBe(202409);
    expect(mesAnoToNum("01/2025")).toBe(202501);
    expect(mesAnoToNum("12/2024")).toBe(202412);
  });

  it("permite comparar meses correctamente entre años", () => {
    expect(mesAnoToNum("01/2025")).toBeGreaterThan(mesAnoToNum("12/2024"));
    expect(mesAnoToNum("09/2024")).toBeLessThan(mesAnoToNum("01/2025"));
  });
});

describe("getMesesAnoEscolar", () => {
  it("genera 11 meses para un año escolar 2024-2025", () => {
    const meses = getMesesAnoEscolar("2024-2025");
    expect(meses).toHaveLength(11);
  });

  it("empieza en septiembre del año de inicio", () => {
    const meses = getMesesAnoEscolar("2024-2025");
    expect(meses[0]).toBe("09/2024");
    expect(meses[1]).toBe("10/2024");
    expect(meses[2]).toBe("11/2024");
    expect(meses[3]).toBe("12/2024");
  });

  it("termina en julio del año siguiente", () => {
    const meses = getMesesAnoEscolar("2024-2025");
    expect(meses[meses.length - 1]).toBe("07/2025");
  });

  it("incluye enero del año siguiente en la posición correcta", () => {
    const meses = getMesesAnoEscolar("2024-2025");
    expect(meses[4]).toBe("01/2025");
  });
});

describe("calcularEdad", () => {
  it("calcula edad correctamente", () => {
    const hoy = new Date();
    const hace10anos = new Date(
      Date.UTC(hoy.getUTCFullYear() - 10, hoy.getUTCMonth(), hoy.getUTCDate())
    );
    expect(calcularEdad(hace10anos)).toBe(10);
  });

  it("no suma un año antes del cumpleaños", () => {
    const hoy = new Date();
    const manana = new Date(
      Date.UTC(hoy.getUTCFullYear() - 5, hoy.getUTCMonth(), hoy.getUTCDate() + 1)
    );
    expect(calcularEdad(manana)).toBe(4);
  });
});

function prismaUniqueError(field: string) {
  const err = new Error(`Unique constraint failed on the fields: (\`${field}\`)`);
  (err as unknown as Record<string, unknown>).code = "P2002";
  return err;
}

describe("parsePrismaError", () => {
  it("identifica error de cédula escolar duplicada", () => {
    expect(parsePrismaError(prismaUniqueError("cedulaEscolar"))).toContain("cédula escolar");
  });

  it("identifica error de número de recibo duplicado", () => {
    expect(parsePrismaError(prismaUniqueError("numeroRecibo"))).toContain("recibo");
  });

  it("identifica error de inscripción duplicada", () => {
    const err = new Error("Unique constraint failed on alumnoId and anoEscolarId");
    (err as unknown as Record<string, unknown>).code = "P2002";
    expect(parsePrismaError(err)).toContain("inscripción");
  });

  it("retorna mensaje genérico para errores desconocidos", () => {
    expect(parsePrismaError(new Error("something broke"))).toBe("something broke");
  });

  it("retorna fallback si no hay mensaje", () => {
    expect(parsePrismaError({})).toBe("Error inesperado.");
  });
});

describe("formatMesAno", () => {
  it("formatea 09/2024 como Septiembre 2024", () => {
    expect(formatMesAno("09/2024")).toBe("Septiembre 2024");
  });

  it("formatea 01/2025 como Enero 2025", () => {
    expect(formatMesAno("01/2025")).toBe("Enero 2025");
  });
});
