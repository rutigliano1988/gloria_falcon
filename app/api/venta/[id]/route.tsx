import { renderToBuffer } from "@react-pdf/renderer";
import { NextRequest } from "next/server";
import { getVentaById } from "@/app/(dashboard)/ventas/actions";
import { getConfigColegio } from "@/app/(dashboard)/mensualidades/actions";
import { ReciboVenta } from "@/components/pdf/ReciboVenta";
import { getLogoBase64 } from "@/lib/logo";

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

  const logoBase64 = await getLogoBase64();

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
  } catch (e) {
    console.error("[PDF venta]", e);
    return new Response("Error al generar el PDF", { status: 500 });
  }
}
