"use server";

import { requireAdmin, requireUser } from "@/lib/auth";
import { registrarAudit } from "@/lib/audit";
import {
  calcularConceptosMensualidad,
  conceptosEsperados,
  mesesConCobroPrevio,
  montoBsDesdeUsd,
  redondear2,
  totalConceptos,
  type ConceptoCalculado,
} from "@/lib/finanzas";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import {
  TIPO_SERVICIO_LABELS,
  getMesesAnoEscolar,
  getMesAnoActual,
  mesAnoToNum,
  formatMesAno,
} from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlumnoConSolvencia = {
  id: string;
  nombreCompleto: string;
  grado: string;
  seccion: string | null;
  serviciosActivos: string[];
  montoMensualUsd: number;
  solvente: boolean;
  mesesMorosos: string[];
};

export type PagoConDetalles = {
  id: string;
  numeroRecibo: string | null;
  fechaPago: Date;
  alumnoNombre: string | null;
  montoUsd: number;
  montoBs: number | null;
  formaPago: string;
  monedaPagada: string;
  conceptos: { concepto: string; mesAno: string | null; montoUsd: number }[];
};

// ─── Fetch principal (vista /mensualidades) ───────────────────────────────────

export async function getMensualidadesData(mesAno?: string, anoEscolarId?: string) {
  await requireUser();
  const mesAnoConsulta = mesAno || getMesAnoActual();

  const [anoActivo, tasaActual, productos, alumnos] = await Promise.all([
    anoEscolarId
      ? prisma.anoEscolar.findUnique({ where: { id: anoEscolarId } })
      : prisma.anoEscolar.findFirst({ where: { activo: true } }),
    prisma.tasaCambio.findFirst({ orderBy: { fechaRegistro: "desc" } }),
    prisma.producto.findMany({ where: { activo: true } }),
    prisma.alumno.findMany({
      where: { estado: "ACTIVO" },
      include: {
        inscripciones: {
          include: {
            grado: true,
            seccion: true,
            anoEscolar: true,
            servicios: { where: { activo: true } },
          },
          orderBy: { fechaInscripcion: "desc" },
        },
      },
      orderBy: [{ primerApellido: "asc" }, { primerNombre: "asc" }],
    }),
  ]);

  const precioMap: Record<string, number> = {};
  for (const p of productos) {
    precioMap[p.nombre] = Number(p.precioUsd);
  }

  const alumnosActivos = anoActivo
    ? alumnos.filter((a) => a.inscripciones.some((i) => i.anoEscolarId === anoActivo.id))
    : [];

  if (alumnosActivos.length === 0 || !anoActivo) {
    return {
      anoActivo,
      tasaActual,
      alumnos: [] as AlumnoConSolvencia[],
      pagosRecientes: [] as PagoConDetalles[],
      totalCobradoMes: 0,
      totalSolventes: 0,
      totalMorosos: 0,
      mesAnoActual: mesAnoConsulta,
      mesesDelAno: [] as string[],
    };
  }

  const todosLosMeses = getMesesAnoEscolar(anoActivo.nombre);
  const mesActual = getMesAnoActual();
  const mesActualNum = mesAnoToNum(mesActual);
  const mesesPasados = todosLosMeses.filter((m) => mesAnoToNum(m) <= mesActualNum);
  const alumnoIds = alumnosActivos.map((a) => a.id);

  // Query masiva: todos los ConceptoPago de todos los alumnos en meses del año
  const todosConceptos = mesesPasados.length > 0
    ? await prisma.conceptoPago.findMany({
        where: {
          mesAno: { in: mesesPasados },
          pago: { alumnoId: { in: alumnoIds }, tipo: "MENSUALIDAD", deletedAt: null },
        },
        include: { pago: { select: { alumnoId: true } } },
      })
    : [];

  // Agrupar: Map<alumnoId, Map<mesAno, Set<concepto>>>
  const pagadosPorAlumnoMes = new Map<string, Map<string, Set<string>>>();
  for (const cp of todosConceptos) {
    const aId = cp.pago.alumnoId!;
    const mes = cp.mesAno!;
    if (!pagadosPorAlumnoMes.has(aId)) pagadosPorAlumnoMes.set(aId, new Map());
    const mesMap = pagadosPorAlumnoMes.get(aId)!;
    if (!mesMap.has(mes)) mesMap.set(mes, new Set());
    mesMap.get(mes)!.add(cp.concepto);
  }

  const alumnosConSolvencia: AlumnoConSolvencia[] = alumnosActivos.map((alumno) => {
    const inscripcion = alumno.inscripciones.find((i) => i.anoEscolarId === anoActivo.id)!;
    const serviciosActivos = inscripcion.servicios;

    const conceptosEsperados = [
      "Mensualidad",
      ...serviciosActivos.map((s) => TIPO_SERVICIO_LABELS[s.tipo]),
    ];

    const montoBase =
      (precioMap["Mensualidad"] ?? 0) +
      serviciosActivos.reduce(
        (sum, s) => sum + (precioMap[TIPO_SERVICIO_LABELS[s.tipo]] ?? 0),
        0
      );
    const descuento = Number(inscripcion.descuentoMontoUsd ?? 0);
    const montoMensualUsd = Math.max(0, montoBase - descuento);

    const mesPagados = pagadosPorAlumnoMes.get(alumno.id);

    const mesesMorosos = mesesPasados.filter((mes) => {
      const pagados = mesPagados?.get(mes) ?? new Set<string>();
      return !conceptosEsperados.every((c) => pagados.has(c));
    });

    // Solvente = sin meses morosos pendientes (incluye el caso donde el año aún no comenzó)
    const solvente = mesesMorosos.length === 0;

    const nombreCompleto = [
      alumno.primerApellido,
      alumno.segundoApellido,
      alumno.primerNombre,
      alumno.segundoNombre,
    ]
      .filter(Boolean)
      .join(" ");

    return {
      id: alumno.id,
      nombreCompleto,
      grado: inscripcion.grado.nombre,
      seccion: inscripcion.seccion?.nombre ?? null,
      serviciosActivos: conceptosEsperados,
      montoMensualUsd,
      solvente,
      mesesMorosos,
    };
  });

  // Historial reciente
  const pagosDB = await prisma.pago.findMany({
    where: { tipo: "MENSUALIDAD", anoEscolarId: anoActivo.id, deletedAt: null },
    orderBy: { fechaPago: "desc" },
    take: 50,
    include: { alumno: true, conceptos: true },
  });

  const pagosRecientes: PagoConDetalles[] = pagosDB.map((p) => ({
    id: p.id,
    numeroRecibo: p.numeroRecibo,
    fechaPago: p.fechaPago,
    alumnoNombre: p.alumno
      ? `${p.alumno.primerApellido} ${p.alumno.primerNombre}`
      : null,
    montoUsd: Number(p.montoUsd),
    montoBs: p.montoBs ? Number(p.montoBs) : null,
    formaPago: p.formaPago,
    monedaPagada: p.monedaPagada,
    conceptos: p.conceptos.map((c) => ({
      concepto: c.concepto,
      mesAno: c.mesAno,
      montoUsd: Number(c.montoUsd),
    })),
  }));

  // Total cobrado en el mes consultado (suma de ConceptoPago del mes)
  const totalCobradoMes = todosConceptos
    .filter((cp) => cp.mesAno === mesAnoConsulta)
    .reduce((sum, cp) => sum + Number(cp.montoUsd), 0);

  return {
    anoActivo,
    tasaActual,
    alumnos: alumnosConSolvencia,
    pagosRecientes,
    totalCobradoMes,
    totalSolventes: alumnosConSolvencia.filter((a) => a.solvente).length,
    totalMorosos: alumnosConSolvencia.filter((a) => !a.solvente).length,
    mesAnoActual: mesAnoConsulta,
    mesesDelAno: todosLosMeses,
  };
}

// ─── Fetch para formulario nuevo pago ─────────────────────────────────────────

export async function getPagoFormData() {
  await requireUser();
  const [anoActivo, tasaActual, productos] = await Promise.all([
    prisma.anoEscolar.findFirst({ where: { activo: true } }),
    prisma.tasaCambio.findFirst({ orderBy: { fechaRegistro: "desc" } }),
    prisma.producto.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
  ]);

  const alumnos = anoActivo
    ? await prisma.alumno.findMany({
        where: { estado: "ACTIVO" },
        include: {
          inscripciones: {
            where: { anoEscolarId: anoActivo.id },
            include: {
              grado: true,
              seccion: true,
              servicios: { where: { activo: true } },
            },
          },
        },
        orderBy: [{ primerApellido: "asc" }, { primerNombre: "asc" }],
      })
    : [];

  // Meses ya cobrados por alumno: el formulario los deshabilita (evita cobrar dos veces).
  const cobrados = anoActivo
    ? await prisma.conceptoPago.findMany({
        where: {
          mesAno: { not: null },
          pago: {
            alumnoId: { in: alumnos.map((a) => a.id) },
            anoEscolarId: anoActivo.id,
            tipo: "MENSUALIDAD",
            deletedAt: null,
          },
        },
        select: { mesAno: true, concepto: true, pago: { select: { alumnoId: true } } },
      })
    : [];

  const alumnosConCobros = alumnos.map((a) => {
    const servicios = a.inscripciones[0]?.servicios.map((s) => s.tipo) ?? [];
    const esperados = conceptosEsperados(servicios);
    const propios = cobrados.filter((c) => c.pago.alumnoId === a.id);
    const meses = [...new Set(propios.map((c) => c.mesAno!))];
    return { ...a, mesesCobrados: mesesConCobroPrevio(meses, propios, esperados) };
  });

  return { alumnos: alumnosConCobros, anoActivo, tasaActual, productos };
}

// ─── Registrar pago ───────────────────────────────────────────────────────────

const FORMAS_PAGO = ["EFECTIVO_USD", "EFECTIVO_BS", "PAGO_MOVIL_BS", "TRANSFERENCIA_BS"] as const;

// El cliente elige meses, conceptos adicionales y forma de pago. Los montos de
// mensualidad, servicios y descuento los calcula el servidor (A3 de REVIEW.md).
const registrarPagoSchema = z.object({
  alumnoId: z.string().min(1).max(50),
  anoEscolarId: z.string().min(1).max(50),
  meses: z.array(z.string().regex(/^\d{2}\/\d{4}$/)).min(1, "Selecciona al menos un mes").max(12),
  conceptosAdicionales: z
    .array(
      z.object({
        concepto: z.string().trim().min(1, "Describe el concepto adicional").max(80),
        montoUsd: z.number().positive("Los conceptos adicionales deben ser mayores a 0").max(100000),
      })
    )
    .max(10)
    .default([]),
  monedaPagada: z.enum(["USD", "BS"]),
  formaPago: z.enum(FORMAS_PAGO),
  tasaAplicada: z.number().positive().max(10_000_000).nullable(),
  numeroReferencia: z.string().trim().max(60).nullable(),
  fechaPago: z.iso.date("Fecha de pago inválida"),
  observaciones: z.string().trim().max(500).nullable(),
});

export type RegistrarPagoInput = z.input<typeof registrarPagoSchema>;
export type ResultadoPago =
  | { ok: true; pagoId: string; numeroRecibo: string }
  | { ok: false; error: string };

class ErrorValidacion extends Error {}

export async function registrarPago(data: RegistrarPagoInput): Promise<ResultadoPago> {
  const usuario = await requireUser();
  const parsed = registrarPagoSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => i.message).join(" · ") };
  const d = parsed.data;

  // Coherencia moneda / forma de pago / referencia / tasa
  if ((d.monedaPagada === "USD") !== (d.formaPago === "EFECTIVO_USD")) {
    return { ok: false, error: "La forma de pago no corresponde a la moneda." };
  }
  const referencia = d.numeroReferencia || null;
  if (["PAGO_MOVIL_BS", "TRANSFERENCIA_BS"].includes(d.formaPago) && !referencia) {
    return { ok: false, error: "El número de referencia es obligatorio para este tipo de pago." };
  }
  if (d.monedaPagada === "BS" && !d.tasaAplicada) {
    return { ok: false, error: "Ingresa la tasa de cambio aplicada." };
  }
  const fechaPago = new Date(d.fechaPago);
  if (fechaPago.getTime() > Date.now() + 36 * 60 * 60 * 1000) {
    return { ok: false, error: "La fecha de pago no puede ser futura." };
  }

  const [inscripcion, productos, tasaOficial] = await Promise.all([
    prisma.inscripcion.findUnique({
      where: { alumnoId_anoEscolarId: { alumnoId: d.alumnoId, anoEscolarId: d.anoEscolarId } },
      include: { anoEscolar: true, servicios: { where: { activo: true } } },
    }),
    prisma.producto.findMany({ where: { activo: true } }),
    prisma.tasaCambio.findFirst({ orderBy: { fechaRegistro: "desc" } }),
  ]);
  if (!inscripcion) return { ok: false, error: "El alumno no está inscrito en ese año escolar." };

  const mesesValidos = getMesesAnoEscolar(inscripcion.anoEscolar.nombre);
  const mesActualNum = mesAnoToNum(getMesAnoActual());
  const meses = [...new Set(d.meses)];
  if (meses.some((m) => !mesesValidos.includes(m) || mesAnoToNum(m) > mesActualNum)) {
    return { ok: false, error: "Hay meses que no pertenecen al año escolar o todavía no han llegado." };
  }

  const precios = Object.fromEntries(productos.map((p) => [p.nombre, Number(p.precioUsd)]));
  const servicios = inscripcion.servicios.map((s) => s.tipo);
  let conceptos: ConceptoCalculado[];
  try {
    conceptos = [
      ...calcularConceptosMensualidad({
        meses,
        serviciosActivos: servicios,
        precios,
        descuentoMensualUsd: Number(inscripcion.descuentoMontoUsd ?? 0),
      }),
      ...d.conceptosAdicionales.map((c) => ({ concepto: c.concepto, mesAno: null, montoUsd: redondear2(c.montoUsd) })),
    ];
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudieron calcular los conceptos." };
  }
  const montoUsd = totalConceptos(conceptos);
  if (!(montoUsd > 0)) return { ok: false, error: "El monto total debe ser mayor a 0." };
  const tasaAplicada = d.monedaPagada === "BS" ? d.tasaAplicada! : null;
  const montoBs = tasaAplicada ? montoBsDesdeUsd(montoUsd, tasaAplicada) : null;
  const esperados = conceptosEsperados(servicios);

  let result!: { pagoId: string; numeroRecibo: string };
  try {
    for (let intento = 0; intento < 3; intento++) {
      try {
        result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          // Serializa los cobros del mismo alumno: sin esto, dos cobros simultáneos
          // del mismo mes pasarían ambos la verificación de duplicados.
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${d.alumnoId}))`;

          const previos = await tx.conceptoPago.findMany({
            where: {
              mesAno: { in: meses },
              pago: { alumnoId: d.alumnoId, anoEscolarId: d.anoEscolarId, tipo: "MENSUALIDAD", deletedAt: null },
            },
            select: { mesAno: true, concepto: true },
          });
          const repetidos = mesesConCobroPrevio(meses, previos, esperados);
          if (repetidos.length > 0) {
            throw new ErrorValidacion(`Ya hay un cobro registrado para: ${repetidos.map(formatMesAno).join(", ")}.`);
          }

          if (referencia) {
            const mismaReferencia = await tx.pago.findFirst({
              where: { formaPago: d.formaPago, numeroReferencia: referencia, deletedAt: null },
              select: { numeroRecibo: true },
            });
            if (mismaReferencia) {
              throw new ErrorValidacion(
                `La referencia ${referencia} ya se usó en el recibo ${mismaReferencia.numeroRecibo ?? "(sin número)"}.`
              );
            }
          }

          const anoStr = inscripcion.anoEscolar.nombre.substring(0, 4);
          const ultimoRecibo = await tx.pago.findFirst({
            where: { anoEscolarId: d.anoEscolarId, numeroRecibo: { not: null } },
            orderBy: { numeroRecibo: "desc" },
          });
          let nextNum = 1;
          if (ultimoRecibo?.numeroRecibo) {
            const partes = ultimoRecibo.numeroRecibo.split("-");
            const ultimo = parseInt(partes[partes.length - 1]);
            if (!isNaN(ultimo)) nextNum = ultimo + 1;
          }
          const numeroRecibo = `${anoStr}-${String(nextNum).padStart(4, "0")}`;

          const pago = await tx.pago.create({
            data: {
              tipo: "MENSUALIDAD",
              alumnoId: d.alumnoId,
              anoEscolarId: d.anoEscolarId,
              montoUsd,
              montoBs,
              tasaAplicada,
              tasaCambioId: tasaOficial?.id ?? null,
              monedaPagada: d.monedaPagada,
              formaPago: d.formaPago,
              numeroReferencia: referencia,
              fechaPago,
              observaciones: d.observaciones || null,
              numeroRecibo,
            },
          });
          await tx.conceptoPago.createMany({
            data: conceptos.map((c) => ({ pagoId: pago.id, ...c })),
          });
          return { pagoId: pago.id, numeroRecibo };
        });
        break;
      } catch (e) {
        const esColision = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
        if (esColision && intento < 2) continue;
        throw e;
      }
    }
  } catch (e) {
    if (e instanceof ErrorValidacion) return { ok: false, error: e.message };
    throw e;
  }

  await registrarAudit({
    accion: "PAGO_REGISTRADO",
    entidad: "Pago",
    entidadId: result.pagoId,
    meta: { numeroRecibo: result.numeroRecibo, montoUsd, meses, registradoPor: usuario.email },
  });

  revalidatePath("/mensualidades");
  revalidatePath("/mensualidades/nuevo");
  revalidatePath("/dashboard");

  return { ok: true, ...result };
}

// ─── Anular pago (mensualidad, venta o ingreso) ───────────────────────────────

const anularSchema = z.object({
  id: z.string().min(1).max(50),
  motivo: z.string().trim().min(5, "Indica el motivo de la anulación (mínimo 5 caracteres)").max(300),
});

/** Solo ADMIN. El pago no se borra: queda marcado como anulado y fuera de los totales. */
export async function anularPago(id: string, motivo: string): Promise<{ ok: boolean; error?: string }> {
  const usuario = await requireAdmin();
  const parsed = anularSchema.safeParse({ id, motivo });
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => i.message).join(" · ") };

  const { count } = await prisma.pago.updateMany({
    where: { id: parsed.data.id, deletedAt: null },
    data: { deletedAt: new Date(), anuladoPor: usuario.email, motivoAnulacion: parsed.data.motivo },
  });
  if (count === 0) return { ok: false, error: "El pago no existe o ya estaba anulado." };

  await registrarAudit({
    accion: "PAGO_ANULADO",
    entidad: "Pago",
    entidadId: parsed.data.id,
    meta: { motivo: parsed.data.motivo },
  });
  revalidatePath("/mensualidades");
  revalidatePath("/ventas");
  revalidatePath("/contabilidad");
  revalidatePath("/dashboard");
  return { ok: true };
}

// ─── Detalle de un pago ───────────────────────────────────────────────────────

export async function getPagoById(id: string) {
  await requireUser();
  return prisma.pago.findUnique({
    where: { id },
    include: {
      alumno: {
        include: {
          inscripciones: {
            orderBy: { fechaInscripcion: "desc" },
            take: 1,
            include: { grado: true, seccion: true },
          },
        },
      },
      conceptos: { orderBy: { concepto: "asc" } },
      tasaCambio: true,
      anoEscolar: true,
    },
  });
}

// ─── Datos del colegio para PDF ───────────────────────────────────────────────

export async function getConfigColegio() {
  await requireUser();
  const config = await prisma.configuracion.findUnique({
    where: { clave: "datos_colegio" },
  });
  if (!config) return null;
  return config.valor as {
    nombre: string;
    rif: string;
    direccion: string;
    telefonos: string;
    correo: string;
  };
}
