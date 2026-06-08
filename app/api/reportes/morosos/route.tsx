import { renderToBuffer } from "@react-pdf/renderer";
import { NextRequest } from "next/server";
import path from "path";
import fs from "fs";
import { getMensualidadesData, getConfigColegio } from "@/app/(dashboard)/mensualidades/actions";
import { getMesAnoActual } from "@/lib/utils";
import { ReporteMorosos } from "@/components/pdf/ReporteMorosos";

export async function GET(req: NextRequest) {
  const mesAno = req.nextUrl.searchParams.get("mesAno") ?? getMesAnoActual();

  const [data, config] = await Promise.all([
    getMensualidadesData(mesAno),
    getConfigColegio(),
  ]);

  const morosos = data.alumnos.filter((a) => !a.solvente);

  const logoPath = path.join(process.cwd(), "public", "logo.jpg");
  const logoBase64 = fs.existsSync(logoPath)
    ? `data:image/jpeg;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : null;

  const buffer = await renderToBuffer(
    <ReporteMorosos
      morosos={morosos}
      mesAno={mesAno}
      config={config}
      logoBase64={logoBase64}
    />
  );

  const filename = `morosos-${mesAno.replace("/", "-")}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
