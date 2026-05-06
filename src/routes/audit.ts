import { Router } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { extractTextFromPdf, parseReport, runAudit, generateAllDisputeLetters } from "../engines/sniper/index.js";
import { createDispute, markDisputeSent } from "../engines/litigator/index.js";
import { config } from "../lib/config.js";
import { log } from "../lib/logger.js";
import {
  saveAudit,
  getAudit,
  saveDisputes,
  getDisputesByAudit,
  saveLetters,
  getLetters,
} from "../lib/store.js";
import type { Bureau, Client, Dispute } from "../types/index.js";

export const auditRouter = Router();

const VALID_BUREAUS = new Set<string>(["equifax", "experian", "transunion"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.MAX_REPORT_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are accepted"));
  },
});

// ─── POST /api/audit — Upload reports & run cross-bureau audit ───────────────

auditRouter.post(
  "/",
  upload.array("reports", 3),
  async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        res.status(400).json({ error: "Upload at least one credit report PDF." });
        return;
      }

      const bureauOverrides = req.body.bureaus as string | string[] | undefined;
      const overrides = Array.isArray(bureauOverrides)
        ? bureauOverrides
        : bureauOverrides
          ? [bureauOverrides]
          : [];

      const clientId = (req.body.clientId as string) || randomUUID();

      log.info({ fileCount: files.length, clientId }, "Starting audit");

      const reports = await Promise.all(
        files.map(async (file, i) => {
          const text = await extractTextFromPdf(file.buffer);
          const raw = overrides[i] || undefined;
          const override = (raw && VALID_BUREAUS.has(raw) ? raw : undefined) as Bureau | undefined;
          return parseReport(text, override);
        }),
      );

      const result = runAudit(clientId, reports);
      saveAudit(result);

      res.json({
        auditId: result.id,
        totalViolations: result.totalViolations,
        estimatedDamages: result.estimatedDamages,
        summary: result.summary,
        discrepancies: result.discrepancies.map((d) => ({
          id: d.id,
          field: d.field,
          violationType: d.violationType,
          severity: d.severity,
          description: d.description,
          legalBasis: d.legalBasis,
          values: d.values,
        })),
        accountsAnalyzed: result.matchedAccounts.length,
        bureausProcessed: reports.map((r) => r.bureau),
      });
    } catch (err) {
      log.error({ err }, "Audit failed");
      res.status(500).json({ error: "Audit failed. Please check your PDF files." });
    }
  },
);

// ─── GET /api/audit/:id — Get audit result ───────────────────────────────────

auditRouter.get("/:id", (req, res) => {
  const result = getAudit(req.params.id!);
  if (!result) {
    res.status(404).json({ error: "Audit not found" });
    return;
  }
  res.json({
    auditId: result.id,
    totalViolations: result.totalViolations,
    estimatedDamages: result.estimatedDamages,
    summary: result.summary,
    discrepancies: result.discrepancies.map((d) => ({
      id: d.id,
      field: d.field,
      violationType: d.violationType,
      severity: d.severity,
      description: d.description,
      legalBasis: d.legalBasis,
      values: d.values,
    })),
    accountsAnalyzed: result.matchedAccounts.length,
    bureausProcessed: result.reports.map((r) => r.bureau),
  });
});

// ─── POST /api/audit/:id/disputes — Generate dispute letters ────────────────

auditRouter.post("/:id/disputes", (req, res) => {
  try {
    const audit = getAudit(req.params.id!);
    if (!audit) {
      res.status(404).json({ error: "Audit not found" });
      return;
    }

    const client: Client = {
      id: audit.clientId,
      email: (req.body.email as string) || "client@example.com",
      name: (req.body.name as string) || "Client",
      phone: (req.body.phone as string) || null,
      state: (req.body.state as string) || "NY",
      county: (req.body.county as string) || "New York",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const letters = generateAllDisputeLetters(audit.discrepancies, client);
    saveLetters(audit.id, letters);

    const disputeRecords: Dispute[] = [];
    let letterIdx = 0;
    for (const discrepancy of audit.discrepancies) {
      const bureaus = Object.keys(discrepancy.values) as Bureau[];
      for (const bureau of bureaus) {
        const letter = letters[letterIdx];
        letterIdx++;
        const dispute = createDispute(
          client.id,
          audit.id,
          discrepancy,
          bureau,
          letter?.content ?? "",
        );
        disputeRecords.push(markDisputeSent(dispute));
      }
    }

    saveDisputes(audit.id, disputeRecords);

    res.json({
      auditId: audit.id,
      disputesCreated: disputeRecords.length,
      letters: letters.map((l) => ({
        fileName: l.fileName,
        type: l.type,
        generatedAt: l.generatedAt,
      })),
      disputes: disputeRecords.map((d) => ({
        id: d.id,
        bureau: d.bureau,
        status: d.status,
        responseDeadline: d.responseDeadline,
      })),
    });
  } catch (err) {
    log.error({ err }, "Dispute generation failed");
    res.status(500).json({ error: "Dispute generation failed." });
  }
});

// ─── GET /api/audit/:id/disputes — Get disputes for an audit ─────────────────

auditRouter.get("/:id/disputes", (req, res) => {
  const disputeList = getDisputesByAudit(req.params.id!);
  if (disputeList.length === 0) {
    res.status(404).json({ error: "No disputes found for this audit" });
    return;
  }
  res.json({ disputes: disputeList });
});

// ─── GET /api/audit/:id/letters/:index — Download a specific letter ──────────

auditRouter.get("/:id/letters/:index", (req, res) => {
  const letters = getLetters(req.params.id!);
  if (letters.length === 0) {
    res.status(404).json({ error: "No letters found. Generate disputes first." });
    return;
  }

  const idx = parseInt(req.params.index!, 10);
  const letter = letters[idx];

  if (!letter) {
    res.status(404).json({ error: "Letter not found" });
    return;
  }

  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Content-Disposition", `attachment; filename="${letter.fileName.replace(/["\\]/g, "_")}"`);
  res.send(letter.content);
});
