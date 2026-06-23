"use server";

import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const invitarSchema = z.object({
  email: z.string().email("Email inválido"),
  rol: z.enum(["ADMIN", "SECRETARIA"]),
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
  if (updateError) throw new Error(updateError.message);

  revalidatePath("/admin/usuarios");
}

export async function cambiarRolUsuario(userId: string, rol: "ADMIN" | "SECRETARIA") {
  await requireAdmin();

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { rol },
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/usuarios");
}
