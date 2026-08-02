/**
 * PDF text extraction via pdf-parse (Node runtime only).
 * Returns full multipage text when available.
 */
export async function extractPdfText(
  buffer: Buffer,
): Promise<{ text: string; numpages: number }> {
  const pdfParseModule = await import("pdf-parse");
  const pdfParse =
    (pdfParseModule as {
      default?: (
        data: Buffer,
      ) => Promise<{ text: string; numpages?: number }>;
    }).default ||
    (pdfParseModule as unknown as (
      data: Buffer,
    ) => Promise<{ text: string; numpages?: number }>);
  const result = await pdfParse(buffer);
  const numpages = result.numpages || 1;
  const body = (result.text || "").replace(/\s+\n/g, "\n").trim();
  const text = body
    ? `[PDF: ${numpages} página${numpages === 1 ? "" : "s"}]\n${body}`
    : "";
  return { text, numpages };
}
