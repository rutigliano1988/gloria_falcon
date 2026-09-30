"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  formatUSD,
  formatBS,
  formatMesAno,
  getMesesAnoEscolar,
  mesAnoToNum,
  FORMA_PAGO_LABELS,
  TIPO_SERVICIO_LABELS,
} from "@/lib/utils";
import { calcularConceptosMensualidad, montoBsDesdeUsd, totalConceptos } from "@/lib/finanzas";
import { registrarPago } from "../actions";
import type { getPagoFormData } from "../actions";

type FormData = Awaited<ReturnType<typeof getPagoFormData>>;

interface ConceptoAdicional {
  concepto: string;
  montoUsd: number;
}

interface Props {
  alumnos: FormData["alumnos"];
  anoActivo: NonNullable<FormData["anoActivo"]>;
  tasaActual: FormData["tasaActual"];
  productos: FormData["productos"];
  alumnoIdInicial?: string;
}

function hoyLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function RegistrarPagoForm({
  alumnos,
  anoActivo,
  tasaActual,
  productos,
  alumnoIdInicial,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [alumnoId, setAlumnoId] = useState(alumnoIdInicial ?? "");
  const [mesesSeleccionados, setMesesSeleccionados] = useState<string[]>([]);
  const [adicionales, setAdicionales] = useState<ConceptoAdicional[]>([]);
  const [formaPago, setFormaPago] = useState<string>("EFECTIVO_USD");
  const [monedaPagada, setMonedaPagada] = useState<"USD" | "BS">("USD");
  // Tasa realmente aplicada al cobro: se guarda con el pago (antes se perdía).
  const [tasa, setTasa] = useState(tasaActual ? Number(tasaActual.tasa).toFixed(4) : "");
  const [numeroReferencia, setNumeroReferencia] = useState("");
  const [fechaPago, setFechaPago] = useState(hoyLocal);
  const [observaciones, setObservaciones] = useState("");
  const [loading, setLoading] = useState(false);

  const mesesDelAno = getMesesAnoEscolar(anoActivo.nombre);
  const mesActualNum = mesAnoToNum(hoyLocal().slice(5, 7) + "/" + hoyLocal().slice(0, 4));

  const alumnoSeleccionado = alumnos.find((a) => a.id === alumnoId);
  const inscripcion = alumnoSeleccionado?.inscripciones?.[0];
  const mesesCobrados = alumnoSeleccionado?.mesesCobrados ?? [];

  // Vista previa con la MISMA función que usa el servidor; el servidor recalcula al guardar.
  let vistaPrevia: ReturnType<typeof calcularConceptosMensualidad> = [];
  let errorCalculo: string | null = null;
  if (inscripcion && mesesSeleccionados.length > 0) {
    try {
      const precios = Object.fromEntries(productos.map((p) => [p.nombre, Number(p.precioUsd)]));
      const ordenados = [...mesesSeleccionados].sort((x, y) => mesAnoToNum(x) - mesAnoToNum(y));
      vistaPrevia = calcularConceptosMensualidad({
        meses: ordenados,
        serviciosActivos: inscripcion.servicios.map((s) => s.tipo),
        precios,
        descuentoMensualUsd: Number(inscripcion.descuentoMontoUsd ?? 0),
      });
    } catch (e) {
      errorCalculo = e instanceof Error ? e.message : "Error al calcular";
    }
  }

  const adicionalesValidos = adicionales.filter((c) => c.concepto.trim() && c.montoUsd > 0);
  const totalUsd = totalConceptos([...vistaPrevia, ...adicionalesValidos]);
  const tasaEfectiva = parseFloat(tasa) || 0;
  const totalBs = monedaPagada === "BS" && tasaEfectiva > 0 ? montoBsDesdeUsd(totalUsd, tasaEfectiva) : null;

  const cambiarMoneda = (m: "USD" | "BS") => {
    setMonedaPagada(m);
    setFormaPago(m === "USD" ? "EFECTIVO_USD" : "EFECTIVO_BS");
  };

  const toggleMes = (mes: string) => {
    setMesesSeleccionados((prev) =>
      prev.includes(mes) ? prev.filter((m) => m !== mes) : [...prev, mes]
    );
  };

  const handleSubmit = async () => {
    if (!alumnoId) {
      toast({ title: "Selecciona un alumno", variant: "destructive" });
      return;
    }
    if (mesesSeleccionados.length === 0) {
      toast({ title: "Selecciona al menos un mes", variant: "destructive" });
      return;
    }
    if (monedaPagada === "BS" && tasaEfectiva <= 0) {
      toast({ title: "Ingresa la tasa de cambio", variant: "destructive" });
      return;
    }
    const requiereRef = ["PAGO_MOVIL_BS", "TRANSFERENCIA_BS"].includes(formaPago);
    if (requiereRef && !numeroReferencia.trim()) {
      toast({ title: "El número de referencia es obligatorio para este tipo de pago", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const result = await registrarPago({
        alumnoId,
        anoEscolarId: anoActivo.id,
        meses: mesesSeleccionados,
        conceptosAdicionales: adicionalesValidos,
        monedaPagada,
        formaPago: formaPago as "EFECTIVO_USD" | "EFECTIVO_BS" | "PAGO_MOVIL_BS" | "TRANSFERENCIA_BS",
        tasaAplicada: monedaPagada === "BS" ? tasaEfectiva : null,
        numeroReferencia: numeroReferencia.trim() || null,
        fechaPago,
        observaciones: observaciones.trim() || null,
      });
      if (!result.ok) {
        toast({ title: "No se pudo registrar el pago", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: `Pago registrado — Recibo ${result.numeroRecibo}` });
      router.push(`/mensualidades/${result.pagoId}`);
    } catch {
      toast({ title: "Error al registrar el pago", description: "Intenta de nuevo.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const requiereReferencia = ["PAGO_MOVIL_BS", "TRANSFERENCIA_BS"].includes(formaPago);

  return (
    <div className="space-y-5">
      {/* Selección de alumno */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-sm text-gray-700 mb-3">1. Selección de Alumno</h3>
        <select
          value={alumnoId}
          onChange={(e) => {
            setAlumnoId(e.target.value);
            setMesesSeleccionados([]);
          }}
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— Selecciona un alumno —</option>
          {alumnos.map((a) => {
            const insc = a.inscripciones[0];
            const grado = insc?.grado?.nombre ?? "";
            const nombre = [a.primerApellido, a.primerNombre].filter(Boolean).join(", ");
            return (
              <option key={a.id} value={a.id}>
                {nombre}{grado ? ` (${grado})` : ""}
              </option>
            );
          })}
        </select>
        {inscripcion && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
            <span>Servicios: {["Mensualidad", ...inscripcion.servicios.map((s) => TIPO_SERVICIO_LABELS[s.tipo])].join(", ")}</span>
            {Number(inscripcion.descuentoMontoUsd ?? 0) > 0 && (
              <Badge variant="secondary">
                Descuento: {formatUSD(Number(inscripcion.descuentoMontoUsd))}/mes
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Selección de meses */}
      {alumnoId && (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="font-semibold text-sm text-gray-700 mb-3">2. Meses a Pagar</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {mesesDelAno.map((mes) => {
              const esFuturo = mesAnoToNum(mes) > mesActualNum;
              const cobrado = mesesCobrados.includes(mes);
              const deshabilitado = esFuturo || cobrado;
              const seleccionado = mesesSeleccionados.includes(mes);
              let label = mes;
              try { label = formatMesAno(mes); } catch { /* */ }
              return (
                <button
                  key={mes}
                  type="button"
                  onClick={() => !deshabilitado && toggleMes(mes)}
                  disabled={deshabilitado}
                  title={cobrado ? "Mes ya cobrado" : esFuturo ? "Mes futuro" : undefined}
                  className={[
                    "px-3 py-2 rounded-md text-xs border transition-colors",
                    seleccionado
                      ? "bg-blue-600 text-white border-blue-600"
                      : cobrado
                      ? "bg-green-50 text-green-700 border-green-200 cursor-not-allowed"
                      : esFuturo
                      ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                      : "bg-white text-gray-700 border-gray-200 hover:border-blue-400",
                  ].join(" ")}
                >
                  {label}
                  {cobrado && <span className="block text-[10px]">Pagado</span>}
                </button>
              );
            })}
          </div>
          {mesesSeleccionados.length > 0 && (
            <p className="mt-2 text-xs text-blue-600">{mesesSeleccionados.length} mes(es) seleccionado(s)</p>
          )}
        </div>
      )}

      {/* Conceptos: calculados (solo lectura) + adicionales */}
      {mesesSeleccionados.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="font-semibold text-sm text-gray-700 mb-3">3. Conceptos del Pago</h3>
          {errorCalculo ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorCalculo} Revisa los productos en Configuración.
            </p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {vistaPrevia.map((c, i) => (
                  <tr key={i}>
                    <td className="py-1.5">{c.concepto}</td>
                    <td className="py-1.5 text-xs text-gray-500">{c.mesAno ? formatMesAno(c.mesAno) : "—"}</td>
                    <td className={`py-1.5 text-right font-mono ${c.montoUsd < 0 ? "text-green-700" : ""}`}>
                      {formatUSD(c.montoUsd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-2 text-xs text-gray-400">
            Los montos salen de los precios configurados y del descuento de la inscripción; no se pueden editar aquí.
          </p>

          <div className="mt-4 space-y-2">
            {adicionales.map((c, i) => (
              <div key={i} className="grid grid-cols-[1fr_100px_32px] gap-2 items-center">
                <input
                  value={c.concepto}
                  placeholder="Concepto adicional (p. ej. materiales)"
                  onChange={(e) =>
                    setAdicionales((prev) => prev.map((x, j) => (j === i ? { ...x, concepto: e.target.value } : x)))
                  }
                  className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={c.montoUsd || ""}
                  placeholder="USD"
                  onChange={(e) =>
                    setAdicionales((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, montoUsd: parseFloat(e.target.value) || 0 } : x))
                    )
                  }
                  className="border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setAdicionales((prev) => prev.filter((_, j) => j !== i))}
                  className="text-gray-300 hover:text-red-400 text-lg leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setAdicionales((prev) => [...prev, { concepto: "", montoUsd: 0 }])}
              className="text-xs text-blue-600 hover:underline"
            >
              + Agregar concepto adicional
            </button>
            <div className="text-right">
              <span className="text-xs text-gray-500 mr-2">Total:</span>
              <span className="font-bold text-lg">{formatUSD(totalUsd)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Forma de pago */}
      {mesesSeleccionados.length > 0 && !errorCalculo && (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="font-semibold text-sm text-gray-700 mb-4">
            4. Forma de Pago
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Moneda */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Moneda
              </label>
              <div className="flex gap-3">
                {["USD", "BS"].map((m) => (
                  <label key={m} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="moneda"
                      value={m}
                      checked={monedaPagada === m}
                      onChange={() => cambiarMoneda(m as "USD" | "BS")}
                      className="accent-blue-600"
                    />
                    <span className="text-sm">{m === "USD" ? "Dólares ($)" : "Bolívares (Bs)"}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Forma */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Método
              </label>
              <select
                value={formaPago}
                onChange={(e) => setFormaPago(e.target.value)}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(FORMA_PAGO_LABELS)
                  .filter(([k]) =>
                    monedaPagada === "USD"
                      ? k === "EFECTIVO_USD"
                      : k !== "EFECTIVO_USD"
                  )
                  .map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
              </select>
            </div>

            {/* Tasa (solo si BS) */}
            {monedaPagada === "BS" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Tasa BCV (Bs / $1)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={tasa}
                  onChange={(e) => setTasa(e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: 42.5000"
                />
                {totalBs && (
                  <p className="mt-1 text-xs text-green-700 font-medium">
                    = {formatBS(totalBs)}
                  </p>
                )}
              </div>
            )}

            {/* Referencia */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                N° Referencia{requiereReferencia ? " *" : " (opcional)"}
              </label>
              <input
                type="text"
                value={numeroReferencia}
                onChange={(e) => setNumeroReferencia(e.target.value)}
                placeholder="Número de confirmación"
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Fecha de Pago
              </label>
              <DatePicker value={fechaPago} onChange={setFechaPago} />
            </div>

            {/* Observaciones */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Observaciones (opcional)
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={2}
                placeholder="Notas adicionales..."
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Resumen y enviar */}
      {mesesSeleccionados.length > 0 && !errorCalculo && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-700">
              Total a registrar: <span className="font-bold text-lg">{formatUSD(totalUsd)}</span>
              {totalBs && <span className="ml-2 text-blue-600">= {formatBS(totalBs)}</span>}
            </p>
            <p className="text-xs text-blue-500 mt-0.5">
              {mesesSeleccionados.length} mes(es) • {FORMA_PAGO_LABELS[formaPago] ?? formaPago} •{" "}
              {alumnoSeleccionado ? `${alumnoSeleccionado.primerApellido} ${alumnoSeleccionado.primerNombre}` : ""}
            </p>
          </div>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Registrando..." : "Registrar Pago"}
          </Button>
        </div>
      )}
    </div>
  );
}
