"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import {
  TIPO_SERVICIO_LABELS,
  getMesesAnoEscolar,
  getMesAnoActual,
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

// Convierte "MM/YYYY" a número comparable (evita error de comparación de strings)
function mesAnoToNum(mesAno: string): number {
  const [mm, yyyy] = mesAno.split("/");
  return parseInt(yyyy) * 100 + parseInt(mm);
}

// ─── Fetch principal (vista /mensualidades) ───────────────────────────────────

export async function getMensualidadesData(mesAno?: string, anoEscolarId?: string) {
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
          pago: { alumnoId: { in: alumnoIds }, tipo: "MENSUALIDAD" },
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
    const conceptosPagadosMes = mesPagados?.get(mesAnoConsulta) ?? new Set<string>();
    const solvente = conceptosEsperados.every((c) => conceptosPagadosMes.has(c));

    const mesesMorosos = mesesPasados.filter((mes) => {
      const pagados = mesPagados?.get(mes) ?? new Set<string>();
      return !conceptosEsperados.every((c) => pagados.has(c));
    });

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
    where: { tipo: "MENSUALIDAD", anoEscolarId: anoActivo.id },
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

  return { alumnos, anoActivo, tasaActual, productos };
}

// ─── Registrar pago ───────────────────────────────────────────────────────────

const conceptoPagoInputSchema = z.object({
  concepto: z.string().min(1),
  mesAno: z
    .string()
    .regex(/^\d{2}\/\d{4}$/)
    .nullable(),
  montoUsd: z.number(),
});

const registrarPagoSchema = z.object({
  alumnoId: z.string().min(1),
  anoEscolarId: z.string().min(1),
  montoUsd: z.number().positive("El monto debe ser mayor a 0"),
  montoBs: z.number().nonnegative().nullable(),
  tasaCambioId: z.string().nullable(),
  monedaPagada: z.enum(["USD", "BS"]),
  formaPago: z.enum(["EFECTIVO_USD", "EFECTIVO_BS", "PAGO_MOVIL_BS", "TRANSFERENCIA_BS"]),
  numeroReferencia: z.string().nullable(),
  fechaPago: z.string().min(1),
  observaciones: z.string().nullable(),
  conceptos: z.array(conceptoPagoInputSchema).min(1, "Debe incluir al menos un concepto"),
});

export type RegistrarPagoInput = z.infer<typeof registrarPagoSchema>;

export async function registrarPago(data: RegistrarPagoInput) {
  const parsed = registrarPagoSchema.parse(data);

  let result!: { pagoId: string; numeroRecibo: string };
  for (let intento = 0; intento < 3; intento++) {
    try {
      result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const anoEscolar = await tx.anoEscolar.findUnique({
          where: { id: parsed.anoEscolarId },
        });
        const anoStr = anoEscolar?.nombre?.substring(0, 4) ?? new Date().getFullYear().toString();

        const ultimoRecibo = await tx.pago.findFirst({
          where: {
            anoEscolarId: parsed.anoEscolarId,
            numeroRecibo: { not: null },
          },
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
            alumnoId: parsed.alumnoId,
            anoEscolarId: parsed.anoEscolarId,
            montoUsd: parsed.montoUsd,
            montoBs: parsed.montoBs,
            tasaCambioId: parsed.tasaCambioId,
            monedaPagada: parsed.monedaPagada,
            formaPago: parsed.formaPago,
            numeroReferencia: parsed.numeroReferencia,
            fechaPago: new Date(parsed.fechaPago),
            observaciones: parsed.observaciones,
            numeroRecibo,
          },
        });

        await tx.conceptoPago.createMany({
          data: parsed.conceptos.map((c) => ({
            pagoId: pago.id,
            concepto: c.concepto,
            mesAno: c.mesAno,
            montoUsd: c.montoUsd,
          })),
        });

        return { pagoId: pago.id, numeroRecibo };
      });
      break;
    } catch (e) {
      const esColision =
        e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
      if (esColision && intento < 2) continue;
      throw e;
    }
  }

  revalidatePath("/mensualidades");
  revalidatePath("/mensualidades/nuevo");
  revalidatePath(`/mensualidades/${result.pagoId}`);
  revalidatePath("/dashboard");

  return result;
}

// ─── Detalle de un pago ───────────────────────────────────────────────────────

export async function getPagoById(id: string) {
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
