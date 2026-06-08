import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Colegio Gloria Falcón — Sistema de Gestión",
  description: "Sistema interno de gestión escolar",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
