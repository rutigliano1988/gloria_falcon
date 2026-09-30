-- Caducidad de los enlaces públicos de inscripción (M2 de REVIEW.md).
ALTER TABLE "solicitudes_inscripcion" ADD COLUMN IF NOT EXISTS "expiraEn" TIMESTAMP(3);

-- Los enlaces pendientes que ya existían siguen funcionando 14 días más.
UPDATE "solicitudes_inscripcion"
SET "expiraEn" = CURRENT_TIMESTAMP + INTERVAL '14 days'
WHERE "estado" = 'PENDIENTE' AND "expiraEn" IS NULL;
