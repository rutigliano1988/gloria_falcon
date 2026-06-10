import { renderToBuffer } from "@react-pdf/renderer";
import { NextRequest } from "next/server";
import path from "path";
import fs from "fs";
import { getPagoNominaById } from "@/app/(dashboard)/docentes/actions";
import { getConfigColegio } from "@/app/(dashboard)/mensualidades/actions";
import { ComprobanteNomina } from "@/components/pdf/ComprobanteNomina";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [pago, config] = await Promise.all([
    getPagoNominaById(id),
    getConfigColegio(),
  ]);

  if (!pago) {
    return new Response("Comprobante no encontrado", { status: 404 });
  }

  const logoPath = path.join(process.cwd(), "public", "logo.jpg");
  const logoBase64 = fs.existsSync(logoPath)
    ? `data:image/jpeg;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  try {
    const buffer = await renderToBuffer(
      <ComprobanteNomina pago={pago} config={config} logoBase64={logoBase64} />
    );
    const docente = pago.docente;
    const apellido = docente.primerApellido.toLowerCase().replace(/\s+/g, "-");
    const filename = `nomina-${pago.periodoAno}-${String(pago.periodoMes).padStart(2, "0")}-${apellido}.pdf`;
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch {
    return new Response("Error al generar el PDF", { status: 500 });
  }
}
