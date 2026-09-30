"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/hooks/use-toast";
import { formatBS, FORMA_PAGO_LABELS, MESES } from "@/lib/utils";
import { calcularTotalNomina, montoBsDesdeUsd } from "@/lib/finanzas";
import { registrarPagoNomina } from "../../actions";
import type { getNominaFormData } from "../../actions";

type FormData = Awaited<ReturnType<typeof getNominaFormData>>;

interface Props {
  docentes: FormData["docentes"];
  tasaActual: FormData["tasaActual"];
  docenteIdInicial?: string;
}

interface ConceptoExtra {
  descripcion: string;
  montoBs: number;
}

export function NominaForm({ docentes, tasaActual, docenteIdInicial }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const hoy = new Date();
  const [docenteId, setDocenteId] = useState(docenteIdInicial ?? "");
  const [periodoMes, setPeriodoMes] = useState(hoy.getMonth() + 1);
  const [periodoAno, setPeriodoAno] = useState(hoy.getFullYear());
  const [baseBs, setBaseBs] = useState("");
  const [bonoUsd, setBonoUsd] = useState("");
  const [tasa, setTasa] = useState(tasaActual ? Number(tasaActual.tasa).toFixed(4) : "");
  // null = automático (bono USD × tasa); string = ajuste manual del usuario.
  const [bonoBsManual, setBonoBsManual] = useState<string | null>(null);
  const [otros, setOtros] = useState<ConceptoExtra[]>([]);
  const [deducciones, setDeducciones] = useState<ConceptoExtra[]>([]);
  const [formaPago, setFormaPago] = useState("EFECTIVO_BS");
  const [numeroReferencia, setNumeroReferencia] = useState("");
  const [fechaPago, setFechaPago] = useState(
    `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`
  );
  const [loading, setLoading] = useState(false);

  const baseNum = parseFloat(baseBs) || 0;
  const bonoUsdNum = parseFloat(bonoUsd) || 0;
  const tasaNum = parseFloat(tasa) || 0;
  const bonoBsAuto = bonoUsdNum > 0 && tasaNum > 0 ? montoBsDesdeUsd(bonoUsdNum, tasaNum) : 0;
  // Sin bono en USD no hay bono en Bs: antes quedaba un monto oculto sumando al total (M10).
  const bonoBsNum = bonoUsdNum > 0 ? (bonoBsManual !== null ? parseFloat(bonoBsManual) || 0 : bonoBsAuto) : 0;
  // Mismo cálculo que hace el servidor al guardar.
  const totalBs = calcularTotalNomina({
    baseBs: baseNum,
    bonoBs: bonoBsNum,
    otros: otros.filter((c) => c.descripcion && c.montoBs > 0),
    deducciones: deducciones.filter((c) => c.descripcion && c.montoBs > 0),
  });

  const addOtro = () => setOtros([...otros, { descripcion: "", montoBs: 0 }]);
  const addDeduccion = () => setDeducciones([...deducciones, { descripcion: "", montoBs: 0 }]);

  const requiereRef = ["PAGO_MOVIL_BS", "TRANSFERENCIA_BS"].includes(formaPago);

  const handleSubmit = async () => {
    if (!docenteId) { toast({ title: "Selecciona un docente", variant: "destructive" }); return; }
    if (baseNum <= 0) { toast({ title: "La base en Bs debe ser mayor a 0", variant: "destructive" }); return; }
    if (tasaNum <= 0) { toast({ title: "Indica la tasa de cambio del día", variant: "destructive" }); return; }
    if (requiereRef && !numeroReferencia.trim()) {
      toast({ title: "El número de referencia es obligatorio", variant: "destructive" }); return;
    }

    setLoading(true);
    try {
      const result = await registrarPagoNomina({
        docenteId,
        periodoMes,
        periodoAno,
        baseBs: baseNum,
        bonoUsd: bonoUsdNum > 0 ? bonoUsdNum : null,
        bonoBsEquivalente: bonoUsdNum > 0 ? bonoBsNum : null,
        tasaAplicada: tasaNum,
        otrosConceptos: otros.filter((c) => c.descripcion && c.montoBs > 0),
        deducciones: deducciones.filter((c) => c.descripcion && c.montoBs > 0),
        formaPago: formaPago as "EFECTIVO_USD" | "EFECTIVO_BS" | "PAGO_MOVIL_BS" | "TRANSFERENCIA_BS",
        numeroReferencia: numeroReferencia.trim() || null,
        fechaPago,
      });
      if (!result.ok) {
        toast({ title: "No se pudo registrar", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Nómina registrada" });
      router.push(`/docentes/nomina/${result.pagoId}`);
    } catch {
      toast({
        title: "Error al registrar",
        description: "Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Docente y período */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-sm text-gray-700 mb-4">1. Docente y Período</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-3">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Docente *</label>
            <select
              value={docenteId}
              onChange={(e) => setDocenteId(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Selecciona —</option>
              {docentes.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.primerApellido} {d.primerNombre} ({d.cargo})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Mes</label>
            <select
              value={periodoMes}
              onChange={(e) => setPeriodoMes(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MESES.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Año</label>
            <input
              type="number"
              value={periodoAno}
              onChange={(e) => setPeriodoAno(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Fecha de pago</label>
            <DatePicker value={fechaPago} onChange={setFechaPago} />
          </div>
        </div>
      </div>

      {/* Conceptos */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-sm text-gray-700 mb-4">2. Conceptos</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Base (Bs) *</label>
              <input
                type="number" step="0.01" value={baseBs}
                onChange={(e) => setBaseBs(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Bono (USD)</label>
              <input
                type="number" step="0.01" value={bonoUsd}
                onChange={(e) => {
                  setBonoUsd(e.target.value);
                  setBonoBsManual(null);
                }}
                placeholder="0.00"
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Tasa del día (Bs/$1) *
              </label>
              <input
                type="number" step="0.0001" value={tasa}
                onChange={(e) => {
                  setTasa(e.target.value);
                  setBonoBsManual(null);
                }}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {bonoUsdNum > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Bono en Bs (editable)
                </label>
                <input
                  type="number" step="0.01" value={bonoBsManual ?? bonoBsAuto.toFixed(2)}
                  onChange={(e) => setBonoBsManual(e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Otros conceptos */}
          {otros.map((c, i) => (
            <div key={i} className="grid grid-cols-[1fr_120px_28px] gap-2 items-center">
              <input
                value={c.descripcion}
                onChange={(e) => setOtros(otros.map((x, j) => j === i ? { ...x, descripcion: e.target.value } : x))}
                placeholder="Descripción del concepto"
                className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="number" step="0.01" value={c.montoBs || ""}
                onChange={(e) => setOtros(otros.map((x, j) => j === i ? { ...x, montoBs: parseFloat(e.target.value) || 0 } : x))}
                placeholder="Bs"
                className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button onClick={() => setOtros(otros.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-400 text-lg">×</button>
            </div>
          ))}
          {otros.length < 3 && (
            <button onClick={addOtro} className="text-xs text-blue-600 hover:underline">+ Agregar concepto</button>
          )}

          {/* Deducciones */}
          {deducciones.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">Deducciones</p>
              {deducciones.map((c, i) => (
                <div key={i} className="grid grid-cols-[1fr_120px_28px] gap-2 items-center mb-2">
                  <input
                    value={c.descripcion}
                    onChange={(e) => setDeducciones(deducciones.map((x, j) => j === i ? { ...x, descripcion: e.target.value } : x))}
                    placeholder="Descripción"
                    className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="number" step="0.01" value={c.montoBs || ""}
                    onChange={(e) => setDeducciones(deducciones.map((x, j) => j === i ? { ...x, montoBs: parseFloat(e.target.value) || 0 } : x))}
                    placeholder="Bs"
                    className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button onClick={() => setDeducciones(deducciones.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-400 text-lg">×</button>
                </div>
              ))}
            </div>
          )}
          {deducciones.length < 2 && (
            <button onClick={addDeduccion} className="text-xs text-orange-600 hover:underline">+ Agregar deducción</button>
          )}

          {/* Total */}
          <div className="flex justify-end pt-3 border-t border-gray-100">
            <div className="text-right">
              <span className="text-xs text-gray-500 mr-2">Total Neto:</span>
              <span className="font-bold text-lg">{formatBS(totalBs)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Forma de pago */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-sm text-gray-700 mb-4">3. Forma de Pago</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Método</label>
            <select
              value={formaPago}
              onChange={(e) => setFormaPago(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(FORMA_PAGO_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              N° Referencia{requiereRef ? " *" : " (opcional)"}
            </label>
            <input
              type="text" value={numeroReferencia}
              onChange={(e) => setNumeroReferencia(e.target.value)}
              placeholder="Número de confirmación"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Resumen y enviar */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-blue-700 font-medium">
            Total: <span className="text-lg font-bold">{formatBS(totalBs)}</span>
          </p>
          <p className="text-xs text-blue-500 mt-0.5">
            {MESES[periodoMes - 1]} {periodoAno} · {FORMA_PAGO_LABELS[formaPago]}
          </p>
        </div>
        <Button onClick={handleSubmit} disabled={loading || totalBs <= 0}>
          {loading ? "Registrando..." : "Registrar Pago"}
        </Button>
      </div>
    </div>
  );
}
