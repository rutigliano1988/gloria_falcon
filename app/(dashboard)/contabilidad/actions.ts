"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DesgloseTipo = {
  MENSUALIDAD: number;
  VENTA: number;
  INGRESO_MANUAL: number;
  INSCRIPCION: number;
};

export type EgresoConDetalle = {
  id: string;
  fecha: Date;
  categoria: string;
  descripcion: string | null;
  montoUsd: number | null;
  montoBs: number | null;
  formaPago: string | null;
  proveedor: string | null;
  numeroFactura: string | null;
  pagoDocenteId: string | null;
  docenteNombre: string | null;
};

// ─── Fetch principal ──────────────────────────────────────────────────────────

export async function getContabilidadData(mes?: number, ano?: number) {
  const hoy = new Date();
  const mesEfectivo = mes && mes >= 1 && mes <= 12 ? mes : hoy.getMonth() + 1;
  const anoEfectivo = ano && ano > 2000 ? ano : hoy.getFullYear();

  const inicio = new Date(anoEfectivo, mesEfectivo - 1, 1);
  const fin = new Date(anoEfectivo, mesEfectivo, 0, 23, 59, 59);

  const [pagos, egresos, tasaActual] = await Promise.all([
    prisma.pago.findMany({
      where: { fechaPago: { gte: inicio, lte: fin } },
      orderBy: { fechaPago: "desc" },
    }),
    prisma.egreso.findMany({
      where: { fecha: { gte: inicio, lte: fin } },
      orderBy: { fecha: "desc" },
      include: {
        categoriaEgreso: true,
        pagoDocente: {
          include: { docente: true },
        },
      },
    }),
    prisma.tasaCambio.findFirst({ orderBy: { fechaRegistro: "desc" } }),
  ]);

  const tasa = tasaActual ? Number(tasaActual.tasa) : 0;

  // ─── Ingresos ─────────────────────────────────────────────────────────────

  const totalIngresosUsd = pagos.reduce((s, p) => s + Number(p.montoUsd), 0);

  const porTipo: DesgloseTipo = {
    MENSUALIDAD: pagos
      .filter((p) => p.tipo === "MENSUALIDAD")
      .reduce((s, p) => s + Number(p.montoUsd), 0),
    VENTA: pagos
      .filter((p) => p.tipo === "VENTA")
      .reduce((s, p) => s + Number(p.montoUsd), 0),
    INGRESO_MANUAL: pagos
      .filter((p) => p.tipo === "INGRESO_MANUAL")
      .reduce((s, p) => s + Number(p.montoUsd), 0),
    INSCRIPCION: pagos
      .filter((p) => p.tipo === "INSCRIPCION")
      .reduce((s, p) => s + Number(p.montoUsd), 0),
  };

  // ─── Egresos ──────────────────────────────────────────────────────────────

  const egresosDetalle: EgresoConDetalle[] = egresos.map((e) => ({
    id: e.id,
    fecha: e.fecha,
    categoria: e.categoriaEgreso.nombre,
    descripcion: e.descripcion,
    montoUsd: e.montoUsd ? Number(e.montoUsd) : null,
    montoBs: e.montoBs ? Number(e.montoBs) : null,
    formaPago: e.formaPago,
    proveedor: e.proveedor,
    numeroFactura: e.numeroFactura,
    pagoDocenteId: e.pagoDocenteId,
    docenteNombre: e.pagoDocente
      ? `${e.pagoDocente.docente.primerApellido} ${e.pagoDocente.docente.primerNombre}`
      : null,
  }));

  const totalEgresosUsd = egresosDetalle.reduce((s, e) => {
    if (e.montoUsd != null) return s + e.montoUsd;
    if (e.montoBs != null && tasa > 0) return s + e.montoBs / tasa;
    return s;
  }, 0);

  // Desglose egresos por categoría
  const egresosPorCategoria: Record<string, number> = {};
  for (const e of egresosDetalle) {
    const montoUsd =
      e.montoUsd != null
        ? e.montoUsd
        : e.montoBs != null && tasa > 0
        ? e.montoBs / tasa
        : 0;
    egresosPorCategoria[e.categoria] =
      (egresosPorCategoria[e.categoria] ?? 0) + montoUsd;
  }

  const balance = totalIngresosUsd - totalEgresosUsd;

  return {
    mes: mesEfectivo,
    ano: anoEfectivo,
    totalIngresosUsd,
    porTipo,
    totalEgresosUsd,
    egresosPorCategoria,
    balance,
    tasa,
    egresos: egresosDetalle,
  };
}

// ─── Datos para el formulario de egreso ───────────────────────────────────────

export async function getEgresoFormData() {
  const [categorias, tasaActual] = await Promise.all([
    prisma.categoriaEgreso.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.tasaCambio.findFirst({ orderBy: { fechaRegistro: "desc" } }),
  ]);
  return { categorias, tasaActual };
}

// ─── Registrar egreso manual ──────────────────────────────────────────────────

const registrarEgresoSchema = z
  .object({
    categoriaEgresoId: z.string().min(1, "Selecciona una categoría"),
    descripcion: z.string().optional().nullable(),
    montoUsd: z.number().positive().nullable(),
    montoBs: z.number().positive().nullable(),
    tasaCambioId: z.string().nullable(),
    formaPago: z
      .enum(["EFECTIVO_USD", "EFECTIVO_BS", "PAGO_MOVIL_BS", "TRANSFERENCIA_BS"])
      .nullable(),
    proveedor: z.string().optional().nullable(),
    numeroFactura: z.string().optional().nullable(),
    fecha: z.string().min(1),
  })
  .refine((d) => d.montoUsd != null || d.montoBs != null, {
    message: "Ingresa el monto en USD o en Bs",
  });

export type RegistrarEgresoInput = z.infer<typeof registrarEgresoSchema>;

export async function registrarEgreso(data: RegistrarEgresoInput) {
  const parsed = registrarEgresoSchema.parse(data);

  await prisma.egreso.create({
    data: {
      categoriaEgresoId: parsed.categoriaEgresoId,
      descripcion: parsed.descripcion || null,
      montoUsd: parsed.montoUsd,
      montoBs: parsed.montoBs,
      tasaCambioId: parsed.tasaCambioId,
      formaPago: parsed.formaPago,
      proveedor: parsed.proveedor || null,
      numeroFactura: parsed.numeroFactura || null,
      fecha: new Date(parsed.fecha),
    },
  });

  revalidatePath("/contabilidad");
}
