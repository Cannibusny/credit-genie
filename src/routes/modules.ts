// Module API routes — runs the 8 modules against a profile (auth-gated, user-scoped)
import { Router } from "express";
import { getProfileForUser, advisoryItems } from "../lib/store.js";
import { runFullScan } from "../modules/master-advisory.js";
import { runReportDateOptimizer } from "../modules/report-date-optimizer.js";
import { runMixedFileDetector } from "../modules/mixed-file-detector.js";
import { buildDisputeCalendar } from "../modules/dispute-calendar.js";
import { generateMoVDemand, generateEscalationPackage } from "../modules/mov-escalation.js";
import { analyzeCollections } from "../modules/pay-for-delete.js";
import { runMedicalDebtEngine } from "../modules/medical-debt.js";
import { runAUAuditAndMixAdvisor } from "../modules/au-audit.js";
import { runDormantMonitor } from "../modules/dormant-monitor.js";
import { requireAuth } from "../middleware/auth.js";

export const modulesRouter = Router();

// All module routes require authentication
modulesRouter.use(requireAuth as any);

// Run FULL scan — all 8 modules (The Scan — onboarding screen 4)
modulesRouter.post("/:profileId/scan", (req, res) => {
  const profile = getProfileForUser(req.params.profileId ?? "", req.userId!);
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const result = runFullScan(profile);
  res.json(result);
});

// Get advisory feed (dashboard)
modulesRouter.get("/:profileId/advisories", (req, res) => {
  const profile = getProfileForUser(req.params.profileId ?? "", req.userId!);
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const items = advisoryItems.get(req.params.profileId ?? "") ?? [];
  const active = items.filter(a => a.status === "active");
  const sorted = active.sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
  });
  res.json(sorted);
});

// Dismiss an advisory
modulesRouter.patch("/:profileId/advisories/:advisoryId/dismiss", (req, res) => {
  const profile = getProfileForUser(req.params.profileId ?? "", req.userId!);
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const items = advisoryItems.get(req.params.profileId ?? "") ?? [];
  const item = items.find(a => a.id === req.params.advisoryId);
  if (!item) return res.status(404).json({ error: "Advisory not found" });
  item.status = "dismissed";
  res.json(item);
});

// Mark advisory as acted on
modulesRouter.patch("/:profileId/advisories/:advisoryId/act", (req, res) => {
  const profile = getProfileForUser(req.params.profileId ?? "", req.userId!);
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const items = advisoryItems.get(req.params.profileId ?? "") ?? [];
  const item = items.find(a => a.id === req.params.advisoryId);
  if (!item) return res.status(404).json({ error: "Advisory not found" });
  item.status = "acted";
  res.json(item);
});

// ─── Individual Module Endpoints ────────────────────────────────────────────

// Module 1: Report Date Optimizer
modulesRouter.post("/:profileId/report-date-optimizer", (req, res) => {
  const profile = getProfileForUser(req.params.profileId ?? "", req.userId!);
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const result = runReportDateOptimizer(profile);
  res.json(result);
});

// Module 2: Mixed File Detector
modulesRouter.post("/:profileId/mixed-file-detector", (req, res) => {
  const profile = getProfileForUser(req.params.profileId ?? "", req.userId!);
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const result = runMixedFileDetector(profile);
  res.json(result);
});

// Module 3: Dispute Calendar
modulesRouter.post("/:profileId/dispute-calendar", (req, res) => {
  const profile = getProfileForUser(req.params.profileId ?? "", req.userId!);
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const result = buildDisputeCalendar(profile);
  res.json(result);
});

// Module 4: MoV & Escalation
modulesRouter.post("/:profileId/mov-demand", (req, res) => {
  const profile = getProfileForUser(req.params.profileId ?? "", req.userId!);
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const { disputeId, bureau, accountId } = req.body;
  if (!disputeId || !bureau || !accountId) {
    return res.status(400).json({ error: "disputeId, bureau, and accountId required" });
  }
  const result = generateMoVDemand(profile, disputeId, bureau, accountId);
  res.json(result);
});

modulesRouter.post("/:profileId/escalation", (req, res) => {
  const profile = getProfileForUser(req.params.profileId ?? "", req.userId!);
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const { disputeId, bureau, accountId } = req.body;
  if (!disputeId || !bureau || !accountId) {
    return res.status(400).json({ error: "disputeId, bureau, and accountId required" });
  }
  const result = generateEscalationPackage(profile, disputeId, bureau, accountId);
  res.json(result);
});

// Module 5: Pay-for-Delete
modulesRouter.post("/:profileId/collections", (req, res) => {
  const profile = getProfileForUser(req.params.profileId ?? "", req.userId!);
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const result = analyzeCollections(profile);
  res.json(result);
});

// Module 6: AU Audit & Credit Mix
modulesRouter.post("/:profileId/au-audit", (req, res) => {
  const profile = getProfileForUser(req.params.profileId ?? "", req.userId!);
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const result = runAUAuditAndMixAdvisor(profile);
  res.json(result);
});

// Module 7: Dormant Monitor
modulesRouter.post("/:profileId/dormant-monitor", (req, res) => {
  const profile = getProfileForUser(req.params.profileId ?? "", req.userId!);
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const result = runDormantMonitor(profile);
  res.json(result);
});

// Module 8: Medical Debt Engine
modulesRouter.post("/:profileId/medical-debt", (req, res) => {
  const profile = getProfileForUser(req.params.profileId ?? "", req.userId!);
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const result = runMedicalDebtEngine(profile);
  res.json(result);
});
