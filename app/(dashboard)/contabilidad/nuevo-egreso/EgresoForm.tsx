"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/hooks/use-toast";
import { formatBS, calcularBs, FORMA_PAGO_LABELS, parsePrismaError } from "@/lib/utils";
import { registrarEgreso } from "../actions";
import type { getEgresoFormData } from "../actions";

type FormData = Awaited<ReturnType<typeof getEgresoFormData>>;

interface Props {
  categorias: FormData["categorias"];
  tasaActual: FormData["tasaActual"];
}

export function EgresoForm({ categorias, tasaActual }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [categoriaId, setCategoriaId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [monedaEgreso, setMonedaEgreso] = useState<"USD" | "BS">("USD");
  const [montoUsd, setMontoUsd] = useState("");
  const [montoBs, setMontoBs] = useState("");
  const [tasa, setTasa] = useState(
    tasaActual ? Number(tasaActual.tasa).toFixed(4) : ""
  );
  const [formaPago, setFormaPago] = useState<string>("");
  const [numeroReferencia, setNumeroReferencia] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [numeroFactura, setNumeroFactura] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);

  const montoBsEquivalente =
    monedaEgreso === "USD" && montoUsd && tasa
      ? calcularBs(parseFloat(montoUsd) || 0, parseFloat(tasa) || 0)
      : null;

  const requiereRef = ["PAGO_MOVIL_BS", "TRANSFERENCIA_BS"].includes(formaPago);

  const handleSubmit = async () => {
    if (!categoriaId) {
      toast({ title: "Selecciona una categoría", variant: "destructive" });
      return;
    }
    if (monedaEgreso === "USD" && !montoUsd) {
      toast({ title: "Ingresa el monto en USD", variant: "destructive" });
      return;
    }
    if (monedaEgreso === "BS" && !montoBs) {
      toast({ title: "Ingresa el monto en Bs", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await registrarEgreso({
        categoriaEgresoId: categoriaId,
        descripcion: descripcion.trim() || null,
        montoUsd: monedaEgreso === "USD" ? parseFloat(montoUsd) || null : null,
        montoBs: monedaEgreso === "BS" ? parseFloat(montoBs) || null : null,
        tasaCambioId: tasaActual?.id ?? null,
        formaPago: (formaPago as "EFECTIVO_USD" | "EFECTIVO_BS" | "PAGO_MOVIL_BS" | "TRANSFERENCIA_BS") || null,
        proveedor: proveedor.trim() || null,
        numeroFactura: numeroFactura.trim() || null,
        fecha,
      });

      toast({ title: "Egreso registrado" });
      router.push("/contabilidad");
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
    <div className="space-y-5 max-w-xl">
      {/* Categoría y descripción */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-sm text-gray-700 mb-4">
          1. Categoría y descripción
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Categoría *
            </label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Selecciona una categoría —</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Las categorías se configuran en{" "}
              <a href="/configuracion" className="text-blue-500 hover:underline">
                Configuración → Categorías de Egreso
              </a>
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Descripción (opcional)
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Factura Corpoelec Nov-2026"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Monto */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-sm text-gray-700 mb-4">2. Monto</h3>
        <div className="space-y-3">
          <div className="flex gap-3">
            {(["USD", "BS"] as const).map((m) => (
              <label key={m} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="monedaEgreso"
                  value={m}
                  checked={monedaEgreso === m}
                  onChange={() => setMonedaEgreso(m)}
                  className="accent-blue-600"
                />
                <span className="text-sm">
                  {m === "USD" ? "En dólares ($)" : "En bolívares (Bs)"}
                </span>
              </label>
            ))}
          </div>

          {monedaEgreso === "USD" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Monto USD *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={montoUsd}
                  onChange={(e) => setMontoUsd(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {montoBsEquivalente && montoBsEquivalente > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    ≈ {formatBS(montoBsEquivalente)}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Tasa BCV (referencia)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={tasa}
                  onChange={(e) => setTasa(e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Monto Bs *
              </label>
              <input
                type="number"
                step="0.01"
                value={montoBs}
                onChange={(e) => setMontoBs(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Detalles del pago */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-sm text-gray-700 mb-4">
          3. Detalles (opcionales)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Forma de pago
            </label>
            <select
              value={formaPago}
              onChange={(e) => setFormaPago(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Sin especificar —</option>
              {Object.entries(FORMA_PAGO_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              N° Referencia{requiereRef ? " *" : ""}
            </label>
            <input
              type="text"
              value={numeroReferencia}
              onChange={(e) => setNumeroReferencia(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Proveedor
            </label>
            <input
              type="text"
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
              placeholder="Ej: Corpoelec"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              N° Factura / Recibo
            </label>
            <input
              type="text"
              value={numeroFactura}
              onChange={(e) => setNumeroFactura(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Fecha
            </label>
            <DatePicker value={fecha} onChange={setFecha} />
          </div>
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={loading}>
        {loading ? "Registrando..." : "Registrar Egreso"}
      </Button>
    </div>
  );
}
