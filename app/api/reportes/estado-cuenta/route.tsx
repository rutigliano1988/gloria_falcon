import { renderToBuffer } from "@react-pdf/renderer";
import { NextRequest } from "next/server";
import { getEstadoCuentaAlumno } from "@/app/(dashboard)/reportes/actions";
import { getConfigColegio } from "@/app/(dashboard)/mensualidades/actions";
import { ReporteEstadoCuenta } from "@/components/pdf/ReporteEstadoCuenta";
import { getLogoBase64 } from "@/lib/logo";

export async function GET(req: NextRequest) {
  const alumnoId = req.nextUrl.searchParams.get("alumnoId");

  if (!alumnoId) {
    return new Response("alumnoId requerido", { status: 400 });
  }

  const [data, config] = await Promise.all([
    getEstadoCuentaAlumno(alumnoId),
    getConfigColegio(),
  ]);

  if (!data.alumno) {
    return new Response("Alumno no encontrado", { status: 404 });
  }

  const logoBase64 = await getLogoBase64();

  try {
    const buffer = await renderToBuffer(
      <ReporteEstadoCuenta data={data} config={config} logoBase64={logoBase64} />
    );
    const apellido = data.alumno.primerApellido.toLowerCase().replace(/\s+/g, "-");
    const filename = `estado-cuenta-${apellido}.pdf`;
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("[PDF estado-cuenta]", e);
    return new Response("Error al generar el PDF", { status: 500 });
  }
}
