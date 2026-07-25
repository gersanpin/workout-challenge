/**
 * PDF text extraction via pdf-parse (Node runtime only).
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParseModule = await import("pdf-parse");
  const pdfParse =
    (pdfParseModule as { default?: (data: Buffer) => Promise<{ text: string }> })
      .default ||
    (pdfParseModule as unknown as (data: Buffer) => Promise<{ text: string }>);
  const result = await pdfParse(buffer);
  return (result.text || "").replace(/\s+\n/g, "\n").trim();
}
