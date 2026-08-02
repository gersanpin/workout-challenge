# Agent instructions — Arquitecta

## Product

Web SaaS (Next.js) for architects to create CV + portfolio. **Not** a native/Expo app.

## Dependency stability (required)

- Pin exact versions in `package.json` (no `latest`, avoid loose `^` ranges on core deps).
- **Do not** upgrade Next.js, React, Supabase, Tailwind, or other majors unless the user explicitly asks.
- Preview = open a browser to `npm run dev` (`localhost:3000`) or a deploy URL. No Expo Go, QR codes, or mobile client apps.

## Stack pin

- `next`: `15.1.12`
- `react` / `react-dom`: `19.0.0`
- Supabase via `@supabase/supabase-js` + `@supabase/ssr`
- PDF: `@react-pdf/renderer`
- AI: OpenAI API (server-side only)

Docs: use Next.js 15 App Router patterns. Keep `react-dom` as a direct dependency for web.
