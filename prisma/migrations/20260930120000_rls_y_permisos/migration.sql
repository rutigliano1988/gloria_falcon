-- Row Level Security y permisos (C2 de REVIEW.md).
-- La app accede solo desde el servidor con Prisma (rol dueño de las tablas, que no
-- está sujeto a RLS). Los roles de la Data API de Supabase (anon, authenticated) no
-- deben poder leer ni escribir nada: RLS activado sin políticas + sin privilegios.
-- En producción esto ya se aplicó a mano; la migración es idempotente.
-- IMPORTANTE: toda tabla nueva debe incluir en su migración
--   ALTER TABLE "<tabla>" ENABLE ROW LEVEL SECURITY;
-- (lo comprueba __tests__/migraciones.test.ts).

DO $$
DECLARE
  t record;
  r text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;

  -- Los roles solo existen en Supabase; en un Postgres local se omite.
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', r);
    END IF;
  END LOOP;
END $$;
