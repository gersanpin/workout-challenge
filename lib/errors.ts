/** Map provider / runtime errors to clear Spanish messages for the UI. */

export function mapAiError(err: unknown): string {
  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";
  const lower = message.toLowerCase();
  const status =
    err && typeof err === "object" && "status" in err
      ? Number((err as { status?: number }).status)
      : undefined;

  if (
    status === 401 ||
    lower.includes("incorrect api key") ||
    lower.includes("invalid api key") ||
    lower.includes("authentication")
  ) {
    return "La clave de OpenAI no es válida. Revisa OPENAI_API_KEY en .env.local.";
  }
  if (status === 429 || lower.includes("rate limit")) {
    return "Se alcanzó el límite de peticiones de OpenAI. Espera un momento e intenta de nuevo.";
  }
  if (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("etimedout") ||
    lower.includes("deadline")
  ) {
    return "La IA tardó demasiado en responder. Prueba con menos texto o un PDF más corto.";
  }
  if (
    lower.includes("enotfound") ||
    lower.includes("fetch failed") ||
    lower.includes("network") ||
    lower.includes("econnrefused")
  ) {
    return "No hay conexión con el servicio de IA. Comprueba tu red e inténtalo de nuevo.";
  }
  if (lower.includes("pdf") && (lower.includes("corrupt") || lower.includes("invalid"))) {
    return "El PDF parece corrupto o no se pudo leer. Sube otro archivo o pega el texto manualmente.";
  }
  if (message.trim()) {
    // Avoid leaking huge stack traces / raw JSON to the user
    const short = message.replace(/\s+/g, " ").trim().slice(0, 180);
    return `No se pudo generar con IA: ${short}`;
  }
  return "No se pudo generar el borrador con IA. Intenta de nuevo.";
}

export async function readJsonSafe<T = Record<string, unknown>>(
  res: Response,
): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      res.ok
        ? "Respuesta inválida del servidor."
        : `Error del servidor (${res.status}). Intenta de nuevo.`,
    );
  }
}
