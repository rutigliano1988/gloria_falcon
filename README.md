# Gloria Falcón — Sistema de Gestión Escolar

Sistema administrativo para el Colegio Gloria Falcón. Gestiona alumnos, inscripciones, mensualidades, docentes, nómina y contabilidad.

## Stack

- **Next.js 16** (App Router, Server Actions)
- **React 19** + TypeScript 5
- **Prisma 7** + PostgreSQL (via Supabase)
- **Supabase Auth**
- **TailwindCSS 4** + Radix UI

---

## Requisitos

- Node.js 20+
- npm 10+
- Cuenta en [Supabase](https://supabase.com)

---

## Instalación local

### 1. Clonar y configurar variables de entorno

```bash
git clone https://github.com/rutigliano1988/gloria_falcon
cd gloria_falcon
cp .env.example .env.local
```

Edita `.env.local` con tus credenciales de Supabase (ver `.env.example` para instrucciones).

### 2. Instalar dependencias

```bash
npm install
```

### 3. Generar el cliente de Prisma y aplicar migraciones

```bash
npx prisma generate
npx prisma migrate deploy
```

> Para desarrollo: usa `npx prisma migrate dev` en lugar de `deploy`.

### 4. Correr en desarrollo

```bash
npm run dev
```

La app estará en [http://localhost:3000](http://localhost:3000).

---

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm test` | Tests unitarios (Vitest) |
| `npm run test:watch` | Tests en modo watch |
| `npm run lint` | ESLint |

---

## Variables de entorno

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anon de Supabase |
| `DATABASE_URL` | Cadena de conexión PostgreSQL (con pooler, para runtime) |
| `DIRECT_URL` | Conexión directa a PostgreSQL (para migraciones Prisma) |

---

## Deploy en Vercel

1. Conecta el repositorio en [vercel.com](https://vercel.com)
2. Configura las variables de entorno en el panel de Vercel
3. El build ejecuta automáticamente `prisma generate && next build`

---

## Estructura del proyecto

```
app/
├── (auth)/login/          # Autenticación
└── (dashboard)/
    ├── alumnos/           # Gestión de alumnos
    ├── mensualidades/     # Pagos y solvencia
    ├── docentes/          # Docentes y nómina
    ├── contabilidad/      # Egresos y balance
    ├── ventas/            # Ventas e ingresos
    ├── reportes/          # Reportes PDF
    └── configuracion/     # Configuración del colegio
lib/
├── prisma.ts              # Cliente Prisma
├── solvencia.ts           # Lógica de solvencia (pura, testeable)
└── utils.ts               # Utilidades y formatters
prisma/
└── schema.prisma          # Esquema de la base de datos
__tests__/                 # Tests unitarios
```

---

## Nota sobre migraciones de base de datos

Si actualizaste el schema de Prisma, generá la migración antes de hacer deploy:

```bash
npx prisma migrate dev --name descripcion_del_cambio
```
