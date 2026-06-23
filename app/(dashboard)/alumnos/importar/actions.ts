"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { registrarAudit } from "@/lib/audit";

const filaSchema = z.object({
  primerApellido: z.string().min(1, "primer_apellido es obligatorio"),
  segundoApellido: z.string().optional().nullable(),
  primerNombre: z.string().min(1, "primer_nombre es obligatorio"),
  segundoNombre: z.string().optional().nullable(),
  cedulaEscolar: z.string().optional().nullable(),
  sexo: z.enum(["M", "F"]),
  fechaNacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "fecha_nacimiento debe ser YYYY-MM-DD"),
});

export type ResultadoImport = {
  creados: number;
  omitidos: number;
  errores: { fila: number; mensaje: string }[];
};

export async function importarAlumnos(formData: FormData): Promise<ResultadoImport> {
  const archivo = formData.get("archivo") as File | null;
  if (!archivo || archivo.size === 0) {
    return { creados: 0, omitidos: 0, errores: [{ fila: 0, mensaje: "No se proporcionó ningún archivo" }] };
  }

  const texto = await archivo.text();
  // Quitar BOM si existe
  const limpio = texto.replace(/^﻿/, "");
  const lines = limpio.trim().split(/\r?\n/);

  if (lines.length < 2) {
    return { creados: 0, omitidos: 0, errores: [{ fila: 0, mensaje: "El archivo no contiene datos" }] };
  }

  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/"/g, ""));

  const resultado: ResultadoImport = { creados: 0, omitidos: 0, errores: [] };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parseo simple de CSV (sin soporte de comas dentro de comillas)
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });

    const parsed = filaSchema.safeParse({
      primerApellido: row["primer_apellido"] || undefined,
      segundoApellido: row["segundo_apellido"] || null,
      primerNombre: row["primer_nombre"] || undefined,
      segundoNombre: row["segundo_nombre"] || null,
      cedulaEscolar: row["cedula_escolar"] || null,
      sexo: row["sexo"]?.toUpperCase() || undefined,
      fechaNacimiento: row["fecha_nacimiento"] || undefined,
    });

    if (!parsed.success) {
      resultado.errores.push({
        fila: i + 1,
        mensaje: parsed.error.issues.map((iss) => iss.message).join("; "),
      });
      continue;
    }

    try {
      await prisma.alumno.create({
        data: {
          primerApellido: parsed.data.primerApellido,
          segundoApellido: parsed.data.segundoApellido ?? null,
          primerNombre: parsed.data.primerNombre,
          segundoNombre: parsed.data.segundoNombre ?? null,
          cedulaEscolar: parsed.data.cedulaEscolar || null,
          sexo: parsed.data.sexo,
          fechaNacimiento: new Date(parsed.data.fechaNacimiento),
          procedencia: "HOGAR",
        },
      });
      resultado.creados++;
    } catch {
      resultado.omitidos++;
      resultado.errores.push({
        fila: i + 1,
        mensaje: "Error al crear — probable cédula escolar duplicada",
      });
    }
  }

  if (resultado.creados > 0) {
    await registrarAudit({
      accion: "ALUMNOS_IMPORTADOS",
      entidad: "Alumno",
      meta: { creados: resultado.creados, omitidos: resultado.omitidos },
    });
  }

  return resultado;
}
