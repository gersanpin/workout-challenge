/**
 * Best-effort text extraction from uploaded files (PDF / plain text).
 * Images are skipped here; their URLs are attached to projects separately.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const type = file.type || "";
  const name = file.name.toLowerCase();

  if (
    type.startsWith("text/") ||
    name.endsWith(".txt") ||
    name.endsWith(".md")
  ) {
    return (await file.text()).trim();
  }

  if (type === "application/pdf" || name.endsWith(".pdf")) {
    try {
      const { extractPdfText } = await import("@/lib/pdfText");
      const buffer = Buffer.from(await file.arrayBuffer());
      const { text } = await extractPdfText(buffer);
      return text;
    } catch {
      return `[PDF adjunto: ${file.name} — no se pudo extraer texto automáticamente; usa las notas del usuario si las hay.]`;
    }
  }

  return "";
}

export async function extractTextFromFiles(files: File[]): Promise<string> {
  const chunks: string[] = [];
  for (const file of files) {
    const text = await extractTextFromFile(file);
    if (text) {
      chunks.push(`--- Archivo: ${file.name} ---\n${text}`);
    }
  }
  return chunks.join("\n\n").slice(0, 40000);
}
