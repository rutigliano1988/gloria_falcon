"use server";

import { requireAdmin, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { MESES } from "@/lib/utils";
import { registrarAudit } from "@/lib/audit";
import { calcularTotalNomina, montoBsDesdeUsd, montoUsdDesdeBs } from "@/lib/finanzas";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DocenteResumen = {
  id: string;
  nombreCompleto: string;
  cedula: string;
  cargo: string;
  estado: string;
  telefono: string | null;
  email: string | null;
  fechaIngreso: Date | null;
};

export type PagoNominaResumen = {
  id: string;
  fechaPago: Date;
  periodoMes: number;
  periodoAno: number;
  baseBs: number;
  bonoUsd: number | null;
  totalBs: number;
  formaPago: string;
};

// ─── Schemas ──────────────────────────────────────────────────────────────────

const docenteSchema = z.object({
  primerApellido: z.string().min(1, "Obligatorio"),
  segundoApellido: z.string().optional().nullable(),
  primerNombre: z.string().min(1, "Obligatorio"),
  segundoNombre: z.string().optional().nullable(),
  cedula: z.string().min(1, "Obligatorio"),
  telefono: z.string().optional().nullable(),
  email: z.string().email("Email inválido").optional().nullable().or(z.literal("")),
  cargo: z.enum(["DOCENTE", "COORDINADOR", "DIRECTOR", "ADMINISTRATIVO", "OBRERO"]),
  gradosAsignados: z.string().optional().nullable(),
  estado: z.enum(["ACTIVO", "INACTIVO"]),
  fechaNacimiento: z.string().min(1, "Obligatorio"),
  fechaIngreso: z.string().optional().nullable(),
});

export type DocenteFormData = z.infer<typeof docenteSchema>;

const conceptoSchema = z.object({
  descripcion: z.string().trim().min(1).max(80),
  montoBs: z.number().positive().max(1_000_000_000),
});

// El total lo recalcula el servidor (antes se aceptaba el totalBs del cliente).
const pagoNominaSchema = z.object({
  docenteId: z.string().min(1).max(50),
  periodoMes: z.number().int().min(1).max(12),
  periodoAno: z.number().int().min(2000).max(2100),
  baseBs: z.number().positive("La base debe ser mayor a 0").max(1_000_000_000),
  bonoUsd: z.number().nonnegative().max(1_000_000).nullable(),
  bonoBsEquivalente: z.number().nonnegative().max(1_000_000_000).nullable(),
  tasaAplicada: z.number().positive("Indica la tasa de cambio del día").max(10_000_000),
  otrosConceptos: z.array(conceptoSchema).max(10),
  deducciones: z.array(conceptoSchema).max(10),
  formaPago: z.enum(["EFECTIVO_USD", "EFECTIVO_BS", "PAGO_MOVIL_BS", "TRANSFERENCIA_BS"]),
  numeroReferencia: z.string().trim().max(60).nullable(),
  fechaPago: z.iso.date("Fecha inválida"),
});

export type PagoNominaInput = z.infer<typeof pagoNominaSchema>;

// ─── Listado de docentes ───────────────────────────────────────────────────────

export async function getDocentes(query?: string, estado?: string) {
  await requireUser();
  return prisma.docente.findMany({
    where: {
      estado: estado ? (estado as "ACTIVO" | "INACTIVO") : undefined,
      OR: query
        ? [
            { primerApellido: { contains: query, mode: "insensitive" } },
            { primerNombre: { contains: query, mode: "insensitive" } },
            { segundoApellido: { contains: query, mode: "insensitive" } },
            { cedula: { contains: query, mode: "insensitive" } },
          ]
        : undefined,
    },
    orderBy: [{ primerApellido: "asc" }, { primerNombre: "asc" }],
  });
}

// ─── Ficha individual ──────────────────────────────────────────────────────────

export async function getDocenteById(id: string) {
  const usuario = await requireUser();
  const esAdmin = usuario.rol === "ADMIN";
  const docente = await prisma.docente.findUnique({
    where: { id },
    include: {
      pagosDocente: {
        // La nómina solo la ve el ADMIN: para el resto no se consulta.
        where: esAdmin ? { deletedAt: null } : { id: { in: [] } },
        orderBy: [{ periodoAno: "desc" }, { periodoMes: "desc" }],
        take: 12,
        include: { tasaCambio: true },
      },
    },
  });
  return docente ? { ...docente, puedeVerNomina: esAdmin } : null;
}

// ─── Crear docente ─────────────────────────────────────────────────────────────

export async function crearDocente(data: DocenteFormData) {
  await requireUser();
  const parsed = docenteSchema.parse(data);
  await prisma.docente.create({
    data: {
      primerApellido: parsed.primerApellido,
      segundoApellido: parsed.segundoApellido || null,
      primerNombre: parsed.primerNombre,
      segundoNombre: parsed.segundoNombre || null,
      cedula: parsed.cedula,
      telefono: parsed.telefono || null,
      email: parsed.email || null,
      cargo: parsed.cargo,
      gradosAsignados: parsed.gradosAsignados || null,
      estado: parsed.estado,
      fechaNacimiento: new Date(parsed.fechaNacimiento),
      fechaIngreso: parsed.fechaIngreso ? new Date(parsed.fechaIngreso) : null,
    },
  });
  revalidatePath("/docentes");
}

// ─── Actualizar docente ────────────────────────────────────────────────────────

export async function actualizarDocente(id: string, data: DocenteFormData) {
  await requireUser();
  const parsed = docenteSchema.parse(data);
  await prisma.docente.update({
    where: { id },
    data: {
      primerApellido: parsed.primerApellido,
      segundoApellido: parsed.segundoApellido || null,
      primerNombre: parsed.primerNombre,
      segundoNombre: parsed.segundoNombre || null,
      cedula: parsed.cedula,
      telefono: parsed.telefono || null,
      email: parsed.email || null,
      cargo: parsed.cargo,
      gradosAsignados: parsed.gradosAsignados || null,
      estado: parsed.estado,
      fechaNacimiento: new Date(parsed.fechaNacimiento),
      fechaIngreso: parsed.fechaIngreso ? new Date(parsed.fechaIngreso) : null,
    },
  });
  revalidatePath("/docentes");
  revalidatePath(`/docentes/${id}`);
}

// ─── Cambiar estado ────────────────────────────────────────────────────────────

export async function toggleEstadoDocente(id: string, estado: "ACTIVO" | "INACTIVO") {
  await requireUser();
  const docente = await prisma.docente.findUnique({
    where: { id },
    select: { estado: true, primerNombre: true, primerApellido: true },
  });
  await prisma.docente.update({ where: { id }, data: { estado } });
  await registrarAudit({
    accion: "DOCENTE_ESTADO_CAMBIADO",
    entidad: "Docente",
    entidadId: id,
    meta: {
      estadoAnterior: docente?.estado,
      estadoNuevo: estado,
      nombre: `${docente?.primerApellido} ${docente?.primerNombre}`,
    },
  });
  revalidatePath("/docentes");
  revalidatePath(`/docentes/${id}`);
}

// ─── Datos para form de nómina ─────────────────────────────────────────────────

export async function getNominaFormData() {
  await requireAdmin();
  const [docentes, tasaActual] = await Promise.all([
    prisma.docente.findMany({
      where: { estado: "ACTIVO" },
      orderBy: [{ primerApellido: "asc" }, { primerNombre: "asc" }],
    }),
    prisma.tasaCambio.findFirst({ orderBy: { fechaRegistro: "desc" } }),
  ]);
  return { docentes, tasaActual };
}

// ─── Registrar pago de nómina ──────────────────────────────────────────────────

export async function registrarPagoNomina(
  data: PagoNominaInput
): Promise<{ ok: true; pagoId: string } | { ok: false; error: string }> {
  const usuario = await requireAdmin();
  const parsed = pagoNominaSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => i.message).join(" · ") };
  const d = parsed.data;

  if (["PAGO_MOVIL_BS", "TRANSFERENCIA_BS"].includes(d.formaPago) && !d.numeroReferencia) {
    return { ok: false, error: "El número de referencia es obligatorio para este tipo de pago." };
  }
  const bonoUsd = d.bonoUsd && d.bonoUsd > 0 ? d.bonoUsd : null;
  // Sin bono en USD no hay bono en Bs (evita el "bono fantasma" de M10).
  const bonoBs = bonoUsd ? (d.bonoBsEquivalente ?? montoBsDesdeUsd(bonoUsd, d.tasaAplicada)) : 0;
  const totalBs = calcularTotalNomina({
    baseBs: d.baseBs,
    bonoBs,
    otros: d.otrosConceptos,
    deducciones: d.deducciones,
  });
  if (!(totalBs > 0)) return { ok: false, error: "El total neto debe ser mayor a 0." };

  const docente = await prisma.docente.findUnique({
    where: { id: d.docenteId },
    select: { primerApellido: true, primerNombre: true },
  });
  if (!docente) return { ok: false, error: "Docente no encontrado." };

  const mesLabel = MESES[d.periodoMes - 1] ?? String(d.periodoMes);
  const tasaOficial = await prisma.tasaCambio.findFirst({ orderBy: { fechaRegistro: "desc" } });

  // Obtener o crear categoría "Nómina"
  const categoriaUpsert = await prisma.categoriaEgreso.upsert({
    where: { nombre: "Nómina" },
    create: { nombre: "Nómina", activo: true },
    update: {},
  });

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const pago = await tx.pagoDocente.create({
      data: {
        docenteId: d.docenteId,
        periodoMes: d.periodoMes,
        periodoAno: d.periodoAno,
        baseBs: d.baseBs,
        bonoUsd,
        bonoBsEquivalente: bonoUsd ? bonoBs : null,
        otrosConceptos: d.otrosConceptos.length > 0 ? d.otrosConceptos : undefined,
        deducciones: d.deducciones.length > 0 ? d.deducciones : undefined,
        tasaAplicada: d.tasaAplicada,
        tasaCambioId: tasaOficial?.id ?? null,
        formaPago: d.formaPago,
        numeroReferencia: d.numeroReferencia || null,
        fechaPago: new Date(d.fechaPago),
        totalBs,
      },
    });

    // Egreso automático en contabilidad, con su equivalente en USD del día.
    // La descripción no lleva el nombre del docente: el detalle está en la nómina (solo ADMIN).
    await tx.egreso.create({
      data: {
        categoriaEgresoId: categoriaUpsert.id,
        descripcion: `Nómina ${mesLabel} ${d.periodoAno}`,
        montoBs: totalBs,
        montoUsd: montoUsdDesdeBs(totalBs, d.tasaAplicada),
        tasaAplicada: d.tasaAplicada,
        tasaCambioId: tasaOficial?.id ?? null,
        formaPago: d.formaPago,
        numeroReferencia: d.numeroReferencia || null,
        fecha: new Date(d.fechaPago),
        pagoDocenteId: pago.id,
      },
    });

    return pago;
  });

  await registrarAudit({
    accion: "NOMINA_REGISTRADA",
    entidad: "PagoDocente",
    entidadId: result.id,
    meta: { periodo: `${d.periodoMes}/${d.periodoAno}`, totalBs, registradoPor: usuario.email },
  });

  revalidatePath("/docentes");
  revalidatePath(`/docentes/${d.docenteId}`);
  revalidatePath("/contabilidad");
  revalidatePath("/dashboard");

  return { ok: true, pagoId: result.id };
}

/** Solo ADMIN. Anula el pago de nómina y su egreso en contabilidad. */
export async function anularPagoNomina(id: string, motivo: string): Promise<{ ok: boolean; error?: string }> {
  const usuario = await requireAdmin();
  const m = z.string().trim().min(5, "Indica el motivo (mínimo 5 caracteres)").max(300).safeParse(motivo);
  if (!m.success) return { ok: false, error: m.error.issues[0].message };

  const ahora = new Date();
  const anulado = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const { count } = await tx.pagoDocente.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: ahora, anuladoPor: usuario.email, motivoAnulacion: m.data },
    });
    if (count === 0) return false;
    await tx.egreso.updateMany({
      where: { pagoDocenteId: id, deletedAt: null },
      data: { deletedAt: ahora, anuladoPor: usuario.email, motivoAnulacion: m.data },
    });
    return true;
  });
  if (!anulado) return { ok: false, error: "El pago no existe o ya estaba anulado." };

  await registrarAudit({ accion: "NOMINA_ANULADA", entidad: "PagoDocente", entidadId: id, meta: { motivo: m.data } });
  revalidatePath("/docentes");
  revalidatePath("/contabilidad");
  revalidatePath("/dashboard");
  return { ok: true };
}

// ─── Detalle de un pago de nómina ─────────────────────────────────────────────

export async function getPagoNominaById(id: string) {
  await requireAdmin();
  return prisma.pagoDocente.findUnique({
    where: { id },
    include: {
      docente: true,
      tasaCambio: true,
    },
  });
}
