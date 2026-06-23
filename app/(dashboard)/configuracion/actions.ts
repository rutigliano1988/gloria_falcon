"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { registrarAudit } from "@/lib/audit";

// ─── Año Escolar ─────────────────────────────────────────────────────────────

const anoEscolarSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  lapsos: z.array(z.object({
    nombre: z.string().min(1),
    fechaInicio: z.string(),
    fechaFin: z.string(),
  })).length(3, "Deben ser exactamente 3 lapsos"),
});

export async function crearAnoEscolar(data: z.infer<typeof anoEscolarSchema>) {
  await requireAdmin();
  const parsed = anoEscolarSchema.parse(data);

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const ano = await tx.anoEscolar.create({
      data: { nombre: parsed.nombre, activo: false },
    });

    await tx.lapso.createMany({
      data: parsed.lapsos.map((l) => ({
        anoEscolarId: ano.id,
        nombre: l.nombre,
        fechaInicio: new Date(l.fechaInicio),
        fechaFin: new Date(l.fechaFin),
      })),
    });
  });

  revalidatePath("/configuracion");
}

export async function activarAnoEscolar(id: string) {
  await requireAdmin();
  const ano = await prisma.anoEscolar.findUnique({ where: { id }, select: { nombre: true } });
  await prisma.$transaction([
    prisma.anoEscolar.updateMany({ where: {}, data: { activo: false } }),
    prisma.anoEscolar.update({ where: { id }, data: { activo: true } }),
  ]);
  await registrarAudit({
    accion: "ANO_ESCOLAR_ACTIVADO",
    entidad: "AnoEscolar",
    entidadId: id,
    meta: { nombre: ano?.nombre },
  });
  revalidatePath("/configuracion");
  revalidatePath("/dashboard");
}

// ─── Grados y Secciones ───────────────────────────────────────────────────────

const gradoSchema = z.object({
  nombre: z.string().min(1),
  nivel: z.enum(["PREESCOLAR", "PRIMARIA"]),
  orden: z.number().int(),
});

export async function crearGrado(data: z.infer<typeof gradoSchema>) {
  const parsed = gradoSchema.parse(data);
  await prisma.grado.create({ data: parsed });
  revalidatePath("/configuracion");
}

export async function toggleGrado(id: string, activo: boolean) {
  await prisma.grado.update({ where: { id }, data: { activo } });
  revalidatePath("/configuracion");
}

const seccionSchema = z.object({
  nombre: z.string().min(1),
  gradoId: z.string().min(1),
});

export async function crearSeccion(data: z.infer<typeof seccionSchema>) {
  const parsed = seccionSchema.parse(data);
  await prisma.seccion.create({ data: parsed });
  revalidatePath("/configuracion");
}

// ─── Tasa de Cambio ───────────────────────────────────────────────────────────

const tasaSchema = z.object({
  tasa: z.number().positive("La tasa debe ser positiva"),
});

export async function registrarTasa(data: z.infer<typeof tasaSchema>) {
  await requireAdmin();
  const parsed = tasaSchema.parse(data);
  const tasa = await prisma.tasaCambio.create({
    data: {
      tasa: parsed.tasa,
      fechaRegistro: new Date(),
    },
  });
  await registrarAudit({
    accion: "TASA_REGISTRADA",
    entidad: "TasaCambio",
    entidadId: tasa.id,
    meta: { tasa: parsed.tasa },
  });
  revalidatePath("/configuracion");
}

// ─── Productos ────────────────────────────────────────────────────────────────

const productoSchema = z.object({
  nombre: z.string().min(1),
  precioUsd: z.number().positive(),
});

export async function crearProducto(data: z.infer<typeof productoSchema>) {
  await prisma.producto.create({ data: productoSchema.parse(data) });
  revalidatePath("/configuracion");
}

export async function actualizarProducto(id: string, data: z.infer<typeof productoSchema>) {
  await prisma.producto.update({ where: { id }, data: productoSchema.parse(data) });
  revalidatePath("/configuracion");
}

export async function toggleProducto(id: string, activo: boolean) {
  await prisma.producto.update({ where: { id }, data: { activo } });
  revalidatePath("/configuracion");
}

// ─── Categorías de Egreso ─────────────────────────────────────────────────────

export async function crearCategoriaEgreso(nombre: string) {
  await prisma.categoriaEgreso.create({ data: { nombre } });
  revalidatePath("/configuracion");
}

export async function toggleCategoriaEgreso(id: string, activo: boolean) {
  await prisma.categoriaEgreso.update({ where: { id }, data: { activo } });
  revalidatePath("/configuracion");
}

// ─── Configuración general (colegio) ─────────────────────────────────────────

export async function guardarConfigColegio(data: {
  nombre: string;
  rif: string;
  direccion: string;
  telefonos: string;
  correo: string;
}) {
  await prisma.configuracion.upsert({
    where: { clave: "datos_colegio" },
    update: { valor: data },
    create: { clave: "datos_colegio", valor: data },
  });
  revalidatePath("/configuracion");
}

// ─── Datos de fetch ───────────────────────────────────────────────────────────

export async function getConfiguracionData() {
  const [
    anosEscolares,
    grados,
    tasas,
    productos,
    categoriasEgreso,
    configColegio,
  ] = await Promise.all([
    prisma.anoEscolar.findMany({ include: { lapsos: true }, orderBy: { nombre: "desc" } }),
    prisma.grado.findMany({ include: { secciones: true }, orderBy: { orden: "asc" } }),
    prisma.tasaCambio.findMany({ orderBy: { fechaRegistro: "desc" }, take: 10 }),
    prisma.producto.findMany({ orderBy: { nombre: "asc" } }),
    prisma.categoriaEgreso.findMany({ orderBy: { nombre: "asc" } }),
    prisma.configuracion.findUnique({ where: { clave: "datos_colegio" } }),
  ]);

  return { anosEscolares, grados, tasas, productos, categoriasEgreso, configColegio };
}
