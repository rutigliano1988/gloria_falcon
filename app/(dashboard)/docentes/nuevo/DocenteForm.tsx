"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CARGO_DOCENTE_LABELS, parsePrismaError } from "@/lib/utils";
import { crearDocente, actualizarDocente } from "../actions";
import type { DocenteFormData } from "../actions";

interface DocenteInicial {
  id?: string;
  primerApellido?: string;
  segundoApellido?: string | null;
  primerNombre?: string;
  segundoNombre?: string | null;
  cedula?: string;
  telefono?: string | null;
  email?: string | null;
  cargo?: string;
  gradosAsignados?: string | null;
  estado?: string;
  fechaIngreso?: Date | null;
}

interface Props {
  docente?: DocenteInicial;
}

export function DocenteForm({ docente }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const esEdicion = !!docente?.id;

  const [primerApellido, setPrimerApellido] = useState(docente?.primerApellido ?? "");
  const [segundoApellido, setSegundoApellido] = useState(docente?.segundoApellido ?? "");
  const [primerNombre, setPrimerNombre] = useState(docente?.primerNombre ?? "");
  const [segundoNombre, setSegundoNombre] = useState(docente?.segundoNombre ?? "");
  const [cedula, setCedula] = useState(docente?.cedula ?? "");
  const [telefono, setTelefono] = useState(docente?.telefono ?? "");
  const [email, setEmail] = useState(docente?.email ?? "");
  const [cargo, setCargo] = useState(docente?.cargo ?? "DOCENTE");
  const [gradosAsignados, setGradosAsignados] = useState(docente?.gradosAsignados ?? "");
  const [estado, setEstado] = useState(docente?.estado ?? "ACTIVO");
  const [fechaIngreso, setFechaIngreso] = useState(
    docente?.fechaIngreso ? new Date(docente.fechaIngreso).toISOString().split("T")[0] : ""
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!primerApellido || !primerNombre || !cedula) {
      toast({ title: "Completa los campos obligatorios", variant: "destructive" });
      return;
    }

    const data: DocenteFormData = {
      primerApellido,
      segundoApellido: segundoApellido || null,
      primerNombre,
      segundoNombre: segundoNombre || null,
      cedula,
      telefono: telefono || null,
      email: email || null,
      cargo: cargo as DocenteFormData["cargo"],
      gradosAsignados: gradosAsignados || null,
      estado: estado as "ACTIVO" | "INACTIVO",
      fechaIngreso: fechaIngreso || null,
    };

    setLoading(true);
    try {
      if (esEdicion) {
        await actualizarDocente(docente!.id!, data);
        toast({ title: "Docente actualizado" });
        router.push(`/docentes/${docente!.id}`);
      } else {
        await crearDocente(data);
        toast({ title: "Docente registrado" });
        router.push("/docentes");
      }
    } catch (e) {
      toast({
        title: "Error al guardar",
        description: parsePrismaError(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const campo = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    opts?: { required?: boolean; type?: string; placeholder?: string }
  ) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}{opts?.required && " *"}
      </label>
      <input
        type={opts?.type ?? "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={opts?.placeholder}
        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Datos personales */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-sm text-gray-700 mb-4">Datos Personales</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {campo("Primer Apellido", primerApellido, setPrimerApellido, { required: true })}
          {campo("Segundo Apellido", segundoApellido, setSegundoApellido)}
          {campo("Primer Nombre", primerNombre, setPrimerNombre, { required: true })}
          {campo("Segundo Nombre", segundoNombre, setSegundoNombre)}
          {campo("Cédula", cedula, setCedula, { required: true, placeholder: "V-12345678" })}
          {campo("Teléfono", telefono, setTelefono, { placeholder: "0412-1234567" })}
          {campo("Correo Electrónico", email, setEmail, { type: "email", placeholder: "correo@ejemplo.com" })}
          {campo("Fecha de Ingreso", fechaIngreso, setFechaIngreso, { type: "date" })}
        </div>
      </div>

      {/* Cargo y estado */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-sm text-gray-700 mb-4">Cargo y Estado</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Cargo *</label>
            <select
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(CARGO_DOCENTE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Estado</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Grados / Secciones asignadas (opcional)
            </label>
            <input
              type="text"
              value={gradosAsignados}
              onChange={(e) => setGradosAsignados(e.target.value)}
              placeholder="Ej: 3° A, 4° B, 5° A"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={loading}>
        {loading ? "Guardando..." : esEdicion ? "Guardar cambios" : "Registrar Docente"}
      </Button>
    </div>
  );
}
