import { Router } from "express";
import { generateLitigationPackage, lookupJurisdiction } from "../engines/litigator/index.js";
import {
  checkDeadlines,
  summarizeDisputes,
  markDisputeResponse,
  escalateToLitigation,
} from "../engines/litigator/index.js";
import { updateDispute, saveLitigationPackage, getLitigationPackage } from "../lib/store.js";
import type { Client, Dispute } from "../types/index.js";

export const litigationRouter = Router();

// ─── POST /api/litigation/package — Generate court filing package ────────────

litigationRouter.post("/package", (req, res) => {
  try {
    const body = req.body as {
      client: Partial<Client>;
      disputes: Dispute[];
    };

    if (!body.disputes || body.disputes.length === 0) {
      res.status(400).json({ error: "Provide at least one dispute to generate a litigation package." });
      return;
    }

    const client: Client = {
      id: (body.client?.id as string) || "unknown",
      email: (body.client?.email as string) || "",
      name: (body.client?.name as string) || "Client",
      phone: (body.client?.phone as string) || null,
      ssn: (body.client?.ssn as string) || null,
      street: (body.client?.street as string) || null,
      city: (body.client?.city as string) || null,
      state: (body.client?.state as string) || "NY",
      county: (body.client?.county as string) || "New York",
      zip: (body.client?.zip as string) || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const pkg = generateLitigationPackage(client, body.disputes);
    saveLitigationPackage(pkg);

    res.json({
      packageId: pkg.id,
      jurisdiction: pkg.jurisdiction,
      estimatedDamages: pkg.estimatedDamages,
      courtFormsCount: pkg.courtForms.length,
      courtForms: pkg.courtForms.map((f) => ({
        type: f.type,
        fileName: f.fileName,
        generatedAt: f.generatedAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: "Litigation package generation failed." });
  }
});

// ─── GET /api/litigation/package/:id — Retrieve package ──────────────────────

litigationRouter.get("/package/:id", (req, res) => {
  const pkg = getLitigationPackage(req.params.id!);
  if (!pkg) {
    res.status(404).json({ error: "Litigation package not found" });
    return;
  }
  res.json({
    packageId: pkg.id,
    jurisdiction: pkg.jurisdiction,
    estimatedDamages: pkg.estimatedDamages,
    courtFormsCount: pkg.courtForms.length,
    courtForms: pkg.courtForms.map((f) => ({
      type: f.type,
      fileName: f.fileName,
      generatedAt: f.generatedAt,
    })),
    createdAt: pkg.createdAt,
  });
});

// ─── GET /api/litigation/package/:id/forms/:index — Download a court form ────

litigationRouter.get("/package/:id/forms/:index", (req, res) => {
  const pkg = getLitigationPackage(req.params.id!);
  if (!pkg) {
    res.status(404).json({ error: "Package not found" });
    return;
  }

  const idx = parseInt(req.params.index!, 10);
  const form = pkg.courtForms[idx];
  if (!form) {
    res.status(404).json({ error: "Court form not found" });
    return;
  }

  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Content-Disposition", `attachment; filename="${form.fileName.replace(/["\\]/g, "_")}"`);
  res.send(form.content);
});

// ─── POST /api/litigation/jurisdiction — Look up jurisdiction info ────────────

litigationRouter.post("/jurisdiction", (req, res) => {
  const { state, county } = req.body as { state?: string; county?: string };
  if (!state || !county) {
    res.status(400).json({ error: "state and county are required." });
    return;
  }
  const info = lookupJurisdiction(state, county);
  res.json(info);
});

// ─── POST /api/litigation/deadlines — Check dispute deadlines ────────────────

litigationRouter.post("/deadlines", (req, res) => {
  try {
    const { disputes } = req.body as { disputes: Dispute[] };
    if (!disputes || disputes.length === 0) {
      res.status(400).json({ error: "Provide disputes to check deadlines." });
      return;
    }
    const alerts = checkDeadlines(disputes);
    const summary = summarizeDisputes(disputes);
    res.json({ alerts, summary });
  } catch (err) {
    res.status(500).json({ error: "Deadline check failed." });
  }
});

// ─── POST /api/litigation/respond — Record bureau response ───────────────────

litigationRouter.post("/respond", (req, res) => {
  try {
    const body = req.body as {
      dispute: Dispute;
      responseStatus: "verified" | "deleted" | "updated";
      responseContent: string;
    };

    if (!body.dispute || !body.responseStatus) {
      res.status(400).json({ error: "dispute and responseStatus are required." });
      return;
    }

    const updated = markDisputeResponse(body.dispute, body.responseStatus, body.responseContent || "");

    const shouldEscalate = body.responseStatus === "verified";
    const escalated = shouldEscalate ? escalateToLitigation(updated) : updated;

    // Persist updated dispute back to the shared server-side store
    updateDispute(escalated.id, () => escalated);

    res.json({
      dispute: {
        id: escalated.id,
        status: escalated.status,
        responseReceivedAt: escalated.responseReceivedAt,
        responseContent: escalated.responseContent,
      },
      escalated: shouldEscalate,
      message: shouldEscalate
        ? "Bureau verified but did not correct. Auto-escalated to litigation."
        : `Bureau responded: ${body.responseStatus}. Dispute resolved.`,
    });
  } catch (err) {
    res.status(500).json({ error: "Response recording failed." });
  }
});
