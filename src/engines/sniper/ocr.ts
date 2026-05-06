import pdf from "pdf-parse";
import Tesseract from "tesseract.js";
import { log } from "../../lib/logger.js";

/**
 * Extract text from a credit report PDF.
 * Tries native text extraction first (for digital PDFs),
 * falls back to Tesseract OCR for scanned documents.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const native = await extractNativeText(buffer);
  if (native.length > 200) {
    log.info({ chars: native.length }, "Extracted text via native PDF parser");
    return native;
  }

  log.info("Native text sparse — falling back to Tesseract OCR");
  return extractWithOcr(buffer);
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

async function extractWithOcr(buffer: Buffer): Promise<string> {
  let worker: Tesseract.Worker | null = null;
  try {
    worker = await Tesseract.createWorker("eng");
    const { data } = await worker.recognize(buffer);
    log.info({ chars: data.text.length, confidence: data.confidence }, "OCR complete");
    return data.text.trim();
  } catch (err) {
    log.warn({ err }, "Tesseract OCR failed");
    return "";
  } finally {
    if (worker) await worker.terminate().catch(() => {});
  }
}
