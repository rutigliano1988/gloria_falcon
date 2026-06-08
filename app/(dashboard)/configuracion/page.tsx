import { getConfiguracionData } from "./actions";
import { AnoEscolarSection } from "./AnoEscolarSection";
import { GradosSection } from "./GradosSection";
import { TasaCambioSection } from "./TasaCambioSection";
import { ProductosSection } from "./ProductosSection";
import { DatosColegio } from "./DatosColegio";
import { CategoriasEgreso } from "./CategoriasEgreso";

export default async function ConfiguracionPage() {
  const data = await getConfiguracionData();

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Configura los parámetros generales del sistema escolar.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DatosColegio config={data.configColegio} />
        <TasaCambioSection tasas={data.tasas} />
      </div>

      <AnoEscolarSection anos={data.anosEscolares} />
      <GradosSection grados={data.grados} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ProductosSection productos={data.productos} />
        <CategoriasEgreso categorias={data.categoriasEgreso} />
      </div>
    </div>
  );
}
