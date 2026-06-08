import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { FORMA_PAGO_LABELS } from "@/lib/utils";

const TIPO_LABELS: Record<string, string> = {
  VENTA: "VENTA DE PRODUCTOS",
  INGRESO_MANUAL: "INGRESO MANUAL",
};

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, padding: 40, color: "#1a1a1a" },
  header: {
    flexDirection: "row", alignItems: "center", marginBottom: 16,
    paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: "#16a34a",
  },
  logo: { width: 60, height: 60, objectFit: "contain", marginRight: 14 },
  colegioNombre: { fontSize: 13, fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginBottom: 3, color: "#14532d" },
  colegioDetalle: { fontSize: 8.5, color: "#4b5563", marginBottom: 1 },
  reciboHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#f0fdf4", padding: 10, borderRadius: 4, marginBottom: 14,
  },
  reciboNumero: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#14532d" },
  reciboDetalle: { fontSize: 9, color: "#4b5563", marginTop: 2 },
  tablaHeader: { flexDirection: "row", backgroundColor: "#16a34a", padding: "6 8" },
  tablaHeaderText: { color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 9 },
  tablaFila: { flexDirection: "row", padding: "5 8", borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" },
  tablaFilaAlterna: { backgroundColor: "#f9fafb" },
  tablaTotal: { flexDirection: "row", padding: "6 8", backgroundColor: "#f0fdf4", borderTopWidth: 1, borderTopColor: "#16a34a" },
  tablaTotalText: { fontFamily: "Helvetica-Bold", fontSize: 10, color: "#14532d" },
  colConcepto: { flex: 3 },
  colMonto: { flex: 1.5, textAlign: "right" },
  tablaCelda: { fontSize: 9, color: "#374151" },
  pagoInfo: { flexDirection: "row", gap: 16, padding: 10, backgroundColor: "#f9fafb", borderRadius: 4, marginBottom: 12 },
  pagoInfoLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase", color: "#9ca3af", marginBottom: 1 },
  pagoInfoValue: { fontSize: 9.5, color: "#111827" },
  bsTotal: { textAlign: "right", marginBottom: 14, paddingRight: 8 },
  bsTotalLabel: { fontSize: 9, color: "#6b7280" },
  bsTotalValue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#065f46" },
  firmas: { flexDirection: "row", justifyContent: "space-around", marginTop: 30 },
  firmaBloque: { alignItems: "center", width: "40%" },
  firmaLinea: { borderTopWidth: 1, borderTopColor: "#9ca3af", width: "100%", marginBottom: 4 },
  firmaLabel: { fontSize: 8, color: "#6b7280", textAlign: "center" },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, textAlign: "center", fontSize: 7.5, color: "#9ca3af" },
});

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-VE", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}
function fmtBs(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2 }).format(n) + " Bs";
}
function fmtFecha(d: Date | string) {
  const fecha = typeof d === "string" ? new Date(d) : d;
  return fecha.toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

type ConfigColegio = { nombre: string; rif: string; direccion: string; telefonos: string; correo: string } | null;
type Venta = Awaited<ReturnType<typeof import("@/app/(dashboard)/ventas/actions").getVentaById>>;

interface Props {
  venta: NonNullable<Venta>;
  config: ConfigColegio;
  logoBase64: string | null;
}

export function ReciboVenta({ venta, config, logoBase64 }: Props) {
  const totalUsd = Number(venta.montoUsd);
  const totalBs = venta.montoBs ? Number(venta.montoBs) : null;
  const tasa = venta.tasaCambio ? Number(venta.tasaCambio.tasa) : null;

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

        {/* Recibo y fecha */}
        <View style={styles.reciboHeader}>
          <View>
            <Text style={styles.reciboNumero}>
              RECIBO N° {venta.numeroRecibo ?? venta.id.slice(-8).toUpperCase()}
            </Text>
            <Text style={styles.reciboDetalle}>
              {TIPO_LABELS[venta.tipo] ?? venta.tipo}
            </Text>
          </View>
          <Text style={{ fontSize: 9, color: "#4b5563" }}>
            Fecha: {fmtFecha(venta.fechaPago)}
          </Text>
        </View>

        {/* Tabla de conceptos */}
        <View style={{ marginBottom: 12 }}>
          <View style={styles.tablaHeader}>
            <Text style={[styles.tablaHeaderText, styles.colConcepto]}>Concepto</Text>
            <Text style={[styles.tablaHeaderText, styles.colMonto]}>Monto USD</Text>
          </View>
          {venta.conceptos.map((c, i) => (
            <View key={i} style={[styles.tablaFila, i % 2 === 1 ? styles.tablaFilaAlterna : {}]}>
              <Text style={[styles.tablaCelda, styles.colConcepto]}>{c.concepto}</Text>
              <Text style={[styles.tablaCelda, styles.colMonto]}>{fmt(Number(c.montoUsd))}</Text>
            </View>
          ))}
          <View style={styles.tablaTotal}>
            <Text style={[styles.tablaTotalText, styles.colConcepto]}>TOTAL</Text>
            <Text style={[styles.tablaTotalText, styles.colMonto]}>{fmt(totalUsd)}</Text>
          </View>
        </View>

        {/* Equivalente Bs */}
        {totalBs && tasa && (
          <View style={styles.bsTotal}>
            <Text style={styles.bsTotalLabel}>Tasa BCV: {tasa.toFixed(4)} Bs / $1</Text>
            <Text style={styles.bsTotalValue}>Equivalente: {fmtBs(totalBs)}</Text>
          </View>
        )}

        {/* Datos del pago */}
        <View style={styles.pagoInfo}>
          <View>
            <Text style={styles.pagoInfoLabel}>Forma de Pago</Text>
            <Text style={styles.pagoInfoValue}>{FORMA_PAGO_LABELS[venta.formaPago] ?? venta.formaPago}</Text>
          </View>
          {venta.numeroReferencia && (
            <View>
              <Text style={styles.pagoInfoLabel}>N° Referencia</Text>
              <Text style={styles.pagoInfoValue}>{venta.numeroReferencia}</Text>
            </View>
          )}
          {venta.observaciones && (
            <View>
              <Text style={styles.pagoInfoLabel}>Observaciones</Text>
              <Text style={styles.pagoInfoValue}>{venta.observaciones}</Text>
            </View>
          )}
        </View>

        {/* Firmas */}
        <View style={styles.firmas}>
          <View style={styles.firmaBloque}>
            <View style={styles.firmaLinea} />
            <Text style={styles.firmaLabel}>Sello / Administración</Text>
          </View>
          <View style={styles.firmaBloque}>
            <View style={styles.firmaLinea} />
            <Text style={styles.firmaLabel}>Recibido por</Text>
          </View>
        </View>

        <Text style={styles.footer}>Documento generado el {fmtFecha(new Date())}</Text>
      </Page>
    </Document>
  );
}
