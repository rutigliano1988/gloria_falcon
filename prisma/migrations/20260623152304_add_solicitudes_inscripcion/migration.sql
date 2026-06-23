-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('PENDIENTE', 'EN_REVISION', 'APROBADA', 'RECHAZADA');

-- CreateTable
CREATE TABLE "solicitudes_inscripcion" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'PENDIENTE',
    "primerApellido" TEXT,
    "segundoApellido" TEXT,
    "primerNombre" TEXT,
    "segundoNombre" TEXT,
    "cedulaEscolar" TEXT,
    "municipioNacimiento" TEXT,
    "estadoNacimiento" TEXT,
    "sexo" "Sexo",
    "fechaNacimiento" DATE,
    "domicilio" TEXT,
    "telefonoHogar" TEXT,
    "procedencia" "Procedencia",
    "nombrePlantelOrigen" TEXT,
    "datosSalud" JSONB,
    "representantes" JSONB,
    "autorizados" JSONB,
    "contactosEmergencia" JSONB,
    "anoEscolarId" TEXT,
    "gradoId" TEXT,
    "seccionId" TEXT,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_inscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "solicitudes_inscripcion_token_key" ON "solicitudes_inscripcion"("token");

-- CreateIndex
CREATE INDEX "solicitudes_inscripcion_estado_idx" ON "solicitudes_inscripcion"("estado");

-- AddForeignKey
ALTER TABLE "solicitudes_inscripcion" ADD CONSTRAINT "solicitudes_inscripcion_anoEscolarId_fkey" FOREIGN KEY ("anoEscolarId") REFERENCES "anos_escolares"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_inscripcion" ADD CONSTRAINT "solicitudes_inscripcion_gradoId_fkey" FOREIGN KEY ("gradoId") REFERENCES "grados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_inscripcion" ADD CONSTRAINT "solicitudes_inscripcion_seccionId_fkey" FOREIGN KEY ("seccionId") REFERENCES "secciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
