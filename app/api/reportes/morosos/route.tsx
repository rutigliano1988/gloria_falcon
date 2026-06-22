import { renderToBuffer } from "@react-pdf/renderer";
import { NextRequest } from "next/server";
import { getMensualidadesData, getConfigColegio } from "@/app/(dashboard)/mensualidades/actions";
import { getMesAnoActual, getMesesAnoEscolar } from "@/lib/utils";
import { ReporteMorosos } from "@/components/pdf/ReporteMorosos";
import { prisma } from "@/lib/prisma";
import { getLogoBase64 } from "@/lib/logo";

export async function GET(req: NextRequest) {
  const mesAno = req.nextUrl.searchParams.get("mesAno") ?? getMesAnoActual();

  // Buscar el año escolar que contiene el mes solicitado
  const todosAnos = await prisma.anoEscolar.findMany({ orderBy: { nombre: "desc" } });
  const anoParaMes = todosAnos.find((a) => getMesesAnoEscolar(a.nombre).includes(mesAno));

  const [data, config] = await Promise.all([
    getMensualidadesData(mesAno, anoParaMes?.id),
    getConfigColegio(),
  ]);

  const morosos = data.alumnos.filter((a) => !a.solvente);

  const logoBase64 = await getLogoBase64();

  try {
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
  } catch (e) {
    console.error("[PDF morosos]", e);
    return new Response("Error al generar el PDF", { status: 500 });
  }
}
