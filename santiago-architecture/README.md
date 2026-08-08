# Santiago Architecture

Bilingual architecture studio website (English / Español) built with Next.js App Router and `next-intl`.

## Stack

- Next.js 15 (App Router) + TypeScript
- `next-intl` locale routes: `/en`, `/es`
- Project data in TypeScript (`src/data/projects.ts`)
- 3D globe view with React Three Fiber

## Develop

```bash
cd santiago-architecture
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The default locale is English (`/en`).

## Locales

- `/en/...` English (default)
- `/es/...` Español

The `EN / ES` switcher keeps the current path and query string (view mode, filters, selected globe project).

## Content

- UI copy: `messages/en.json`, `messages/es.json`
- Projects: `src/data/projects.ts` — shared technical fields (`slug`, `year`, coords, images) with bilingual text fields (`name`, `location`, `description`, SEO)

## SEO

- Per-page titles, descriptions, Open Graph
- `hreflang` via `alternates.languages` (`en`, `es`, `x-default`)
- `sitemap.xml` and `robots.txt`

Set the public site URL when deploying:

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — start production server
- `npm run lint` — ESLint
