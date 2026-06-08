import { renderToBuffer } from "@react-pdf/renderer";
import { NextRequest } from "next/server";
import path from "path";
import fs from "fs";
import { getContabilidadData } from "@/app/(dashboard)/contabilidad/actions";
import { getConfigColegio } from "@/app/(dashboard)/mensualidades/actions";
import { ReporteBalance } from "@/components/pdf/ReporteBalance";

export async function GET(req: NextRequest) {
  const mesParam = req.nextUrl.searchParams.get("mes");
  const anoParam = req.nextUrl.searchParams.get("ano");

  const mes = mesParam ? parseInt(mesParam) : undefined;
  const ano = anoParam ? parseInt(anoParam) : undefined;

  const [data, config] = await Promise.all([
    getContabilidadData(mes, ano),
    getConfigColegio(),
  ]);

  const logoPath = path.join(process.cwd(), "public", "logo.jpg");
  const logoBase64 = fs.existsSync(logoPath)
    ? `data:image/jpeg;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  const buffer = await renderToBuffer(
    <ReporteBalance data={data} config={config} logoBase64={logoBase64} />
  );

  const filename = `balance-${String(data.mes).padStart(2, "0")}-${data.ano}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
