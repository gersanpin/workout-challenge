export type JobFetchResult =
  | { ok: true; text: string; source: "fetch" }
  | {
      ok: false;
      reason: "blocked" | "empty" | "invalid" | "network";
      message: string;
    };

const BLOCKED_HOSTS = ["linkedin.com", "www.linkedin.com"];

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchJobPosting(url: string): Promise<JobFetchResult> {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return {
        ok: false,
        reason: "invalid",
        message: "La URL debe empezar por http:// o https://",
      };
    }
  } catch {
    return {
      ok: false,
      reason: "invalid",
      message: "URL no válida. Revisa el enlace de la vacante.",
    };
  }

  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
    return {
      ok: false,
      reason: "blocked",
      message:
        "LinkedIn suele bloquear la lectura automática. Pega abajo el texto de la vacante (descripción del puesto).",
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ArquitectaBot/1.0; +https://localhost)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    clearTimeout(timer);

    if (res.status === 401 || res.status === 403 || res.status === 999) {
      return {
        ok: false,
        reason: "blocked",
        message:
          "El sitio bloqueó la lectura automática (común en portales de empleo). Pega el texto de la vacante manualmente.",
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        reason: "network",
        message: `No se pudo leer la vacante (HTTP ${res.status}). Pega el texto manualmente.`,
      };
    }

    const html = await res.text();
    const text = stripHtml(html).slice(0, 12000);
    if (text.length < 80) {
      return {
        ok: false,
        reason: "empty",
        message:
          "No se pudo extraer texto útil de ese enlace. Pega la descripción de la vacante manualmente.",
      };
    }

    return { ok: true, text, source: "fetch" };
  } catch {
    return {
      ok: false,
      reason: "network",
      message:
        "No se pudo acceder al enlace (red, timeout o bloqueo). Pega el texto de la vacante manualmente.",
    };
  }
}
