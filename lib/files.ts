/** Shared upload validation (client + server). */

export const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB (multipage PDFs)
export const MAX_FILES = 24; // portfolios often need many project images

const ALLOWED_EXT = new Set([
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".txt",
  ".md",
]);

const ALLOWED_MIME_PREFIXES = ["image/"];
const ALLOWED_MIME_EXACT = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
]);

export function fileExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

export function isAllowedFile(file: { name: string; type: string }): boolean {
  const ext = fileExtension(file.name);
  if (ALLOWED_EXT.has(ext)) return true;
  if (ALLOWED_MIME_EXACT.has(file.type)) return true;
  if (ALLOWED_MIME_PREFIXES.some((p) => file.type.startsWith(p))) return true;
  return false;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateUploadFiles(files: File[]): string | null {
  if (files.length > MAX_FILES) {
    return `Máximo ${MAX_FILES} archivos por subida.`;
  }
  for (const file of files) {
    if (!isAllowedFile(file)) {
      return `Tipo no permitido: ${file.name}. Usa PDF, imágenes (PNG/JPG/WebP/GIF) o texto (.txt/.md).`;
    }
    if (file.size <= 0) {
      return `El archivo "${file.name}" está vacío o corrupto.`;
    }
    if (file.size > MAX_FILE_BYTES) {
      return `"${file.name}" pesa ${formatBytes(file.size)}. El máximo es ${formatBytes(MAX_FILE_BYTES)} por archivo.`;
    }
  }
  return null;
}
