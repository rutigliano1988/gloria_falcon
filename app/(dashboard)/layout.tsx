import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import type { Rol } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Segunda línea de defensa (el middleware ya protege las rutas)
  if (!user) redirect("/login");

  const rol = (user.app_metadata?.rol ?? "ADMIN") as Rol;

  return (
    <div className="flex h-full">
      <Sidebar userEmail={user.email ?? ""} rol={rol} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">{children}</main>
      </div>
    </div>
  );
}
