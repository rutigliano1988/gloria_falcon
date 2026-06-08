import { renderToBuffer } from "@react-pdf/renderer";
import { NextRequest } from "next/server";
import path from "path";
import fs from "fs";
import { getPagoById, getConfigColegio } from "@/app/(dashboard)/mensualidades/actions";
import { ReciboPago } from "@/components/pdf/ReciboPago";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [pago, config] = await Promise.all([getPagoById(id), getConfigColegio()]);

  if (!pago) {
    return new Response("Recibo no encontrado", { status: 404 });
  }

  const logoPath = path.join(process.cwd(), "public", "logo.jpg");
  const logoBase64 = fs.existsSync(logoPath)
    ? `data:image/jpeg;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  const buffer = await renderToBuffer(
    <ReciboPago pago={pago} config={config} logoBase64={logoBase64} />
  );

  const filename = `recibo-${pago.numeroRecibo ?? id}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
