"use server";

import { requireAdmin, requireUser } from "@/lib/auth";
import { registrarAudit } from "@/lib/audit";
import { egresoEnUsd, montoUsdDesdeBs, redondear2 } from "@/lib/finanzas";
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
  /** Equivalente en USD con la tasa del día del egreso (null si no hay tasa). */
  montoUsdEquivalente: number | null;
  formaPago: string | null;
  proveedor: string | null;
  numeroFactura: string | null;
  pagoDocenteId: string | null;
  docenteNombre: string | null;
};

// ─── Fetch principal ──────────────────────────────────────────────────────────

export async function getContabilidadData(mes?: number, ano?: number) {
  const usuario = await requireUser();
  const hoy = new Date();
  const mesEfectivo = mes && mes >= 1 && mes <= 12 ? mes : hoy.getMonth() + 1;
  const anoEfectivo = ano && ano > 2000 ? ano : hoy.getFullYear();

  const inicio = new Date(anoEfectivo, mesEfectivo - 1, 1);
  const fin = new Date(anoEfectivo, mesEfectivo, 0, 23, 59, 59);

  const [pagos, egresos, tasaActual] = await Promise.all([
    prisma.pago.findMany({
      where: { fechaPago: { gte: inicio, lte: fin }, deletedAt: null },
      orderBy: { fechaPago: "desc" },
    }),
    prisma.egreso.findMany({
      where: { fecha: { gte: inicio, lte: fin }, deletedAt: null },
      orderBy: { fecha: "desc" },
      include: {
        categoriaEgreso: true,
        tasaCambio: true,
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

  // Cada egreso se convierte con SU tasa (la aplicada o la de su día). La tasa
  // actual solo se usa como último recurso para registros antiguos sin tasa (M9).
  const egresosDetalle: EgresoConDetalle[] = egresos.map((e) => {
    const montoUsd = e.montoUsd != null ? Number(e.montoUsd) : null;
    const montoBs = e.montoBs != null ? Number(e.montoBs) : null;
    const tasaDelDia = e.tasaAplicada
      ? Number(e.tasaAplicada)
      : e.tasaCambio
      ? Number(e.tasaCambio.tasa)
      : tasa || null;
    return {
      id: e.id,
      fecha: e.fecha,
      categoria: e.categoriaEgreso.nombre,
      descripcion: e.descripcion,
      montoUsd,
      montoBs,
      montoUsdEquivalente: egresoEnUsd({ montoUsd, montoBs, tasaDelDia }),
      formaPago: e.formaPago,
      proveedor: e.proveedor,
      numeroFactura: e.numeroFactura,
      pagoDocenteId: e.pagoDocenteId,
      docenteNombre: e.pagoDocente
        ? `${e.pagoDocente.docente.primerApellido} ${e.pagoDocente.docente.primerNombre}`
        : null,
    };
  });

  const totalEgresosUsd = redondear2(egresosDetalle.reduce((s, e) => s + (e.montoUsdEquivalente ?? 0), 0));

  // Desglose egresos por categoría
  const egresosPorCategoria: Record<string, number> = {};
  for (const e of egresosDetalle) {
    egresosPorCategoria[e.categoria] = (egresosPorCategoria[e.categoria] ?? 0) + (e.montoUsdEquivalente ?? 0);
  }

  const balance = totalIngresosUsd - totalEgresosUsd;

  // La nómina individual (docente + monto) solo la ve el ADMIN. Para el resto,
  // los egresos de nómina se muestran como una sola línea agregada del mes.
  const egresosVisibles =
    usuario.rol === "ADMIN" ? egresosDetalle : agregarNomina(egresosDetalle, fin);

  return {
    mes: mesEfectivo,
    ano: anoEfectivo,
    totalIngresosUsd,
    porTipo,
    totalEgresosUsd,
    egresosPorCategoria,
    balance,
    tasa,
    egresos: egresosVisibles,
  };
}

function agregarNomina(egresos: EgresoConDetalle[], fechaCorte: Date): EgresoConDetalle[] {
  const nomina = egresos.filter((e) => e.pagoDocenteId != null);
  if (nomina.length === 0) return egresos;
  const sumar = (vals: (number | null)[]) =>
    vals.every((v) => v == null) ? null : vals.reduce<number>((s, v) => s + (v ?? 0), 0);
  const resumen: EgresoConDetalle = {
    id: "nomina-agregada",
    fecha: fechaCorte,
    categoria: nomina[0].categoria,
    descripcion: `Nómina del mes (total de ${nomina.length} pago${nomina.length === 1 ? "" : "s"})`,
    montoUsd: sumar(nomina.map((e) => e.montoUsd)),
    montoBs: sumar(nomina.map((e) => e.montoBs)),
    montoUsdEquivalente: sumar(nomina.map((e) => e.montoUsdEquivalente)),
    formaPago: null,
    proveedor: null,
    numeroFactura: null,
    pagoDocenteId: null,
    docenteNombre: null,
  };
  return [...egresos.filter((e) => e.pagoDocenteId == null), resumen];
}

// ─── Datos para el formulario de egreso ───────────────────────────────────────

export async function getEgresoFormData() {
  await requireUser();
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
    categoriaEgresoId: z.string().min(1, "Selecciona una categoría").max(50),
    descripcion: z.string().trim().max(300).optional().nullable(),
    moneda: z.enum(["USD", "BS"]),
    monto: z.number().positive("El monto debe ser mayor a 0").max(1_000_000_000),
    tasaAplicada: z.number().positive().max(10_000_000).nullable(),
    formaPago: z
      .enum(["EFECTIVO_USD", "EFECTIVO_BS", "PAGO_MOVIL_BS", "TRANSFERENCIA_BS"])
      .nullable(),
    numeroReferencia: z.string().trim().max(60).nullable(),
    proveedor: z.string().trim().max(120).optional().nullable(),
    numeroFactura: z.string().trim().max(60).optional().nullable(),
    fecha: z.iso.date("Fecha inválida"),
  })
  .refine((d) => d.moneda === "USD" || d.tasaAplicada != null, {
    message: "Para un egreso en Bs indica la tasa de cambio del día",
  });

export type RegistrarEgresoInput = z.infer<typeof registrarEgresoSchema>;

export async function registrarEgreso(data: RegistrarEgresoInput): Promise<{ ok: boolean; error?: string }> {
  const usuario = await requireUser();
  const parsed = registrarEgresoSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => i.message).join(" · ") };
  const d = parsed.data;
  if (d.formaPago && ["PAGO_MOVIL_BS", "TRANSFERENCIA_BS"].includes(d.formaPago) && !d.numeroReferencia) {
    return { ok: false, error: "El número de referencia es obligatorio para este tipo de pago." };
  }

  // Siempre se guarda el equivalente en USD con la tasa del día: así los
  // reportes no dependen de la tasa vigente al consultarlos (A4/M9).
  const montoUsd = d.moneda === "USD" ? redondear2(d.monto) : montoUsdDesdeBs(d.monto, d.tasaAplicada!);
  const montoBs = d.moneda === "BS" ? redondear2(d.monto) : null;
  const tasaOficial = await prisma.tasaCambio.findFirst({ orderBy: { fechaRegistro: "desc" } });

  const egreso = await prisma.egreso.create({
    data: {
      categoriaEgresoId: d.categoriaEgresoId,
      descripcion: d.descripcion || null,
      montoUsd,
      montoBs,
      tasaAplicada: d.tasaAplicada,
      tasaCambioId: tasaOficial?.id ?? null,
      formaPago: d.formaPago,
      numeroReferencia: d.numeroReferencia || null,
      proveedor: d.proveedor || null,
      numeroFactura: d.numeroFactura || null,
      fecha: new Date(d.fecha),
    },
  });

  await registrarAudit({
    accion: "EGRESO_REGISTRADO",
    entidad: "Egreso",
    entidadId: egreso.id,
    meta: { montoUsd, montoBs, registradoPor: usuario.email },
  });
  revalidatePath("/contabilidad");
  revalidatePath("/dashboard");
  return { ok: true };
}

// ─── Anular egreso ────────────────────────────────────────────────────────────

/** Solo ADMIN. Los egresos de nómina se anulan desde el pago de nómina. */
export async function anularEgreso(id: string, motivo: string): Promise<{ ok: boolean; error?: string }> {
  const usuario = await requireAdmin();
  const m = z.string().trim().min(5, "Indica el motivo (mínimo 5 caracteres)").max(300).safeParse(motivo);
  if (!m.success) return { ok: false, error: m.error.issues[0].message };

  const { count } = await prisma.egreso.updateMany({
    where: { id, deletedAt: null, pagoDocenteId: null },
    data: { deletedAt: new Date(), anuladoPor: usuario.email, motivoAnulacion: m.data },
  });
  if (count === 0) return { ok: false, error: "El egreso no existe, ya estaba anulado o es de nómina." };

  await registrarAudit({ accion: "EGRESO_ANULADO", entidad: "Egreso", entidadId: id, meta: { motivo: m.data } });
  revalidatePath("/contabilidad");
  revalidatePath("/dashboard");
  return { ok: true };
}
