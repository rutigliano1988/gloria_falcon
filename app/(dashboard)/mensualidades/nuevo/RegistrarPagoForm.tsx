"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  formatUSD,
  formatBS,
  calcularBs,
  formatMesAno,
  getMesesAnoEscolar,
  mesAnoToNum,
  FORMA_PAGO_LABELS,
  TIPO_SERVICIO_LABELS,
  parsePrismaError,
} from "@/lib/utils";
import { registrarPago } from "../actions";
import type { getPagoFormData } from "../actions";

type FormData = Awaited<ReturnType<typeof getPagoFormData>>;

interface ConceptoEditable {
  concepto: string;
  mesAno: string | null;
  montoUsd: number;
}

interface Props {
  alumnos: FormData["alumnos"];
  anoActivo: NonNullable<FormData["anoActivo"]>;
  tasaActual: FormData["tasaActual"];
  productos: FormData["productos"];
  alumnoIdInicial?: string;
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
  const [conceptos, setConceptos] = useState<ConceptoEditable[]>([]);
  const [formaPago, setFormaPago] = useState<string>("EFECTIVO_USD");
  const [monedaPagada, setMonedaPagada] = useState<string>("USD");
  const [tasaOverride, setTasaOverride] = useState(
    tasaActual ? Number(tasaActual.tasa).toFixed(4) : ""
  );
  const [numeroReferencia, setNumeroReferencia] = useState("");
  const [fechaPago, setFechaPago] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [observaciones, setObservaciones] = useState("");
  const [loading, setLoading] = useState(false);

  const mesesDelAno = getMesesAnoEscolar(anoActivo.nombre);
  const mesActual = (() => {
    const hoy = new Date();
    return `${String(hoy.getMonth() + 1).padStart(2, "0")}/${hoy.getFullYear()}`;
  })();
  const mesActualNum = mesAnoToNum(mesActual);

  const precioMap: Record<string, number> = {};
  for (const p of productos) {
    precioMap[p.nombre] = Number(p.precioUsd);
  }

  const alumnoSeleccionado = alumnos.find((a) => a.id === alumnoId);
  const inscripcion = alumnoSeleccionado?.inscripciones?.[0];

  const recalcularConceptos = useCallback(() => {
    if (!alumnoSeleccionado || !inscripcion || mesesSeleccionados.length === 0) {
      setConceptos([]);
      return;
    }

    const serviciosActivos = inscripcion.servicios;
    const descuento = Number(inscripcion.descuentoMontoUsd ?? 0);
    const nuevosConceptos: ConceptoEditable[] = [];

    for (const mes of mesesSeleccionados) {
      nuevosConceptos.push({
        concepto: "Mensualidad",
        mesAno: mes,
        montoUsd: precioMap["Mensualidad"] ?? 0,
      });
      for (const servicio of serviciosActivos) {
        const label = TIPO_SERVICIO_LABELS[servicio.tipo];
        nuevosConceptos.push({
          concepto: label,
          mesAno: mes,
          montoUsd: precioMap[label] ?? 0,
        });
      }
    }

    if (descuento > 0) {
      nuevosConceptos.push({
        concepto: "Descuento/Beca",
        mesAno: null,
        montoUsd: -(descuento * mesesSeleccionados.length),
      });
    }

    setConceptos(nuevosConceptos);
  }, [alumnoId, mesesSeleccionados.join(","), productos.length]);

  useEffect(() => {
    recalcularConceptos();
  }, [recalcularConceptos]);

  // Cuando cambia la moneda, ajustar forma de pago por defecto
  useEffect(() => {
    if (monedaPagada === "USD") setFormaPago("EFECTIVO_USD");
    else setFormaPago("EFECTIVO_BS");
  }, [monedaPagada]);

  const totalUsd = conceptos.reduce((sum, c) => sum + c.montoUsd, 0);
  const tasaEfectiva = parseFloat(tasaOverride) || 0;
  const totalBs = monedaPagada === "BS" && tasaEfectiva > 0
    ? calcularBs(totalUsd, tasaEfectiva)
    : null;

  const toggleMes = (mes: string) => {
    setMesesSeleccionados((prev) =>
      prev.includes(mes) ? prev.filter((m) => m !== mes) : [...prev, mes]
    );
  };

  const actualizarMontoConcepto = (idx: number, valor: string) => {
    const num = parseFloat(valor);
    setConceptos((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, montoUsd: isNaN(num) ? 0 : num } : c))
    );
  };

  const eliminarConcepto = (idx: number) => {
    setConceptos((prev) => prev.filter((_, i) => i !== idx));
  };

  const agregarConceptoManual = () => {
    setConceptos((prev) => [
      ...prev,
      { concepto: "Concepto adicional", mesAno: null, montoUsd: 0 },
    ]);
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
    if (conceptos.length === 0) {
      toast({ title: "Agrega al menos un concepto", variant: "destructive" });
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
        montoUsd: totalUsd,
        montoBs: totalBs,
        tasaCambioId: tasaActual?.id ?? null,
        monedaPagada: monedaPagada as "USD" | "BS",
        formaPago: formaPago as "EFECTIVO_USD" | "EFECTIVO_BS" | "PAGO_MOVIL_BS" | "TRANSFERENCIA_BS",
        numeroReferencia: numeroReferencia.trim() || null,
        fechaPago,
        observaciones: observaciones.trim() || null,
        conceptos: conceptos.map((c) => ({
          concepto: c.concepto,
          mesAno: c.mesAno,
          montoUsd: c.montoUsd,
        })),
      });

      toast({
        title: `Pago registrado — Recibo ${result.numeroRecibo}`,
      });
      router.push(`/mensualidades/${result.pagoId}`);
    } catch (e) {
      toast({
        title: "Error al registrar el pago",
        description: parsePrismaError(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const requiereReferencia = ["PAGO_MOVIL_BS", "TRANSFERENCIA_BS"].includes(formaPago);

  return (
    <div className="space-y-5">
      {/* Selección de alumno */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-sm text-gray-700 mb-3">
          1. Selección de Alumno
        </h3>
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
                Descuento: {formatUSD(Number(inscripcion.descuentoMontoUsd))}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Selección de meses */}
      {alumnoId && (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="font-semibold text-sm text-gray-700 mb-3">
            2. Meses a Pagar
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {mesesDelAno.map((mes) => {
              const esFuturo = mesAnoToNum(mes) > mesActualNum;
              const seleccionado = mesesSeleccionados.includes(mes);
              let label = mes;
              try { label = formatMesAno(mes); } catch { /* */ }
              return (
                <button
                  key={mes}
                  onClick={() => !esFuturo && toggleMes(mes)}
                  disabled={esFuturo}
                  className={[
                    "px-3 py-2 rounded-md text-xs border transition-colors",
                    seleccionado
                      ? "bg-blue-600 text-white border-blue-600"
                      : esFuturo
                      ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                      : "bg-white text-gray-700 border-gray-200 hover:border-blue-400",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {mesesSeleccionados.length > 0 && (
            <p className="mt-2 text-xs text-blue-600">
              {mesesSeleccionados.length} mes(es) seleccionado(s)
            </p>
          )}
        </div>
      )}

      {/* Conceptos */}
      {conceptos.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="font-semibold text-sm text-gray-700 mb-3">
            3. Conceptos del Pago
          </h3>
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_100px_80px_32px] gap-2 text-xs font-medium text-gray-500 uppercase px-1 mb-2">
              <span>Concepto</span>
              <span>Mes/Año</span>
              <span className="text-right">Monto USD</span>
              <span></span>
            </div>
            {conceptos.map((c, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_100px_80px_32px] gap-2 items-center"
              >
                <input
                  value={c.concepto}
                  onChange={(e) =>
                    setConceptos((prev) =>
                      prev.map((x, j) =>
                        j === i ? { ...x, concepto: e.target.value } : x
                      )
                    )
                  }
                  className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-500 text-center">
                  {c.mesAno ?? "—"}
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={c.montoUsd}
                  onChange={(e) => actualizarMontoConcepto(i, e.target.value)}
                  className={[
                    "border rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500",
                    c.montoUsd < 0 ? "border-red-200 text-red-600" : "border-gray-200",
                  ].join(" ")}
                />
                <button
                  onClick={() => eliminarConcepto(i)}
                  className="text-gray-300 hover:text-red-400 text-lg leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={agregarConceptoManual}
              className="text-xs text-blue-600 hover:underline"
            >
              + Agregar concepto manual
            </button>
            <div className="text-right">
              <span className="text-xs text-gray-500 mr-2">Total:</span>
              <span className="font-bold text-lg">{formatUSD(totalUsd)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Forma de pago */}
      {mesesSeleccionados.length > 0 && (
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
                      onChange={() => setMonedaPagada(m)}
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
                  value={tasaOverride}
                  onChange={(e) => setTasaOverride(e.target.value)}
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
              <input
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
      {conceptos.length > 0 && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-700">
              Total a registrar:{" "}
              <span className="font-bold text-lg">{formatUSD(totalUsd)}</span>
              {totalBs && (
                <span className="ml-2 text-blue-600">
                  = {formatBS(totalBs)}
                </span>
              )}
            </p>
            <p className="text-xs text-blue-500 mt-0.5">
              {mesesSeleccionados.length} mes(es) •{" "}
              {FORMA_PAGO_LABELS[formaPago] ?? formaPago} •{" "}
              {alumnoSeleccionado
                ? `${alumnoSeleccionado.primerApellido} ${alumnoSeleccionado.primerNombre}`
                : ""}
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
