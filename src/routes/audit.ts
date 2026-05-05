import { Router } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { extractTextFromPdf, parseReport, runAudit, generateAllDisputeLetters } from "../engines/sniper/index.js";
import { createDispute, markDisputeSent } from "../engines/litigator/index.js";
import { log } from "../lib/logger.js";
import type { Bureau, Client, Dispute, AuditResult } from "../types/index.js";

export const auditRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are accepted"));
  },
});

// In-memory stores (swap for Supabase in production)
const audits = new Map<string, AuditResult>();
const disputes = new Map<string, Dispute[]>();

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
          const override = overrides[i] as Bureau | undefined;
          return parseReport(text, override);
        }),
      );

      const result = runAudit(clientId, reports);
      audits.set(result.id, result);

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
  const result = audits.get(req.params.id!);
  if (!result) {
    res.status(404).json({ error: "Audit not found" });
    return;
  }
  res.json(result);
});

// ─── POST /api/audit/:id/disputes — Generate dispute letters ────────────────

auditRouter.post("/:id/disputes", (req, res) => {
  const audit = audits.get(req.params.id!);
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

  const disputeRecords: Dispute[] = [];
  for (const discrepancy of audit.discrepancies) {
    const bureaus = Object.keys(discrepancy.values) as Bureau[];
    for (const bureau of bureaus) {
      const letter = letters.find((l) => l.fileName.includes(bureau));
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

  disputes.set(audit.id, disputeRecords);

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
});

// ─── GET /api/audit/:id/disputes — Get disputes for an audit ─────────────────

auditRouter.get("/:id/disputes", (req, res) => {
  const disputeList = disputes.get(req.params.id!);
  if (!disputeList) {
    res.status(404).json({ error: "No disputes found for this audit" });
    return;
  }
  res.json({ disputes: disputeList });
});

// ─── GET /api/audit/:id/letters/:index — Download a specific letter ──────────

auditRouter.get("/:id/letters/:index", (req, res) => {
  const audit = audits.get(req.params.id!);
  if (!audit) {
    res.status(404).json({ error: "Audit not found" });
    return;
  }

  const client: Client = {
    id: audit.clientId,
    email: "",
    name: "Client",
    phone: null,
    state: "NY",
    county: "New York",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const letters = generateAllDisputeLetters(audit.discrepancies, client);
  const idx = parseInt(req.params.index!, 10);
  const letter = letters[idx];

  if (!letter) {
    res.status(404).json({ error: "Letter not found" });
    return;
  }

  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Content-Disposition", `attachment; filename="${letter.fileName}"`);
  res.send(letter.content);
});
