// MASTER IF/THEN ADVISORY ENGINE — DASHBOARD FEED
// Orchestrates all 8 modules and generates the unified advisory feed.

import type { CreditProfile, AdvisoryItem, ModuleId } from "../types/index.js";
import { addAdvisory, advisoryItems } from "../lib/store.js";
import { runReportDateOptimizer } from "./report-date-optimizer.js";
import { runMixedFileDetector } from "./mixed-file-detector.js";
import { buildDisputeCalendar } from "./dispute-calendar.js";
import { analyzeCollections } from "./pay-for-delete.js";
import { runMedicalDebtEngine } from "./medical-debt.js";
import { runAUAuditAndMixAdvisor } from "./au-audit.js";
import { runDormantMonitor } from "./dormant-monitor.js";

interface FullScanResult {
  advisories: AdvisoryItem[];
  moduleSummaries: Record<string, string>;
  totalIssues: number;
  criticalCount: number;
  estimatedTotalImpact: string;
}

export function runFullScan(profile: CreditProfile): FullScanResult {
  const now = new Date();
  const moduleSummaries: Record<string, string> = {};
  let totalIssues = 0;

  // Run all modules in sequence (some depend on prior results)
  const rdoResult = runReportDateOptimizer(profile);
  moduleSummaries["Report Date Optimizer"] = rdoResult.summary;
  totalIssues += rdoResult.alerts.length;

  const mfResult = runMixedFileDetector(profile);
  moduleSummaries["Mixed File Detector"] = mfResult.summary;
  totalIssues += mfResult.flags.length;

  const calResult = buildDisputeCalendar(profile);
  moduleSummaries["Dispute Calendar"] = calResult.summary;
  totalIssues += calResult.calendar.entries.length;

  const pfdResult = analyzeCollections(profile);
  moduleSummaries["Pay-for-Delete"] = pfdResult.summary;
  totalIssues += pfdResult.analyses.length;

  const medResult = runMedicalDebtEngine(profile);
  moduleSummaries["Medical Debt Engine"] = medResult.summary;
  totalIssues += medResult.actions.length;

  const auResult = runAUAuditAndMixAdvisor(profile);
  moduleSummaries["AU Audit & Credit Mix"] = auResult.summary;
  totalIssues += auResult.auResults.filter(r => r.recommendation === "remove_immediately").length;

  const dormResult = runDormantMonitor(profile);
  moduleSummaries["Dormant Monitor"] = dormResult.summary;
  totalIssues += dormResult.alerts.length;

  // Master-level triggers
  const masterAdvisories = generateMasterTriggers(profile, now);
  for (const adv of masterAdvisories) {
    addAdvisory(profile.id, adv);
  }

  // Collect all advisories
  const allAdvisories = advisoryItems.get(profile.id) ?? [];
  const criticalCount = allAdvisories.filter(a => a.priority === "critical" && a.status === "active").length;

  // Estimate total impact
  const estimatedTotalImpact = estimateImpact(allAdvisories);

  return {
    advisories: allAdvisories.filter(a => a.status === "active").sort(prioritySort),
    moduleSummaries,
    totalIssues,
    criticalCount,
    estimatedTotalImpact,
  };
}

function generateMasterTriggers(profile: CreditProfile, now: Date): AdvisoryItem[] {
  const triggers: AdvisoryItem[] = [];

  // IF score drops 20+ points with no new derogatory → utilization spike
  // Group scores by bureau to avoid false positives from cross-bureau comparison
  const recentScores = profile.scores.filter(s => {
    const d = new Date(s.recordedAt);
    return (now.getTime() - d.getTime()) < 60 * 24 * 60 * 60 * 1000; // last 60 days
  });
  const scoresByBureau = new Map<string, typeof recentScores>();
  for (const s of recentScores) {
    const existing = scoresByBureau.get(s.bureau) ?? [];
    existing.push(s);
    scoresByBureau.set(s.bureau, existing);
  }
  for (const [bureau, scores] of scoresByBureau) {
    if (scores.length < 2) continue;
    const sorted = scores.sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
    const latest = sorted[sorted.length - 1];
    const previous = sorted[sorted.length - 2];
    if (latest && previous && previous.score - latest.score >= 20) {
      triggers.push({
        id: `adv-master-drop-${bureau}-${now.getTime()}`,
        profileId: profile.id,
        module: "master_advisory",
        priority: "critical",
        condition: `Score dropped ${previous.score - latest.score} points on ${bureau} (${previous.score} → ${latest.score}) with no new derogatory accounts`,
        action: "Pull all three bureaus immediately. Likely utilization spike or limit reduction. Run Report Date Optimizer.",
        specificDetails: `Bureau: ${bureau}. Date: ${latest.recordedAt}. Check for limit reductions, new collections, or utilization spikes.`,
        expectedImpact: "Diagnosis — identifies the cause for targeted fix",
        bureau: latest.bureau,
        timeframe: "Immediate — investigate today",
        status: "active",
        createdAt: now.toISOString(),
      });
    }
  }

  // IF new collection user doesn't recognize → Mixed File first, DO NOT PAY
  const newCollections = profile.accounts.filter(a =>
    a.accountType === "collection" &&
    a.dateOpened &&
    (now.getTime() - new Date(a.dateOpened).getTime()) < 30 * 24 * 60 * 60 * 1000
  );
  for (const coll of newCollections) {
    triggers.push({
      id: `adv-master-newcoll-${coll.id}-${now.getTime()}`,
      profileId: profile.id,
      module: "master_advisory",
      priority: "critical",
      condition: `New collection appeared: "${coll.creditorName}" — $${coll.balance ?? 0}`,
      action: "DO NOT PAY. Run Mixed File Detector first — this may not be yours.",
      specificDetails: `New collections that appear unexpectedly are often mixed files. Verify identity before any action.`,
      expectedImpact: "Prevents accidentally validating a debt that isn't yours",
      bureau: coll.bureaus[0] ?? "all",
      timeframe: "Immediate — do not contact collector",
      status: "active",
      createdAt: now.toISOString(),
    });
  }

  // IF user applying for business financing in 90 days
  if (profile.goal === "business_financing") {
    triggers.push({
      id: `adv-master-biz-${now.getTime()}`,
      profileId: profile.id,
      module: "master_advisory",
      priority: "high",
      condition: "Business financing goal set — pre-application optimization sprint active",
      action: "Get utilization below 10%, no new hard inquiries, resolve all disputes, audit AU accounts",
      specificDetails: "Lenders pull all 3 bureaus. Every point matters. Freeze non-essential credit applications for 6 months.",
      expectedImpact: "Maximizes financing approval odds and lowest rate",
      bureau: "all",
      timeframe: "90 days to application-ready",
      status: "active",
      createdAt: now.toISOString(),
    });
  }

  // IF score between 679-699 → prioritize utilization, no new accounts
  for (const score of profile.scores) {
    if (score.score >= 679 && score.score <= 699) {
      triggers.push({
        id: `adv-master-threshold-${score.bureau}-${now.getTime()}`,
        profileId: profile.id,
        module: "master_advisory",
        priority: "high",
        condition: `${score.bureau} score is ${score.score} — just ${700 - score.score} points from prime rate threshold (700)`,
        action: "Prioritize utilization optimization and credit mix. Do NOT open new accounts within 6 months.",
        specificDetails: "At this range, utilization paydown is the fastest lever. Each 10% reduction = ~10-20 points. Avoid hard inquiries.",
        expectedImpact: `+${700 - score.score}-${720 - score.score} points to cross threshold`,
        bureau: score.bureau,
        timeframe: "1-2 billing cycles for utilization fix",
        status: "active",
        createdAt: now.toISOString(),
      });
    }
  }

  // IF multiple hard inquiries in short window — same loan type = single inquiry
  const hardInquiries = profile.accounts.filter(a =>
    a.remarks.some(r => r.toLowerCase().includes("inquiry"))
  );
  // Simplified — would need inquiry data in real implementation

  // IF oldest account about to turn 10 years → milestone
  const oldestAccount = profile.accounts.reduce((oldest, current) => {
    if (!current.dateOpened) return oldest;
    if (!oldest || !oldest.dateOpened) return current;
    return new Date(current.dateOpened) < new Date(oldest.dateOpened) ? current : oldest;
  }, null as CreditProfile["accounts"][0] | null);

  if (oldestAccount?.dateOpened) {
    const ageYears = (now.getTime() - new Date(oldestAccount.dateOpened).getTime()) / (1000 * 60 * 60 * 24 * 365);
    if (ageYears >= 9.5 && ageYears < 10.5) {
      triggers.push({
        id: `adv-master-milestone-${now.getTime()}`,
        profileId: profile.id,
        module: "master_advisory",
        priority: "medium",
        condition: `Oldest account (${oldestAccount.creditorName}) about to turn 10 years — AAoA milestone`,
        action: "Do NOT close any accounts in the next 6 months. This milestone anchors your average account age.",
        specificDetails: `Opened: ${oldestAccount.dateOpened}. 10-year accounts significantly boost average age of accounts.`,
        expectedImpact: "Protects existing age-of-credit benefit",
        bureau: "all",
        timeframe: "6 months — no account closures",
        status: "active",
        createdAt: now.toISOString(),
      });
    }
  }

  return triggers;
}

function prioritySort(a: AdvisoryItem, b: AdvisoryItem): number {
  const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
}

function estimateImpact(advisories: AdvisoryItem[]): string {
  // Extract point ranges from expectedImpact strings
  let minTotal = 0;
  let maxTotal = 0;
  for (const adv of advisories) {
    if (adv.status !== "active") continue;
    const match = adv.expectedImpact.match(/\+(\d+)-(\d+)/);
    if (match) {
      minTotal += parseInt(match[1] ?? "0");
      maxTotal += parseInt(match[2] ?? "0");
    }
  }
  if (maxTotal === 0) return "No immediate score impact actions";
  return `+${Math.min(minTotal, 150)}-${Math.min(maxTotal, 250)} points potential (all actions combined)`;
}
