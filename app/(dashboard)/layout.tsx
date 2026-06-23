import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/DashboardShell";
import type { Rol } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const rol = (user.app_metadata?.rol ?? "ADMIN") as Rol;

  return (
    <DashboardShell userEmail={user.email ?? ""} rol={rol}>
      {children}
    </DashboardShell>
  );
}
