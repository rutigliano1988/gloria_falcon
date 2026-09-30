@AGENTS.md

# Memoria del proyecto — Sistema de gestión del Colegio "Gloria Falcón"

## Contexto
- **Qué es:** gestión escolar interna (alumnos, inscripciones, mensualidades, ventas, egresos, docentes/nómina, reportes).
- **Usuarios:** el colegio está en Caracas (Venezuela). El soporte técnico lo da el dueño del repo desde España.
- **Idioma:** la interfaz, el código y los commits van en español. Montos en USD y Bs; tasa del BCV; Pago Móvil.
- **Stack:** Next.js 16 (App Router; `proxy.ts` sustituye al middleware), Prisma 7 con el adaptador `pg`, Supabase (Auth + Postgres), Zod 4, Vitest.
- **Infraestructura:**
  - Supabase: proyecto `ifnhauunhgkhosbnfaqq`, región `eu-west-1` (Irlanda).
  - Vercel: proyecto `prj_cRBhxthhqmp3HyP5yRGM7bAvP9Ga`, equipo `team_ANFvyQ05uHa2dnjgRUbDTVpx`, dominio `gloria-falcon.vercel.app`. Las funciones están fijadas en `dub1` (`vercel.json`).
- **Documentos de referencia:**
  - `REVIEW.md`: revisión completa, hallazgos C/A/M/B y plan por fases.
  - `SESSION_LOG.md`: bitácora detallada de cada sesión.

## Reglas que no se deben romper
- **Roles:** solo `ADMIN` y `SECRETARIA`, guardados en `app_metadata.rol` de Supabase. Sin rol válido, no hay acceso (denegación por defecto; ver `lib/roles.ts` y `lib/auth.ts`).
- **Autorización:** toda server action exportada empieza con `await requireUser()` o `await requireAdmin()`. Las rutas API usan `authorizeApi(...)`. `proxy.ts` no basta. El test `__tests__/autorizacion.test.ts` lo vigila; las acciones públicas están listadas en `PUBLICAS`.
- **Permisos de la SECRETARIA:** ve contabilidad y datos de salud, pero **no la nómina**. En contabilidad la nómina le aparece agregada en una línea (`nomina-agregada`). `ADMIN_PATHS` en `lib/roles.ts`.
- **Dinero:**
  - El servidor calcula los montos con las funciones de `lib/finanzas.ts`; los totales salen de `lib/reportes.ts`.
  - Nunca se confía en los montos que manda el cliente.
  - Los registros no se borran: se anulan con motivo (solo ADMIN), y queda en la auditoría.
  - Se guarda `tasaAplicada`.
  - Las acciones de dinero y de edición devuelven `{ ok: true } | { ok: false, error }`. No se lanzan errores, porque Next los oculta en producción.
- **Datos personales de menores y de salud:**
  - La auditoría guarda los nombres de los campos cambiados, **nunca los valores**.
  - Al aprobar o rechazar una solicitud se borran sus datos personales.
  - Los enlaces públicos de inscripción usan un token de 256 bits y caducan a los 14 días.
- **Base de datos:**
  - Toda tabla nueva lleva `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` en su migración (lo exige `__tests__/migraciones.test.ts`).
  - `anon` y `authenticated` no tienen permisos: la app accede solo con Prisma desde el servidor.
  - Las migraciones deben ser idempotentes (`IF EXISTS` / `IF NOT EXISTS`).
- **Implementaciones:** por defecto son para España, pero hay que confirmarlo siempre con el usuario.
- **Comunicación:** hablar con el usuario en castellano de Venezuela.

## Comandos
- `npm test`: tests unitarios.
- `TEST_DATABASE_URL=postgresql://... npm run test:integracion`: tests de integración.
  - Necesitan un Postgres **local** con las migraciones aplicadas (`prisma migrate deploy`) y corren en serie.
  - `setup.ts` rechaza cualquier URL de Supabase.
- `npx tsc --noEmit` y `npm run lint`: deben quedar en 0 errores.
- `npm run build`: hace `prisma generate` y `next build`.
- **Migraciones en producción:** `DIRECT_URL=<prod> npx prisma migrate deploy`.
  - Si no se tiene la URL, se pueden aplicar por el conector de Supabase y registrarlas en `_prisma_migrations` con el SHA-256 del `migration.sql`, que es el checksum de Prisma.
- **Despliegue:**
  - Producción sale de `master`.
  - El proyecto de Vercel no está conectado a GitHub: se despliega con `vercel --prod` o con el conector de Vercel (`create_deployment` con `gitSource` de GitHub y `target: production`).

## Estado al 30/09/2026
- **Fase 0 de `REVIEW.md` completa y en producción:**
  - PR rutigliano1988/gloria_falcon#1, fusionado en `master` (`05c8896`).
  - Desplegado en Vercel (`dpl_DrjduVxtTuea4uQ77w6GQARsLTsZ`, `dub1`).
  - Las 6 migraciones están aplicadas en producción.
  - La cuenta del dueño tiene rol ADMIN.
- **A5 (privacidad), hecho:**
  - pantalla de rectificación `/alumnos/[id]/editar`;
  - borrador legal en `docs/legal/privacidad-y-consentimiento-BORRADOR.md`, pendiente de revisión del abogado.

## Pendientes
1. Probar con sesión en producción: login, "Editar datos" y formulario de cobro.
2. **Confirmar la regla de negocio:** la secretaria ya no puede editar los montos de mensualidad ni de servicios al cobrar; solo puede agregar conceptos adicionales.
3. **A5:**
   - completar los `[corchetes]` del borrador legal (correo de privacidad, nombre del prestador) y que lo revise un abogado;
   - después, agregar las casillas de consentimiento al formulario público y guardar la fecha, la versión aceptada y el consentimiento de salud;
   - definir los plazos de retención (aún no decididos);
   - implementar la baja o anonimización.
4. **Supabase:** activar la protección contra contraseñas filtradas y desactivar el registro abierto.
5. **Fases 1 y 2 de `REVIEW.md`:** M3–M7, resto de M11, M12, M13, M15, M17 (CI) y los hallazgos B, incluido B18 (logo/SSO).
