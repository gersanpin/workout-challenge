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
   Si ya tenías el schema anterior, ejecuta también [`supabase/migration_doc_types.sql`](./supabase/migration_doc_types.sql).
3. En Storage, crea el bucket **`portfolio-assets`** (público) o ejecuta también [`supabase/storage.sql`](./supabase/storage.sql).
4. Auth → Email: habilita email/password (puedes desactivar “Confirm email” en desarrollo).

### 4. Arrancar

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador (escritorio o móvil en la misma red con la IP de tu máquina).

## Flujo de producto

1. Registro / login  
2. Elige en el dashboard:
   - **Nuevo portafolio** — desde notas/imágenes  
   - **Rediseñar portafolio** — sube PDF/archivos existentes  
   - **Crear / mejorar CV** — texto o CV PDF (separado del portafolio)  
3. Opcional: indica **empresa/puesto** para personalizar la IA  
4. Plantilla → borrador IA → editor  
5. **Descargar PDF** y/o **Publicar link** `/p/[slug]`

## Planes / límites

**Por ahora todo es ilimitado y gratis** (sin cortes de IA, PDF ni número de documentos). La tabla `plans` / `usage_events` queda para cuando decidamos cobro.

Subida de archivos: máx. 24 archivos, 15 MB c/u (PDF multipágina, imágenes o texto). Tipos/tamaños inválidos se rechazan antes de llamar a la IA.

CV: plantilla **ATS-safe**, link/texto de vacante, revisión por secciones (aceptar/revertir/regenerar).  
Portafolio: rediseño multipágina + edición asistida en lenguaje natural.  
La IA tiene regla estricta de **no inventar** experiencia ni proyectos.

## Scripts

- `npm run dev` — desarrollo
- `npm run build` / `npm start` — producción
- `npm run typecheck` — TypeScript

## Deploy

Compatible con Vercel: conecta el repo, define las env vars y despliega. Preview = URL de Vercel en el navegador.
