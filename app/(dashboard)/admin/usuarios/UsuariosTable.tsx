"use client";

import { useState, useTransition } from "react";
import { ShieldCheck, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { invitarUsuario, cambiarRolUsuario } from "./actions";
import { useToast } from "@/hooks/use-toast";

export interface UsuarioResumen {
  id: string;
  email: string;
  rol: "ADMIN" | "SECRETARIA";
  creadoEn: string;
  ultimoAcceso: string | null;
}

function formatFechaRelativa(isoString: string | null): string {
  if (!isoString) return "Nunca";
  const diff = Date.now() - new Date(isoString).getTime();
  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Ayer";
  if (dias < 30) return `Hace ${dias} días`;
  const meses = Math.floor(dias / 30);
  return `Hace ${meses} mes${meses > 1 ? "es" : ""}`;
}

function FilaUsuario({
  usuario,
  esSelf,
}: {
  usuario: UsuarioResumen;
  esSelf: boolean;
}) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const otroRol: "ADMIN" | "SECRETARIA" =
    usuario.rol === "ADMIN" ? "SECRETARIA" : "ADMIN";

  const handleCambioRol = () => {
    startTransition(async () => {
      try {
        await cambiarRolUsuario(usuario.id, otroRol);
        toast({ title: `Rol cambiado a ${otroRol}` });
      } catch (e) {
        toast({
          title: "Error al cambiar rol",
          description: e instanceof Error ? e.message : undefined,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100">
            <Mail className="h-3.5 w-3.5 text-gray-500" />
          </div>
          <span className="text-sm font-medium text-gray-900">{usuario.email}</span>
          {esSelf && (
            <Badge variant="secondary" className="text-xs">tú</Badge>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge
          variant={usuario.rol === "ADMIN" ? "default" : "secondary"}
          className="text-xs"
        >
          {usuario.rol === "ADMIN" ? "Administrador" : "Secretaria"}
        </Badge>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {formatFechaRelativa(usuario.ultimoAcceso)}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        {!esSelf && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleCambioRol}
            disabled={isPending}
          >
            {isPending ? "..." : `Cambiar a ${otroRol === "ADMIN" ? "Admin" : "Secretaria"}`}
          </Button>
        )}
      </td>
    </tr>
  );
}

export function UsuariosTable({
  usuarios,
  selfId,
}: {
  usuarios: UsuarioResumen[];
  selfId: string;
}) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<"ADMIN" | "SECRETARIA">("SECRETARIA");

  const handleInvitar = (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    data.set("email", email);
    data.set("rol", rol);

    startTransition(async () => {
      try {
        await invitarUsuario(data);
        toast({ title: `Invitación enviada a ${email}` });
        setEmail("");
      } catch (err) {
        toast({
          title: "Error al invitar",
          description: err instanceof Error ? err.message : undefined,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="space-y-5">
      {/* Tabla de usuarios */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-gray-500" />
          <h3 className="font-semibold text-sm text-gray-700">
            Usuarios activos{" "}
            <span className="text-gray-400 font-normal">({usuarios.length})</span>
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">Email</th>
              <th className="text-left px-4 py-2.5">Rol</th>
              <th className="text-left px-4 py-2.5 hidden sm:table-cell">Último acceso</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {usuarios.map((u) => (
              <FilaUsuario
                key={u.id}
                usuario={u}
                esSelf={u.id === selfId}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Formulario de invitación */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-sm text-gray-700 mb-4">Invitar nuevo usuario</h3>
        <form onSubmit={handleInvitar} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-52">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@ejemplo.com"
              required
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Rol</label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value as "ADMIN" | "SECRETARIA")}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="SECRETARIA">Secretaria</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <Button type="submit" disabled={isPending || !email}>
            {isPending ? "Enviando..." : "Enviar invitación"}
          </Button>
        </form>
        <p className="text-xs text-gray-400 mt-3">
          El usuario recibirá un email con un enlace para crear su contraseña.
        </p>
      </div>
    </div>
  );
}
