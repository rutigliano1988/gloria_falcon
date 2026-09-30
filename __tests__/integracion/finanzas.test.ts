import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { TEST_DB, mockearEntornoNext, usuarioActual } from "./setup";

mockearEntornoNext();

type PrismaT = typeof import("@/lib/prisma")["prisma"];

describe.skipIf(!TEST_DB)("integridad financiera (integración)", () => {
  let prisma: PrismaT;
  let mensualidades: typeof import("@/app/(dashboard)/mensualidades/actions");
  let ventas: typeof import("@/app/(dashboard)/ventas/actions");
  let contabilidad: typeof import("@/app/(dashboard)/contabilidad/actions");
  let docentes: typeof import("@/app/(dashboard)/docentes/actions");
  let reportes: typeof import("@/lib/reportes");
  let alumnoId: string;
  let anoId: string;
  let docenteId: string;
  let mes: string;

  const hoy = new Date();
  const fechaHoy = hoy.toISOString().slice(0, 10);

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/prisma"));
    mensualidades = await import("@/app/(dashboard)/mensualidades/actions");
    ventas = await import("@/app/(dashboard)/ventas/actions");
    contabilidad = await import("@/app/(dashboard)/contabilidad/actions");
    docentes = await import("@/app/(dashboard)/docentes/actions");
    reportes = await import("@/lib/reportes");
  });

  beforeEach(async () => {
    usuarioActual.rol = "ADMIN";
    await prisma.$executeRawUnsafe(
      'TRUNCATE "conceptos_pago","pagos","egresos","pagos_docente","docentes","categorias_egreso","productos","tasas_cambio","servicios_alumno","inscripciones","alumnos","grados","anos_escolares" CASCADE'
    );
    // Año escolar que contiene el mes actual (sep–jul).
    const y = hoy.getMonth() >= 8 ? hoy.getFullYear() : hoy.getFullYear() - 1;
    const anoNombre = `${y}-${y + 1}`;
    mes = `${String(hoy.getMonth() + 1).padStart(2, "0")}/${hoy.getFullYear()}`;
    if (hoy.getMonth() === 7) mes = `07/${hoy.getFullYear()}`; // agosto no es mes escolar
    anoId = (await prisma.anoEscolar.create({ data: { nombre: anoNombre, activo: true } })).id;
    const grado = await prisma.grado.create({ data: { nombre: "1er Grado", nivel: "PRIMARIA", orden: 1 } });
    await prisma.producto.createMany({
      data: [
        { nombre: "Mensualidad", precioUsd: 50 },
        { nombre: "Almuerzo", precioUsd: 20 },
      ],
    });
    await prisma.tasaCambio.create({ data: { tasa: 36.5 } });
    const alumno = await prisma.alumno.create({
      data: { primerApellido: "Pérez", primerNombre: "Ana", sexo: "F", fechaNacimiento: new Date("2019-05-10") },
    });
    alumnoId = alumno.id;
    const insc = await prisma.inscripcion.create({
      data: { alumnoId, anoEscolarId: anoId, gradoId: grado.id, descuentoMontoUsd: 10 },
    });
    await prisma.servicioAlumno.create({ data: { alumnoId, inscripcionId: insc.id, tipo: "ALMUERZO" } });
    docenteId = (
      await prisma.docente.create({ data: { primerApellido: "Gómez", primerNombre: "Luis", cedula: "V-1" } })
    ).id;
  });

  const pagoBase = () => ({
    alumnoId,
    anoEscolarId: anoId,
    meses: [mes],
    monedaPagada: "USD" as const,
    formaPago: "EFECTIVO_USD" as const,
    tasaAplicada: null,
    numeroReferencia: null,
    fechaPago: fechaHoy,
    observaciones: null,
  });

  it("el servidor calcula los montos (mensualidad + almuerzo − descuento)", async () => {
    const r = await mensualidades.registrarPago(pagoBase());
    expect(r.ok).toBe(true);
    const pago = await prisma.pago.findFirstOrThrow({ include: { conceptos: true } });
    expect(Number(pago.montoUsd)).toBe(60);
    expect(pago.conceptos.find((c) => c.concepto === "Descuento/Beca")?.mesAno).toBe(mes);
  });

  it("no se puede cobrar dos veces el mismo mes, ni siquiera en simultáneo", async () => {
    const r = await Promise.all([mensualidades.registrarPago(pagoBase()), mensualidades.registrarPago(pagoBase())]);
    expect(r.filter((x) => x.ok)).toHaveLength(1);
    expect(r.find((x) => !x.ok)).toMatchObject({ ok: false });
    expect(await prisma.pago.count()).toBe(1);
  });

  it("en Bs guarda la tasa aplicada y calcula montoBs", async () => {
    const r = await mensualidades.registrarPago({
      ...pagoBase(), monedaPagada: "BS", formaPago: "PAGO_MOVIL_BS", tasaAplicada: 40, numeroReferencia: "123456",
    });
    expect(r.ok).toBe(true);
    const pago = await prisma.pago.findFirstOrThrow();
    expect(Number(pago.tasaAplicada)).toBe(40);
    expect(Number(pago.montoBs)).toBe(2400);
  });

  it("rechaza una referencia de Pago Móvil ya usada", async () => {
    await ventas.registrarVenta({
      tipo: "VENTA", tasaAplicada: 40, monedaPagada: "BS", formaPago: "PAGO_MOVIL_BS",
      numeroReferencia: "999", fechaPago: fechaHoy, observaciones: null, conceptos: [{ concepto: "Uniforme", montoUsd: 15 }],
    });
    const r = await mensualidades.registrarPago({
      ...pagoBase(), monedaPagada: "BS", formaPago: "PAGO_MOVIL_BS", tasaAplicada: 40, numeroReferencia: "999",
    });
    expect(r).toMatchObject({ ok: false });
  });

  it("anular: solo ADMIN, libera el mes y sale de los totales", async () => {
    const r = await mensualidades.registrarPago(pagoBase());
    if (!r.ok) throw new Error(r.error);

    usuarioActual.rol = "SECRETARIA";
    await expect(mensualidades.anularPago(r.pagoId, "error de carga")).rejects.toThrow(/NEXT_REDIRECT/);

    usuarioActual.rol = "ADMIN";
    expect(await mensualidades.anularPago(r.pagoId, "no")).toMatchObject({ ok: false });
    expect(await mensualidades.anularPago(r.pagoId, "error de carga")).toMatchObject({ ok: true });
    expect((await mensualidades.registrarPago(pagoBase())).ok).toBe(true);

    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);
    expect((await reportes.totalesPeriodo(inicio, fin)).ingresosUsd).toBe(60);
  });

  it("nómina: el servidor recalcula el total y no acepta un bono en Bs sin bono en USD", async () => {
    const r = await docentes.registrarPagoNomina({
      docenteId, periodoMes: 9, periodoAno: 2026, baseBs: 3650,
      bonoUsd: null, bonoBsEquivalente: 999_999, // "bono fantasma" del formulario viejo
      tasaAplicada: 36.5, otrosConceptos: [], deducciones: [{ descripcion: "IVSS", montoBs: 150 }],
      formaPago: "TRANSFERENCIA_BS", numeroReferencia: "T-1", fechaPago: fechaHoy,
    });
    expect(r.ok).toBe(true);
    const pago = await prisma.pagoDocente.findFirstOrThrow();
    expect(Number(pago.totalBs)).toBe(3500);
    expect(pago.bonoBsEquivalente).toBeNull();
    const egreso = await prisma.egreso.findFirstOrThrow();
    expect(Number(egreso.montoUsd)).toBeCloseTo(95.89, 2);
    expect(egreso.descripcion).not.toMatch(/Gómez/);
  });

  it("dashboard incluye la nómina (en Bs) en los egresos del mes", async () => {
    await docentes.registrarPagoNomina({
      docenteId, periodoMes: 9, periodoAno: 2026, baseBs: 3650, bonoUsd: null, bonoBsEquivalente: null,
      tasaAplicada: 36.5, otrosConceptos: [], deducciones: [], formaPago: "EFECTIVO_BS", numeroReferencia: null,
      fechaPago: fechaHoy,
    });
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);
    expect((await reportes.totalesPeriodo(inicio, fin)).egresosUsd).toBe(100);
  });

  it("contabilidad: la secretaria ve la nómina agregada, sin nombres", async () => {
    await docentes.registrarPagoNomina({
      docenteId, periodoMes: 9, periodoAno: 2026, baseBs: 3650, bonoUsd: null, bonoBsEquivalente: null,
      tasaAplicada: 36.5, otrosConceptos: [], deducciones: [], formaPago: "EFECTIVO_BS", numeroReferencia: null,
      fechaPago: fechaHoy,
    });
    const cat = await prisma.categoriaEgreso.create({ data: { nombre: "Servicios" } });
    const e = await contabilidad.registrarEgreso({
      categoriaEgresoId: cat.id, moneda: "BS", monto: 730, tasaAplicada: 36.5, formaPago: "EFECTIVO_BS",
      numeroReferencia: null, fecha: fechaHoy,
    });
    expect(e.ok).toBe(true);

    usuarioActual.rol = "SECRETARIA";
    const data = await contabilidad.getContabilidadData(hoy.getMonth() + 1, hoy.getFullYear());
    expect(data.egresos.some((x) => x.docenteNombre || x.pagoDocenteId)).toBe(false);
    expect(data.egresos.find((x) => x.id === "nomina-agregada")?.montoUsdEquivalente).toBe(100);
    expect(data.totalEgresosUsd).toBe(120);

    usuarioActual.rol = "ADMIN";
    const admin = await contabilidad.getContabilidadData(hoy.getMonth() + 1, hoy.getFullYear());
    expect(admin.egresos.some((x) => x.docenteNombre === "Gómez Luis")).toBe(true);
  });
});
