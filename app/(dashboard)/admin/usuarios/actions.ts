"use server";

import { requireAdmin } from "@/lib/auth";
import { registrarAudit } from "@/lib/audit";
import { ROLES } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const rolSchema = z.enum(ROLES);

const invitarSchema = z.object({
  email: z.string().email("Email inválido"),
  rol: rolSchema,
});

export async function invitarUsuario(formData: FormData) {
  await requireAdmin();

  const parsed = invitarSchema.safeParse({
    email: formData.get("email"),
    rol: formData.get("rol"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  }

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email);
  if (error) throw new Error(error.message);

  // app_metadata solo puede ser seteado por el service role
  const { error: updateError } = await admin.auth.admin.updateUserById(
    data.user.id,
    { app_metadata: { rol: parsed.data.rol } }
  );
  if (updateError) {
    // No dejar una cuenta invitada sin rol: se elimina y se informa el error.
    await admin.auth.admin.deleteUser(data.user.id);
    throw new Error(updateError.message);
  }

  await registrarAudit({
    accion: "USUARIO_INVITADO",
    entidad: "Usuario",
    entidadId: data.user.id,
    meta: { rol: parsed.data.rol },
  });
  revalidatePath("/admin/usuarios");
}

export async function cambiarRolUsuario(userId: string, rol: string) {
  const self = await requireAdmin();
  const nuevoRol = rolSchema.parse(rol);
  const id = z.string().uuid().parse(userId);

  // Evita que un administrador se quite su propio acceso (y deje el sistema sin ADMIN).
  if (id === self.id) throw new Error("No puedes cambiar tu propio rol.");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, {
    app_metadata: { rol: nuevoRol },
  });
  if (error) throw new Error(error.message);

  await registrarAudit({
    accion: "USUARIO_ROL_CAMBIADO",
    entidad: "Usuario",
    entidadId: id,
    meta: { rol: nuevoRol },
  });
  revalidatePath("/admin/usuarios");
}
