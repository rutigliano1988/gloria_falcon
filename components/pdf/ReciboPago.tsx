import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { FORMA_PAGO_LABELS } from "@/lib/utils";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 40,
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: "#2563eb",
  },
  logo: {
    width: 60,
    height: 60,
    objectFit: "contain",
    marginRight: 14,
  },
  headerTexts: {
    flex: 1,
  },
  colegioNombre: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    marginBottom: 3,
    color: "#1e3a8a",
  },
  colegioDetalle: {
    fontSize: 8.5,
    color: "#4b5563",
    marginBottom: 1,
  },
  reciboHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    padding: 10,
    borderRadius: 4,
    marginBottom: 14,
  },
  reciboNumero: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a8a",
  },
  reciboFecha: {
    fontSize: 9,
    color: "#4b5563",
  },
  seccion: {
    marginBottom: 12,
  },
  seccionTitulo: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    color: "#6b7280",
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  alumnoNombre: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  alumnoDetalle: {
    fontSize: 9,
    color: "#4b5563",
  },
  tabla: {
    marginBottom: 12,
  },
  tablaHeader: {
    flexDirection: "row",
    backgroundColor: "#1e3a8a",
    padding: "6 8",
  },
  tablaHeaderText: {
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  tablaFila: {
    flexDirection: "row",
    padding: "5 8",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  tablaFilaAlterna: {
    backgroundColor: "#f9fafb",
  },
  tablaTotal: {
    flexDirection: "row",
    padding: "6 8",
    backgroundColor: "#eff6ff",
    borderTopWidth: 1,
    borderTopColor: "#2563eb",
  },
  tablaTotalText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: "#1e3a8a",
  },
  colConcepto: { flex: 3 },
  colMes: { flex: 1.5 },
  colMonto: { flex: 1.2, textAlign: "right" },
  tablaCelda: {
    fontSize: 9,
    color: "#374151",
  },
  pagoInfo: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
    padding: 10,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
  },
  pagoInfoItem: {
    marginRight: 16,
    marginBottom: 4,
  },
  pagoInfoLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    color: "#9ca3af",
    marginBottom: 1,
  },
  pagoInfoValue: {
    fontSize: 9.5,
    color: "#111827",
  },
  bsTotal: {
    textAlign: "right",
    marginBottom: 14,
    paddingRight: 8,
  },
  bsTotalLabel: {
    fontSize: 9,
    color: "#6b7280",
  },
  bsTotalValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#065f46",
  },
  firmas: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 30,
  },
  firmaBloque: {
    alignItems: "center",
    width: "40%",
  },
  firmaLinea: {
    borderTopWidth: 1,
    borderTopColor: "#9ca3af",
    width: "100%",
    marginBottom: 4,
  },
  firmaLabel: {
    fontSize: 8,
    color: "#6b7280",
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 7.5,
    color: "#9ca3af",
  },
});

function fmt(n: number | null | undefined) {
  if (n == null) return "-";
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

function fmtBs(n: number | null | undefined) {
  if (n == null) return "-";
  return (
    new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2 }).format(n) +
    " Bs"
  );
}

function fmtFecha(d: Date | string | null | undefined) {
  if (!d) return "-";
  const fecha = typeof d === "string" ? new Date(d) : d;
  return fecha.toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type ConfigColegio = {
  nombre: string;
  rif: string;
  direccion: string;
  telefonos: string;
  correo: string;
} | null;

type Pago = Awaited<ReturnType<typeof import("@/app/(dashboard)/mensualidades/actions").getPagoById>>;

interface ReciboPagoProps {
  pago: NonNullable<Pago>;
  config: ConfigColegio;
  logoBase64: string | null;
}

export function ReciboPago({ pago, config, logoBase64 }: ReciboPagoProps) {
  const inscripcion = pago.alumno?.inscripciones?.[0];
  const alumnoNombre = pago.alumno
    ? [
        pago.alumno.primerApellido,
        pago.alumno.segundoApellido,
        pago.alumno.primerNombre,
        pago.alumno.segundoNombre,
      ]
        .filter(Boolean)
        .join(" ")
    : "—";

  const totalUsd = Number(pago.montoUsd);
  const totalBs = pago.montoBs ? Number(pago.montoBs) : null;
  const tasa = pago.tasaCambio ? Number(pago.tasaCambio.tasa) : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Encabezado */}
        <View style={styles.header}>
          {logoBase64 && (
            <Image src={logoBase64} style={styles.logo} />
          )}
          <View style={styles.headerTexts}>
            <Text style={styles.colegioNombre}>
              {config?.nombre ?? "Unidad Educativa Colegio Gloria Falcón"}
            </Text>
            {config?.rif && (
              <Text style={styles.colegioDetalle}>RIF: {config.rif}</Text>
            )}
            {config?.direccion && (
              <Text style={styles.colegioDetalle}>{config.direccion}</Text>
            )}
            {config?.telefonos && (
              <Text style={styles.colegioDetalle}>
                Tlf: {config.telefonos}
              </Text>
            )}
            {config?.correo && (
              <Text style={styles.colegioDetalle}>{config.correo}</Text>
            )}
          </View>
        </View>

        {/* Número y fecha del recibo */}
        <View style={styles.reciboHeader}>
          <Text style={styles.reciboNumero}>
            RECIBO N° {pago.numeroRecibo ?? pago.id.slice(-6).toUpperCase()}
          </Text>
          <Text style={styles.reciboFecha}>
            Fecha: {fmtFecha(pago.fechaPago)}
          </Text>
        </View>

        {/* Datos del alumno */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Datos del Alumno</Text>
          <Text style={styles.alumnoNombre}>{alumnoNombre}</Text>
          {inscripcion && (
            <Text style={styles.alumnoDetalle}>
              {inscripcion.grado.nombre}
              {inscripcion.seccion ? ` — Sección ${inscripcion.seccion.nombre}` : ""}
              {pago.anoEscolar ? `  •  Año Escolar ${pago.anoEscolar.nombre}` : ""}
            </Text>
          )}
        </View>

        {/* Tabla de conceptos */}
        <View style={styles.tabla}>
          <Text style={styles.seccionTitulo}>Detalle del Pago</Text>
          <View style={styles.tablaHeader}>
            <Text style={[styles.tablaHeaderText, styles.colConcepto]}>
              Concepto
            </Text>
            <Text style={[styles.tablaHeaderText, styles.colMes]}>
              Mes / Año
            </Text>
            <Text style={[styles.tablaHeaderText, styles.colMonto]}>
              Monto USD
            </Text>
          </View>
          {pago.conceptos.map((c, i) => (
            <View
              key={i}
              style={[
                styles.tablaFila,
                i % 2 === 1 ? styles.tablaFilaAlterna : {},
              ]}
            >
              <Text style={[styles.tablaCelda, styles.colConcepto]}>
                {c.concepto}
              </Text>
              <Text style={[styles.tablaCelda, styles.colMes]}>
                {c.mesAno ?? "—"}
              </Text>
              <Text style={[styles.tablaCelda, styles.colMonto]}>
                {fmt(Number(c.montoUsd))}
              </Text>
            </View>
          ))}
          <View style={styles.tablaTotal}>
            <Text style={[styles.tablaTotalText, styles.colConcepto]}>
              TOTAL
            </Text>
            <Text style={[styles.tablaTotalText, styles.colMes]}></Text>
            <Text style={[styles.tablaTotalText, styles.colMonto]}>
              {fmt(totalUsd)}
            </Text>
          </View>
        </View>

        {/* Equivalente en Bs */}
        {totalBs && tasa && (
          <View style={styles.bsTotal}>
            <Text style={styles.bsTotalLabel}>
              Tasa BCV: {tasa.toFixed(4)} Bs / $1
            </Text>
            <Text style={styles.bsTotalValue}>
              Equivalente: {fmtBs(totalBs)}
            </Text>
          </View>
        )}

        {/* Datos del pago */}
        <View style={styles.pagoInfo}>
          <View style={styles.pagoInfoItem}>
            <Text style={styles.pagoInfoLabel}>Forma de Pago</Text>
            <Text style={styles.pagoInfoValue}>
              {FORMA_PAGO_LABELS[pago.formaPago] ?? pago.formaPago}
            </Text>
          </View>
          <View style={styles.pagoInfoItem}>
            <Text style={styles.pagoInfoLabel}>Moneda</Text>
            <Text style={styles.pagoInfoValue}>{pago.monedaPagada}</Text>
          </View>
          {pago.numeroReferencia && (
            <View style={styles.pagoInfoItem}>
              <Text style={styles.pagoInfoLabel}>N° Referencia</Text>
              <Text style={styles.pagoInfoValue}>{pago.numeroReferencia}</Text>
            </View>
          )}
          {pago.observaciones && (
            <View style={styles.pagoInfoItem}>
              <Text style={styles.pagoInfoLabel}>Observaciones</Text>
              <Text style={styles.pagoInfoValue}>{pago.observaciones}</Text>
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

        {/* Footer */}
        <Text style={styles.footer}>
          Documento generado el {fmtFecha(new Date())} — Este recibo es un
          comprobante oficial de pago.
        </Text>
      </Page>
    </Document>
  );
}
