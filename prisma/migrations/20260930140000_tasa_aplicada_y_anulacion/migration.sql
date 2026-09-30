-- Integridad financiera (A3, A4, M8, M9 de REVIEW.md).

ALTER TABLE "pagos" ADD COLUMN IF NOT EXISTS "tasaAplicada" DECIMAL(12,4);
ALTER TABLE "pagos" ADD COLUMN IF NOT EXISTS "anuladoPor" TEXT;
ALTER TABLE "pagos" ADD COLUMN IF NOT EXISTS "motivoAnulacion" TEXT;

ALTER TABLE "pagos_docente" ADD COLUMN IF NOT EXISTS "tasaAplicada" DECIMAL(12,4);
ALTER TABLE "pagos_docente" ADD COLUMN IF NOT EXISTS "anuladoPor" TEXT;
ALTER TABLE "pagos_docente" ADD COLUMN IF NOT EXISTS "motivoAnulacion" TEXT;

ALTER TABLE "egresos" ADD COLUMN IF NOT EXISTS "tasaAplicada" DECIMAL(12,4);
ALTER TABLE "egresos" ADD COLUMN IF NOT EXISTS "numeroReferencia" TEXT;
ALTER TABLE "egresos" ADD COLUMN IF NOT EXISTS "anuladoPor" TEXT;
ALTER TABLE "egresos" ADD COLUMN IF NOT EXISTS "motivoAnulacion" TEXT;

-- Backfill: en los pagos en Bs, la tasa realmente aplicada es montoBs / montoUsd
-- (el formulario permitía ajustar la tasa y guardaba el id de la tasa oficial).
UPDATE "pagos"
SET "tasaAplicada" = ROUND("montoBs" / "montoUsd", 4)
WHERE "tasaAplicada" IS NULL AND "montoBs" IS NOT NULL AND "montoUsd" > 0;

-- Nómina: la tasa registrada con el pago.
UPDATE "pagos_docente" p
SET "tasaAplicada" = t."tasa"
FROM "tasas_cambio" t
WHERE p."tasaAplicada" IS NULL AND p."tasaCambioId" = t."id";

-- Egresos solo en Bs: equivalente en USD con la tasa de su día (no la actual).
UPDATE "egresos" e
SET "tasaAplicada" = t."tasa",
    "montoUsd" = ROUND(e."montoBs" / t."tasa", 2)
FROM "tasas_cambio" t
WHERE e."montoUsd" IS NULL AND e."montoBs" IS NOT NULL
  AND e."tasaCambioId" = t."id" AND t."tasa" > 0;
