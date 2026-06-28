"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/hooks/use-toast";
import {
  formatUSD,
  formatBS,
  calcularBs,
  FORMA_PAGO_LABELS,
  parsePrismaError,
} from "@/lib/utils";
import { registrarVenta } from "../actions";
import type { getVentaFormData } from "../actions";

type FormData = Awaited<ReturnType<typeof getVentaFormData>>;

interface Concepto {
  concepto: string;
  montoUsd: number;
}

interface Props {
  productos: FormData["productos"];
  tasaActual: FormData["tasaActual"];
}

export function VentaForm({ productos, tasaActual }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [modo, setModo] = useState<"VENTA" | "INGRESO_MANUAL">("VENTA");
  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState("");
  const [monedaPagada, setMonedaPagada] = useState("USD");
  const [formaPago, setFormaPago] = useState("EFECTIVO_USD");
  const [tasa, setTasa] = useState(
    tasaActual ? Number(tasaActual.tasa).toFixed(4) : ""
  );
  const [numeroReferencia, setNumeroReferencia] = useState("");
  const [fechaPago, setFechaPago] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [observaciones, setObservaciones] = useState("");
  const [loading, setLoading] = useState(false);

  // Cambiar forma de pago al cambiar moneda
  useEffect(() => {
    setFormaPago(monedaPagada === "USD" ? "EFECTIVO_USD" : "EFECTIVO_BS");
  }, [monedaPagada]);

  // Al cambiar de modo, limpiar conceptos
  useEffect(() => {
    setConceptos([]);
    setProductoSeleccionado("");
  }, [modo]);

  const agregarProducto = () => {
    const prod = productos.find((p) => p.id === productoSeleccionado);
    if (!prod) return;
    setConceptos([
      ...conceptos,
      { concepto: prod.nombre, montoUsd: Number(prod.precioUsd) },
    ]);
    setProductoSeleccionado("");
  };

  const agregarConceptoLibre = () => {
    setConceptos([...conceptos, { concepto: "", montoUsd: 0 }]);
  };

  const eliminarConcepto = (i: number) => {
    setConceptos(conceptos.filter((_, j) => j !== i));
  };

  const totalUsd = conceptos.reduce((s, c) => s + (c.montoUsd || 0), 0);
  const tasaNum = parseFloat(tasa) || 0;
  const totalBs =
    monedaPagada === "BS" && tasaNum > 0 ? calcularBs(totalUsd, tasaNum) : null;

  const requiereRef = ["PAGO_MOVIL_BS", "TRANSFERENCIA_BS"].includes(formaPago);

  const handleSubmit = async () => {
    if (conceptos.length === 0) {
      toast({ title: "Agrega al menos un concepto", variant: "destructive" });
      return;
    }
    if (totalUsd <= 0) {
      toast({ title: "El monto total debe ser mayor a 0", variant: "destructive" });
      return;
    }
    if (monedaPagada === "BS" && tasaNum <= 0) {
      toast({ title: "Ingresa la tasa de cambio", variant: "destructive" });
      return;
    }
    if (requiereRef && !numeroReferencia.trim()) {
      toast({
        title: "El número de referencia es obligatorio",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await registrarVenta({
        tipo: modo,
        montoUsd: totalUsd,
        montoBs: totalBs,
        tasaCambioId: tasaActual?.id ?? null,
        monedaPagada: monedaPagada as "USD" | "BS",
        formaPago: formaPago as
          | "EFECTIVO_USD"
          | "EFECTIVO_BS"
          | "PAGO_MOVIL_BS"
          | "TRANSFERENCIA_BS",
        numeroReferencia: numeroReferencia.trim() || null,
        fechaPago,
        observaciones: observaciones.trim() || null,
        conceptos: conceptos.map((c) => ({
          concepto: c.concepto || "Sin descripción",
          montoUsd: c.montoUsd,
        })),
      });

      toast({ title: `Registrado — Recibo ${result.numeroRecibo}` });
      router.push(`/ventas/${result.pagoId}`);
    } catch (e) {
      toast({
        title: "Error al registrar",
        description: parsePrismaError(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Selector de modo */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-sm text-gray-700 mb-3">
          1. Tipo de registro
        </h3>
        <div className="flex gap-3">
          {(["VENTA", "INGRESO_MANUAL"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setModo(m)}
              className={[
                "flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition-colors",
                modo === m
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-200 hover:border-blue-300",
              ].join(" ")}
            >
              {m === "VENTA" ? "🛒 Venta de productos" : "💰 Ingreso manual"}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {modo === "VENTA"
            ? "Selecciona productos del catálogo configurado en Configuración."
            : "Caja libre, chucherías, donaciones, eventos y otros ingresos libres."}
        </p>
      </div>

      {/* Conceptos */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-sm text-gray-700 mb-3">
          2. {modo === "VENTA" ? "Productos" : "Conceptos"}
        </h3>

        {/* Selector de producto (solo en modo VENTA) */}
        {modo === "VENTA" && (
          <div className="flex gap-2 mb-4">
            <select
              value={productoSeleccionado}
              onChange={(e) => setProductoSeleccionado(e.target.value)}
              className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Seleccionar producto del catálogo —</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} — {formatUSD(Number(p.precioUsd))}
                </option>
              ))}
            </select>
            <Button
              onClick={agregarProducto}
              disabled={!productoSeleccionado}
              variant="outline"
              size="sm"
            >
              Añadir
            </Button>
          </div>
        )}

        {/* Tabla de conceptos */}
        {conceptos.length > 0 && (
          <div className="space-y-1 mb-3">
            <div className="grid grid-cols-[1fr_100px_28px] gap-2 text-xs font-medium text-gray-500 uppercase px-1 mb-1">
              <span>Concepto</span>
              <span className="text-right">Monto USD</span>
              <span></span>
            </div>
            {conceptos.map((c, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_100px_28px] gap-2 items-center"
              >
                <input
                  value={c.concepto}
                  onChange={(e) =>
                    setConceptos(
                      conceptos.map((x, j) =>
                        j === i ? { ...x, concepto: e.target.value } : x
                      )
                    )
                  }
                  placeholder="Descripción"
                  className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="number"
                  step="0.01"
                  value={c.montoUsd || ""}
                  onChange={(e) =>
                    setConceptos(
                      conceptos.map((x, j) =>
                        j === i
                          ? { ...x, montoUsd: parseFloat(e.target.value) || 0 }
                          : x
                      )
                    )
                  }
                  className="border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
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
        )}

        <button
          onClick={agregarConceptoLibre}
          className="text-xs text-blue-600 hover:underline"
        >
          + Agregar concepto{modo === "VENTA" ? " libre" : ""}
        </button>

        {conceptos.length > 0 && (
          <div className="flex justify-end mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500 mr-2">Total:</span>
            <span className="font-bold text-base">{formatUSD(totalUsd)}</span>
          </div>
        )}
      </div>

      {/* Forma de pago */}
      {conceptos.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="font-semibold text-sm text-gray-700 mb-4">
            3. Forma de Pago
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Moneda */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Moneda
              </label>
              <div className="flex gap-3">
                {["USD", "BS"].map((m) => (
                  <label
                    key={m}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="moneda"
                      value={m}
                      checked={monedaPagada === m}
                      onChange={() => setMonedaPagada(m)}
                      className="accent-blue-600"
                    />
                    <span className="text-sm">
                      {m === "USD" ? "Dólares ($)" : "Bolívares (Bs)"}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Método */}
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

            {/* Tasa (si BS) */}
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
                N° Referencia{requiereRef ? " *" : " (opcional)"}
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
                Fecha
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
              Total:{" "}
              <span className="font-bold text-lg">{formatUSD(totalUsd)}</span>
              {totalBs && (
                <span className="ml-2 text-blue-600">= {formatBS(totalBs)}</span>
              )}
            </p>
            <p className="text-xs text-blue-500 mt-0.5">
              {modo === "VENTA" ? "Venta de productos" : "Ingreso manual"} ·{" "}
              {FORMA_PAGO_LABELS[formaPago]}
            </p>
          </div>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Registrando..." : "Registrar"}
          </Button>
        </div>
      )}
    </div>
  );
}
