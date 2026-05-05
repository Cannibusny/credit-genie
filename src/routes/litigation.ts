import { Router } from "express";
import { generateLitigationPackage } from "../engines/litigator/index.js";
import type { Client, Dispute } from "../types/index.js";

export const litigationRouter = Router();

// In-memory (mirrors audit.ts stores — in production, use Supabase)
const packages = new Map<string, ReturnType<typeof generateLitigationPackage>>();

// ─── POST /api/litigation/package — Generate court filing package ────────────

litigationRouter.post("/package", (req, res) => {
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
    state: (body.client?.state as string) || "NY",
    county: (body.client?.county as string) || "New York",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const pkg = generateLitigationPackage(client, body.disputes);
  packages.set(pkg.id, pkg);

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
});

// ─── GET /api/litigation/package/:id — Retrieve package ──────────────────────

litigationRouter.get("/package/:id", (req, res) => {
  const pkg = packages.get(req.params.id!);
  if (!pkg) {
    res.status(404).json({ error: "Litigation package not found" });
    return;
  }
  res.json(pkg);
});

// ─── GET /api/litigation/package/:id/forms/:index — Download a court form ────

litigationRouter.get("/package/:id/forms/:index", (req, res) => {
  const pkg = packages.get(req.params.id!);
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
