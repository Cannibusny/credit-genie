import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { log } from "../../lib/logger.js";

interface TextItemLike {
  str: string;
  transform: number[];
  hasEOL?: boolean;
}

/**
 * Extract text from a credit report PDF using pdfjs-dist.
 * Preserves line breaks by detecting Y-coordinate changes between text items.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const uint8 = new Uint8Array(buffer);
    const doc = await getDocument({ data: uint8, useSystemFonts: true }).promise;
    try {
      const pages: string[] = [];

      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();

        const items = content.items
          .filter((item) => "str" in item && "transform" in item)
          .map((item) => item as unknown as TextItemLike);

        const lines: string[] = [];
        let currentLine = "";
        let lastY: number | null = null;

        for (const item of items) {
          const y = item.transform[5];
          if (lastY !== null && typeof y === "number" && Math.abs(y - lastY) > 2) {
            lines.push(currentLine);
            currentLine = item.str;
          } else {
            currentLine += (currentLine && item.str ? " " : "") + item.str;
          }
          lastY = typeof y === "number" ? y : lastY;
        }
        if (currentLine) lines.push(currentLine);

        pages.push(lines.join("\n"));
      }

      const result = pages.join("\n").trim();
      if (result.length > 0) {
        log.info({ chars: result.length }, "Extracted text via pdfjs-dist");
      } else {
        log.warn("No text extracted from PDF — may be a scanned-image PDF");
      }
      return result;
    } finally {
      // Release internal page caches, data buffers, and document state.
      // pdfjs-dist accumulates these per-document, so failing to call
      // destroy() here leaks memory across uploads (up to 3 × 25MB per
      // /api/audit request).
      try {
        await doc.destroy();
      } catch (destroyErr) {
        log.warn({ err: destroyErr }, "PDF doc.destroy() failed");
      }
    }
  } catch (err) {
    log.warn({ err }, "PDF parse failed");
    return "";
  }
}
