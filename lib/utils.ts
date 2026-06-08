import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUSD(amount: number | { toString(): string } | null | undefined): string {
  const num = amount == null ? 0 : Number(amount);
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatBS(amount: number | { toString(): string } | null | undefined): string {
  const num = amount == null ? 0 : Number(amount);
  return new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num) + " Bs";
}

export function calcularBs(
  montoUsd: number,
  tasa: number | { toString(): string } | null | undefined
): number {
  const t = tasa == null ? 0 : Number(tasa);
  return montoUsd * t;
}

export function calcularEdad(fechaNacimiento: Date): number {
  const hoy = new Date();
  let edad = hoy.getUTCFullYear() - fechaNacimiento.getUTCFullYear();
  const mes = hoy.getUTCMonth() - fechaNacimiento.getUTCMonth();
  if (mes < 0 || (mes === 0 && hoy.getUTCDate() < fechaNacimiento.getUTCDate())) {
    edad--;
  }
  return edad;
}

export function formatFecha(fecha: Date | string | null | undefined): string {
  if (!fecha) return "-";
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return d.toLocaleDateString("es-VE", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function mesAnoLabel(mesAno: string): string {
  const [year, month] = mesAno.split("-");
  return `${MESES[parseInt(month) - 1]} ${year}`;
}

export const FORMA_PAGO_LABELS: Record<string, string> = {
  EFECTIVO_USD: "Efectivo $",
  EFECTIVO_BS: "Efectivo Bs",
  PAGO_MOVIL_BS: "Pago Móvil (Bs)",
  TRANSFERENCIA_BS: "Transferencia (Bs)",
};

export const TIPO_SERVICIO_LABELS: Record<string, string> = {
  ALMUERZO: "Almuerzo",
  RESGUARDO: "Resguardo",
  TAE_KWON_DO: "Tae-Kwon-Do",
};

export const CARGO_DOCENTE_LABELS: Record<string, string> = {
  DOCENTE: "Docente",
  COORDINADOR: "Coordinador",
  DIRECTOR: "Director",
  ADMINISTRATIVO: "Administrativo",
  OBRERO: "Obrero",
};

export const PROCEDENCIA_LABELS: Record<string, string> = {
  HOGAR: "Hogar",
  MISMO_PLANTEL: "Mismo plantel",
  OTRO_PLANTEL: "Otro plantel",
};

// Para el formato "MM/YYYY" que usa ConceptoPago.mesAno
export function formatMesAno(mesAno: string): string {
  const [mm, yyyy] = mesAno.split("/");
  return `${MESES[parseInt(mm) - 1]} ${yyyy}`;
}

export function getMesesAnoEscolar(anoNombre: string): string[] {
  const [inicio, fin] = anoNombre.split("-").map(Number);
  const meses: string[] = [];
  for (let m = 9; m <= 12; m++) {
    meses.push(`${String(m).padStart(2, "0")}/${inicio}`);
  }
  for (let m = 1; m <= 7; m++) {
    meses.push(`${String(m).padStart(2, "0")}/${fin}`);
  }
  return meses;
}

export function getMesAnoActual(): string {
  const hoy = new Date();
  return `${String(hoy.getMonth() + 1).padStart(2, "0")}/${hoy.getFullYear()}`;
}

export function parsePrismaError(e: unknown): string {
  const msg = e instanceof Error ? e.message : "";
  const code =
    typeof e === "object" && e !== null && "code" in e
      ? (e as { code: string }).code
      : "";

  const esUnico = code === "P2002" || msg.includes("Unique constraint");
  if (esUnico) {
    if (msg.includes("cedulaEscolar"))
      return "La cédula escolar ya está registrada para otro alumno.";
    if (msg.includes("cedula"))
      return "Ya existe un docente con esa cédula.";
    if (msg.includes("alumnoId") && msg.includes("anoEscolarId"))
      return "El alumno ya tiene una inscripción en ese año escolar.";
    if (msg.includes("nombre"))
      return "Ya existe un registro con ese nombre.";
    if (msg.includes("numeroRecibo"))
      return "Número de recibo duplicado, intenta de nuevo.";
    return "Ya existe un registro con esos datos.";
  }

  if (msg) return msg;
  return "Error inesperado.";
}
