export interface GifResult {
  id: string;
  title: string;
  url: string;
  preview: string;
}

/**
 * WhatsApp-style GIF search via Giphy.
 * Set EXPO_PUBLIC_GIPHY_API_KEY — without it we return a built-in set of public GIFs.
 */
export async function searchGifs(query: string): Promise<GifResult[]> {
  const key = process.env.EXPO_PUBLIC_GIPHY_API_KEY;
  const q = query.trim() || 'workout gym';

  if (!key) {
    const needle = q.toLowerCase();
    return FALLBACK_GIFS.filter(
      (g) =>
        !query.trim() ||
        g.title.toLowerCase().includes(needle) ||
        needle.split(/\s+/).some((w) => g.title.toLowerCase().includes(w)) ||
        needle.length < 2,
    );
  }

  const url =
    `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(key)}` +
    `&q=${encodeURIComponent(q)}&limit=24&rating=pg-13&lang=es`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al buscar GIFs');
  const json = await res.json();
  return (json.data ?? [])
    .map((g: any) => {
      const images = g.images ?? {};
      const url =
        images.fixed_height?.url ||
        images.downsized?.url ||
        images.downsized_medium?.url ||
        images.original?.url;
      const preview =
        images.fixed_width_small?.url ||
        images.preview_gif?.url ||
        images.fixed_height_small?.url ||
        url;
      if (!url) return null;
      return {
        id: String(g.id),
        title: g.title || 'gif',
        url,
        preview,
      } as GifResult;
    })
    .filter(Boolean);
}

/** Stable public Giphy CDN URLs (work without API key). */
const FALLBACK_GIFS: GifResult[] = [
  {
    id: 'strong',
    title: 'fuerte gym',
    url: 'https://media.giphy.com/media/3o7TKMCm0L85VfGR4Y/giphy.gif',
    preview: 'https://media.giphy.com/media/3o7TKMCm0L85VfGR4Y/200w.gif',
  },
  {
    id: 'workout',
    title: 'entrenamiento workout',
    url: 'https://media.giphy.com/media/l2SpUoAPo0CBORf5e/giphy.gif',
    preview: 'https://media.giphy.com/media/l2SpUoAPo0CBORf5e/200w.gif',
  },
  {
    id: 'celebrate',
    title: 'celebrar victory',
    url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif',
    preview: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/200w.gif',
  },
  {
    id: 'popeye',
    title: 'poder espinaca popeye',
    url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',
    preview: 'https://media.giphy.com/media/5GoVLqeAOo6PK/200w.gif',
  },
  {
    id: 'run',
    title: 'correr running',
    url: 'https://media.giphy.com/media/3orieYsP2cTCPtYc5i/giphy.gif',
    preview: 'https://media.giphy.com/media/3orieYsP2cTCPtYc5i/200w.gif',
  },
  {
    id: 'flex',
    title: 'flex muscles',
    url: 'https://media.giphy.com/media/26BRv0ThiiUW37GVi/giphy.gif',
    preview: 'https://media.giphy.com/media/26BRv0ThiiUW37GVi/200w.gif',
  },
];

export function extractYoutubeUrl(text: string): string | null {
  const m = text.match(
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/,
  );
  if (!m) return null;
  return `https://www.youtube.com/watch?v=${m[1]}`;
}
