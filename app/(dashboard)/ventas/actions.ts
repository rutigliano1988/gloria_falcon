"use server";

import { requireUser } from "@/lib/auth";
import { registrarAudit } from "@/lib/audit";
import { montoBsDesdeUsd, redondear2, totalConceptos } from "@/lib/finanzas";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type VentaResumen = {
  id: string;
  numeroRecibo: string | null;
  fechaPago: Date;
  tipo: string;
  montoUsd: number;
  montoBs: number | null;
  formaPago: string;
  monedaPagada: string;
  observaciones: string | null;
  conceptos: { concepto: string; montoUsd: number }[];
};

// ─── Schema ───────────────────────────────────────────────────────────────────

const conceptoVentaSchema = z.object({
  concepto: z.string().trim().min(1, "Describe cada concepto").max(80),
  montoUsd: z.number().positive("Cada concepto debe ser mayor a 0").max(100000),
});

// El total y el monto en Bs los calcula el servidor a partir de los conceptos.
const registrarVentaSchema = z.object({
  tipo: z.enum(["VENTA", "INGRESO_MANUAL"]),
  tasaAplicada: z.number().positive().max(10_000_000).nullable(),
  monedaPagada: z.enum(["USD", "BS"]),
  formaPago: z.enum(["EFECTIVO_USD", "EFECTIVO_BS", "PAGO_MOVIL_BS", "TRANSFERENCIA_BS"]),
  numeroReferencia: z.string().trim().max(60).nullable(),
  fechaPago: z.iso.date("Fecha inválida"),
  observaciones: z.string().trim().max(500).nullable(),
  conceptos: z.array(conceptoVentaSchema).min(1, "Agrega al menos un concepto").max(30),
});

export type RegistrarVentaInput = z.infer<typeof registrarVentaSchema>;

class ErrorValidacion extends Error {}

// ─── Fetch principal ──────────────────────────────────────────────────────────

export async function getVentasData(tipo?: string) {
  await requireUser();
  const tipoFiltro =
    tipo === "VENTA"
      ? "VENTA"
      : tipo === "INGRESO_MANUAL"
      ? "INGRESO_MANUAL"
      : undefined;

  const ventas = await prisma.pago.findMany({
    where: {
      tipo: tipoFiltro
        ? (tipoFiltro as "VENTA" | "INGRESO_MANUAL")
        : { in: ["VENTA", "INGRESO_MANUAL"] },
      deletedAt: null,
    },
    orderBy: { fechaPago: "desc" },
    take: 100,
    include: { conceptos: true },
  });

  // Stats del mes actual
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const ventasMes = ventas.filter(
    (v) => v.tipo === "VENTA" && v.fechaPago >= inicioMes
  );
  const ingresosMes = ventas.filter(
    (v) => v.tipo === "INGRESO_MANUAL" && v.fechaPago >= inicioMes
  );

  const totalVentasMes = ventasMes.reduce((s, v) => s + Number(v.montoUsd), 0);
  const totalIngresosMes = ingresosMes.reduce((s, v) => s + Number(v.montoUsd), 0);

  const lista: VentaResumen[] = ventas.map((v) => ({
    id: v.id,
    numeroRecibo: v.numeroRecibo,
    fechaPago: v.fechaPago,
    tipo: v.tipo,
    montoUsd: Number(v.montoUsd),
    montoBs: v.montoBs ? Number(v.montoBs) : null,
    formaPago: v.formaPago,
    monedaPagada: v.monedaPagada,
    observaciones: v.observaciones,
    conceptos: v.conceptos.map((c) => ({
      concepto: c.concepto,
      montoUsd: Number(c.montoUsd),
    })),
  }));

  return {
    ventas: lista,
    totalVentasMes,
    totalIngresosMes,
    totalMes: totalVentasMes + totalIngresosMes,
  };
}

// ─── Datos para el formulario ─────────────────────────────────────────────────

export async function getVentaFormData() {
  await requireUser();
  const [productos, tasaActual] = await Promise.all([
    prisma.producto.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.tasaCambio.findFirst({ orderBy: { fechaRegistro: "desc" } }),
  ]);
  return { productos, tasaActual };
}

// ─── Registrar venta / ingreso ────────────────────────────────────────────────

export async function registrarVenta(
  data: RegistrarVentaInput
): Promise<{ ok: true; pagoId: string; numeroRecibo: string } | { ok: false; error: string }> {
  const usuario = await requireUser();
  const parsed = registrarVentaSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => i.message).join(" · ") };
  const d = parsed.data;

  if ((d.monedaPagada === "USD") !== (d.formaPago === "EFECTIVO_USD")) {
    return { ok: false, error: "La forma de pago no corresponde a la moneda." };
  }
  const referencia = d.numeroReferencia || null;
  if (["PAGO_MOVIL_BS", "TRANSFERENCIA_BS"].includes(d.formaPago) && !referencia) {
    return { ok: false, error: "El número de referencia es obligatorio para este tipo de pago." };
  }
  if (d.monedaPagada === "BS" && !d.tasaAplicada) return { ok: false, error: "Ingresa la tasa de cambio aplicada." };
  const fechaPago = new Date(d.fechaPago);
  if (fechaPago.getTime() > Date.now() + 36 * 60 * 60 * 1000) {
    return { ok: false, error: "La fecha no puede ser futura." };
  }

  const conceptos = d.conceptos.map((c) => ({ concepto: c.concepto, montoUsd: redondear2(c.montoUsd) }));
  const montoUsd = totalConceptos(conceptos);
  const tasaAplicada = d.monedaPagada === "BS" ? d.tasaAplicada! : null;
  const montoBs = tasaAplicada ? montoBsDesdeUsd(montoUsd, tasaAplicada) : null;
  const tasaOficial = await prisma.tasaCambio.findFirst({ orderBy: { fechaRegistro: "desc" } });

  const prefijo = `V-${fechaPago.getUTCFullYear()}-`;

  let result!: { pagoId: string; numeroRecibo: string };
  try {
    for (let intento = 0; intento < 3; intento++) {
      try {
        result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          if (referencia) {
            const repetida = await tx.pago.findFirst({
              where: { formaPago: d.formaPago, numeroReferencia: referencia, deletedAt: null },
              select: { numeroRecibo: true },
            });
            if (repetida) {
              throw new ErrorValidacion(
                `La referencia ${referencia} ya se usó en el recibo ${repetida.numeroRecibo ?? "(sin número)"}.`
              );
            }
          }

          const ultimoRecibo = await tx.pago.findFirst({
            where: {
              tipo: { in: ["VENTA", "INGRESO_MANUAL"] },
              numeroRecibo: { startsWith: prefijo },
            },
            orderBy: { numeroRecibo: "desc" },
          });

          let nextNum = 1;
          if (ultimoRecibo?.numeroRecibo) {
            const partes = ultimoRecibo.numeroRecibo.split("-");
            const ultimo = parseInt(partes[partes.length - 1]);
            if (!isNaN(ultimo)) nextNum = ultimo + 1;
          }
          const numeroRecibo = `${prefijo}${String(nextNum).padStart(4, "0")}`;

          const pago = await tx.pago.create({
            data: {
              tipo: d.tipo,
              alumnoId: null,
              anoEscolarId: null,
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
            data: conceptos.map((c) => ({ pagoId: pago.id, concepto: c.concepto, mesAno: null, montoUsd: c.montoUsd })),
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
    accion: "VENTA_REGISTRADA",
    entidad: "Pago",
    entidadId: result.pagoId,
    meta: { numeroRecibo: result.numeroRecibo, montoUsd, tipo: d.tipo, registradoPor: usuario.email },
  });

  revalidatePath("/ventas");
  revalidatePath("/dashboard");

  return { ok: true, ...result };
}

// ─── Detalle de una venta ──────────────────────────────────────────────────────

export async function getVentaById(id: string) {
  await requireUser();
  return prisma.pago.findUnique({
    where: { id },
    include: {
      conceptos: { orderBy: { concepto: "asc" } },
      tasaCambio: true,
    },
  });
}
