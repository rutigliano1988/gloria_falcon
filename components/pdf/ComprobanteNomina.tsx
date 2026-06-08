import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { FORMA_PAGO_LABELS, CARGO_DOCENTE_LABELS, MESES } from "@/lib/utils";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, padding: 40, color: "#1a1a1a" },
  header: {
    flexDirection: "row", alignItems: "center", marginBottom: 16,
    paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: "#2563eb",
  },
  logo: { width: 60, height: 60, objectFit: "contain", marginRight: 14 },
  colegioNombre: { fontSize: 13, fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginBottom: 3, color: "#1e3a8a" },
  colegioDetalle: { fontSize: 8.5, color: "#4b5563", marginBottom: 1 },
  comprobanteHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#eff6ff", padding: 10, borderRadius: 4, marginBottom: 14,
  },
  comprobanteTitulo: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#1e3a8a" },
  comprobanteDetalle: { fontSize: 9, color: "#4b5563" },
  seccion: { marginBottom: 12 },
  seccionTitulo: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", color: "#6b7280", letterSpacing: 0.8, marginBottom: 5 },
  docenteNombre: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  docenteDetalle: { fontSize: 9, color: "#4b5563" },
  tabla: { marginBottom: 12 },
  tablaHeader: { flexDirection: "row", backgroundColor: "#1e3a8a", padding: "6 8" },
  tablaHeaderText: { color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 9 },
  tablaFila: { flexDirection: "row", padding: "5 8", borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" },
  tablaFilaAlterna: { backgroundColor: "#f9fafb" },
  tablaDeduccion: { flexDirection: "row", padding: "5 8", borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" },
  tablaTotal: { flexDirection: "row", padding: "6 8", backgroundColor: "#eff6ff", borderTopWidth: 1, borderTopColor: "#2563eb" },
  tablaTotalText: { fontFamily: "Helvetica-Bold", fontSize: 10, color: "#1e3a8a" },
  colConcepto: { flex: 3 },
  colMonto: { flex: 1.5, textAlign: "right" },
  tablaCelda: { fontSize: 9, color: "#374151" },
  tablaCeldaRed: { fontSize: 9, color: "#dc2626" },
  pagoInfo: { flexDirection: "row", gap: 16, padding: 10, backgroundColor: "#f9fafb", borderRadius: 4, marginBottom: 12 },
  pagoInfoLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase", color: "#9ca3af", marginBottom: 1 },
  pagoInfoValue: { fontSize: 9.5, color: "#111827" },
  firmas: { flexDirection: "row", justifyContent: "space-around", marginTop: 30 },
  firmaBloque: { alignItems: "center", width: "40%" },
  firmaLinea: { borderTopWidth: 1, borderTopColor: "#9ca3af", width: "100%", marginBottom: 4 },
  firmaLabel: { fontSize: 8, color: "#6b7280", textAlign: "center" },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, textAlign: "center", fontSize: 7.5, color: "#9ca3af" },
});

function fmtBs(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2 }).format(n) + " Bs";
}
function fmtFecha(d: Date | string) {
  const fecha = typeof d === "string" ? new Date(d) : d;
  return fecha.toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

type ConfigColegio = { nombre: string; rif: string; direccion: string; telefonos: string; correo: string } | null;
type Pago = Awaited<ReturnType<typeof import("@/app/(dashboard)/docentes/actions").getPagoNominaById>>;

interface Props {
  pago: NonNullable<Pago>;
  config: ConfigColegio;
  logoBase64: string | null;
}

export function ComprobanteNomina({ pago, config, logoBase64 }: Props) {
  const docente = pago.docente;
  const nombreDocente = [docente.primerApellido, docente.segundoApellido, docente.primerNombre, docente.segundoNombre].filter(Boolean).join(" ");
  const otrosConceptos = (pago.otrosConceptos as { descripcion: string; montoBs: number }[] | null) ?? [];
  const deducciones = (pago.deducciones as { descripcion: string; montoBs: number }[] | null) ?? [];
  const tasa = pago.tasaCambio ? Number(pago.tasaCambio.tasa) : null;
  const periodo = `${MESES[pago.periodoMes - 1]} ${pago.periodoAno}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Encabezado */}
        <View style={styles.header}>
          {logoBase64 && <Image src={logoBase64} style={styles.logo} />}
          <View style={{ flex: 1 }}>
            <Text style={styles.colegioNombre}>{config?.nombre ?? "Unidad Educativa Colegio Gloria Falcón"}</Text>
            {config?.rif && <Text style={styles.colegioDetalle}>RIF: {config.rif}</Text>}
            {config?.direccion && <Text style={styles.colegioDetalle}>{config.direccion}</Text>}
            {config?.telefonos && <Text style={styles.colegioDetalle}>Tlf: {config.telefonos}</Text>}
          </View>
        </View>

        {/* ID y fecha */}
        <View style={styles.comprobanteHeader}>
          <Text style={styles.comprobanteTitulo}>COMPROBANTE DE NÓMINA</Text>
          <View>
            <Text style={styles.comprobanteDetalle}>Período: {periodo}</Text>
            <Text style={styles.comprobanteDetalle}>Fecha: {fmtFecha(pago.fechaPago)}</Text>
          </View>
        </View>

        {/* Docente */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Docente</Text>
          <Text style={styles.docenteNombre}>{nombreDocente}</Text>
          <Text style={styles.docenteDetalle}>
            {CARGO_DOCENTE_LABELS[docente.cargo] ?? docente.cargo} · C.I. {docente.cedula}
          </Text>
        </View>

        {/* Tabla conceptos */}
        <View style={styles.tabla}>
          <Text style={styles.seccionTitulo}>Detalle</Text>
          <View style={styles.tablaHeader}>
            <Text style={[styles.tablaHeaderText, styles.colConcepto]}>Concepto</Text>
            <Text style={[styles.tablaHeaderText, styles.colMonto]}>Monto Bs</Text>
          </View>
          <View style={styles.tablaFila}>
            <Text style={[styles.tablaCelda, styles.colConcepto]}>Base mensual</Text>
            <Text style={[styles.tablaCelda, styles.colMonto]}>{fmtBs(Number(pago.baseBs))}</Text>
          </View>
          {pago.bonoUsd && (
            <View style={[styles.tablaFila, styles.tablaFilaAlterna]}>
              <Text style={[styles.tablaCelda, styles.colConcepto]}>
                Bono USD {Number(pago.bonoUsd).toFixed(2)}{tasa ? ` × ${tasa.toFixed(4)}` : ""}
              </Text>
              <Text style={[styles.tablaCelda, styles.colMonto]}>{fmtBs(Number(pago.bonoBsEquivalente ?? 0))}</Text>
            </View>
          )}
          {otrosConceptos.map((c, i) => (
            <View key={i} style={[styles.tablaFila, i % 2 === 0 ? {} : styles.tablaFilaAlterna]}>
              <Text style={[styles.tablaCelda, styles.colConcepto]}>{c.descripcion}</Text>
              <Text style={[styles.tablaCelda, styles.colMonto]}>{fmtBs(c.montoBs)}</Text>
            </View>
          ))}
          {deducciones.map((d, i) => (
            <View key={i} style={styles.tablaDeduccion}>
              <Text style={[styles.tablaCeldaRed, styles.colConcepto]}>{d.descripcion}</Text>
              <Text style={[styles.tablaCeldaRed, styles.colMonto]}>- {fmtBs(d.montoBs)}</Text>
            </View>
          ))}
          <View style={styles.tablaTotal}>
            <Text style={[styles.tablaTotalText, styles.colConcepto]}>TOTAL NETO</Text>
            <Text style={[styles.tablaTotalText, styles.colMonto]}>{fmtBs(Number(pago.totalBs))}</Text>
          </View>
        </View>

        {/* Forma de pago */}
        <View style={styles.pagoInfo}>
          <View>
            <Text style={styles.pagoInfoLabel}>Forma de Pago</Text>
            <Text style={styles.pagoInfoValue}>{FORMA_PAGO_LABELS[pago.formaPago] ?? pago.formaPago}</Text>
          </View>
          {pago.numeroReferencia && (
            <View>
              <Text style={styles.pagoInfoLabel}>N° Referencia</Text>
              <Text style={styles.pagoInfoValue}>{pago.numeroReferencia}</Text>
            </View>
          )}
          {tasa && (
            <View>
              <Text style={styles.pagoInfoLabel}>Tasa BCV</Text>
              <Text style={styles.pagoInfoValue}>{tasa.toFixed(4)} Bs/$1</Text>
            </View>
          )}
        </View>

        {/* Firmas */}
        <View style={styles.firmas}>
          <View style={styles.firmaBloque}>
            <View style={styles.firmaLinea} />
            <Text style={styles.firmaLabel}>Firma del Docente</Text>
          </View>
          <View style={styles.firmaBloque}>
            <View style={styles.firmaLinea} />
            <Text style={styles.firmaLabel}>Sello / Administración</Text>
          </View>
        </View>

        <Text style={styles.footer}>Documento generado el {fmtFecha(new Date())}</Text>
      </Page>
    </Document>
  );
}
