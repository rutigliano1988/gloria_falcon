"use server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { registrarAudit } from "@/lib/audit";
import { parsePrismaError } from "@/lib/utils";
import { ALUMNOS_POR_PAGINA } from "./constants";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const representanteSchema = z.object({
  tipo: z.enum(["MADRE", "PADRE", "TUTOR"]),
  apellidosNombres: z.string().min(1),
  fechaNacimiento: z.string().optional().nullable(),
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
  await requireUser();
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
      reps.push({ ...parsed.madre, email: parsed.madre.email || null, alumnoId: alumno.id, tipo: "MADRE" as const, fechaNacimiento: parsed.madre.fechaNacimiento ? new Date(parsed.madre.fechaNacimiento) : null });
    }
    if (parsed.padre?.apellidosNombres) {
      reps.push({ ...parsed.padre, email: parsed.padre.email || null, alumnoId: alumno.id, tipo: "PADRE" as const, fechaNacimiento: parsed.padre.fechaNacimiento ? new Date(parsed.padre.fechaNacimiento) : null });
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

// ─── Editar ficha (rectificación de datos) ────────────────────────────────────

// Texto opcional: recorta espacios, limita longitud y guarda "" como null.
const texto = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .nullish()
    .transform((v) => v || null);
const fechaOpcional = z
  .union([z.iso.date("Fecha inválida"), z.literal("")])
  .nullish()
  .transform((v) => (v ? new Date(v) : null));

const representanteEdicionSchema = z.object({
  id: z.string().min(1).optional(),
  tipo: z.enum(["MADRE", "PADRE", "TUTOR"]),
  apellidosNombres: z.string().trim().min(1, "Nombre del representante obligatorio").max(150),
  fechaNacimiento: fechaOpcional,
  cedula: texto(20),
  telefonoHab: texto(30),
  telefonoCelular: texto(30),
  ocupacion: texto(100),
  telefonoOficina: texto(30),
  email: z
    .union([z.email("Correo inválido").max(150), z.literal("")])
    .nullish()
    .transform((v) => v || null),
});

const personaSchema = z.object({ nombre: z.string().trim().max(150), cedula: texto(20) });
const contactoSchema = z.object({ nombre: z.string().trim().max(150), telefono: texto(30) });

const edicionAlumnoSchema = z.object({
  primerApellido: z.string().trim().min(1, "Primer apellido obligatorio").max(60),
  segundoApellido: texto(60),
  primerNombre: z.string().trim().min(1, "Primer nombre obligatorio").max(60),
  segundoNombre: texto(60),
  cedulaEscolar: texto(20),
  municipioNacimiento: texto(80),
  estadoNacimiento: texto(40),
  sexo: z.enum(["M", "F"], "Selecciona el sexo"),
  fechaNacimiento: z.iso.date("Fecha de nacimiento inválida"),
  domicilio: texto(300),
  telefonoHogar: texto(30),
  procedencia: z.enum(["HOGAR", "MISMO_PLANTEL", "OTRO_PLANTEL"]),
  nombrePlantelOrigen: texto(150),
  salud: z.object({
    enfermedadActual: texto(500),
    tratamiento: texto(500),
    alergiasMedicamentos: texto(500),
    medicamentoFiebre: texto(200),
    seguroSaludTelefono: texto(30),
  }),
  representantes: z.array(representanteEdicionSchema).max(6),
  autorizados: z.array(personaSchema).max(6),
  contactos: z.array(contactoSchema).max(6),
});

export type EdicionAlumnoInput = z.input<typeof edicionAlumnoSchema>;
export type ResultadoEdicion = { ok: true } | { ok: false; error: string };

const CAMPOS_ALUMNO = [
  "primerApellido", "segundoApellido", "primerNombre", "segundoNombre", "cedulaEscolar",
  "municipioNacimiento", "estadoNacimiento", "sexo", "fechaNacimiento", "domicilio",
  "telefonoHogar", "procedencia", "nombrePlantelOrigen",
] as const;
const CAMPOS_SALUD = [
  "enfermedadActual", "tratamiento", "alergiasMedicamentos", "medicamentoFiebre", "seguroSaludTelefono",
] as const;

function mismoValor(a: unknown, b: unknown): boolean {
  if (a instanceof Date || b instanceof Date) {
    return (a instanceof Date ? a.getTime() : a) === (b instanceof Date ? b.getTime() : b);
  }
  return (a ?? null) === (b ?? null);
}

export async function actualizarAlumno(alumnoId: string, data: EdicionAlumnoInput): Promise<ResultadoEdicion> {
  await requireUser();
  const parsed = edicionAlumnoSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => i.message).join(" · ") };
  const d = parsed.data;

  const fechaNacimiento = new Date(d.fechaNacimiento);
  if (fechaNacimiento.getTime() > Date.now()) {
    return { ok: false, error: "La fecha de nacimiento no puede ser futura." };
  }

  const actual = await prisma.alumno.findUnique({
    where: { id: alumnoId },
    include: { saludAlumno: true, representantes: { select: { id: true } } },
  });
  if (!actual) return { ok: false, error: "El alumno no existe." };

  // Solo se pueden editar representantes de este alumno.
  const idsActuales = new Set(actual.representantes.map((r) => r.id));
  if (d.representantes.some((r) => r.id && !idsActuales.has(r.id))) {
    return { ok: false, error: "Representante no válido para este alumno." };
  }

  const datosAlumno = {
    primerApellido: d.primerApellido,
    segundoApellido: d.segundoApellido,
    primerNombre: d.primerNombre,
    segundoNombre: d.segundoNombre,
    cedulaEscolar: d.cedulaEscolar,
    municipioNacimiento: d.municipioNacimiento,
    estadoNacimiento: d.estadoNacimiento,
    sexo: d.sexo,
    fechaNacimiento,
    domicilio: d.domicilio,
    telefonoHogar: d.telefonoHogar,
    procedencia: d.procedencia,
    nombrePlantelOrigen: d.procedencia === "OTRO_PLANTEL" ? d.nombrePlantelOrigen : null,
  };

  const idsEnviados = new Set(d.representantes.flatMap((r) => (r.id ? [r.id] : [])));
  const idsBorrados = [...idsActuales].filter((id) => !idsEnviados.has(id));

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.alumno.update({ where: { id: alumnoId }, data: datosAlumno });
      await tx.saludAlumno.upsert({
        where: { alumnoId },
        create: { alumnoId, ...d.salud },
        update: d.salud,
      });

      if (idsBorrados.length > 0) {
        await tx.representante.deleteMany({ where: { alumnoId, id: { in: idsBorrados } } });
      }
      for (const { id, ...rep } of d.representantes) {
        if (id) await tx.representante.update({ where: { id, alumnoId }, data: rep });
        else await tx.representante.create({ data: { ...rep, alumnoId } });
      }

      await tx.autorizadoRetiro.deleteMany({ where: { alumnoId } });
      const autorizados = d.autorizados.filter((a) => a.nombre);
      if (autorizados.length > 0) {
        await tx.autorizadoRetiro.createMany({
          data: autorizados.map((a, i) => ({ alumnoId, nombre: a.nombre, cedula: a.cedula, orden: i + 1 })),
        });
      }

      await tx.contactoEmergencia.deleteMany({ where: { alumnoId } });
      const contactos = d.contactos.filter((c) => c.nombre);
      if (contactos.length > 0) {
        await tx.contactoEmergencia.createMany({
          data: contactos.map((c, i) => ({ alumnoId, nombre: c.nombre, telefono: c.telefono, orden: i + 1 })),
        });
      }
    });
  } catch (e) {
    return { ok: false, error: parsePrismaError(e) };
  }

  // En la auditoría se guardan los NOMBRES de los campos cambiados, nunca los
  // valores (son datos personales de menores y de salud).
  const camposCambiados = [
    ...CAMPOS_ALUMNO.filter((c) => !mismoValor(actual[c], datosAlumno[c])),
    ...CAMPOS_SALUD.filter((c) => !mismoValor(actual.saludAlumno?.[c], d.salud[c])).map((c) => `salud.${c}`),
  ];
  await registrarAudit({
    accion: "ALUMNO_DATOS_ACTUALIZADOS",
    entidad: "Alumno",
    entidadId: alumnoId,
    meta: {
      camposCambiados,
      representantes: {
        editados: d.representantes.filter((r) => r.id).length,
        agregados: d.representantes.filter((r) => !r.id).length,
        eliminados: idsBorrados.length,
      },
    },
  });

  revalidatePath("/alumnos");
  revalidatePath(`/alumnos/${alumnoId}`);
  return { ok: true };
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
  await requireUser();
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
  await requireUser();
  const alumno = await prisma.alumno.findUnique({
    where: { id },
    select: { estado: true, primerNombre: true, primerApellido: true },
  });
  await prisma.alumno.update({ where: { id }, data: { estado } });
  await registrarAudit({
    accion: "ALUMNO_ESTADO_CAMBIADO",
    entidad: "Alumno",
    entidadId: id,
    meta: {
      estadoAnterior: alumno?.estado,
      estadoNuevo: estado,
      nombre: `${alumno?.primerApellido} ${alumno?.primerNombre}`,
    },
  });
  revalidatePath("/alumnos");
  revalidatePath(`/alumnos/${id}`);
}

// ─── Listado ──────────────────────────────────────────────────────────────────

const ESTADOS_VALIDOS = ["ACTIVO", "RETIRADO", "EGRESADO"] as const;
type EstadoAlumnoEnum = (typeof ESTADOS_VALIDOS)[number];

export async function getAlumnos(query?: string, estado?: string, pagina: number = 1) {
  await requireUser();
  const estadoFiltro = ESTADOS_VALIDOS.includes(estado as EstadoAlumnoEnum)
    ? (estado as EstadoAlumnoEnum)
    : undefined;

  const where = {
    estado: estadoFiltro,
    OR: query
      ? [
          { primerApellido: { contains: query, mode: "insensitive" as const } },
          { primerNombre: { contains: query, mode: "insensitive" as const } },
          { segundoApellido: { contains: query, mode: "insensitive" as const } },
          { segundoNombre: { contains: query, mode: "insensitive" as const } },
          { cedulaEscolar: { contains: query, mode: "insensitive" as const } },
        ]
      : undefined,
  };

  const [alumnos, total] = await Promise.all([
    prisma.alumno.findMany({
      where,
      include: {
        inscripciones: {
          orderBy: { fechaInscripcion: "desc" },
          take: 1,
          include: { grado: true, seccion: true, anoEscolar: true },
        },
      },
      orderBy: [{ primerApellido: "asc" }, { primerNombre: "asc" }],
      skip: (pagina - 1) * ALUMNOS_POR_PAGINA,
      take: ALUMNOS_POR_PAGINA,
    }),
    prisma.alumno.count({ where }),
  ]);

  return { alumnos, total, pagina, totalPaginas: Math.ceil(total / ALUMNOS_POR_PAGINA) };
}

export async function getAlumnoById(id: string) {
  await requireUser();
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
  await requireUser();
  const [grados, anos] = await Promise.all([
    prisma.grado.findMany({ where: { activo: true }, include: { secciones: { where: { activo: true } } }, orderBy: { orden: "asc" } }),
    prisma.anoEscolar.findMany({ orderBy: { nombre: "desc" } }),
  ]);
  return { grados, anos };
}
