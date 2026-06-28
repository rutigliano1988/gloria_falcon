"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const representanteSchema = z.object({
  tipo: z.enum(["MADRE", "PADRE", "TUTOR"]),
  apellidosNombres: z.string().min(1, "Nombre del representante requerido"),
  cedula: z.string().optional().nullable(),
  fechaNacimiento: z.string().optional().nullable(),
  telefonoHab: z.string().optional().nullable(),
  telefonoCelular: z.string().optional().nullable(),
  telefonoOficina: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  ocupacion: z.string().optional().nullable(),
});

const solicitudSchema = z.object({
  primerApellido: z.string().min(1, "Primer apellido es obligatorio"),
  segundoApellido: z.string().optional().nullable(),
  primerNombre: z.string().min(1, "Primer nombre es obligatorio"),
  segundoNombre: z.string().optional().nullable(),
  cedulaEscolar: z.string().optional().nullable(),
  municipioNacimiento: z.string().optional().nullable(),
  estadoNacimiento: z.string().optional().nullable(),
  sexo: z.enum(["M", "F"], { error: "Sexo es obligatorio" }),
  fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (use AAAA-MM-DD)"),
  domicilio: z.string().optional().nullable(),
  telefonoHogar: z.string().optional().nullable(),
  procedencia: z.enum(["HOGAR", "MISMO_PLANTEL", "OTRO_PLANTEL"]).default("HOGAR"),
  nombrePlantelOrigen: z.string().optional().nullable(),
  representantes: z.array(representanteSchema).min(1, "Debe incluir al menos un representante"),
  autorizados: z.array(z.object({
    nombre: z.string().min(1),
    cedula: z.string().optional().nullable(),
    orden: z.number(),
  })).default([]),
  contactosEmergencia: z.array(z.object({
    nombre: z.string().min(1),
    telefono: z.string().min(1),
    orden: z.number(),
  })).min(1, "Debe incluir al menos un contacto de emergencia"),
  datosSalud: z.object({
    enfermedadActual: z.string().optional().nullable(),
    tratamiento: z.string().optional().nullable(),
    alergiasMedicamentos: z.string().optional().nullable(),
    medicamentoFiebre: z.string().optional().nullable(),
    seguroSaludTelefono: z.string().optional().nullable(),
  }).optional(),
});

export type SolicitudFormData = z.infer<typeof solicitudSchema>;

export async function getSolicitudPorToken(token: string) {
  return prisma.solicitudInscripcion.findUnique({
    where: { token },
    select: { id: true, estado: true },
  });
}

export async function enviarSolicitud(
  token: string,
  data: SolicitudFormData
): Promise<{ ok: boolean; error?: string; referencia?: string }> {
  const solicitud = await prisma.solicitudInscripcion.findUnique({ where: { token } });

  if (!solicitud) return { ok: false, error: "Enlace inválido o expirado." };
  if (solicitud.estado !== "PENDIENTE") return { ok: false, error: "Esta solicitud ya fue enviada anteriormente." };

  const parsed = solicitudSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(" · ") };
  }

  const d = parsed.data;

  await prisma.solicitudInscripcion.update({
    where: { token },
    data: {
      estado: "EN_REVISION",
      primerApellido: d.primerApellido,
      segundoApellido: d.segundoApellido ?? null,
      primerNombre: d.primerNombre,
      segundoNombre: d.segundoNombre ?? null,
      cedulaEscolar: d.cedulaEscolar || null,
      municipioNacimiento: d.municipioNacimiento || null,
      estadoNacimiento: d.estadoNacimiento || null,
      sexo: d.sexo as "M" | "F",
      fechaNacimiento: new Date(d.fechaNacimiento),
      domicilio: d.domicilio || null,
      telefonoHogar: d.telefonoHogar || null,
      procedencia: d.procedencia as "HOGAR" | "MISMO_PLANTEL" | "OTRO_PLANTEL",
      nombrePlantelOrigen: d.nombrePlantelOrigen || null,
      representantes: d.representantes as Prisma.InputJsonValue,
      autorizados: d.autorizados as Prisma.InputJsonValue,
      contactosEmergencia: d.contactosEmergencia as Prisma.InputJsonValue,
      datosSalud: d.datosSalud != null ? (d.datosSalud as Prisma.InputJsonValue) : Prisma.DbNull,
    },
  });

  return { ok: true, referencia: solicitud.id.slice(-8).toUpperCase() };
}
