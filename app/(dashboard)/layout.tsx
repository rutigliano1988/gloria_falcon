import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/DashboardShell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Sin sesión o sin rol válido => fuera (denegar por defecto).
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <DashboardShell userEmail={user.email} rol={user.rol}>
      {children}
    </DashboardShell>
  );
}
