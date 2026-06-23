-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "Procedencia" AS ENUM ('HOGAR', 'MISMO_PLANTEL', 'OTRO_PLANTEL');

-- CreateEnum
CREATE TYPE "EstadoAlumno" AS ENUM ('ACTIVO', 'RETIRADO', 'EGRESADO');

-- CreateEnum
CREATE TYPE "TipoRepresentante" AS ENUM ('MADRE', 'PADRE', 'TUTOR');

-- CreateEnum
CREATE TYPE "NivelGrado" AS ENUM ('PREESCOLAR', 'PRIMARIA');

-- CreateEnum
CREATE TYPE "TipoServicio" AS ENUM ('ALMUERZO', 'RESGUARDO', 'TAE_KWON_DO');

-- CreateEnum
CREATE TYPE "CargoDocente" AS ENUM ('DOCENTE', 'COORDINADOR', 'DIRECTOR', 'ADMINISTRATIVO', 'OBRERO');

-- CreateEnum
CREATE TYPE "EstadoDocente" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "TipoPago" AS ENUM ('MENSUALIDAD', 'VENTA', 'INGRESO_MANUAL', 'INSCRIPCION');

-- CreateEnum
CREATE TYPE "MonedaPago" AS ENUM ('USD', 'BS');

-- CreateEnum
CREATE TYPE "FormaPago" AS ENUM ('EFECTIVO_USD', 'EFECTIVO_BS', 'PAGO_MOVIL_BS', 'TRANSFERENCIA_BS');

-- CreateTable
CREATE TABLE "alumnos" (
    "id" TEXT NOT NULL,
    "primerApellido" TEXT NOT NULL,
    "segundoApellido" TEXT,
    "primerNombre" TEXT NOT NULL,
    "segundoNombre" TEXT,
    "cedulaEscolar" TEXT,
    "municipioNacimiento" TEXT,
    "estadoNacimiento" TEXT,
    "sexo" "Sexo" NOT NULL,
    "fechaNacimiento" DATE NOT NULL,
    "domicilio" TEXT,
    "telefonoHogar" TEXT,
    "procedencia" "Procedencia" NOT NULL DEFAULT 'HOGAR',
    "nombrePlantelOrigen" TEXT,
    "fotoUrl" TEXT,
    "estado" "EstadoAlumno" NOT NULL DEFAULT 'ACTIVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alumnos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "representantes" (
    "id" TEXT NOT NULL,
    "alumnoId" TEXT NOT NULL,
    "tipo" "TipoRepresentante" NOT NULL,
    "apellidosNombres" TEXT NOT NULL,
    "edad" INTEGER,
    "cedula" TEXT,
    "telefonoHab" TEXT,
    "telefonoCelular" TEXT,
    "ocupacion" TEXT,
    "telefonoOficina" TEXT,
    "email" TEXT,

    CONSTRAINT "representantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "autorizados_retiro" (
    "id" TEXT NOT NULL,
    "alumnoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cedula" TEXT,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "autorizados_retiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salud_alumno" (
    "id" TEXT NOT NULL,
    "alumnoId" TEXT NOT NULL,
    "enfermedadActual" TEXT,
    "tratamiento" TEXT,
    "alergiasMedicamentos" TEXT,
    "medicamentoFiebre" TEXT,
    "seguroSaludTelefono" TEXT,

    CONSTRAINT "salud_alumno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contactos_emergencia" (
    "id" TEXT NOT NULL,
    "alumnoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "contactos_emergencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anos_escolares" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "anos_escolares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lapsos" (
    "id" TEXT NOT NULL,
    "anoEscolarId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "fechaInicio" DATE NOT NULL,
    "fechaFin" DATE NOT NULL,

    CONSTRAINT "lapsos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grados" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nivel" "NivelGrado" NOT NULL,
    "orden" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "grados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secciones" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "gradoId" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "secciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscripciones" (
    "id" TEXT NOT NULL,
    "alumnoId" TEXT NOT NULL,
    "anoEscolarId" TEXT NOT NULL,
    "gradoId" TEXT NOT NULL,
    "seccionId" TEXT,
    "descuentoMontoUsd" DECIMAL(10,2),
    "descuentoObservacion" TEXT,
    "fechaInscripcion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inscripciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicios_alumno" (
    "id" TEXT NOT NULL,
    "alumnoId" TEXT NOT NULL,
    "inscripcionId" TEXT NOT NULL,
    "tipo" "TipoServicio" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "servicios_alumno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "docentes" (
    "id" TEXT NOT NULL,
    "primerApellido" TEXT NOT NULL,
    "segundoApellido" TEXT,
    "primerNombre" TEXT NOT NULL,
    "segundoNombre" TEXT,
    "cedula" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "cargo" "CargoDocente" NOT NULL DEFAULT 'DOCENTE',
    "gradosAsignados" TEXT,
    "estado" "EstadoDocente" NOT NULL DEFAULT 'ACTIVO',
    "fechaIngreso" DATE,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "docentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasas_cambio" (
    "id" TEXT NOT NULL,
    "tasa" DECIMAL(12,4) NOT NULL,
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registradoPor" TEXT,

    CONSTRAINT "tasas_cambio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" TEXT NOT NULL,
    "tipo" "TipoPago" NOT NULL,
    "alumnoId" TEXT,
    "anoEscolarId" TEXT,
    "montoUsd" DECIMAL(10,2) NOT NULL,
    "montoBs" DECIMAL(14,2),
    "tasaCambioId" TEXT,
    "monedaPagada" "MonedaPago" NOT NULL,
    "formaPago" "FormaPago" NOT NULL,
    "numeroReferencia" TEXT,
    "fechaPago" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observaciones" TEXT,
    "numeroRecibo" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conceptos_pago" (
    "id" TEXT NOT NULL,
    "pagoId" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "mesAno" TEXT,
    "montoUsd" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "conceptos_pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos_docente" (
    "id" TEXT NOT NULL,
    "docenteId" TEXT NOT NULL,
    "periodoMes" INTEGER NOT NULL,
    "periodoAno" INTEGER NOT NULL,
    "baseBs" DECIMAL(14,2) NOT NULL,
    "bonoUsd" DECIMAL(10,2),
    "bonoBsEquivalente" DECIMAL(14,2),
    "otrosConceptos" JSONB,
    "deducciones" JSONB,
    "tasaCambioId" TEXT,
    "formaPago" "FormaPago" NOT NULL,
    "numeroReferencia" TEXT,
    "fechaPago" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalBs" DECIMAL(14,2) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "pagos_docente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "egresos" (
    "id" TEXT NOT NULL,
    "categoriaEgresoId" TEXT NOT NULL,
    "descripcion" TEXT,
    "montoUsd" DECIMAL(10,2),
    "montoBs" DECIMAL(14,2),
    "tasaCambioId" TEXT,
    "formaPago" "FormaPago",
    "proveedor" TEXT,
    "numeroFactura" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pagoDocenteId" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "egresos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_egreso" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categorias_egreso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precioUsd" DECIMAL(10,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion" (
    "clave" TEXT NOT NULL,
    "valor" JSONB NOT NULL,

    CONSTRAINT "configuracion_pkey" PRIMARY KEY ("clave")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT,
    "entidadId" TEXT,
    "meta" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "alumnos_cedulaEscolar_key" ON "alumnos"("cedulaEscolar");

-- CreateIndex
CREATE UNIQUE INDEX "salud_alumno_alumnoId_key" ON "salud_alumno"("alumnoId");

-- CreateIndex
CREATE UNIQUE INDEX "anos_escolares_nombre_key" ON "anos_escolares"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "grados_nombre_key" ON "grados"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "secciones_nombre_gradoId_key" ON "secciones"("nombre", "gradoId");

-- CreateIndex
CREATE UNIQUE INDEX "inscripciones_alumnoId_anoEscolarId_key" ON "inscripciones"("alumnoId", "anoEscolarId");

-- CreateIndex
CREATE UNIQUE INDEX "docentes_cedula_key" ON "docentes"("cedula");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_numeroRecibo_key" ON "pagos"("numeroRecibo");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_egreso_nombre_key" ON "categorias_egreso"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "productos_nombre_key" ON "productos"("nombre");

-- CreateIndex
CREATE INDEX "audit_logs_creadoEn_idx" ON "audit_logs"("creadoEn");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- AddForeignKey
ALTER TABLE "representantes" ADD CONSTRAINT "representantes_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "autorizados_retiro" ADD CONSTRAINT "autorizados_retiro_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salud_alumno" ADD CONSTRAINT "salud_alumno_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contactos_emergencia" ADD CONSTRAINT "contactos_emergencia_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lapsos" ADD CONSTRAINT "lapsos_anoEscolarId_fkey" FOREIGN KEY ("anoEscolarId") REFERENCES "anos_escolares"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secciones" ADD CONSTRAINT "secciones_gradoId_fkey" FOREIGN KEY ("gradoId") REFERENCES "grados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "alumnos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_anoEscolarId_fkey" FOREIGN KEY ("anoEscolarId") REFERENCES "anos_escolares"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_gradoId_fkey" FOREIGN KEY ("gradoId") REFERENCES "grados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_seccionId_fkey" FOREIGN KEY ("seccionId") REFERENCES "secciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicios_alumno" ADD CONSTRAINT "servicios_alumno_inscripcionId_fkey" FOREIGN KEY ("inscripcionId") REFERENCES "inscripciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "alumnos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_anoEscolarId_fkey" FOREIGN KEY ("anoEscolarId") REFERENCES "anos_escolares"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_tasaCambioId_fkey" FOREIGN KEY ("tasaCambioId") REFERENCES "tasas_cambio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conceptos_pago" ADD CONSTRAINT "conceptos_pago_pagoId_fkey" FOREIGN KEY ("pagoId") REFERENCES "pagos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_docente" ADD CONSTRAINT "pagos_docente_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "docentes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_docente" ADD CONSTRAINT "pagos_docente_tasaCambioId_fkey" FOREIGN KEY ("tasaCambioId") REFERENCES "tasas_cambio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "egresos" ADD CONSTRAINT "egresos_categoriaEgresoId_fkey" FOREIGN KEY ("categoriaEgresoId") REFERENCES "categorias_egreso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "egresos" ADD CONSTRAINT "egresos_tasaCambioId_fkey" FOREIGN KEY ("tasaCambioId") REFERENCES "tasas_cambio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "egresos" ADD CONSTRAINT "egresos_pagoDocenteId_fkey" FOREIGN KEY ("pagoDocenteId") REFERENCES "pagos_docente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
