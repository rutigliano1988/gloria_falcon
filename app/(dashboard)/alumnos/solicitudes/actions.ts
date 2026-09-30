"use server";

import { requireAdmin, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { registrarAudit } from "@/lib/audit";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";

// Vigencia de un enlace de inscripción sin usar.
const DIAS_VIGENCIA_ENLACE = 14;

// Al decidir una solicitud, los datos ya pasaron a la ficha del alumno (o se
// descartan): se borran de la solicitud y solo se conservan los nombres para
// el listado (minimización de datos de menores, A5 de REVIEW.md).
const DATOS_PERSONALES_VACIOS = {
  cedulaEscolar: null,
  municipioNacimiento: null,
  estadoNacimiento: null,
  sexo: null,
  fechaNacimiento: null,
  domicilio: null,
  telefonoHogar: null,
  procedencia: null,
  nombrePlantelOrigen: null,
  datosSalud: Prisma.DbNull,
  representantes: Prisma.DbNull,
  autorizados: Prisma.DbNull,
  contactosEmergencia: Prisma.DbNull,
} satisfies Prisma.SolicitudInscripcionUpdateInput;

export async function generarEnlaceSolicitud(): Promise<void> {
  await requireUser();
  await prisma.solicitudInscripcion.create({
    data: {
      // 256 bits aleatorios: el enlace no debe poder adivinarse.
      token: randomBytes(32).toString("base64url"),
      expiraEn: new Date(Date.now() + DIAS_VIGENCIA_ENLACE * 24 * 60 * 60 * 1000),
    },
  });
  revalidatePath("/alumnos/solicitudes");
}

export async function getSolicitudes() {
  await requireUser();
  const ahora = Date.now();
  const solicitudes = await prisma.solicitudInscripcion.findMany({
    orderBy: { creadoEn: "desc" },
    select: {
      id: true, token: true, estado: true, creadoEn: true, expiraEn: true,
      primerApellido: true, primerNombre: true, segundoApellido: true,
    },
  });
  return solicitudes.map((s) => ({
    ...s,
    enlaceVigente: s.expiraEn != null && s.expiraEn.getTime() > ahora,
  }));
}

export async function getSolicitudDetalle(id: string) {
  await requireUser();
  return prisma.solicitudInscripcion.findUnique({
    where: { id },
    include: { anoEscolar: true, grado: true, seccion: true },
  });
}

export async function getGradosYAnos() {
  await requireUser();
  const [grados, anos, secciones] = await Promise.all([
    prisma.grado.findMany({ where: { activo: true }, orderBy: { orden: "asc" } }),
    prisma.anoEscolar.findMany({ orderBy: { nombre: "desc" } }),
    prisma.seccion.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
  ]);
  return { grados, anos, secciones };
}

export async function aprobarSolicitud(
  id: string,
  data: { anoEscolarId: string; gradoId: string; seccionId?: string; observaciones?: string }
) {
  await requireAdmin();
  const solicitud = await prisma.solicitudInscripcion.findUnique({ where: { id } });
  if (!solicitud) throw new Error("Solicitud no encontrada");
  if (!solicitud.primerApellido || !solicitud.primerNombre || !solicitud.sexo || !solicitud.fechaNacimiento) {
    throw new Error("La solicitud no tiene datos completos del estudiante.");
  }

  if (solicitud.estado !== "EN_REVISION") {
    throw new Error("La solicitud ya fue procesada.");
  }

  await prisma.$transaction(async (tx) => {
    // Reclamar la solicitud primero: si otra persona la aprobó o rechazó a la
    // vez, count = 0 y se aborta todo (evita alumnos duplicados).
    const reclamada = await tx.solicitudInscripcion.updateMany({
      where: { id, estado: "EN_REVISION" },
      data: { estado: "APROBADA" },
    });
    if (reclamada.count === 0) throw new Error("La solicitud ya fue procesada.");

    const alumno = await tx.alumno.create({
      data: {
        primerApellido: solicitud.primerApellido!,
        segundoApellido: solicitud.segundoApellido,
        primerNombre: solicitud.primerNombre!,
        segundoNombre: solicitud.segundoNombre,
        cedulaEscolar: solicitud.cedulaEscolar || null,
        municipioNacimiento: solicitud.municipioNacimiento,
        estadoNacimiento: solicitud.estadoNacimiento,
        sexo: solicitud.sexo!,
        fechaNacimiento: solicitud.fechaNacimiento!,
        domicilio: solicitud.domicilio,
        telefonoHogar: solicitud.telefonoHogar,
        procedencia: solicitud.procedencia ?? "HOGAR",
        nombrePlantelOrigen: solicitud.nombrePlantelOrigen,
      },
    });

    if (solicitud.datosSalud) {
      const s = solicitud.datosSalud as Record<string, string | null>;
      await tx.saludAlumno.create({
        data: {
          alumnoId: alumno.id,
          enfermedadActual: s.enfermedadActual ?? null,
          tratamiento: s.tratamiento ?? null,
          alergiasMedicamentos: s.alergiasMedicamentos ?? null,
          medicamentoFiebre: s.medicamentoFiebre ?? null,
          seguroSaludTelefono: s.seguroSaludTelefono ?? null,
        },
      });
    }

    if (Array.isArray(solicitud.representantes)) {
      for (const rep of solicitud.representantes as Prisma.InputJsonValue[]) {
        const r = rep as Record<string, unknown>;
        await tx.representante.create({
          data: {
            alumnoId: alumno.id,
            tipo: r.tipo as "MADRE" | "PADRE" | "TUTOR",
            apellidosNombres: String(r.apellidosNombres ?? ""),
            cedula: (r.cedula as string) ?? null,
            fechaNacimiento: r.fechaNacimiento ? new Date(r.fechaNacimiento as string) : null,
            telefonoHab: (r.telefonoHab as string) ?? null,
            telefonoCelular: (r.telefonoCelular as string) ?? null,
            telefonoOficina: (r.telefonoOficina as string) ?? null,
            email: (r.email as string) ?? null,
            ocupacion: (r.ocupacion as string) ?? null,
          },
        });
      }
    }

    if (Array.isArray(solicitud.autorizados)) {
      for (const a of solicitud.autorizados as Record<string, unknown>[]) {
        if (a.nombre) {
          await tx.autorizadoRetiro.create({
            data: {
              alumnoId: alumno.id,
              nombre: String(a.nombre),
              cedula: (a.cedula as string) ?? null,
              orden: Number(a.orden ?? 1),
            },
          });
        }
      }
    }

    if (Array.isArray(solicitud.contactosEmergencia)) {
      for (const c of solicitud.contactosEmergencia as Record<string, unknown>[]) {
        if (c.nombre && c.telefono) {
          await tx.contactoEmergencia.create({
            data: {
              alumnoId: alumno.id,
              nombre: String(c.nombre),
              telefono: String(c.telefono),
              orden: Number(c.orden ?? 1),
            },
          });
        }
      }
    }

    await tx.inscripcion.create({
      data: {
        alumnoId: alumno.id,
        anoEscolarId: data.anoEscolarId,
        gradoId: data.gradoId,
        seccionId: data.seccionId || null,
      },
    });

    await tx.solicitudInscripcion.update({
      where: { id },
      data: {
        anoEscolarId: data.anoEscolarId,
        gradoId: data.gradoId,
        seccionId: data.seccionId || null,
        observaciones: data.observaciones || null,
        ...DATOS_PERSONALES_VACIOS,
      },
    });
  });

  await registrarAudit({
    accion: "SOLICITUD_APROBADA",
    entidad: "SolicitudInscripcion",
    entidadId: id,
  });

  revalidatePath("/alumnos/solicitudes");
  revalidatePath("/alumnos");
  redirect("/alumnos/solicitudes");
}

export async function rechazarSolicitud(id: string, observaciones?: string) {
  await requireAdmin();
  const { count } = await prisma.solicitudInscripcion.updateMany({
    where: { id, estado: "EN_REVISION" },
    data: {
      estado: "RECHAZADA",
      observaciones: observaciones || null,
      ...DATOS_PERSONALES_VACIOS,
    },
  });
  if (count === 0) throw new Error("La solicitud ya fue procesada.");

  await registrarAudit({
    accion: "SOLICITUD_RECHAZADA",
    entidad: "SolicitudInscripcion",
    entidadId: id,
  });

  revalidatePath("/alumnos/solicitudes");
  redirect("/alumnos/solicitudes");
}

/** Anula un enlace que todavía no se usó (p. ej. enviado por error). */
export async function revocarEnlaceSolicitud(id: string) {
  await requireUser();
  const { count } = await prisma.solicitudInscripcion.deleteMany({
    where: { id, estado: "PENDIENTE" },
  });
  if (count > 0) {
    await registrarAudit({ accion: "ENLACE_SOLICITUD_REVOCADO", entidad: "SolicitudInscripcion", entidadId: id });
  }
  revalidatePath("/alumnos/solicitudes");
}
