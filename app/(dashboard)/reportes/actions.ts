"use server";

import { prisma } from "@/lib/prisma";

// ─── Lista de alumnos activos (para el selector del reporte de estado de cuenta)

export async function getAlumnosActivos() {
  return prisma.alumno.findMany({
    where: { estado: "ACTIVO" },
    include: {
      inscripciones: {
        orderBy: { fechaInscripcion: "desc" },
        take: 1,
        include: { grado: true, seccion: true },
      },
    },
    orderBy: [{ primerApellido: "asc" }, { primerNombre: "asc" }],
  });
}

// ─── Estado de cuenta completo de un alumno

export async function getEstadoCuentaAlumno(alumnoId: string) {
  const [alumno, pagos] = await Promise.all([
    prisma.alumno.findUnique({
      where: { id: alumnoId },
      include: {
        inscripciones: {
          include: {
            grado: true,
            seccion: true,
            anoEscolar: true,
            servicios: true,
          },
          orderBy: { fechaInscripcion: "desc" },
        },
      },
    }),
    prisma.pago.findMany({
      where: { alumnoId, deletedAt: null },
      orderBy: { fechaPago: "desc" },
      include: {
        conceptos: { orderBy: { concepto: "asc" } },
        anoEscolar: true,
      },
    }),
  ]);

  return { alumno, pagos };
}
