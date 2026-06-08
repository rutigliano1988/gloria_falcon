import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { MESES } from "@/lib/utils";
import type { getContabilidadData } from "@/app/(dashboard)/contabilidad/actions";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, padding: 40, color: "#1a1a1a" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1.5, borderBottomColor: "#059669" },
  logo: { width: 55, height: 55, objectFit: "contain", marginRight: 12 },
  colegioNombre: { fontSize: 12, fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginBottom: 2, color: "#064e3b" },
  colegioDetalle: { fontSize: 8, color: "#4b5563", marginBottom: 1 },
  reporteTitulo: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#065f46", marginBottom: 2 },
  reporteSubtitulo: { fontSize: 9, color: "#6b7280", marginBottom: 16 },
  seccionTitulo: { fontSize: 10, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
  tablaHeader: { flexDirection: "row", backgroundColor: "#d1fae5", padding: "4 8" },
  tablaHeaderEgreso: { flexDirection: "row", backgroundColor: "#fee2e2", padding: "4 8" },
  tablaHeaderText: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#374151" },
  tablaFila: { flexDirection: "row", padding: "4 8", borderBottomWidth: 0.5, borderBottomColor: "#f3f4f6" },
  tablaFilaTotal: { flexDirection: "row", padding: "5 8", backgroundColor: "#f0fdf4", borderTopWidth: 1, borderTopColor: "#059669" },
  tablaFilaTotalEgreso: { flexDirection: "row", padding: "5 8", backgroundColor: "#fff1f2", borderTopWidth: 1, borderTopColor: "#dc2626" },
  colLabel: { flex: 3 },
  colUsd: { flex: 1.2, textAlign: "right" },
  colBs: { flex: 1.5, textAlign: "right" },
  celda: { fontSize: 9, color: "#374151" },
  celdaBold: { fontSize: 9.5, fontFamily: "Helvetica-Bold" },
  separador: { borderTopWidth: 1.5, borderTopColor: "#000", marginTop: 14, marginBottom: 8 },
  balanceBox: { backgroundColor: "#ecfdf5", padding: "10 12", borderRadius: 4, borderWidth: 1.5, borderColor: "#059669", marginTop: 8 },
  balanceBoxRed: { backgroundColor: "#fff1f2", padding: "10 12", borderRadius: 4, borderWidth: 1.5, borderColor: "#dc2626", marginTop: 8 },
  balanceLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  balanceMonto: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  balanceBs: { fontSize: 10, color: "#6b7280", marginTop: 2 },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, textAlign: "center", fontSize: 7.5, color: "#9ca3af" },
});

type BalanceData = Awaited<ReturnType<typeof getContabilidadData>>;
type ConfigColegio = { nombre: string; rif: string; direccion: string; telefonos: string; correo: string } | null;

const TIPO_LABELS: Record<string, string> = {
  MENSUALIDAD: "Mensualidades y cobros",
  VENTA: "Ventas de productos",
  INGRESO_MANUAL: "Ingresos manuales",
  INSCRIPCION: "Inscripciones",
};

function fmt(n: number) {
  return new Intl.NumberFormat("es-VE", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}
function fmtBs(n: number) {
  return new Intl.NumberFormat("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + " Bs";
}
function fmtFecha(d: Date) {
  return d.toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

interface Props {
  data: BalanceData;
  config: ConfigColegio;
  logoBase64: string | null;
}

export function ReporteBalance({ data, config, logoBase64 }: Props) {
  const { mes, ano, porTipo, totalIngresosUsd, egresosPorCategoria, totalEgresosUsd, balance, tasa } = data;
  const periodoLabel = `${MESES[mes - 1]} ${ano}`;
  const balancePositivo = balance >= 0;

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

        <Text style={styles.reporteTitulo}>BALANCE MENSUAL</Text>
        <Text style={styles.reporteSubtitulo}>
          Período: {periodoLabel}
          {tasa > 0 ? `{"   "}|{"   "}Tasa BCV: ${tasa.toFixed(4)} Bs/$1` : ""}
          {"   "}|{"   "}Generado: {fmtFecha(new Date())}
        </Text>

        {/* INGRESOS */}
        <Text style={[styles.seccionTitulo, { color: "#065f46" }]}>📥 Ingresos</Text>
        <View style={styles.tablaHeader}>
          <Text style={[styles.tablaHeaderText, styles.colLabel]}>Categoría</Text>
          <Text style={[styles.tablaHeaderText, styles.colUsd]}>USD</Text>
          {tasa > 0 && <Text style={[styles.tablaHeaderText, styles.colBs]}>Bs (aprox.)</Text>}
        </View>
        {Object.entries(TIPO_LABELS).map(([tipo, label], i) => {
          const monto = porTipo[tipo as keyof typeof porTipo] ?? 0;
          return (
            <View key={tipo} style={styles.tablaFila}>
              <Text style={[styles.celda, styles.colLabel]}>{label}</Text>
              <Text style={[styles.celda, styles.colUsd]}>{fmt(monto)}</Text>
              {tasa > 0 && <Text style={[styles.celda, styles.colBs]}>{fmtBs(monto * tasa)}</Text>}
            </View>
          );
        })}
        <View style={styles.tablaFilaTotal}>
          <Text style={[styles.celdaBold, styles.colLabel, { color: "#065f46" }]}>TOTAL INGRESOS</Text>
          <Text style={[styles.celdaBold, styles.colUsd, { color: "#065f46" }]}>{fmt(totalIngresosUsd)}</Text>
          {tasa > 0 && <Text style={[styles.celdaBold, styles.colBs, { color: "#065f46" }]}>{fmtBs(totalIngresosUsd * tasa)}</Text>}
        </View>

        {/* EGRESOS */}
        <Text style={[styles.seccionTitulo, { color: "#7f1d1d" }]}>📤 Egresos</Text>
        <View style={styles.tablaHeaderEgreso}>
          <Text style={[styles.tablaHeaderText, styles.colLabel]}>Categoría</Text>
          <Text style={[styles.tablaHeaderText, styles.colUsd]}>USD</Text>
          {tasa > 0 && <Text style={[styles.tablaHeaderText, styles.colBs]}>Bs (aprox.)</Text>}
        </View>
        {Object.entries(egresosPorCategoria).length === 0 ? (
          <View style={styles.tablaFila}>
            <Text style={[styles.celda, { color: "#9ca3af" }]}>Sin egresos registrados</Text>
          </View>
        ) : (
          Object.entries(egresosPorCategoria)
            .sort(([, a], [, b]) => b - a)
            .map(([cat, monto]) => (
              <View key={cat} style={styles.tablaFila}>
                <Text style={[styles.celda, styles.colLabel]}>{cat}</Text>
                <Text style={[styles.celda, styles.colUsd]}>{fmt(monto)}</Text>
                {tasa > 0 && <Text style={[styles.celda, styles.colBs]}>{fmtBs(monto * tasa)}</Text>}
              </View>
            ))
        )}
        <View style={styles.tablaFilaTotalEgreso}>
          <Text style={[styles.celdaBold, styles.colLabel, { color: "#7f1d1d" }]}>TOTAL EGRESOS</Text>
          <Text style={[styles.celdaBold, styles.colUsd, { color: "#7f1d1d" }]}>{fmt(totalEgresosUsd)}</Text>
          {tasa > 0 && <Text style={[styles.celdaBold, styles.colBs, { color: "#7f1d1d" }]}>{fmtBs(totalEgresosUsd * tasa)}</Text>}
        </View>

        {/* BALANCE NETO */}
        <View style={[styles.separador]} />
        <View style={balancePositivo ? styles.balanceBox : styles.balanceBoxRed}>
          <Text style={[styles.balanceLabel, { color: balancePositivo ? "#065f46" : "#7f1d1d" }]}>
            BALANCE NETO {periodoLabel}
          </Text>
          <Text style={[styles.balanceMonto, { color: balancePositivo ? "#059669" : "#dc2626" }]}>
            {balancePositivo ? "+" : ""}{fmt(balance)}
          </Text>
          {tasa > 0 && (
            <Text style={styles.balanceBs}>
              {balancePositivo ? "+" : ""}{fmtBs(balance * tasa)}
            </Text>
          )}
        </View>

        <Text style={styles.footer}>
          Documento generado el {fmtFecha(new Date())} — Sistema de Gestión Escolar Gloria Falcón
        </Text>
      </Page>
    </Document>
  );
}
