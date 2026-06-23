"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { MESES } from "@/lib/utils";
import { registrarAudit } from "@/lib/audit";

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
  fechaIngreso: z.string().optional().nullable(),
});

export type DocenteFormData = z.infer<typeof docenteSchema>;

const conceptoSchema = z.object({
  descripcion: z.string().min(1),
  montoBs: z.number(),
});

const pagoNominaSchema = z.object({
  docenteId: z.string().min(1),
  periodoMes: z.number().int().min(1).max(12),
  periodoAno: z.number().int().positive(),
  baseBs: z.number().positive("La base debe ser mayor a 0"),
  bonoUsd: z.number().nonnegative().nullable(),
  bonoBsEquivalente: z.number().nonnegative().nullable(),
  tasaCambioId: z.string().nullable(),
  otrosConceptos: z.array(conceptoSchema),
  deducciones: z.array(conceptoSchema),
  totalBs: z.number().positive("El total debe ser mayor a 0"),
  formaPago: z.enum(["EFECTIVO_USD", "EFECTIVO_BS", "PAGO_MOVIL_BS", "TRANSFERENCIA_BS"]),
  numeroReferencia: z.string().nullable(),
  fechaPago: z.string().min(1),
});

export type PagoNominaInput = z.infer<typeof pagoNominaSchema>;

// ─── Listado de docentes ───────────────────────────────────────────────────────

export async function getDocentes(query?: string, estado?: string) {
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
  return prisma.docente.findUnique({
    where: { id },
    include: {
      pagosDocente: {
        orderBy: [{ periodoAno: "desc" }, { periodoMes: "desc" }],
        take: 12,
        include: { tasaCambio: true },
      },
    },
  });
}

// ─── Crear docente ─────────────────────────────────────────────────────────────

export async function crearDocente(data: DocenteFormData) {
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
      fechaIngreso: parsed.fechaIngreso ? new Date(parsed.fechaIngreso) : null,
    },
  });
  revalidatePath("/docentes");
}

// ─── Actualizar docente ────────────────────────────────────────────────────────

export async function actualizarDocente(id: string, data: DocenteFormData) {
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
      fechaIngreso: parsed.fechaIngreso ? new Date(parsed.fechaIngreso) : null,
    },
  });
  revalidatePath("/docentes");
  revalidatePath(`/docentes/${id}`);
}

// ─── Cambiar estado ────────────────────────────────────────────────────────────

export async function toggleEstadoDocente(id: string, estado: "ACTIVO" | "INACTIVO") {
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

export async function registrarPagoNomina(data: PagoNominaInput) {
  const parsed = pagoNominaSchema.parse(data);

  const docente = await prisma.docente.findUnique({
    where: { id: parsed.docenteId },
    select: { primerApellido: true, primerNombre: true },
  });

  const mesLabel = MESES[parsed.periodoMes - 1] ?? String(parsed.periodoMes);
  const descripcionEgreso = `Nómina ${mesLabel} ${parsed.periodoAno} — ${docente?.primerApellido ?? ""} ${docente?.primerNombre ?? ""}`.trim();

  // Obtener o crear categoría "Nómina"
  const categoriaUpsert = await prisma.categoriaEgreso.upsert({
    where: { nombre: "Nómina" },
    create: { nombre: "Nómina", activo: true },
    update: {},
  });

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const pago = await tx.pagoDocente.create({
      data: {
        docenteId: parsed.docenteId,
        periodoMes: parsed.periodoMes,
        periodoAno: parsed.periodoAno,
        baseBs: parsed.baseBs,
        bonoUsd: parsed.bonoUsd,
        bonoBsEquivalente: parsed.bonoBsEquivalente,
        otrosConceptos: parsed.otrosConceptos.length > 0 ? parsed.otrosConceptos : undefined,
        deducciones: parsed.deducciones.length > 0 ? parsed.deducciones : undefined,
        tasaCambioId: parsed.tasaCambioId,
        formaPago: parsed.formaPago,
        numeroReferencia: parsed.numeroReferencia,
        fechaPago: new Date(parsed.fechaPago),
        totalBs: parsed.totalBs,
      },
    });

    // Egreso automático en contabilidad
    await tx.egreso.create({
      data: {
        categoriaEgresoId: categoriaUpsert.id,
        descripcion: descripcionEgreso,
        montoBs: parsed.totalBs,
        tasaCambioId: parsed.tasaCambioId,
        formaPago: parsed.formaPago,
        fecha: new Date(parsed.fechaPago),
        pagoDocenteId: pago.id,
      },
    });

    return pago;
  });

  revalidatePath("/docentes");
  revalidatePath(`/docentes/${parsed.docenteId}`);
  revalidatePath("/contabilidad");

  return { pagoId: result.id };
}

// ─── Detalle de un pago de nómina ─────────────────────────────────────────────

export async function getPagoNominaById(id: string) {
  return prisma.pagoDocente.findUnique({
    where: { id },
    include: {
      docente: true,
      tasaCambio: true,
    },
  });
}
