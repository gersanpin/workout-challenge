export interface GifResult {
  id: string;
  title: string;
  url: string;
  preview: string;
}

/**
 * WhatsApp-style GIF search via Giphy.
 * Set EXPO_PUBLIC_GIPHY_API_KEY — without it we return a tiny built-in set of public GIFs.
 */
export async function searchGifs(query: string): Promise<GifResult[]> {
  const key = process.env.EXPO_PUBLIC_GIPHY_API_KEY;
  const q = query.trim() || 'workout';

  if (!key) {
    return FALLBACK_GIFS.filter(
      (g) =>
        !query.trim() ||
        g.title.toLowerCase().includes(q.toLowerCase()) ||
        q.length < 2,
    );
  }

  const url =
    `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(key)}` +
    `&q=${encodeURIComponent(q)}&limit=24&rating=pg-13`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al buscar GIFs');
  const json = await res.json();
  return (json.data ?? []).map((g: any) => ({
    id: g.id,
    title: g.title || 'gif',
    url: g.images?.downsized_medium?.url || g.images?.original?.url,
    preview: g.images?.fixed_width_small?.url || g.images?.preview_gif?.url,
  }));
}

const FALLBACK_GIFS: GifResult[] = [
  {
    id: '1',
    title: 'fuerte',
    url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
    preview: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
  },
  {
    id: '2',
    title: 'entrenamiento',
    url: 'https://media.giphy.com/media/3o7TKU8RvQuomFfUUU/giphy.gif',
    preview: 'https://media.giphy.com/media/3o7TKU8RvQuomFfUUU/giphy.gif',
  },
  {
    id: '3',
    title: 'celebrar',
    url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif',
    preview: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif',
  },
  {
    id: '4',
    title: 'poder espinaca',
    url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',
    preview: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',
  },
];

export function extractYoutubeUrl(text: string): string | null {
  const m = text.match(
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/,
  );
  if (!m) return null;
  return `https://www.youtube.com/watch?v=${m[1]}`;
}
