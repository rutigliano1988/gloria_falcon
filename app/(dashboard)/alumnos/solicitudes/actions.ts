"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { registrarAudit } from "@/lib/audit";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";

export async function generarEnlaceSolicitud(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await prisma.solicitudInscripcion.create({ data: {} });
  revalidatePath("/alumnos/solicitudes");
}

export async function getSolicitudes() {
  return prisma.solicitudInscripcion.findMany({
    orderBy: { creadoEn: "desc" },
    select: {
      id: true, token: true, estado: true, creadoEn: true,
      primerApellido: true, primerNombre: true, segundoApellido: true,
    },
  });
}

export async function getSolicitudDetalle(id: string) {
  return prisma.solicitudInscripcion.findUnique({
    where: { id },
    include: { anoEscolar: true, grado: true, seccion: true },
  });
}

export async function getGradosYAnos() {
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
  const solicitud = await prisma.solicitudInscripcion.findUnique({ where: { id } });
  if (!solicitud) throw new Error("Solicitud no encontrada");
  if (!solicitud.primerApellido || !solicitud.primerNombre || !solicitud.sexo || !solicitud.fechaNacimiento) {
    throw new Error("La solicitud no tiene datos completos del estudiante.");
  }

  await prisma.$transaction(async (tx) => {
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
        estado: "APROBADA",
        anoEscolarId: data.anoEscolarId,
        gradoId: data.gradoId,
        seccionId: data.seccionId || null,
        observaciones: data.observaciones || null,
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
  await prisma.solicitudInscripcion.update({
    where: { id },
    data: { estado: "RECHAZADA", observaciones: observaciones || null },
  });

  await registrarAudit({
    accion: "SOLICITUD_RECHAZADA",
    entidad: "SolicitudInscripcion",
    entidadId: id,
  });

  revalidatePath("/alumnos/solicitudes");
  redirect("/alumnos/solicitudes");
}
