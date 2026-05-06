import pdf from "pdf-parse";
import { log } from "../../lib/logger.js";

/**
 * Extract text from a credit report PDF.
 * Uses native text extraction (for digital PDFs with embedded text).
 * Tesseract OCR fallback is not used because Tesseract.js cannot
 * process PDF buffers directly — it only supports image formats.
 * For scanned PDFs, a PDF-to-image conversion step would be needed first.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const native = await extractNativeText(buffer);
  if (native.length > 0) {
    log.info({ chars: native.length }, "Extracted text via native PDF parser");
  } else {
    log.warn("No text extracted from PDF — scanned-image PDFs require OCR preprocessing");
  }
  return native;
}

async function extractNativeText(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    return data.text.trim();
  } catch (err) {
    log.warn({ err }, "Native PDF parse failed");
    return "";
  }
}
