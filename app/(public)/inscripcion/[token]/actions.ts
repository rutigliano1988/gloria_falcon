"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Límites de longitud: es un endpoint público sin autenticación.
const txt = (max = 120) => z.string().trim().max(max);
const opt = (max = 120) => txt(max).optional().nullable();
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (use AAAA-MM-DD)");

const representanteSchema = z.object({
  tipo: z.enum(["MADRE", "PADRE", "TUTOR"]),
  apellidosNombres: txt(150).min(1, "Nombre del representante requerido"),
  cedula: opt(),
  fechaNacimiento: fecha.optional().nullable(),
  telefonoHab: opt(),
  telefonoCelular: opt(),
  telefonoOficina: opt(),
  email: z.string().trim().email("Correo del representante inválido").max(120).optional().nullable().or(z.literal("")),
  ocupacion: opt(),
});

const solicitudSchema = z.object({
  primerApellido: txt(80).min(1, "Primer apellido es obligatorio"),
  segundoApellido: opt(),
  primerNombre: txt(80).min(1, "Primer nombre es obligatorio"),
  segundoNombre: opt(),
  cedulaEscolar: opt(),
  municipioNacimiento: opt(),
  estadoNacimiento: opt(),
  sexo: z.enum(["M", "F"], { error: "Sexo es obligatorio" }),
  fechaNacimiento: fecha,
  domicilio: opt(300),
  telefonoHogar: opt(),
  procedencia: z.enum(["HOGAR", "MISMO_PLANTEL", "OTRO_PLANTEL"]).default("HOGAR"),
  nombrePlantelOrigen: opt(),
  representantes: z.array(representanteSchema).min(1, "Debe incluir al menos un representante").max(3),
  autorizados: z.array(z.object({
    nombre: txt(150).min(1),
    cedula: opt(),
    orden: z.number().int().min(1).max(10),
  })).max(5).default([]),
  contactosEmergencia: z.array(z.object({
    nombre: txt(150).min(1),
    telefono: txt(40).min(1),
    orden: z.number().int().min(1).max(10),
  })).min(1, "Debe incluir al menos un contacto de emergencia").max(5),
  datosSalud: z.object({
    enfermedadActual: opt(500),
    tratamiento: opt(500),
    alergiasMedicamentos: opt(500),
    medicamentoFiebre: opt(300),
    seguroSaludTelefono: opt(),
  }).optional(),
});

export type SolicitudFormData = z.infer<typeof solicitudSchema>;

export async function getSolicitudPorToken(token: string) {
  return prisma.solicitudInscripcion.findUnique({
    where: { token },
    select: { id: true, estado: true, expiraEn: true },
  });
}

function vigente(expiraEn: Date | null): boolean {
  return expiraEn != null && expiraEn.getTime() > Date.now();
}

export async function enviarSolicitud(
  token: string,
  data: SolicitudFormData
): Promise<{ ok: boolean; error?: string; referencia?: string }> {
  const solicitud = await prisma.solicitudInscripcion.findUnique({ where: { token } });

  if (!solicitud) return { ok: false, error: "Enlace inválido o expirado." };
  if (solicitud.estado !== "PENDIENTE") return { ok: false, error: "Esta solicitud ya fue enviada anteriormente." };
  if (!vigente(solicitud.expiraEn)) return { ok: false, error: "Este enlace expiró. Pida uno nuevo al colegio." };

  const parsed = solicitudSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(" · ") };
  }

  const d = parsed.data;

  // Condicionado al estado: si llegan dos envíos a la vez, solo uno se guarda.
  const { count } = await prisma.solicitudInscripcion.updateMany({
    where: { token, estado: "PENDIENTE", expiraEn: { gt: new Date() } },
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

  if (count === 0) return { ok: false, error: "Esta solicitud ya fue enviada anteriormente." };

  return { ok: true, referencia: solicitud.id.slice(-8).toUpperCase() };
}
