"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { MESES } from "@/lib/utils";

type AlumnoSimple = {
  id: string;
  primerApellido: string;
  primerNombre: string;
  inscripciones: { grado: { nombre: string } }[];
};

interface Props {
  alumnos: AlumnoSimple[];
}

function PeriodoSelector({
  mes,
  ano,
  onMesChange,
  onAnoChange,
}: {
  mes: number;
  ano: number;
  onMesChange: (m: number) => void;
  onAnoChange: (a: number) => void;
}) {
  const hoy = new Date();
  const anos = Array.from({ length: 5 }, (_, i) => hoy.getFullYear() - i);

  return (
    <div className="flex items-center gap-2">
      <select
        value={mes}
        onChange={(e) => onMesChange(Number(e.target.value))}
        className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {MESES.map((m, i) => (
          <option key={i + 1} value={i + 1}>{m}</option>
        ))}
      </select>
      <select
        value={ano}
        onChange={(e) => onAnoChange(Number(e.target.value))}
        className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {anos.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
    </div>
  );
}

export function ReportesCliente({ alumnos }: Props) {
  const hoy = new Date();

  const [mesMorosos, setMesMorosos] = useState(hoy.getMonth() + 1);
  const [anoMorosos, setAnoMorosos] = useState(hoy.getFullYear());

  const [alumnoId, setAlumnoId] = useState("");

  const [mesBalance, setMesBalance] = useState(hoy.getMonth() + 1);
  const [anoBalance, setAnoBalance] = useState(hoy.getFullYear());

  const mesAnoMorosos = `${String(mesMorosos).padStart(2, "0")}/${anoMorosos}`;
  const urlMorosos = `/api/reportes/morosos?mesAno=${encodeURIComponent(mesAnoMorosos)}`;
  const urlEstadoCuenta = alumnoId ? `/api/reportes/estado-cuenta?alumnoId=${alumnoId}` : null;
  const urlBalance = `/api/reportes/balance?mes=${mesBalance}&ano=${anoBalance}`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {/* Card 1: Morosos */}
      <div className="rounded-lg border border-red-200 bg-white p-5 flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">📋</span>
            <h3 className="font-semibold text-gray-900">Listado de Morosos</h3>
          </div>
          <p className="text-xs text-gray-500">
            Alumnos con pagos pendientes en el período seleccionado, con meses adeudados y monto estimado.
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1.5">Período</p>
          <PeriodoSelector
            mes={mesMorosos}
            ano={anoMorosos}
            onMesChange={setMesMorosos}
            onAnoChange={setAnoMorosos}
          />
        </div>
        <a
          href={urlMorosos}
          target="_blank"
          rel="noreferrer"
          className="mt-auto flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          <FileText className="h-4 w-4" />
          Descargar PDF
        </a>
      </div>

      {/* Card 2: Estado de Cuenta */}
      <div className="rounded-lg border border-blue-200 bg-white p-5 flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">👤</span>
            <h3 className="font-semibold text-gray-900">Estado de Cuenta</h3>
          </div>
          <p className="text-xs text-gray-500">
            Historial completo de todos los pagos realizados por un alumno específico.
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1.5">Alumno</p>
          <select
            value={alumnoId}
            onChange={(e) => setAlumnoId(e.target.value)}
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Selecciona un alumno —</option>
            {alumnos.map((a) => {
              const grado = a.inscripciones[0]?.grado?.nombre ?? "";
              return (
                <option key={a.id} value={a.id}>
                  {a.primerApellido}, {a.primerNombre}{grado ? ` (${grado})` : ""}
                </option>
              );
            })}
          </select>
        </div>
        {urlEstadoCuenta ? (
          <a
            href={urlEstadoCuenta}
            target="_blank"
            rel="noreferrer"
            className="mt-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            <FileText className="h-4 w-4" />
            Descargar PDF
          </a>
        ) : (
          <button
            disabled
            className="mt-auto flex items-center justify-center gap-2 bg-gray-100 text-gray-400 text-sm font-medium py-2.5 rounded-lg cursor-not-allowed"
          >
            <FileText className="h-4 w-4" />
            Selecciona un alumno
          </button>
        )}
      </div>

      {/* Card 3: Balance */}
      <div className="rounded-lg border border-green-200 bg-white p-5 flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">📊</span>
            <h3 className="font-semibold text-gray-900">Balance Mensual</h3>
          </div>
          <p className="text-xs text-gray-500">
            Resumen de ingresos vs egresos del período con desglose por categoría y balance neto.
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1.5">Período</p>
          <PeriodoSelector
            mes={mesBalance}
            ano={anoBalance}
            onMesChange={setMesBalance}
            onAnoChange={setAnoBalance}
          />
        </div>
        <a
          href={urlBalance}
          target="_blank"
          rel="noreferrer"
          className="mt-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          <FileText className="h-4 w-4" />
          Descargar PDF
        </a>
      </div>
    </div>
  );
}
