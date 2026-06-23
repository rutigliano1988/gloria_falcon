"use client";

import { useState, useTransition, useRef } from "react";
import { Upload, Download, CheckCircle, AlertTriangle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importarAlumnos } from "./actions";
import type { ResultadoImport } from "./actions";

const PLANTILLA_CSV =
  "primer_apellido,segundo_apellido,primer_nombre,segundo_nombre,cedula_escolar,sexo,fecha_nacimiento\n" +
  "Gonzalez,Perez,Pedro,Luis,CE-001,M,2018-05-20\n" +
  "Rodriguez,,Maria,,CE-002,F,2019-03-15\n";

function descargarPlantilla() {
  const blob = new Blob(["﻿" + PLANTILLA_CSV], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plantilla-importacion-alumnos.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ImportarForm() {
  const [resultado, setResultado] = useState<ResultadoImport | null>(null);
  const [isPending, startTransition] = useTransition();
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const res = await importarAlumnos(formData);
        setResultado(res);
      } catch (err) {
        setResultado({
          creados: 0,
          omitidos: 0,
          errores: [{ fila: 0, mensaje: err instanceof Error ? err.message : "Error inesperado" }],
        });
      }
    });
  };

  return (
    <div className="space-y-5">
      {/* Instrucciones */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-3">
        <h3 className="font-semibold text-sm text-gray-700">Formato del archivo CSV</h3>
        <p className="text-sm text-gray-600">
          El archivo debe tener las siguientes columnas en la primera fila (cabecera):
        </p>
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse w-full">
            <thead>
              <tr className="bg-gray-50">
                {[
                  "primer_apellido",
                  "segundo_apellido",
                  "primer_nombre",
                  "segundo_nombre",
                  "cedula_escolar",
                  "sexo",
                  "fecha_nacimiento",
                ].map((col) => (
                  <th
                    key={col}
                    className="border border-gray-200 px-2 py-1.5 text-left font-mono text-gray-600"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {["Obligatorio", "Opcional", "Obligatorio", "Opcional", "Opcional", "M o F", "YYYY-MM-DD"].map(
                  (v, i) => (
                    <td key={i} className="border border-gray-200 px-2 py-1.5 text-gray-500">
                      {v}
                    </td>
                  )
                )}
              </tr>
            </tbody>
          </table>
        </div>
        <Button variant="outline" size="sm" onClick={descargarPlantilla}>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Descargar plantilla
        </Button>
      </div>

      {/* Formulario de upload */}
      <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
        <h3 className="font-semibold text-sm text-gray-700">Subir archivo</h3>

        <div
          className="relative flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-lg p-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            name="archivo"
            accept=".csv,text/csv"
            required
            className="hidden"
            onChange={(e) =>
              setNombreArchivo(e.target.files?.[0]?.name ?? null)
            }
          />
          {nombreArchivo ? (
            <>
              <FileText className="h-8 w-8 text-blue-500" />
              <p className="text-sm font-medium text-gray-700">{nombreArchivo}</p>
              <p className="text-xs text-gray-400">Haz clic para cambiar</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">
                Haz clic para seleccionar un archivo CSV
              </p>
            </>
          )}
        </div>

        <Button type="submit" disabled={isPending || !nombreArchivo}>
          {isPending ? "Procesando..." : "Importar alumnos"}
        </Button>
      </form>

      {/* Resultado */}
      {resultado && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-3">
          <h3 className="font-semibold text-sm text-gray-700">Resultado</h3>

          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-semibold">{resultado.creados} creados</span>
            </div>
            {resultado.omitidos > 0 && (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-semibold">{resultado.omitidos} omitidos</span>
              </div>
            )}
          </div>

          {resultado.errores.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase">
                Errores ({resultado.errores.length})
              </p>
              <div className="max-h-48 overflow-y-auto rounded border border-red-100 bg-red-50 p-3 space-y-1">
                {resultado.errores.map((e, i) => (
                  <p key={i} className="text-xs text-red-700">
                    {e.fila > 0 ? <span className="font-mono">Fila {e.fila}:</span> : null}{" "}
                    {e.mensaje}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
