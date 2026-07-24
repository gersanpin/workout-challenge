# Arquitecta

SaaS web para arquitectos: crea, rediseña y publica tu **CV + portafolio** con plantillas y ayuda de IA. Descarga PDF o comparte un link público.

Preview = abrir el navegador en el servidor local o en la URL de deploy. **No** hay app nativa, Expo Go ni códigos QR.

## Stack (versiones fijadas)

- Next.js `15.1.12` (App Router) + React `19.0.0` + TypeScript `5.7.3`
- Tailwind CSS `3.4.17`
- Supabase (`@supabase/supabase-js` `2.49.1`, `@supabase/ssr` `0.5.2`)
- OpenAI SDK `4.82.0` (servidor)
- `@react-pdf/renderer` `4.2.0`

No actualices majors de estas dependencias a menos que se pida explícitamente. Ver [AGENTS.md](./AGENTS.md).

## Setup

### 1. Dependencias

```bash
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Completa en `.env.local`:

| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (opcional; no se usa en el MVP de cliente) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` en local |
| `OPENAI_API_KEY` | Clave OpenAI para IA real |
| `OPENAI_MODEL` | Por defecto `gpt-4o-mini` |

Sin `OPENAI_API_KEY`, la app sigue funcionando con un **fallback heurístico** de redacción (útil para probar el flujo).

### 3. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En el SQL Editor, ejecuta [`supabase/schema.sql`](./supabase/schema.sql).
3. En Storage, crea el bucket **`portfolio-assets`** (público) o ejecuta también [`supabase/storage.sql`](./supabase/storage.sql).
4. Auth → Email: habilita email/password (puedes desactivar “Confirm email” en desarrollo).

### 4. Arrancar

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador (escritorio o móvil en la misma red con la IP de tu máquina).

## Flujo de producto

1. Registro / login  
2. **Nuevo portafolio**: notas + imágenes/PDF → plantilla → borrador IA  
3. Editor: textos, proyectos, “Mejorar con IA”, plantillas  
4. **Descargar PDF** y/o **Publicar link** `/p/[slug]`

## Planes (sin Stripe todavía)

Límites en `lib/plans.ts` + tabla `plans` / `profiles.plan_id`:

| Plan | Portfolios | Publicados | IA / mes | PDF / mes |
| --- | --- | --- | --- | --- |
| free | 1 | 1 | 20 | 5 |
| pro | 10 | 10 | 200 | 50 |

Para Pro en pruebas: `update profiles set plan_id = 'pro' where id = '...'`.

## Scripts

- `npm run dev` — desarrollo
- `npm run build` / `npm start` — producción
- `npm run typecheck` — TypeScript

## Deploy

Compatible con Vercel: conecta el repo, define las env vars y despliega. Preview = URL de Vercel en el navegador.
