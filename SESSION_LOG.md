# SESSION_LOG — Revisión de código `gloria_falcon`

Fecha: 2026-09-30 · Rama: `claude/busy-gates-kb3ip8` · Commit revisado: `769f4a1`

Alcance acordado: SOLO revisión. No se modifica código; solo se crean `REVIEW.md` y `SESSION_LOG.md`.

## 1. Reconocimiento inicial

- Repo: Next.js 16.2.6 (App Router + Server Actions), React 19, Prisma 7 + PostgreSQL (Supabase), Supabase Auth, Tailwind 4, Vitest.
- Tamaño: ~15.2K líneas en ~150 archivos (sin contar `package-lock.json`). **Cabe revisarlo completo**, así que no hace falta priorizar recortes.
- `AGENTS.md` advierte que Next 16 cambia APIs: el middleware ahora se llama `proxy.ts` (verificar en `node_modules/next/dist/docs/` si hace falta).
- `.gitignore` ignora `.env*` → no hay `.env` versionado (pendiente confirmar en el historial de git).

### Decisiones
- Orden de revisión: auth/proxy → server actions (acceso a datos) → rutas API (PDF) → formulario público de inscripción → pagos/mensualidades → esquema/migraciones → resto de UI → tests → dependencias.
- **No voy a conectarme al proyecto Supabase real** (aunque hay herramientas MCP disponibles): el encargo es revisar el código, y consultar la base real expondría datos de menores en esta sesión. Queda listado como "no revisado" y como siguiente paso sugerido.

## 2. Hallazgos preliminares (a confirmar)

- `proxy.ts:62` y `lib/auth.ts:15`: usuario sin `app_metadata.rol` ⇒ se trata como **ADMIN** (fail-open).
- Solo hay 2 roles: `ADMIN` y `SECRETARIA`. **No existen cuentas de representante ni de docente**: los representantes solo interactúan vía el formulario público `/inscripcion/[token]`. Las preguntas "¿un representante ve datos de otro alumno?" / "¿un docente accede a lo que no le toca?" se evalúan sobre ese flujo público y sobre la separación ADMIN/SECRETARIA.
- **No existe módulo de notas/calificaciones** (grep de nota/calificación/boletín/materia: solo aparece "Boletín" como documento requerido en `FichaAlumnoForm.tsx:480`). El área "cálculos de notas" no aplica.

## 3. Auth, roles y Server Actions (revisado)

Archivos: `proxy.ts`, `lib/auth.ts`, `lib/supabase/*`, `app/(auth)/login/*`, `app/(dashboard)/admin/usuarios/*`, `app/(dashboard)/configuracion/actions.ts`, `app/(dashboard)/alumnos/solicitudes/**`, `app/(public)/inscripcion/**`, `app/(dashboard)/alumnos/actions.ts` y páginas.

- Mapa de Server Actions: 12 archivos `"use server"`, ~55 funciones exportadas. **Solo 5 verifican rol/sesión** (`invitarUsuario`, `cambiarRolUsuario`, `crearAnoEscolar`, `activarAnoEscolar`, `registrarTasa`) + `generarEnlaceSolicitud` que verifica sesión. El resto depende 100 % de `proxy.ts`.
- Documentación local de Next 16 (leída en `node_modules/next/dist/docs/`): `02-guides/data-security.md:272,282,329` ("verify authentication and authorization inside each one") y `02-guides/authentication.md:1119` ("Proxy ... should not be your only line of defense").
- **Verificación en el código de Next (`dist/server/app-render/action-handler.js:449-455` y `manifests-singleton.js:200-214`)**: si se hace POST de una acción a una ruta que no la contiene, Next la reenvía con `fetch` a la ruta "dueña", y ese reenvío vuelve a pasar por `proxy.ts`.
  - Consecuencia: un anónimo que haga POST a `/login` (ruta pública) con el ID de una acción del dashboard **no** debería poder ejecutarla (el reenvío cae en el proxy). No lo clasifico como bypass anónimo confirmado.
  - Consecuencia: una SECRETARIA **sí** puede ejecutar acciones "solo admin" que vivan en rutas no-admin. Caso confirmado: `aprobarSolicitud`/`rechazarSolicitud` (restricción solo en UI: `solicitudes/[id]/page.tsx:59`, `ReviewForm.tsx:51`; el módulo cliente `ReviewForm` se envía igual a la secretaria, con los IDs de acción).
  - *Corrección posterior*: al principio anoté `ReviewForm.tsx:269` y `admin/usuarios/page.tsx:26` leyendo archivos concatenados; las líneas correctas (verificadas con grep) son `ReviewForm.tsx:51` y `admin/usuarios/page.tsx:28`.
  - Las acciones de `/configuracion` sin `requireAdmin` quedan protegidas de rebote por el reenvío+proxy (ninguna se importa fuera de `/configuracion`, verificado con grep). Es defensa accidental y frágil → lo reporto como Alto igualmente, pero aclarando la explotabilidad.
- Rol por defecto `?? "ADMIN"` (`proxy.ts:62`, `lib/auth.ts:15`, `app/(dashboard)/layout.tsx:14`, `admin/usuarios/page.tsx:28`). Combinado con el registro público de Supabase (activado por defecto; no verificable desde el código) ⇒ cualquiera podría crear cuenta y ser ADMIN. También: si `updateUserById` falla tras `inviteUserByEmail` (`admin/usuarios/actions.ts:26-34`) el invitado queda sin rol ⇒ ADMIN.
- No hay ruta de callback/aceptación de invitación ni de "olvidé mi contraseña" (grep `exchangeCodeForSession|verifyOtp|updateUser(|auth/callback`: 0 resultados). `lib/supabase/client.ts` no se importa en ningún lado (código muerto).
- No hay forma de desactivar/eliminar usuarios desde la app.
- `aprobarSolicitud` no comprueba `estado` ⇒ aprobar dos veces duplica el alumno.
- Formulario público: token `cuid()` sin caducidad ni revocación; carrera check-then-update en `enviarSolicitud`; strings/arrays sin `.max()`.
- `next.config.ts:6`: `allowedOrigins: ["localhost:3000"]` en producción (restos de desarrollo).

### Decisión
- Para no afirmar de más, clasifico el problema de Server Actions como **Alto** (no Crítico): impacto confirmado = escalamiento SECRETARIA→ADMIN en solicitudes; el resto es falta de defensa en profundidad.
- El `?? "ADMIN"` sí lo clasifico **Crítico**, condicionado a la configuración de Supabase (sign-ups), que debe verificarse ya.

## 4. Esquema y migraciones (revisado)

- Solo 2 migraciones (`20260623132846_initial`, `20260623152304_add_solicitudes_inscripcion`).
- **Deriva confirmada**: el commit `769f4a1` cambió `Representante.edad → fechaNacimiento` y añadió `Docente.fechaNacimiento` en `schema.prisma` sin crear migración (el mensaje del commit dice "migración aplicada", pero no hay archivo). La migración inicial sigue creando `representantes.edad` (`initial/migration.sql:64`) y `docentes` sin `fechaNacimiento` (`:177-193`).
- **Ninguna migración activa RLS** (grep `ROW LEVEL SECURITY`: 0). Las tablas se crean en `public`.
- No hay índices en columnas FK ni en fechas de consulta (`pagos.alumnoId`, `pagos.fechaPago`, `conceptos_pago.pagoId`, etc.).
- `servicios_alumno.alumnoId` sin FK.
- No hay `.env*` en el historial de git; no hay patrones de claves (JWT `eyJ...`, `sb_secret_`, `postgres://user:pass@`) en ningún commit.
- README pide `cp .env.example` pero el archivo no existe; `SUPABASE_SERVICE_ROLE_KEY` no está documentada.

## 5. Pagos, mensualidades, ventas, contabilidad y nómina (revisado)

Archivos: `mensualidades/**`, `ventas/**`, `contabilidad/**`, `docentes/**`, `reportes/**`, `app/api/**`, `components/pdf/*`, `lib/solvencia.ts`, `lib/utils.ts`, `dashboard/page.tsx`.

- `lib/solvencia.ts::calcularSolvencia` **solo se usa en tests**; producción duplica la lógica en `mensualidades/actions.ts:118-165`.
- Solvencia = presencia del *nombre* del concepto por mes; no mira montos. El servidor no valida que Σ conceptos = total, ni montos ≥ 0 por concepto, ni meses ya pagados.
- `RegistrarPagoForm`: no sabe qué meses ya están pagados → permite cobrar dos veces el mismo mes. Si se edita la tasa, `montoBs` usa la tasa editada pero `tasaCambioId` apunta a la oficial → recibo PDF incoherente (`ReciboPago.tsx:352-356`).
- "Cobrado en <mes>" (`mensualidades/actions.ts:194-196`) suma conceptos brutos: el descuento va con `mesAno: null` y no se resta.
- Reporte PDF de morosos: `mesesPasados` se calcula con el mes actual del servidor, no con el mes pedido.
- Alumnos inscritos a mitad de año aparecen morosos desde septiembre (no se usa `fechaInscripcion`).
- Precios acoplados a nombres literales de productos ("Mensualidad", "Almuerzo"...): renombrar/desactivar ⇒ montos 0.
- `getMesesAnoEscolar` asume nombre "YYYY-YYYY"; `crearAnoEscolar` no valida formato.
- Contabilidad: egresos en Bs se pasan a USD con la tasa **actual**, no la del egreso. Dashboard suma solo `montoUsd` ⇒ la nómina (guardada solo en Bs) no aparece en "Egresos del mes" ni en la gráfica.
- `deletedAt` se filtra pero **nunca se asigna**: no hay anulación de pagos/ventas/egresos.
- Nómina: `totalBs` viene del cliente sin recalcular; bug de bono "fantasma" en `NominaForm.tsx:45-57,173`.
- `EgresoForm`: "N° Referencia" se pide pero no se envía (`:32,230-234` vs `:61-71`).
- `ReporteBalance.tsx:82`: template literal imprime `{"   "}` literal en el PDF.
- Sin auditoría en pagos, ventas, egresos, nómina, creación/edición de alumnos y docentes, cambios de rol.
- Errores de Server Actions: en producción React solo envía `digest` (`react-server-dom-webpack-server.node.production.js:1874`), así que `parsePrismaError(e)` en el cliente no verá los mensajes de Prisma ni los `throw new Error("...")` en español.

## 6. Resto de UI, PDFs y formulario público (revisado)

- Sin `dangerouslySetInnerHTML`, sin SQL crudo (`$queryRaw`), sin `eval`. React escapa todo; riesgo XSS bajo. `@react-pdf` no interpreta HTML.
- Logs: solo `console.error` de errores de PDF y de los error boundaries; no vi logs de datos personales.
- Formulario público: sin aviso de privacidad ni consentimiento para datos de salud de menores; `"use client"` duplicado (líneas 1 y 3).
- `DatePicker`/`Calendar`: `captionLayout` por defecto `"label"` (verificado en `react-day-picker@10.0.1` types) ⇒ sin selector de año para fechas de nacimiento.
- Importación CSV: `split(",")`, UTF-8 forzado, sin inscripción/representantes/contactos, sin transacción.
- Contexto: Bs, Pago Móvil, RIF, cédula escolar, `ESTADOS_VE` ⇒ el colegio parece estar en **Venezuela**. Hay que confirmar con el usuario el marco legal (LOPNNA/Constitución VE vs. RGPD si el tratamiento se hace desde España).
- Grep de `update/delete` sobre modelos de alumno: solo `alumno.update` del campo `estado` (`alumnos/actions.ts:201,215`). **No hay forma de rectificar ni borrar** datos de alumno, representantes, salud, contactos o autorizados.
- `auditLog` no se lee en ningún sitio (write-only). No existe `.github/` (sin CI). Sin cabeceras de seguridad (`headers()`/CSP) en `next.config.ts` ni en `proxy.ts`.

## 7. Verificaciones ejecutadas (herramientas)

Todas sin tocar archivos versionados (checksums de `tsconfig.json`, `next.config.ts`, `package.json`, `package-lock.json` idénticos antes y después; `git status` solo muestra `SESSION_LOG.md`). Artefactos ignorados (`.next/`, `next-env.d.ts`, `tsconfig.tsbuildinfo`) borrados al terminar; `node_modules/` se deja (ignorado).

| Paso | Resultado |
|---|---|
| `npm ci --ignore-scripts` | OK (sin ejecutar scripts de terceros por prudencia) |
| `npx prisma generate` | OK (solo escribe en `node_modules`) |
| `vitest run --coverage` | 22/22 tests OK. Cobertura sobre `lib/`+`app/`: **2,64 % sentencias**, 1,81 % ramas |
| `tsc --noEmit` | OK, 0 errores |
| `eslint .` | **Falla**: 8 errores (`react-hooks/set-state-in-effect`, `react-hooks/use-memo`, `no-empty-object-type`) y 21 warnings. Next 16 ya no ejecuta lint en `next build` (`docs/.../version-16.md:1095`), así que no bloquea despliegues |
| `npm audit` | **22 vulnerabilidades**: 1 crítica (`next@16.2.6`), 12 altas, 8 moderadas, 1 baja |
| `npm outdated` / grep de imports | `next` fijado sin `^`; 9 dependencias declaradas sin uso |
| `next build` con variables marcadoras falsas | OK. La anon key, la URL y la service key **no** aparecen en `.next/static` (JS público). Manifiesto: **54 Server Actions**, **29 con su ID en chunks estáticos públicos** |

Avisos de `next` consultados en GitHub (vía WebFetch; la API `api.github.com/advisories` está bloqueada en este entorno):
- GHSA-6gpp-xcg3-4w24 (bypass de Proxy): requiere `i18n.locales` con una sola entrada ⇒ **no aplica** (no hay `i18n` en `next.config.ts`).
- GHSA-955p-x3mx-jcvp: IDs de Server Actions expuestos a no autenticados vía chunks estáticos (<16.2.11) ⇒ **aplica** y refuerza el hallazgo de acciones sin autorización.
- GHSA-2xp9-vwfh-vxw4: RCE en Image Optimization con AVIF (<16.3.3). Aplicabilidad depende del hosting (no verificable). Agravante: `/_next/image` fuera del proxy y `remotePatterns: *.supabase.co` (cualquier proyecto Supabase).

Intentos que no dieron resultado (me detuve según la regla de los dos intentos):
- Implementación exacta de `cuid()` en Prisma 7 (grep sobre runtime minificado, dos intentos) ⇒ reporto el token como "cuid v1, no diseñado como secreto", sin afirmar la fuente de aleatoriedad.

## 8. Decisiones de clasificación

- **Crítico**: rol por defecto ADMIN (condicionado a sign-ups, pero también alcanzable si falla la invitación); sin RLS (condicionado a exposición de la Data API; mitigante verificado: anon key fuera del bundle); `next@16.2.6` (crítico según npm audit; RCE dependiente del hosting).
- **Alto**: autorización solo en proxy/UI (escalamiento confirmado en solicitudes); deriva de migraciones; integridad de pagos (sin validación servidor, duplicados, sin anulación ni auditoría); dashboard sin nómina; privacidad de menores (sin consentimiento, sin rectificación/borrado, copias en JSON).
- Resto en Medio/Bajo según impacto en uso normal del piloto.
- No clasifico nada como "bypass anónimo" porque el reenvío de acciones pasa por el proxy (`action-handler.js:177` usa `redirect: 'manual'` y descarta respuestas no-RSC; `x-action-forwarded` no se usa para saltarse el proxy).

## 9. Cierre

- Entregables: `REVIEW.md` (3 críticos, 5 altos, 17 medios, 16 bajos; plan por fases con S/M/L; lista de lo no revisado; 4 preguntas abiertas) y este `SESSION_LOG.md`.
- Antes de publicar, repasé con grep cada `archivo:línea` citado en `REVIEW.md` y corregí tres citas: `inscripcion/[token]/page.tsx:47`, `lib/auth.ts:10` y `(dashboard)/layout.tsx:10`.
- Código del repositorio: sin cambios. Solo se agregan estos dos archivos en la raíz.
- Siguiente paso sugerido: confirmar las preguntas abiertas (marco legal Venezuela/España, alcance del rol SECRETARIA, hosting) y, si se autoriza, hacer una verificación de solo lectura del proyecto Supabase (Security Advisor, RLS, sign-ups) para convertir C1/C2 de "condicionados" a "confirmados" o descartarlos.


## 10. Segunda ronda (respuestas del usuario y verificación de Supabase)

Respuestas del usuario:
- El colegio está en Venezuela y el soporte se da desde España.
- La SECRETARIA ve contabilidad y salud, pero **no** la nómina.
- Producción corre en Vercel.
- Autoriza una verificación de Supabase de solo lectura.

Verificación de Supabase (solo metadatos, sin leer ninguna fila):
- `list_projects`: el proyecto `gloria-falcon` (`ifnhauunhgkhosbnfaqq`) está en `eu-west-1` con estado **INACTIVE**.
- `get_advisors(security)`: `lints: []`. No es concluyente con el proyecto pausado.
- `execute_sql` (consulta de `relrowsecurity` en `pg_class`): timeout de conexión.
- Me detuve aquí por la regla de los dos intentos. No reactivo el proyecto (sería una escritura). La configuración de sign-ups no se puede leer con estas herramientas.

Hallazgos nuevos en el código:
- La nómina se filtra también desde contabilidad: `EgresosTable.tsx:24,124,152-155` muestra nombre, monto y enlace, y `docentes/actions.ts:204,236` guarda el nombre en la descripción del egreso.
- No hay `vercel.json` ni `preferredRegion` ⇒ las funciones usan la región por defecto de Vercel (EE. UU.), salvo que se haya cambiado en el panel.

Decisiones:
- C3 pasa de Crítico a Alto, porque en Vercel la optimización de imágenes no la hace el `sharp` de la app.
- M16 pasa a ser un requisito concreto.
- A5 incorpora las obligaciones probables del RGPD como encargado del tratamiento.
- REVIEW.md actualizado: nueva sección de actualización, índice, M16, "Lo que no pude revisar", preguntas abiertas y plan.
