import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { formatMesAno } from "@/lib/utils";
import type { getEstadoCuentaAlumno } from "@/app/(dashboard)/reportes/actions";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, padding: 40, color: "#1a1a1a" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1.5, borderBottomColor: "#2563eb" },
  logo: { width: 55, height: 55, objectFit: "contain", marginRight: 12 },
  colegioNombre: { fontSize: 12, fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginBottom: 2, color: "#1e3a8a" },
  colegioDetalle: { fontSize: 8, color: "#4b5563", marginBottom: 1 },
  reporteTitulo: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#1e3a8a", marginBottom: 2 },
  alumnoInfo: { backgroundColor: "#eff6ff", padding: "8 10", borderRadius: 4, marginBottom: 12 },
  alumnoNombre: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  alumnoDetalle: { fontSize: 9, color: "#4b5563" },
  tablaHeader: { flexDirection: "row", backgroundColor: "#1e3a8a", padding: "5 6" },
  tablaHeaderText: { color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 8.5 },
  tablaFila: { flexDirection: "row", padding: "4 6", borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" },
  tablaFilaConceptos: { flexDirection: "row", padding: "3 6", borderBottomWidth: 0.5, borderBottomColor: "#f3f4f6", backgroundColor: "#f9fafb" },
  tablaTotal: { flexDirection: "row", padding: "6 6", backgroundColor: "#eff6ff", borderTopWidth: 1, borderTopColor: "#2563eb", marginTop: 4 },
  tablaTotalText: { fontFamily: "Helvetica-Bold", fontSize: 10, color: "#1e3a8a" },
  colFecha: { width: 55 },
  colRecibo: { width: 70 },
  colConcepto: { flex: 2.5 },
  colMesAno: { width: 55 },
  colMonto: { width: 55, textAlign: "right" },
  celda: { fontSize: 8.5, color: "#374151" },
  celdaGris: { fontSize: 8.5, color: "#9ca3af" },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, textAlign: "center", fontSize: 7.5, color: "#9ca3af" },
});

function fmt(n: number) {
  return new Intl.NumberFormat("es-VE", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}
function fmtFecha(d: Date | string) {
  const fecha = typeof d === "string" ? new Date(d) : d;
  return fecha.toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

type EstadoCuenta = Awaited<ReturnType<typeof getEstadoCuentaAlumno>>;
type ConfigColegio = { nombre: string; rif: string; direccion: string; telefonos: string; correo: string } | null;

interface Props {
  data: EstadoCuenta;
  config: ConfigColegio;
  logoBase64: string | null;
}

export function ReporteEstadoCuenta({ data, config, logoBase64 }: Props) {
  const { alumno, pagos } = data;
  if (!alumno) return <Document><Page size="A4"><Text>Alumno no encontrado</Text></Page></Document>;

  const inscripcion = alumno.inscripciones[0];
  const nombreCompleto = [alumno.primerApellido, alumno.segundoApellido, alumno.primerNombre, alumno.segundoNombre].filter(Boolean).join(" ");
  const totalPagado = pagos.reduce((s, p) => s + Number(p.montoUsd), 0);

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

        <Text style={styles.reporteTitulo}>ESTADO DE CUENTA</Text>

        {/* Datos del alumno */}
        <View style={styles.alumnoInfo}>
          <Text style={styles.alumnoNombre}>{nombreCompleto}</Text>
          <Text style={styles.alumnoDetalle}>
            {inscripcion ? `${inscripcion.grado.nombre}${inscripcion.seccion ? ` — Secc. ${inscripcion.seccion.nombre}` : ""} | ${inscripcion.anoEscolar.nombre}` : ""}
            {"   "}|{"   "}Generado: {fmtFecha(new Date())}
          </Text>
        </View>

        {/* Tabla de pagos */}
        {pagos.length === 0 ? (
          <Text style={{ fontSize: 10, color: "#6b7280", textAlign: "center", marginTop: 20 }}>
            No hay pagos registrados para este alumno.
          </Text>
        ) : (
          <>
            <View style={styles.tablaHeader}>
              <Text style={[styles.tablaHeaderText, styles.colFecha]}>Fecha</Text>
              <Text style={[styles.tablaHeaderText, styles.colRecibo]}>Recibo</Text>
              <Text style={[styles.tablaHeaderText, styles.colConcepto]}>Concepto</Text>
              <Text style={[styles.tablaHeaderText, styles.colMesAno]}>Mes/Año</Text>
              <Text style={[styles.tablaHeaderText, styles.colMonto]}>USD</Text>
            </View>
            {pagos.map((p, pi) => (
              <View key={p.id}>
                {p.conceptos.map((c, ci) => (
                  <View key={c.id} style={ci === 0 ? styles.tablaFila : styles.tablaFilaConceptos}>
                    <Text style={[ci === 0 ? styles.celda : styles.celdaGris, styles.colFecha]}>
                      {ci === 0 ? fmtFecha(p.fechaPago) : ""}
                    </Text>
                    <Text style={[ci === 0 ? styles.celda : styles.celdaGris, styles.colRecibo]}>
                      {ci === 0 ? (p.numeroRecibo ?? "—") : ""}
                    </Text>
                    <Text style={[styles.celda, styles.colConcepto]}>{c.concepto}</Text>
                    <Text style={[styles.celda, styles.colMesAno]}>
                      {c.mesAno ? (() => { try { return formatMesAno(c.mesAno); } catch { return c.mesAno; } })() : "—"}
                    </Text>
                    <Text style={[styles.celda, styles.colMonto]}>{fmt(Number(c.montoUsd))}</Text>
                  </View>
                ))}
              </View>
            ))}
            <View style={styles.tablaTotal}>
              <Text style={[styles.tablaTotalText, styles.colFecha]}></Text>
              <Text style={[styles.tablaTotalText, styles.colRecibo]}></Text>
              <Text style={[styles.tablaTotalText, styles.colConcepto]}>TOTAL PAGADO</Text>
              <Text style={[styles.tablaTotalText, styles.colMesAno]}></Text>
              <Text style={[styles.tablaTotalText, styles.colMonto]}>{fmt(totalPagado)}</Text>
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
