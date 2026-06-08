import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { formatMesAno, MESES } from "@/lib/utils";
import type { AlumnoConSolvencia } from "@/app/(dashboard)/mensualidades/actions";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, padding: 40, color: "#1a1a1a" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1.5, borderBottomColor: "#dc2626" },
  logo: { width: 55, height: 55, objectFit: "contain", marginRight: 12 },
  colegioNombre: { fontSize: 12, fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginBottom: 2, color: "#7f1d1d" },
  colegioDetalle: { fontSize: 8, color: "#4b5563", marginBottom: 1 },
  reporteTitulo: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#991b1b", marginBottom: 2 },
  reporteSubtitulo: { fontSize: 9, color: "#6b7280", marginBottom: 14 },
  tablaHeader: { flexDirection: "row", backgroundColor: "#991b1b", padding: "5 6" },
  tablaHeaderText: { color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 8.5 },
  tablaFila: { flexDirection: "row", padding: "5 6", borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" },
  tablaFilaAlterna: { backgroundColor: "#fef2f2" },
  colNum: { width: 20 },
  colNombre: { flex: 3 },
  colGrado: { flex: 1.2 },
  colMeses: { flex: 2.5 },
  colMonto: { flex: 1.2, textAlign: "right" },
  celda: { fontSize: 9, color: "#374151" },
  resumen: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, padding: "8 6", backgroundColor: "#fee2e2", borderRadius: 4 },
  resumenText: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: "#7f1d1d" },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, textAlign: "center", fontSize: 7.5, color: "#9ca3af" },
});

function fmt(n: number) {
  return new Intl.NumberFormat("es-VE", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}
function fmtFecha(d: Date) {
  return d.toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

type ConfigColegio = { nombre: string; rif: string; direccion: string; telefonos: string; correo: string } | null;

interface Props {
  morosos: AlumnoConSolvencia[];
  mesAno: string;
  config: ConfigColegio;
  logoBase64: string | null;
}

export function ReporteMorosos({ morosos, mesAno, config, logoBase64 }: Props) {
  let periodoLabel = mesAno;
  try { periodoLabel = formatMesAno(mesAno); } catch { /* */ }

  const ordenados = [...morosos].sort((a, b) =>
    a.nombreCompleto.localeCompare(b.nombreCompleto)
  );

  const montoTotalEstimado = ordenados.reduce(
    (s, a) => s + a.montoMensualUsd * a.mesesMorosos.length,
    0
  );

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

        <Text style={styles.reporteTitulo}>REPORTE DE ALUMNOS MOROSOS</Text>
        <Text style={styles.reporteSubtitulo}>
          Período: {periodoLabel}{"   "}|{"   "}Generado: {fmtFecha(new Date())}
        </Text>

        {ordenados.length === 0 ? (
          <Text style={{ fontSize: 11, color: "#6b7280", textAlign: "center", marginTop: 40 }}>
            No hay alumnos morosos en este período. ✓
          </Text>
        ) : (
          <>
            <View style={styles.tablaHeader}>
              <Text style={[styles.tablaHeaderText, styles.colNum]}>N°</Text>
              <Text style={[styles.tablaHeaderText, styles.colNombre]}>Alumno</Text>
              <Text style={[styles.tablaHeaderText, styles.colGrado]}>Grado</Text>
              <Text style={[styles.tablaHeaderText, styles.colMeses]}>Meses adeudados</Text>
              <Text style={[styles.tablaHeaderText, styles.colMonto]}>Monto est.</Text>
            </View>
            {ordenados.map((a, i) => {
              const mesesLabels = a.mesesMorosos.slice(0, 4).map((m) => {
                try { return formatMesAno(m); } catch { return m; }
              }).join(", ") + (a.mesesMorosos.length > 4 ? ` +${a.mesesMorosos.length - 4}` : "");
              const montoEst = a.montoMensualUsd * a.mesesMorosos.length;
              return (
                <View key={a.id} style={[styles.tablaFila, i % 2 === 1 ? styles.tablaFilaAlterna : {}]}>
                  <Text style={[styles.celda, styles.colNum]}>{i + 1}</Text>
                  <Text style={[styles.celda, styles.colNombre]}>{a.nombreCompleto}</Text>
                  <Text style={[styles.celda, styles.colGrado]}>{a.grado}{a.seccion ? ` ${a.seccion}` : ""}</Text>
                  <Text style={[styles.celda, styles.colMeses]}>{mesesLabels}</Text>
                  <Text style={[styles.celda, styles.colMonto]}>{fmt(montoEst)}</Text>
                </View>
              );
            })}
            <View style={styles.resumen}>
              <Text style={styles.resumenText}>Total alumnos morosos: {ordenados.length}</Text>
              <Text style={styles.resumenText}>Monto total estimado: {fmt(montoTotalEstimado)}</Text>
            </View>
          </>
        )}

        <Text style={styles.footer}>
          Documento generado el {fmtFecha(new Date())} — Sistema de Gestión Escolar Gloria Falcón
        </Text>
      </Page>
    </Document>
  );
}
