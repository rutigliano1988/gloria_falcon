import { renderToBuffer } from "@react-pdf/renderer";
import { NextRequest } from "next/server";
import path from "path";
import fs from "fs";
import { getVentaById } from "@/app/(dashboard)/ventas/actions";
import { getConfigColegio } from "@/app/(dashboard)/mensualidades/actions";
import { ReciboVenta } from "@/components/pdf/ReciboVenta";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [venta, config] = await Promise.all([
    getVentaById(id),
    getConfigColegio(),
  ]);

  if (!venta) {
    return new Response("Recibo no encontrado", { status: 404 });
  }

  const logoPath = path.join(process.cwd(), "public", "logo.jpg");
  const logoBase64 = fs.existsSync(logoPath)
    ? `data:image/jpeg;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  try {
    const buffer = await renderToBuffer(
      <ReciboVenta venta={venta} config={config} logoBase64={logoBase64} />
    );
    const filename = `recibo-${venta.numeroRecibo ?? id}.pdf`;
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
