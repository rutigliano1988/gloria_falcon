"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const representanteSchema = z.object({
  tipo: z.enum(["MADRE", "PADRE", "TUTOR"]),
  apellidosNombres: z.string().min(1),
  edad: z.number().int().positive().optional().nullable(),
  cedula: z.string().optional().nullable(),
  telefonoHab: z.string().optional().nullable(),
  telefonoCelular: z.string().optional().nullable(),
  ocupacion: z.string().optional().nullable(),
  telefonoOficina: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
});

const alumnoSchema = z.object({
  primerApellido: z.string().min(1, "Obligatorio"),
  segundoApellido: z.string().optional().nullable(),
  primerNombre: z.string().min(1, "Obligatorio"),
  segundoNombre: z.string().optional().nullable(),
  cedulaEscolar: z.string().optional().nullable(),
  municipioNacimiento: z.string().optional().nullable(),
  estadoNacimiento: z.string().optional().nullable(),
  sexo: z.enum(["M", "F"]),
  fechaNacimiento: z.string().min(1, "Obligatorio"),
  domicilio: z.string().optional().nullable(),
  telefonoHogar: z.string().optional().nullable(),
  procedencia: z.enum(["HOGAR", "MISMO_PLANTEL", "OTRO_PLANTEL"]),
  nombrePlantelOrigen: z.string().optional().nullable(),
  // Salud
  enfermedadActual: z.string().optional().nullable(),
  tratamiento: z.string().optional().nullable(),
  alergiasMedicamentos: z.string().optional().nullable(),
  medicamentoFiebre: z.string().optional().nullable(),
  seguroSaludTelefono: z.string().optional().nullable(),
  // Representantes
  madre: representanteSchema.optional().nullable(),
  padre: representanteSchema.optional().nullable(),
  // Autorizados (hasta 2)
  autorizado1Nombre: z.string().optional().nullable(),
  autorizado1Cedula: z.string().optional().nullable(),
  autorizado2Nombre: z.string().optional().nullable(),
  autorizado2Cedula: z.string().optional().nullable(),
  // Contactos emergencia (hasta 3)
  contactos: z.array(z.object({ nombre: z.string(), telefono: z.string().optional().nullable() })).optional(),
  // Inscripción
  anoEscolarId: z.string().min(1, "Selecciona el año escolar"),
  gradoId: z.string().min(1, "Selecciona el grado"),
  seccionId: z.string().optional().nullable(),
  descuentoMontoUsd: z.number().min(0, "El descuento no puede ser negativo").optional().nullable(),
  descuentoObservacion: z.string().optional().nullable(),
  servicios: z.array(z.enum(["ALMUERZO", "RESGUARDO", "TAE_KWON_DO"])).optional(),
});

export type AlumnoFormData = z.infer<typeof alumnoSchema>;

// ─── Crear alumno + inscripción ───────────────────────────────────────────────

export async function crearAlumno(data: AlumnoFormData) {
  const parsed = alumnoSchema.parse(data);

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const alumno = await tx.alumno.create({
      data: {
        primerApellido: parsed.primerApellido,
        segundoApellido: parsed.segundoApellido,
        primerNombre: parsed.primerNombre,
        segundoNombre: parsed.segundoNombre,
        cedulaEscolar: parsed.cedulaEscolar || null,
        municipioNacimiento: parsed.municipioNacimiento,
        estadoNacimiento: parsed.estadoNacimiento,
        sexo: parsed.sexo,
        fechaNacimiento: new Date(parsed.fechaNacimiento),
        domicilio: parsed.domicilio,
        telefonoHogar: parsed.telefonoHogar,
        procedencia: parsed.procedencia,
        nombrePlantelOrigen: parsed.nombrePlantelOrigen,
        estado: "ACTIVO",
      },
    });

    // Salud
    await tx.saludAlumno.create({
      data: {
        alumnoId: alumno.id,
        enfermedadActual: parsed.enfermedadActual,
        tratamiento: parsed.tratamiento,
        alergiasMedicamentos: parsed.alergiasMedicamentos,
        medicamentoFiebre: parsed.medicamentoFiebre,
        seguroSaludTelefono: parsed.seguroSaludTelefono,
      },
    });

    // Representantes
    const reps = [];
    if (parsed.madre?.apellidosNombres) {
      reps.push({ ...parsed.madre, email: parsed.madre.email || null, alumnoId: alumno.id, tipo: "MADRE" as const });
    }
    if (parsed.padre?.apellidosNombres) {
      reps.push({ ...parsed.padre, email: parsed.padre.email || null, alumnoId: alumno.id, tipo: "PADRE" as const });
    }
    if (reps.length > 0) {
      await tx.representante.createMany({ data: reps });
    }

    // Autorizados
    const autorizados = [];
    if (parsed.autorizado1Nombre) {
      autorizados.push({ alumnoId: alumno.id, nombre: parsed.autorizado1Nombre, cedula: parsed.autorizado1Cedula, orden: 1 });
    }
    if (parsed.autorizado2Nombre) {
      autorizados.push({ alumnoId: alumno.id, nombre: parsed.autorizado2Nombre, cedula: parsed.autorizado2Cedula, orden: 2 });
    }
    if (autorizados.length > 0) {
      await tx.autorizadoRetiro.createMany({ data: autorizados });
    }

    // Contactos emergencia
    if (parsed.contactos && parsed.contactos.length > 0) {
      await tx.contactoEmergencia.createMany({
        data: parsed.contactos
          .filter((c) => c.nombre)
          .map((c, i) => ({ alumnoId: alumno.id, nombre: c.nombre, telefono: c.telefono, orden: i + 1 })),
      });
    }

    // Inscripción
    const inscripcion = await tx.inscripcion.create({
      data: {
        alumnoId: alumno.id,
        anoEscolarId: parsed.anoEscolarId,
        gradoId: parsed.gradoId,
        seccionId: parsed.seccionId || null,
        descuentoMontoUsd: parsed.descuentoMontoUsd ?? null,
        descuentoObservacion: parsed.descuentoObservacion,
      },
    });

    // Servicios
    if (parsed.servicios && parsed.servicios.length > 0) {
      await tx.servicioAlumno.createMany({
        data: parsed.servicios.map((tipo) => ({
          alumnoId: alumno.id,
          inscripcionId: inscripcion.id,
          tipo,
          activo: true,
        })),
      });
    }
  });

  revalidatePath("/alumnos");
}

// ─── Reinscripción ─────────────────────────────────────────────────────────────

const reinscripcionSchema = z.object({
  alumnoId: z.string().min(1),
  anoEscolarId: z.string().min(1),
  gradoId: z.string().min(1),
  seccionId: z.string().optional().nullable(),
  descuentoMontoUsd: z.number().min(0, "El descuento no puede ser negativo").optional().nullable(),
  descuentoObservacion: z.string().optional().nullable(),
  servicios: z.array(z.enum(["ALMUERZO", "RESGUARDO", "TAE_KWON_DO"])).optional(),
});

export async function reinscribirAlumno(data: z.infer<typeof reinscripcionSchema>) {
  const parsed = reinscripcionSchema.parse(data);

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const inscripcion = await tx.inscripcion.create({
      data: {
        alumnoId: parsed.alumnoId,
        anoEscolarId: parsed.anoEscolarId,
        gradoId: parsed.gradoId,
        seccionId: parsed.seccionId || null,
        descuentoMontoUsd: parsed.descuentoMontoUsd ?? null,
        descuentoObservacion: parsed.descuentoObservacion,
      },
    });

    if (parsed.servicios && parsed.servicios.length > 0) {
      await tx.servicioAlumno.createMany({
        data: parsed.servicios.map((tipo) => ({
          alumnoId: parsed.alumnoId,
          inscripcionId: inscripcion.id,
          tipo,
          activo: true,
        })),
      });
    }

    await tx.alumno.update({ where: { id: parsed.alumnoId }, data: { estado: "ACTIVO" } });
  });

  revalidatePath("/alumnos");
  revalidatePath(`/alumnos/${parsed.alumnoId}`);
}

// ─── Actualizar estado alumno ─────────────────────────────────────────────────

export async function cambiarEstadoAlumno(id: string, estado: "ACTIVO" | "RETIRADO" | "EGRESADO") {
  await prisma.alumno.update({ where: { id }, data: { estado } });
  revalidatePath("/alumnos");
  revalidatePath(`/alumnos/${id}`);
}

// ─── Listado ──────────────────────────────────────────────────────────────────

const ESTADOS_VALIDOS = ["ACTIVO", "RETIRADO", "EGRESADO"] as const;
type EstadoAlumnoEnum = (typeof ESTADOS_VALIDOS)[number];

export async function getAlumnos(query?: string, estado?: string) {
  const estadoFiltro = ESTADOS_VALIDOS.includes(estado as EstadoAlumnoEnum)
    ? (estado as EstadoAlumnoEnum)
    : undefined;

  return prisma.alumno.findMany({
    where: {
      estado: estadoFiltro,
      OR: query
        ? [
            { primerApellido: { contains: query, mode: "insensitive" } },
            { primerNombre: { contains: query, mode: "insensitive" } },
            { segundoApellido: { contains: query, mode: "insensitive" } },
            { segundoNombre: { contains: query, mode: "insensitive" } },
            { cedulaEscolar: { contains: query, mode: "insensitive" } },
          ]
        : undefined,
    },
    include: {
      inscripciones: {
        orderBy: { fechaInscripcion: "desc" },
        take: 1,
        include: { grado: true, seccion: true, anoEscolar: true },
      },
    },
    orderBy: [{ primerApellido: "asc" }, { primerNombre: "asc" }],
  });
}

export async function getAlumnoById(id: string) {
  return prisma.alumno.findUnique({
    where: { id },
    include: {
      representantes: true,
      autorizadosRetiro: { orderBy: { orden: "asc" } },
      saludAlumno: true,
      contactosEmergencia: { orderBy: { orden: "asc" } },
      inscripciones: {
        include: { grado: true, seccion: true, anoEscolar: true, servicios: true },
        orderBy: { fechaInscripcion: "desc" },
      },
    },
  });
}

export async function getGradosYAnosActivos() {
  const [grados, anos] = await Promise.all([
    prisma.grado.findMany({ where: { activo: true }, include: { secciones: { where: { activo: true } } }, orderBy: { orden: "asc" } }),
    prisma.anoEscolar.findMany({ orderBy: { nombre: "desc" } }),
  ]);
  return { grados, anos };
}
