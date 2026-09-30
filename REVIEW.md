# Revisión de código — Sistema de gestión escolar "Gloria Falcón"

> **Fecha:** 30/09/2026 · **Commit revisado:** `769f4a1` (rama `claude/busy-gates-kb3ip8`) · **Tipo:** solo revisión, no se modificó código.
> **Método:** leí completos los ~150 archivos versionados (~15.200 líneas). Además corrí en local los tests, `tsc`, `eslint`, `npm audit`, `npm outdated` y un `next build` con variables ficticias para inspeccionar el bundle. El paso a paso y las decisiones están en `SESSION_LOG.md`.

## Resumen ejecutivo

**Estado general:** es un MVP funcional y legible, con bases sanas: Prisma con consultas parametrizadas, zod, ningún punto de entrada para XSS y la service key solo en el servidor. Aun así, **no está listo para un piloto con datos reales de menores** hasta cerrar los 3 problemas críticos y los 5 altos. Los tres más graves:

1. **Un usuario sin rol se trata como ADMIN** (`proxy.ts:62`, `lib/auth.ts:15`). Si el registro público de Supabase está activo (lo está por defecto) o falla una invitación, esa persona obtiene acceso total a fichas, datos de salud, pagos y usuarios.
2. **Ninguna tabla tiene RLS** (no hay ni una política en `prisma/migrations/`). Si la Data API de Supabase expone el esquema `public` (lo habitual), basta la anon key para leer y escribir toda la base.
3. **La autorización vive solo en `proxy.ts` y en la interfaz.** 44 de las 50 Server Actions del panel no verifican sesión ni rol. Hoy mismo una SECRETARIA puede aprobar o rechazar inscripciones, que solo están restringidas en pantalla. Además, `next@16.2.6` expone esos IDs de acción públicamente y arrastra avisos de seguridad críticos.

Otros bloqueantes: las migraciones no coinciden con el esquema, los pagos no se validan en el servidor ni se pueden anular o auditar, y el dashboard deja la nómina fuera de los egresos.

### Contexto que cambia el alcance de lo pedido
- **No existe módulo de notas ni calificaciones.** No hay modelos ni rutas para eso; "Boletín" solo aparece como documento requerido en `app/(dashboard)/alumnos/nuevo/FichaAlumnoForm.tsx:480`. No hubo cálculos de notas que revisar.
- **Representantes y docentes no tienen cuenta.** Solo existen los roles `ADMIN` y `SECRETARIA` (`lib/auth.ts:4`). Los representantes solo usan el formulario público `/inscripcion/[token]`, y los docentes existen únicamente como registros de nómina. Las preguntas "¿un representante ve datos de otro alumno?" y "¿un docente accede a lo que no le toca?" las evalué sobre ese formulario (hallazgos M2 y M13) y sobre la separación ADMIN/SECRETARIA (A1 y M16).
- **Todo indica que el colegio está en Venezuela:** bolívares, Pago Móvil, RIF, cédula escolar y la lista `ESTADOS_VE`. Ver la pregunta abierta sobre el marco legal al final.

---

## Índice de hallazgos

| ID | Severidad | Título |
|---|---|---|
| C1 | Crítico | Un usuario sin rol se trata como ADMIN |
| C2 | Crítico | Ninguna tabla tiene RLS en Supabase |
| C3 | Crítico | `next@16.2.6` vulnerable y optimizador de imágenes abierto |
| A1 | Alto | La autorización depende solo del proxy y de la interfaz |
| A2 | Alto | Las migraciones no reflejan el esquema actual |
| A3 | Alto | Pagos: el servidor confía en el cliente, no hay anulación ni auditoría |
| A4 | Alto | El dashboard no cuenta la nómina ni los egresos en bolívares |
| A5 | Alto | Privacidad de menores: sin consentimiento, sin rectificación ni borrado |
| M1 | Medio | Aprobar una solicitud dos veces duplica al alumno |
| M2 | Medio | Token del enlace público débil y sin caducidad |
| M3 | Medio | Solvencia errónea para inscritos a mitad de año y para retirados |
| M4 | Medio | El reporte de morosos ignora el mes elegido |
| M5 | Medio | "Cobrado en el mes" no descuenta las becas |
| M6 | Medio | Los precios dependen del nombre literal de cada producto |
| M7 | Medio | El año escolar asume formato "AAAA-AAAA" y meses fijos |
| M8 | Medio | La tasa editada no coincide con la tasa guardada (recibos incoherentes) |
| M9 | Medio | Contabilidad convierte bolívares con la tasa del día de consulta |
| M10 | Medio | Nómina: bono "fantasma" y total sin recalcular en el servidor |
| M11 | Medio | Los mensajes de error no llegan al usuario en producción |
| M12 | Medio | Gestión de usuarios incompleta (bajas, invitación, contraseña) |
| M13 | Medio | Validación de entradas débil, también en el formulario público |
| M14 | Medio | El selector de fechas no permite elegir el año |
| M15 | Medio | La importación CSV es frágil y deja fichas incompletas |
| M16 | Medio | La SECRETARIA ve nómina, contabilidad y datos de salud |
| M17 | Medio | Sin CI, lint roto y cobertura de tests casi nula |
| B1–B16 | Bajo | Ver la tabla de la sección Bajo |

---

## Hallazgos — Crítico

### C1 · Un usuario sin rol se trata como ADMIN (falla abierta)
- **Dónde:** `proxy.ts:62`, `lib/auth.ts:15`, `app/(dashboard)/layout.tsx:14` y `app/(dashboard)/admin/usuarios/page.tsx:28` usan `user.app_metadata?.rol ?? "ADMIN"`. La creación de usuarios está en `app/(dashboard)/admin/usuarios/actions.ts:26-34`.
- **Qué pasa:**
  - Cualquier usuario autenticado sin `rol` recibe permisos de administrador (lo explica un comentario de "retrocompatibilidad").
  - Nada en el código impide crear cuentas. Eso depende de que el proyecto Supabase tenga desactivado *Allow new users to sign up*, que viene activado por defecto. El código solo traduce el error "signup is disabled" (`app/(auth)/login/actions.ts:16`), lo cual no demuestra cómo está configurado.
  - `invitarUsuario` primero envía la invitación (`:26`) y después asigna el rol (`:30-34`). Si el segundo paso falla, la persona invitada queda sin rol y, por lo tanto, como ADMIN.
- **Por qué importa:** con el registro abierto, cualquiera puede llamar a `POST /auth/v1/signup` de Supabase, confirmar su propio correo y entrar como ADMIN. Desde ahí ve fichas y datos de salud de todos los menores, pagos y nómina, y puede invitar a otros administradores o cambiar roles.
- **Cómo arreglarlo:**
  1. Denegar por defecto. Centralizar en `lib/auth.ts` una función `parseRol(user)` que devuelva `null` si el rol no es `ADMIN` ni `SECRETARIA`. Usarla en el proxy, el layout y las acciones, y cerrar la sesión o responder 403 cuando no haya rol válido.
  2. Correr una sola vez un script con la service role que asigne `app_metadata.rol` a los usuarios existentes.
  3. Desactivar los registros públicos en Supabase Auth.
  4. Crear los usuarios de forma atómica: `auth.admin.createUser({ email, app_metadata: { rol } })` más el enlace de invitación, o borrar el usuario si falla la asignación del rol.

### C2 · Ninguna tabla tiene Row Level Security (RLS)
- **Dónde:** `prisma/migrations/20260623132846_initial/migration.sql` crea, por ejemplo, `alumnos` (`:35`), `representantes` (`:59`), `salud_alumno` (`:87`) y `pagos` (`:206`). `prisma/migrations/20260623152304_add_solicitudes_inscripcion/migration.sql:5` crea `solicitudes_inscripcion`, que incluye un JSON de salud. Una búsqueda de `ROW LEVEL SECURITY` no da ningún resultado. Todas las tablas están en el esquema `public`.
- **Qué pasa:** la app usa Prisma con el rol dueño de las tablas, así que funciona sin RLS. Pero Supabase publica por defecto el esquema `public` en su Data API (PostgREST) para los roles `anon` y `authenticated`. Sin RLS, la única barrera es conocer la anon key, que Supabase considera pública por diseño.
  - **Verificado (mitiga, pero no protege):** en un build local con valores marcadores, la anon key **no** aparece en el JS público (`.next/static`), porque `lib/supabase/client.ts` no se importa en ningún lado.
  - **No verificado:** si en el proyecto real la Data API está activa y qué permisos tienen `anon` y `authenticated`. No me conecté a Supabase (ver "Lo que no pude revisar").
- **Por qué importa:** si esa condición se cumple, cualquiera que tenga la anon key puede leer o modificar **todas** las tablas sin pasar por la app, incluidos los datos de salud de menores y los pagos. La clave puede llegar a manos equivocadas por un ex-empleado, un log o una futura página que use el cliente del navegador.
- **Cómo arreglarlo:**
  1. Como la app no usa PostgREST, desactivar la Data API o quitar `public` de los esquemas expuestos (Settings → API).
  2. Crear una migración que ejecute `ALTER TABLE … ENABLE ROW LEVEL SECURITY` en todas las tablas y `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated`. Sin políticas, RLS deniega el acceso a `anon` y `authenticated`. El rol dueño que usa Prisma no se ve afectado salvo con `FORCE ROW LEVEL SECURITY`; conviene probarlo en staging.
  3. Revisar el *Security Advisor* de Supabase y confirmar con `curl` que `/rest/v1/alumnos` responde 401 o *permission denied*.

### C3 · `next@16.2.6` con avisos de seguridad conocidos y optimizador de imágenes abierto
- **Dónde:** `package.json` fija `"next": "16.2.6"` sin `^`, así que nunca recibe parches por sí solo. `proxy.ts:73` deja `_next/image` fuera del proxy, y `next.config.ts:10-16` acepta imágenes de cualquier `*.supabase.co`.
- **Qué pasa:** `npm audit` agrupa 11 avisos para esta versión, 2 de ellos críticos. Todos se corrigen en la 16.3.7, sin cambio de versión mayor. Revisé en detalle los relevantes para esta app:
  - **GHSA-955p-x3mx-jcvp:** los IDs de Server Actions quedan expuestos a usuarios **no autenticados** en los chunks estáticos. Lo confirmé en el build: 29 de los 54 IDs están en `.next/static`.
  - **GHSA-2xp9-vwfh-vxw4 (crítico):** ejecución remota de código (RCE) al optimizar imágenes AVIF (<16.3.3). Aquí `/_next/image` es público y `*.supabase.co` admite imágenes de *cualquier* proyecto Supabase, incluido uno de un atacante. Si es explotable depende del hosting: en Vercel la optimización la hace su infraestructura, y no pude verificarlo.
  - **GHSA-m99w-x7hq-7vfj:** denegación de servicio con Server Actions. Hay además otros avisos de caché y SSRF.
  - **GHSA-6gpp-xcg3-4w24 (bypass del Proxy): no aplica.** Requiere `i18n` con un solo locale y `next.config.ts` no define `i18n`.
- **Por qué importa:** toda la seguridad de la app depende del proxy y de que nadie conozca los IDs de acción (ver A1). Esta versión debilita ambas cosas.
- **Cómo arreglarlo:**
  1. Subir `next` y `eslint-config-next` a 16.3.7 o superior.
  2. Quitar `images.remotePatterns`, que hoy no se usa (la única `next/image` es el `/logo.jpg` local), o limitarlo al host exacto del proyecto.
  3. Pasar `prisma` a `devDependencies`, actualizarlo a la última 7.x y volver a correr `npm audit` (la sugerencia de npm de bajar a `prisma@6` no es una solución real).
  4. Ejecutar `npm audit` en CI (ver M17).

---

## Hallazgos — Alto

### A1 · La autorización depende solo de `proxy.ts` y de la interfaz
- **Dónde:** de las 50 Server Actions del panel, repartidas en 12 archivos `"use server"`, solo 6 verifican algo:
  - `requireAdmin()` en `app/(dashboard)/admin/usuarios/actions.ts:14,40` y en `app/(dashboard)/configuracion/actions.ts:22,44,97`.
  - Existencia de sesión en `app/(dashboard)/alumnos/solicitudes/actions.ts:11-13`.

  Las otras 44 no verifican nada: todas las lecturas `get*` y escrituras como `registrarPago`, `crearAlumno`, `importarAlumnos` o `registrarPagoNomina`. Las 6 rutas de `app/api/**/route.tsx` tampoco comprueban la sesión; dependen de `proxy.ts:41-47`.
- **Caso confirmado (análisis del código y del build, no ejecutado contra un servidor real):**
  - Aprobar o rechazar solicitudes está limitado a administradores solo en pantalla (`app/(dashboard)/alumnos/solicitudes/[id]/page.tsx:59`, `app/(dashboard)/alumnos/solicitudes/[id]/ReviewForm.tsx:51`).
  - Las acciones `aprobarSolicitud` (`app/(dashboard)/alumnos/solicitudes/actions.ts:45`) y `rechazarSolicitud` (`:170`) no verifican el rol.
  - Ambas viven en rutas que el proxy permite a la secretaria (`/alumnos/solicitudes*`), y sus IDs están en el JS público.
  - Resultado: una SECRETARIA puede invocarlas con un POST.
- **Protección accidental:** las 10 acciones de `app/(dashboard)/configuracion/actions.ts` que no llaman a `requireAdmin` (`:68, 74, 84, 121, 126, 131, 138, 143, 150, 167`) hoy quedan protegidas de rebote.
  - Next reenvía la acción a la ruta que la contiene (`/configuracion`) y ese reenvío vuelve a pasar por el proxy (`node_modules/next/dist/server/app-render/action-handler.js:449-455`; usa `redirect: 'manual'` en `:177`).
  - Ese es un detalle interno de Next, no una garantía documentada. Basta con reutilizar una de esas acciones en otra página para dejarla abierta.
  - Por ese mismo mecanismo **no** encontré un camino para que un usuario anónimo ejecute acciones del panel.
- **Por qué importa:** la documentación de Next 16 incluida en el repo lo advierte:
  - "verify authentication and authorization inside each one" (`node_modules/next/dist/docs/01-app/02-guides/data-security.md:282,329`).
  - "Proxy … should not be your only line of defense" (`node_modules/next/dist/docs/01-app/02-guides/authentication.md:1119`).

  Cualquier error futuro en `proxy.ts` o en su `matcher` dejaría todo expuesto.
- **Cómo arreglarlo:**
  1. Crear una capa de acceso a datos (DAL) con `requireUser()` y `requireRole("ADMIN")`, y llamarla al inicio de **cada** Server Action y cada Route Handler.
  2. Sacar las lecturas `get*` de los archivos `"use server"` y moverlas a módulos con `import "server-only"`. Así dejan de ser endpoints públicos.
  3. Documentar la matriz de permisos por rol y cubrirla con tests.

### A2 · Las migraciones no reflejan el esquema actual
- **Dónde:** `prisma/schema.prisma:114` (`Representante.fechaNacimiento`) y `:268` (`Docente.fechaNacimiento`) no coinciden con `prisma/migrations/20260623132846_initial/migration.sql:64`, que crea `"edad" INTEGER`, ni con `:177-193`, donde `docentes` no tiene `fechaNacimiento`. El mensaje del commit `769f4a1` dice "migración aplicada", pero ese commit no agregó ningún archivo en `prisma/migrations/`.
- **Qué pasa:** la base de producción se modificó a mano (o con `db push`) y el historial de migraciones quedó desfasado.
- **Por qué importa:**
  1. Un entorno nuevo creado con `prisma migrate deploy`, como indica el README (por ejemplo, la base del piloto), no tendrá esas columnas. Fallarán el alta de alumnos y de docentes, la aprobación de solicitudes y la ficha del alumno.
  2. `prisma migrate dev`, también recomendado en el README, detectará la diferencia y propondrá **resetear** la base. `prisma.config.ts:2,11` toma `DIRECT_URL` de `.env.local`, que podría estar apuntando a producción.
  3. No se sabe si se perdieron los datos de `edad`.
- **Cómo arreglarlo:**
  1. Generar la migración faltante contra una base local limpia (`prisma migrate dev --create-only` o `prisma migrate diff`) y revisarla.
  2. En producción, marcarla como aplicada con `prisma migrate resolve --applied <nombre>`.
  3. Separar las bases de desarrollo y de producción.
  4. Agregar en CI una verificación con `prisma migrate diff … --exit-code`.

### A3 · Pagos: el servidor confía en el cliente, permite cobrar dos veces y no hay anulación ni auditoría
- **Dónde:**
  - `app/(dashboard)/mensualidades/actions.ts:242-263`: el esquema acepta cualquier número por concepto (`:248`, también negativos) y texto libre en concepto y `mesAno`. No verifica que la suma de conceptos sea igual a `montoUsd`, ni que `montoBs` sea `montoUsd × tasa`.
  - `app/(dashboard)/mensualidades/actions.ts:138-141`: la solvencia solo mira si el *nombre* del concepto aparece en el mes. Un concepto "Mensualidad" de $0 deja el mes como pagado.
  - `app/(dashboard)/mensualidades/nuevo/RegistrarPagoForm.tsx:262-284`: la grilla de meses no sabe cuáles ya se pagaron, porque `getPagoFormData` (`actions.ts:213-238`) no los consulta, y el servidor tampoco lo impide. Se puede cobrar dos veces el mismo mes.
  - `deletedAt` existe (`prisma/schema.prisma:306,343,364`) y las lecturas lo filtran, pero **ningún código lo asigna**. No hay forma de anular un pago, una venta o un egreso cargado por error.
  - `registrarPago`, `registrarVenta` (`app/(dashboard)/ventas/actions.ts:120`), `registrarEgreso` (`app/(dashboard)/contabilidad/actions.ts:166`) y `registrarPagoNomina` (`app/(dashboard)/docentes/actions.ts:195`) no llaman a `registrarAudit`.
  - Ventas repite el mismo patrón (`app/(dashboard)/ventas/actions.ts:25-41`).
- **Por qué importa:** los errores de cobro, o un fraude interno, ni se detectan ni se pueden corregir desde la app, y no queda registro de quién cargó qué. En un piloto con familias reales, un cobro duplicado imposible de anular es un problema operativo y de confianza.
- **Cómo arreglarlo:**
  1. Recalcular en el servidor los conceptos a partir de los precios y de la inscripción. El cliente solo debería elegir los meses y la forma de pago.
  2. Validar que la suma de conceptos sea igual al total y que los montos sean ≥ 0, salvo el descuento.
  3. Rechazar meses ya pagados, con una consulta previa o un índice único parcial (alumno + mes + concepto).
  4. Agregar una acción "Anular" que asigne `deletedAt` y guarde motivo y usuario.
  5. Llamar a `registrarAudit` en todas las escrituras financieras.

### A4 · El dashboard no cuenta la nómina ni ningún egreso en bolívares
- **Dónde:** `app/(dashboard)/dashboard/page.tsx:38-41` (tarjetas) y `:72-75` (gráfica de 6 meses) suman solo el `montoUsd` de los egresos. Pero:
  - La nómina se guarda solo en Bs: `app/(dashboard)/docentes/actions.ts:237` asigna `montoBs: parsed.totalBs`.
  - El formulario de egresos guarda los gastos en Bs con `montoUsd = null` (`app/(dashboard)/contabilidad/nuevo-egreso/EgresoForm.tsx:64-65`).
- **Por qué importa:** "Egresos del mes" y "Balance del mes" dejan fuera la nómina, que suele ser el gasto más grande. El balance sale inflado y no cuadra con `/contabilidad`, que sí convierte los bolívares (aunque con otro problema, ver M9).
- **Cómo arreglarlo:** guardar siempre el equivalente en USD al momento del registro, con la tasa del día, además del monto en Bs. Calcular dashboard, contabilidad y el PDF de balance con una única función compartida y con tests.

### A5 · Privacidad de menores: sin aviso ni consentimiento, sin rectificación ni borrado, y con copias innecesarias
- **Dónde:**
  - **Sin aviso ni consentimiento.** El formulario público (`app/(public)/inscripcion/[token]/InscripcionForm.tsx` y `app/(public)/inscripcion/[token]/actions.ts:44-50`) pide enfermedades, tratamientos y alergias del menor y datos de los padres. No muestra aviso de privacidad ni pide consentimiento: buscar "privacidad", "consentimiento", "autorizo" o "acepto" no da ningún resultado.
  - **Sin rectificación ni borrado.** No existe ninguna acción para editar o borrar datos de alumnos, representantes, salud, contactos o autorizados. Los únicos `update` sobre alumnos cambian `estado` (`app/(dashboard)/alumnos/actions.ts:201,215`).
  - **Copias innecesarias.** Al aprobar o rechazar una solicitud se conserva la copia completa en JSON, datos de salud incluidos (`app/(dashboard)/alumnos/solicitudes/actions.ts:147-156,171-174`; `prisma/schema.prisma:431-434`). Ni las solicitudes rechazadas ni los enlaces pendientes caducan.
  - **Acceso sin control.** Todo el personal ve los datos de salud (`app/(dashboard)/alumnos/[id]/page.tsx:167-191`) y no se registra quién los consulta. El audit log no se muestra en ninguna pantalla.
- **Por qué importa:**
  - Son datos de salud de menores, una categoría especial en prácticamente cualquier marco legal.
  - Sin rectificación no se puede corregir, por ejemplo, una alergia mal cargada.
  - Sin borrado no se puede atender una solicitud de supresión ni aplicar una política de retención.
  - El colegio parece estar en Venezuela. Si el tratamiento o el soporte se hacen desde España, podría aplicar también el RGPD. Esto no es asesoría legal: hay que confirmarlo.
- **Cómo arreglarlo:**
  1. Agregar un aviso de privacidad y una casilla de consentimiento, guardando fecha y versión, en el formulario público y en la ficha interna.
  2. Crear pantallas de edición y de baja o anonimización, con auditoría.
  3. Limpiar el JSON de la solicitud al aprobarla o rechazarla.
  4. Definir una retención, por ejemplo borrar las solicitudes rechazadas a los N días.
  5. Mostrar los datos de salud solo a quien los necesite y auditar cada consulta.

---

## Hallazgos — Medio

### M1 · Aprobar una solicitud dos veces duplica al alumno
- **Dónde:**
  - `app/(dashboard)/alumnos/solicitudes/actions.ts:49-53` solo comprueba que la solicitud exista y tenga datos; no exige `estado === "EN_REVISION"`.
  - `rechazarSolicitud` (`:170-174`) puede rechazar una solicitud ya aprobada.
- **Por qué importa:** si dos personas o dos pestañas aprueban la misma solicitud, se crean dos alumnos. La cédula escolar no lo evita, porque es opcional (`prisma/schema.prisma:85`). Eso duplica el cobro y la lista de morosos.
- **Cómo arreglarlo:** al comienzo de la transacción, ejecutar `updateMany({ where: { id, estado: "EN_REVISION" }, data: { estado: "APROBADA" } })` y abortar si `count === 0`. Hacer lo mismo al rechazar.

### M2 · Token del enlace público débil, sin caducidad ni revocación, y con carrera al enviar
- **Dónde:**
  - El token se genera con `prisma/schema.prisma:412` (`@default(cuid())`).
  - `app/(public)/inscripcion/[token]/page.tsx:47` dice que el enlace "ya expiró", pero no existe ninguna lógica de caducidad.
  - `app/(public)/inscripcion/[token]/actions.ts:66-69` comprueba el estado y `:78` actualiza sin condicionar a ese estado.
- **Por qué importa:**
  - Un cuid lleva marca de tiempo y contador; no está pensado como secreto. No verifiqué su fuente de aleatoriedad en Prisma 7.
  - Un enlace filtrado o adivinado permite enviar datos falsos a nombre de una familia.
  - Los enlaces no vencen nunca.
  - Si se envía dos veces al mismo tiempo, queda guardado el último envío.
  - Punto a favor: el formulario **no muestra** datos existentes, así que un token filtrado no expone datos de otro alumno.
- **Cómo arreglarlo:**
  1. Generar el token con `crypto.randomBytes(32).toString("base64url")`.
  2. Agregar una columna `expiraEn` (por ejemplo, 7 días) y un botón para revocar el enlace.
  3. Actualizar con `updateMany({ where: { token, estado: "PENDIENTE" } })` y verificar el `count`.
  4. Limitar los envíos por IP.

### M3 · Solvencia errónea para inscritos a mitad de año y para retirados
- **Dónde:**
  - `app/(dashboard)/mensualidades/actions.ts:90-93` exige todos los meses desde septiembre a todos los alumnos, sin mirar `fechaInscripcion`.
  - `:51` solo considera alumnos `ACTIVO`.
  - `app/(dashboard)/reportes/actions.ts:7-19` hace lo mismo en el selector del estado de cuenta.
- **Por qué importa:**
  - Un alumno inscrito en enero aparece moroso por septiembre a diciembre.
  - Un alumno retirado con deuda desaparece de los morosos y del selector del estado de cuenta.
- **Cómo arreglarlo:** empezar a contar desde el mes de inscripción (o desde un mes de inicio configurable por inscripción) y agregar un reporte de deudas de alumnos retirados.

### M4 · El reporte PDF de morosos ignora el mes elegido
- **Dónde:** `app/api/reportes/morosos/route.tsx:10,17` recibe `mesAno`, pero `getMensualidadesData` calcula los meses vencidos con el mes actual del servidor (`app/(dashboard)/mensualidades/actions.ts:91-93`). El parámetro solo afecta al total cobrado (`:194-196`).
- **Por qué importa:** un reporte de "Morosos de marzo" impreso en septiembre muestra las deudas acumuladas hasta septiembre.
- **Cómo arreglarlo:** pasar al cálculo un mes de corte ("hasta") explícito.

### M5 · "Cobrado en el mes" no descuenta las becas
- **Dónde:**
  - `app/(dashboard)/mensualidades/actions.ts:194-196` suma los conceptos cuyo `mesAno` es el mes consultado.
  - El descuento se guarda con `mesAno: null` (`app/(dashboard)/mensualidades/nuevo/RegistrarPagoForm.tsx:106-110`), así que nunca se resta.
  - Además, deja fuera los pagos de alumnos que ya no están activos (`actions.ts:94,101`).
- **Por qué importa:** el total cobrado del mes aparece más alto de lo real cuando hay becas.
- **Cómo arreglarlo:** calcular lo cobrado a partir de `Pago.montoUsd` por fecha de pago, o repartir el descuento entre los meses.

### M6 · Los precios dependen del nombre literal de cada producto
- **Dónde:**
  - El precio se busca por nombre ("Mensualidad", "Almuerzo", "Resguardo", "Tae-Kwon-Do") en `app/(dashboard)/mensualidades/actions.ts:67-70,127-132` y `app/(dashboard)/mensualidades/nuevo/RegistrarPagoForm.tsx:71-74,93,100`.
  - `app/(dashboard)/configuracion/actions.ts:126-134` permite renombrar o desactivar esos productos.
- **Por qué importa:** si alguien renombra o desactiva "Mensualidad", el precio pasa a ser $0 en el formulario de cobro y en los montos estimados de morosos, sin ningún aviso.
- **Cómo arreglarlo:** agregar a `Producto` una clave estable (por ejemplo, un enum `codigo`) y no permitir renombrar ni desactivar los productos del sistema.

### M7 · El año escolar asume formato "AAAA-AAAA" y meses fijos
- **Dónde:**
  - `lib/utils.ts:102-112` asume ese formato y los meses de septiembre a julio.
  - Al crear el año, `app/(dashboard)/configuracion/actions.ts:13` solo exige `min(1)`.
  - El prefijo del recibo usa `substring(0, 4)` (`app/(dashboard)/mensualidades/actions.ts:277`).
  - Los lapsos, que sí tienen fechas, no se usan para cobrar.
- **Por qué importa:** si el año se llama "2026/2027" o "Año 2026-2027", los meses quedan como "09/NaN". Nadie aparece nunca como moroso y los recibos salen con el prefijo "Año ".
- **Cómo arreglarlo:** validar con `^\d{4}-\d{4}$` y años consecutivos. Idealmente, derivar los meses de las fechas de los lapsos.

### M8 · La tasa editada no coincide con la tasa guardada (recibos incoherentes)
- **Dónde:**
  - `app/(dashboard)/mensualidades/nuevo/RegistrarPagoForm.tsx:54-56,127-130` calcula `montoBs` con la tasa que el usuario puede editar.
  - `:186` guarda el `tasaCambioId` de la tasa oficial.
  - El recibo muestra la tasa oficial junto a un monto en Bs calculado con otra tasa (`components/pdf/ReciboPago.tsx:253,355-358`).
  - Lo mismo ocurre en la nómina: `app/(dashboard)/docentes/nomina/nuevo/NominaForm.tsx:35,80` y `components/pdf/ComprobanteNomina.tsx:75,124,159-162`.
- **Por qué importa:** es un documento que se entrega a las familias y la cuenta no cierra (tasa × USD ≠ Bs).
- **Cómo arreglarlo:** guardar la tasa realmente aplicada (una columna `tasaAplicada`) o no permitir editarla.

### M9 · Contabilidad convierte bolívares con la tasa del día de consulta
- **Dónde:** `app/(dashboard)/contabilidad/actions.ts:55-58,97-114` usa la última tasa registrada para todos los meses e ignora `egreso.tasaCambioId`. El PDF de balance usa la misma función.
- **Por qué importa:** los balances pasados cambian cada vez que se registra una tasa nueva. Con devaluación, los gastos históricos expresados en USD se van achicando.
- **Cómo arreglarlo:** el mismo arreglo de A4.

### M10 · Nómina: bono "fantasma" y total sin recalcular en el servidor
- **Dónde:**
  - `app/(dashboard)/docentes/nomina/nuevo/NominaForm.tsx:45-51` solo recalcula el bono en Bs cuando hay un monto en USD.
  - Si se borra el USD, el valor anterior en Bs se queda. Los campos se ocultan (`:173`), pero ese monto sigue sumando al total (`:54-57`) y se guarda como `bonoBsEquivalente` (`:79`).
  - El servidor acepta el `totalBs` que manda el cliente (`app/(dashboard)/docentes/actions.ts:68,228,237`).
- **Por qué importa:** se registra y se comprueba un pago mayor al real.
- **Cómo arreglarlo:** poner el bono en Bs a cero cuando el USD queda vacío y recalcular el total en el servidor a partir de sus componentes.

### M11 · Los mensajes de error no llegan al usuario en producción
- **Dónde:**
  - Ocho formularios muestran `parsePrismaError(e)` (`lib/utils.ts:119`) con errores lanzados por Server Actions. Lo mismo pasa con los `throw new Error("…")` de `app/(dashboard)/alumnos/solicitudes/actions.ts:50-53` y `app/(dashboard)/admin/usuarios/actions.ts:21,27,34`.
  - En producción React solo envía un `digest` al cliente (`node_modules/next/dist/compiled/react-server-dom-webpack/cjs/react-server-dom-webpack-server.node.production.js:1874`; `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md:106-111`).
- **Por qué importa:** en producción, mensajes como "cédula escolar duplicada" o "Email inválido" se convierten en un error genérico en inglés. Los tests de `parsePrismaError` dan una falsa sensación de cobertura.
- **Cómo arreglarlo:** que las acciones devuelvan `{ ok: false, error }` en lugar de lanzar errores, como ya hace `enviarSolicitud`, y que los errores de Prisma se traduzcan en el servidor.

### M12 · Gestión de usuarios incompleta: sin bajas, sin aceptación de invitación y sin recuperación de contraseña
- **Dónde:**
  - `app/(dashboard)/admin/usuarios/actions.ts` solo permite invitar y alternar el rol. No hay forma de suspender ni eliminar un usuario.
  - Ninguna ruta procesa el enlace de invitación ni el de recuperación de contraseña (buscar `exchangeCodeForSession|verifyOtp|updateUser(|auth/callback` no da resultados). Sin embargo, la pantalla promete "un enlace para crear su contraseña" (`app/(dashboard)/admin/usuarios/UsuariosTable.tsx:197`).
  - `cambiarRolUsuario` (`actions.ts:39-49`) no valida el `rol` en tiempo de ejecución ni impide que alguien se quite su propio rol de administrador: solo el botón está oculto (`UsuariosTable.tsx:84`).
- **Por qué importa:** cuando una secretaria deja el colegio, su acceso solo se puede revocar desde el panel de Supabase. Que la invitación funcione de punta a punta depende de una configuración de Supabase que no está en el repo.
- **Cómo arreglarlo:**
  1. Agregar "Desactivar usuario" (`auth.admin.updateUserById(id, { ban_duration })` o borrarlo).
  2. Crear una ruta `/auth/confirm` con `verifyOtp` y una pantalla para fijar la contraseña.
  3. Agregar "Olvidé mi contraseña".
  4. Validar `rol` con zod y bloquear la eliminación del último ADMIN.

### M13 · Validación de entradas débil, también en el formulario público
- **Dónde:**
  - **Formulario público** (`app/(public)/inscripcion/[token]/actions.ts:7-51`): ningún `.max()` en textos ni listas, el correo no se valida (`:15`) y la fecha de nacimiento del representante tampoco (`:11`).
  - **Panel:** las fechas se validan solo con `z.string().min(1)` y luego se pasan a `new Date(...)`. Ocurre en `app/(dashboard)/alumnos/actions.ts:33`, `app/(dashboard)/docentes/actions.ts:47`, `app/(dashboard)/mensualidades/actions.ts:260`, `app/(dashboard)/ventas/actions.ts:38` y `app/(dashboard)/contabilidad/actions.ts:158`. No hay límites de rango, así que se aceptan nacimientos en el futuro o pagos en 2099.
  - Los filtros de estado se convierten con `as` sin validar (`app/(dashboard)/docentes/actions.ts:81`).
- **Por qué importa:** entran datos basura y aparecen errores 500. El endpoint público permite cargar textos arbitrariamente largos, aunque Next limita cada petición a 1 MB por defecto (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md:26`).
- **Cómo arreglarlo:** usar esquemas zod compartidos entre cliente y servidor, con `.max()`, `z.iso.date()` y rangos de fechas.

### M14 · El selector de fechas no permite elegir el año
- **Dónde:**
  - `components/ui/date-picker.tsx:46-54` usa `Calendar` sin `captionLayout`, y el valor por defecto de react-day-picker 10 es `"label"`, sin selector (`node_modules/react-day-picker/dist/esm/types/props.d.ts:135-150`).
  - La fecha de nacimiento es obligatoria para madre y padre (`app/(dashboard)/alumnos/nuevo/FichaAlumnoForm.tsx:109-116`) y para los docentes (`app/(dashboard)/docentes/actions.ts:47`).
- **Por qué importa:** para cargar una fecha de 1985 hay que pulsar "mes anterior" unas 500 veces. El personal terminará cargando fechas incorrectas o saltándose a los padres.
- **Cómo arreglarlo:** usar `captionLayout="dropdown"` con `startMonth` y `endMonth`, o permitir escribir la fecha en formato dd/mm/aaaa.

### M15 · La importación CSV es frágil y deja fichas incompletas
- **Dónde** (`app/(dashboard)/alumnos/importar/actions.ts`):
  - `:31` lee el archivo siempre como UTF-8.
  - `:41,51` separa con `split(",")`. Excel en español usa `;` y las comas dentro de comillas rompen las filas.
  - `:76-87` crea alumnos sin inscripción, sin representantes y sin contacto de emergencia, fila por fila y sin transacción.
  - `:89-94` oculta el error real: cualquier fallo, incluso una fecha inválida, se reporta como "probable cédula duplicada".
- **Por qué importa:**
  - Si el archivo viene en ANSI, las ñ y los acentos se corrompen.
  - Quedan fichas de menores sin contacto de emergencia.
  - Volver a importar el mismo archivo duplica a los alumnos que no tienen cédula.
- **Cómo arreglarlo:** usar un parser robusto (por ejemplo, papaparse) que detecte delimitador y codificación, mostrar una vista previa antes de confirmar, hacer la carga en una transacción, detectar duplicados y exigir los datos de inscripción.

### M16 · La SECRETARIA ve nómina, contabilidad y datos de salud
- **Dónde:** `proxy.ts:4` solo reserva `/configuracion` y `/admin` para el ADMIN. `components/layout/Sidebar.tsx:23-34` le da a la SECRETARIA acceso a nómina (`:29`), contabilidad (`:30`) y reportes.
- **Por qué importa:** cualquier secretaria ve los sueldos de todo el personal y la salud de todos los alumnos. Puede ser intencional, pero hay que confirmarlo.
- **Cómo arreglarlo:** definir con el colegio una matriz de roles (por ejemplo, nómina y balance solo para ADMIN) y aplicarla en la DAL de A1.

### M17 · Sin CI, lint roto y cobertura de tests casi nula
- **Dónde:**
  - No existe `.github/workflows`.
  - `npm run lint` falla con 8 errores. Entre ellos: `app/(dashboard)/mensualidades/nuevo/RegistrarPagoForm.tsx:114,117,122`, `app/(dashboard)/ventas/nuevo/VentaForm.tsx:51,56`, `app/(dashboard)/docentes/nomina/nuevo/NominaForm.tsx:49`, `components/ui/input.tsx:4` y `components/ui/textarea.tsx:4`.
  - Next 16 ya no ejecuta el lint durante el build (`node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md:1095`).
  - La cobertura es del 2,64 % de las sentencias de `lib/` y `app/`.
  - La función de solvencia que tiene tests (`lib/solvencia.ts`) **no se usa en producción**: la lógica real está duplicada en `app/(dashboard)/mensualidades/actions.ts:118-165`.
- **Por qué importa:** ninguna de las regresiones de esta revisión la habría detectado una máquina.
- **Cómo arreglarlo:** ver la sección "Tests" y el plan.

---

## Hallazgos — Bajo

| ID | Dónde | Qué pasa | Por qué importa | Cómo arreglarlo |
|---|---|---|---|---|
| B1 | `prisma/migrations/20260623132846_initial/migration.sql:316-350`; `prisma/schema.prisma:244` | Solo hay índices únicos y los de `audit_logs`. Las claves foráneas y fechas que se filtran (`pagos.alumnoId`, `pagos.fechaPago`, `conceptos_pago.pagoId`, `representantes.alumnoId`, `egresos.fecha`) no tienen índice, y `servicios_alumno.alumnoId` no tiene clave foránea | Hoy da igual, pero se notará con varios años de pagos | Agregar `@@index` en las claves foráneas y en las fechas de filtro, y una relación en `ServicioAlumno.alumnoId` |
| B2 | `app/(dashboard)/mensualidades/nuevo/RegistrarPagoForm.tsx:58-60`; `app/(dashboard)/docentes/nomina/nuevo/NominaForm.tsx:41`; `app/(dashboard)/contabilidad/nuevo-egreso/EgresoForm.tsx:35`; `lib/utils.ts:114`; `app/(dashboard)/contabilidad/actions.ts:37-38` | La fecha por defecto sale de `toISOString()`, que está en UTC: después de las 8 p. m. en Caracas propone el día siguiente. El "mes actual" y los rangos dependen de la zona horaria del servidor | Los pagos y el mes vencido quedan corridos cerca de fin de mes | Un solo helper con la zona `America/Caracas` |
| B3 | `app/(dashboard)/mensualidades/actions.ts:279-293`; `app/(dashboard)/ventas/actions.ts:130-144` | El último recibo se busca ordenando `numeroRecibo` como texto. Después de `-9999` el siguiente número se calcula mal y el pago falla tras 3 reintentos | Es improbable en un año, pero el fallo sería silencioso | Usar un contador numérico por año (tabla o secuencia de Postgres) |
| B4 | `app/(dashboard)/contabilidad/nuevo-egreso/EgresoForm.tsx:32,230-234` vs `:61-71` | Se pide "N° Referencia" (obligatorio para Pago Móvil y transferencias) pero nunca se envía, y `Egreso` no tiene esa columna | Se pierde la trazabilidad del pago | Agregar la columna y enviarla, o quitar el campo |
| B5 | `components/pdf/ReporteBalance.tsx:82` | El template literal imprime `{"   "}` tal cual en el PDF | Un documento visible sale con basura | Mover el separador fuera del template |
| B6 | `app/(dashboard)/dashboard/page.tsx:35,39` vs `:69,73` | Las tarjetas no filtran `deletedAt` y la gráfica sí | Hoy no afecta; afectará cuando exista la anulación de A3 | Filtrar en ambos lugares |
| B7 | `app/(dashboard)/ventas/actions.ts:55-79` | Los totales del mes se calculan sobre los últimos 100 registros y después de aplicar el filtro: con `?tipo=VENTA`, "Ingresos manuales" muestra $0 | Da cifras engañosas | Calcular los agregados por fecha, independientes del listado |
| B8 | `app/(auth)/login/page.tsx:35` | `decodeURIComponent` se aplica a un parámetro ya decodificado: `/login?error=%25` produce un error 500. Además permite mostrar cualquier texto en el login | Suplantación de contenido (útil para phishing) y errores | Enviar códigos de error y mapearlos a mensajes fijos |
| B9 | `next.config.ts:5-7`; `next.config.ts` y `proxy.ts` (sin `headers()`) | `allowedOrigins: ["localhost:3000"]` sigue activo en producción. No hay CSP, `frame-ancestors` ni `Referrer-Policy` | Defensa en profundidad; el token de inscripción viaja en la URL | Quitar `allowedOrigins` en producción y agregar `headers()` |
| B10 | `app/(dashboard)/contabilidad/EgresosTable.tsx:11-45` | La exportación CSV no neutraliza celdas que empiezan con `= + - @` | Inyección de fórmulas al abrir en Excel; riesgo bajo porque los datos los carga el personal | Anteponer `'` a esas celdas |
| B11 | `lib/supabase/client.ts`; `lib/utils.ts:58`; `app/(public)/inscripcion/[token]/InscripcionForm.tsx:1,3`; `package.json`; `prisma.config.ts:1` | Hay código muerto (`client.ts`, `mesAnoLabel`, que además usa otro formato de fecha) y un `"use client"` duplicado. Hay 9 dependencias sin uso: `react-hook-form`, `@hookform/resolvers`, `cmdk` y 6 paquetes `@radix-ui/*`. `dotenv` se importa sin estar declarado y el CLI de `prisma` está en `dependencies` | Mantenimiento más difícil y mayor superficie de ataque | Limpiar el código y las dependencias; declarar `dotenv` |
| B12 | `README.md` (instalación, paso 1); `lib/supabase/admin.ts:6` | El README pide `cp .env.example`, pero ese archivo no existe, y no documenta `SUPABASE_SERVICE_ROLE_KEY` | La instalación falla y cuesta rotar claves | Crear `.env.example` sin valores reales y documentar la variable |
| B13 | `proxy.ts:34-36`; `app/(dashboard)/layout.tsx:10`; `lib/audit.ts:14-17`; `app/(dashboard)/mensualidades/actions.ts:50-74` | `getUser()` (una llamada de red) se hace hasta 3 veces por petición, incluidos los prefetch. La vista de mensualidades carga todos los alumnos con todas sus inscripciones y filtra en memoria | Latencia y límites de Supabase Auth | Leer la sesión del cookie en el proxy (chequeo optimista) y filtrar en la consulta |
| B14 | `lib/prisma.ts:6-10` | Si falta `DATABASE_URL`, se conecta en silencio a `localhost:5432/placeholder` | Errores confusos en producción | Fallar al arrancar (fuera del build) |
| B15 | `lib/audit.ts:29-31` | Los fallos de auditoría se ignoran en silencio y no hay pantalla para consultar `audit_logs` | La auditoría no es verificable | Registrar el fallo y agregar una vista simple para el ADMIN |
| B16 | `__tests__/utils.test.ts:50-56` | El test de `calcularEdad` usa la fecha real y falla los 29 de febrero | Test inestable | Congelar la fecha con `vi.setSystemTime` |

---

## Lo que está bien (para no perderlo al refactorizar)
- Todas las consultas pasan por Prisma y van parametrizadas. No hay `$queryRaw` ni SQL concatenado, así que no hay inyección SQL.
- No hay `dangerouslySetInnerHTML` ni `eval`. React escapa la salida y los PDF usan `@react-pdf`, que no interpreta HTML. El riesgo de XSS es bajo.
- `getUser()`, que verifica el token con Supabase, se usa en lugar de `getSession()` (`proxy.ts:33-36`, `lib/auth.ts:10`).
- La service role solo se usa en el servidor; lo verifiqué en el build (no aparece en `.next/static`). `.env*` está en `.gitignore` y no encontré secretos en el historial de git.
- zod valida casi todas las escrituras, las altas compuestas usan transacciones y hay reintento ante colisión de número de recibo.
- El formulario público no devuelve datos existentes y acepta un solo envío por token.

---

## Tests: estado actual y qué probar primero

**Hoy:** 2 archivos con 22 tests, todos en verde, que cubren solo funciones puras de `lib/`. La cobertura es del 2,64 % de sentencias y del 1,81 % de ramas en `lib/` y `app/`. Hay tres problemas:
- `calcularSolvencia` tiene tests pero no se usa en producción (M17).
- `parsePrismaError` se prueba con errores que en producción nunca llegan al cliente (M11).
- El test de edad depende de la fecha real (B16).

**Qué probar primero, en este orden:**
1. **Autorización.** Por cada Server Action y Route Handler: un anónimo es rechazado, la SECRETARIA solo accede a lo permitido y un usuario sin rol es rechazado. Pueden ser tests de integración con la sesión simulada.
2. **`registrarPago`.** Suma de conceptos, meses duplicados, numeración de recibos (también con pagos concurrentes) y tasa aplicada.
3. **Solvencia**, ya unificada en una sola función de `lib/`. Casos: inscripción a mitad de año, descuentos, servicios, producto renombrado y mes de corte del reporte.
4. **Totales** de dashboard, contabilidad y PDF de balance, con egresos en Bs y nómina.
5. **Flujo de solicitudes.** Envío doble, aprobación doble, rechazo después de aprobar y token vencido.
6. **Migraciones.** `prisma migrate diff --exit-code` en CI y una prueba de humo contra una base creada solo con migraciones.
7. **Importación CSV.** Separador `;`, comillas, acentos y ñ, y fechas inválidas.
8. **E2E con Playwright.** Una prueba de humo de login por rol, alta de alumno, cobro y descarga del PDF.

---

## Plan de arreglos sugerido

Esfuerzo: **S** ≈ horas a 1 día · **M** ≈ 2 a 5 días · **L** ≈ 1 a 2 semanas.

**Fase 0 — Bloqueantes antes del piloto**

| # | Qué | Hallazgos | Esfuerzo |
|---|---|---|---|
| 1 | Denegar por defecto a quien no tenga rol, asignar el rol a los usuarios existentes y desactivar el registro público en Supabase | C1 | S |
| 2 | Desactivar la Data API o revocar `anon`/`authenticated`, habilitar RLS en todas las tablas y revisar el Security Advisor | C2 | S |
| 3 | Subir `next` y `eslint-config-next` a 16.3.7 o más, quitar `remotePatterns` y volver a pasar `npm audit` | C3 | S |
| 4 | Crear la migración faltante, `migrate resolve` en producción, separar las bases de desarrollo y producción | A2 | S–M |
| 5 | DAL con `requireUser`/`requireRole` en las 50 acciones y las 6 rutas API, lecturas a módulos `server-only` y matriz de roles | A1, M16 | M |
| 6 | Pagos, ventas y nómina recalculados y validados en el servidor, bloqueo de duplicados, anulación con motivo y auditoría | A3, M8, M10 | L |
| 7 | Guardar el equivalente en USD con la tasa del día y usar una única función de reportes | A4, M9, B6 | M |
| 8 | Aviso y consentimiento; edición, baja y anonimización; limpieza del JSON de solicitudes; retención (después de confirmar el marco legal) | A5 | L |
| 9 | Máquina de estados de las solicitudes y token aleatorio con caducidad | M1, M2 | S |
| 10 | Selector de año en el `DatePicker` | M14 | S |

**Fase 1 — Primeras semanas del piloto**

| # | Qué | Hallazgos | Esfuerzo |
|---|---|---|---|
| 11 | Devolver los errores como resultado en lugar de lanzarlos | M11 | M |
| 12 | Unificar la solvencia en `lib/solvencia.ts` y corregir sus casos: mitad de año, retirados, mes de corte, becas, claves de producto y formato del año | M3–M7 | M |
| 13 | Baja de usuarios, aceptación de invitación y "Olvidé mi contraseña" | M12 | M |
| 14 | Esquemas de validación compartidos | M13 | M |
| 15 | Importación CSV robusta con vista previa | M15 | M |

**Fase 2 — Calidad continua**

| # | Qué | Hallazgos | Esfuerzo |
|---|---|---|---|
| 16 | CI con lint, `tsc`, tests, `prisma migrate diff` y `npm audit`; corregir los 8 errores de lint | M17 | S |
| 17 | Tests prioritarios (sección anterior) | M17 | M–L |
| 18 | Hallazgos de severidad baja | B1–B16 | S cada uno (B2 y B13: M) |

---

## Lo que NO pude revisar y por qué

1. **Configuración real del proyecto Supabase:** registros públicos, confirmación de correo, esquemas expuestos por la Data API, permisos de `anon`/`authenticated`, estado de RLS, backups y región. Decidí **no conectarme** aunque había herramientas disponibles: el encargo era revisar código y esa base contiene datos de menores. Si me autorizas, puedo hacer una verificación de solo lectura (Security Advisor y estado de RLS).
2. **Vercel u otro hosting:** variables de entorno, qué entorno apunta a qué base, Deployment Protection, optimización de imágenes, región y retención de logs. De eso depende si el RCE de C3 aplica.
3. **Estado real de la base de producción frente a las migraciones:** si se aplicó el cambio de `fechaNacimiento` y si se perdieron los datos de `edad` (A2).
4. **Pruebas dinámicas con sesiones reales:** no tengo credenciales. El escalamiento de la SECRETARIA (A1) y la conclusión de que el reenvío de acciones pasa por el proxy salen del análisis del código, del manifiesto del build y del código interno de Next. No los reproduje contra una instancia en ejecución.
5. **Implementación exacta de `cuid()` en Prisma 7:** dos intentos de análisis del runtime minificado no dieron resultado y me detuve, como pediste. En M2 no afirmo cuál es su fuente de aleatoriedad.
6. **Aplicabilidad de los 22 avisos de `npm audit`:** revisé en detalle los 3 de `next` que más afectan a esta app. El resto (herramientas del CLI de Prisma, Vitest, PostCSS) no lo analicé uno por uno.
7. **Cumplimiento legal:** esto no es una revisión legal y falta confirmar la jurisdicción.
8. **Revisión visual en el navegador:** interfaz, accesibilidad, aspecto de los PDF y rendimiento con carga real.
9. **Componentes generados de shadcn/ui** (`components/ui/*`, `hooks/use-toast.ts`): solo los recorrí por encima; es código estándar.

## Preguntas abiertas para ti
1. **Marco legal:** el código apunta a un colegio en Venezuela. ¿El tratamiento o el soporte lo haces tú desde España? Según la respuesta aplica la LOPNNA y la Constitución venezolana y, posiblemente, también el RGPD. Eso define cómo implementar A5.
2. **Rol SECRETARIA:** ¿debe ver nómina, contabilidad y datos de salud (M16)?
3. **Hosting:** ¿producción corre en Vercel? Afecta a C3.
4. **Supabase:** ¿quieres que haga una verificación de solo lectura del proyecto (punto 1 de la sección anterior)?
