-- Migración que faltaba en el repo (commit 769f4a1): Representante.edad -> fechaNacimiento
-- y nuevo Docente.fechaNacimiento. En producción se aplicó a mano, por eso es idempotente:
-- en una base nueva crea/borra las columnas; en producción no cambia nada.
-- Nota: los valores de "edad" no se pueden convertir a fecha y se descartan.

ALTER TABLE "representantes" DROP COLUMN IF EXISTS "edad";
ALTER TABLE "representantes" ADD COLUMN IF NOT EXISTS "fechaNacimiento" DATE;

ALTER TABLE "docentes" ADD COLUMN IF NOT EXISTS "fechaNacimiento" DATE;
