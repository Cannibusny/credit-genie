import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { log } from "../../lib/logger.js";

/**
 * Extract text from a credit report PDF using pdfjs-dist.
 * Works with both pdf-lib and pdfkit generated PDFs.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const uint8 = new Uint8Array(buffer);
    const doc = await getDocument({ data: uint8, useSystemFonts: true }).promise;
    const pages: string[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .filter((item) => "str" in item)
        .map((item) => (item as { str: string }).str)
        .join(" ");
      pages.push(text);
    }

    const result = pages.join("\n").trim();
    if (result.length > 0) {
      log.info({ chars: result.length }, "Extracted text via pdfjs-dist");
    } else {
      log.warn("No text extracted from PDF — may be a scanned-image PDF");
    }
    return result;
  } catch (err) {
    log.warn({ err }, "PDF parse failed");
    return "";
  }
}
