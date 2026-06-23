import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { UsuariosTable } from "./UsuariosTable";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const self = await requireAdmin();

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.auth.admin.listUsers();

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        <strong>Error al cargar usuarios:</strong> {error.message}
        <p className="mt-1 text-xs text-red-500">
          Verifica que SUPABASE_SERVICE_ROLE_KEY esté configurado en .env.local
        </p>
      </div>
    );
  }

  const usuarios = (data?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? "",
    rol: ((u.app_metadata?.rol ?? "ADMIN") as "ADMIN" | "SECRETARIA"),
    creadoEn: u.created_at,
    ultimoAcceso: u.last_sign_in_at ?? null,
  }));

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Gestión de Usuarios</h1>
        <p className="text-sm text-gray-500">
          Administra quién puede acceder al sistema y con qué permisos.
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>Roles disponibles:</strong>{" "}
        <span className="font-semibold">Administrador</span> — acceso completo, incluye Configuración y esta sección.{" "}
        <span className="font-semibold">Secretaria</span> — puede registrar pagos y gestionar alumnos y docentes,
        pero no puede acceder a Configuración ni Usuarios.
      </div>

      <UsuariosTable usuarios={usuarios} selfId={self.id} />
    </div>
  );
}
