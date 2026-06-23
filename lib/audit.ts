import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

interface AuditData {
  accion: string;
  entidad?: string;
  entidadId?: string;
  meta?: Record<string, unknown>;
}

export async function registrarAudit(data: AuditData) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await prisma.auditLog.create({
      data: {
        userId: user?.id ?? null,
        userEmail: user?.email ?? null,
        accion: data.accion,
        entidad: data.entidad ?? null,
        entidadId: data.entidadId ?? null,
        meta: data.meta ?? undefined,
      },
    });
  } catch {
    // Los fallos de auditoría no deben interrumpir el flujo principal
  }
}
