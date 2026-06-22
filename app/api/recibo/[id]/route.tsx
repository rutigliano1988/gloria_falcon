import { renderToBuffer } from "@react-pdf/renderer";
import { NextRequest } from "next/server";
import { getPagoById, getConfigColegio } from "@/app/(dashboard)/mensualidades/actions";
import { ReciboPago } from "@/components/pdf/ReciboPago";
import { getLogoBase64 } from "@/lib/logo";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [pago, config] = await Promise.all([getPagoById(id), getConfigColegio()]);

  if (!pago) {
    return new Response("Recibo no encontrado", { status: 404 });
  }

  const logoBase64 = await getLogoBase64();

  try {
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
  } catch (e) {
    console.error("[PDF recibo]", e);
    return new Response("Error al generar el PDF", { status: 500 });
  }
}
