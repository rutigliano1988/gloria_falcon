"use server";

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
  concepto: z.string().min(1),
  montoUsd: z.number(),
});

const registrarVentaSchema = z.object({
  tipo: z.enum(["VENTA", "INGRESO_MANUAL"]),
  montoUsd: z.number().positive("El monto debe ser mayor a 0"),
  montoBs: z.number().nonnegative().nullable(),
  tasaCambioId: z.string().nullable(),
  monedaPagada: z.enum(["USD", "BS"]),
  formaPago: z.enum(["EFECTIVO_USD", "EFECTIVO_BS", "PAGO_MOVIL_BS", "TRANSFERENCIA_BS"]),
  numeroReferencia: z.string().nullable(),
  fechaPago: z.string().min(1),
  observaciones: z.string().nullable(),
  conceptos: z.array(conceptoVentaSchema).min(1, "Agrega al menos un concepto"),
});

export type RegistrarVentaInput = z.infer<typeof registrarVentaSchema>;

// ─── Fetch principal ──────────────────────────────────────────────────────────

export async function getVentasData(tipo?: string) {
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

export async function registrarVenta(data: RegistrarVentaInput) {
  const parsed = registrarVentaSchema.parse(data);

  const ano = new Date(parsed.fechaPago).getFullYear();
  const prefijo = `V-${ano}-`;

  let result!: { pagoId: string; numeroRecibo: string };
  for (let intento = 0; intento < 3; intento++) {
    try {
      result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
            tipo: parsed.tipo,
            alumnoId: null,
            anoEscolarId: null,
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
            mesAno: null,
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

  revalidatePath("/ventas");
  revalidatePath("/dashboard");

  return result;
}

// ─── Detalle de una venta ──────────────────────────────────────────────────────

export async function getVentaById(id: string) {
  return prisma.pago.findUnique({
    where: { id },
    include: {
      conceptos: { orderBy: { concepto: "asc" } },
      tasaCambio: true,
    },
  });
}
