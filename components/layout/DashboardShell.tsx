"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import type { Rol } from "@/lib/auth";

interface DashboardShellProps {
  children: React.ReactNode;
  userEmail: string;
  rol: Rol;
}

export function DashboardShell({ children, userEmail, rol }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="flex h-full">
      {/* Backdrop para mobile/tablet */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <Sidebar userEmail={userEmail} rol={rol} isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header onMenuClick={openSidebar} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
