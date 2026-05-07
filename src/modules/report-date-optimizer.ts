// MODULE 1: REPORT DATE OPTIMIZER
// Priority: CRITICAL | Expected Score Impact: +15 to +40 points
// Solves: Bureaus snapshot utilization on statement closing date, not payment due date.

import type { CreditProfile, CreditAccount, SnapshotAlert, AdvisoryItem, IfThenLogEntry } from "../types/index.js";
import { addAdvisory, snapshotAlerts } from "../lib/store.js";

interface OptimizationResult {
  alerts: SnapshotAlert[];
  advisories: AdvisoryItem[];
  ifthenEntries: IfThenLogEntry[];
  summary: string;
}

export function runReportDateOptimizer(profile: CreditProfile): OptimizationResult {
  const result: OptimizationResult = { alerts: [], advisories: [], ifthenEntries: [], summary: "" };
  const revolvingAccounts = profile.accounts.filter(a => a.accountType === "revolving" && a.accountStatus === "open");

  if (revolvingAccounts.length === 0) {
    result.summary = "No open revolving accounts found. Report Date Optimizer not applicable.";
    return result;
  }

  const now = new Date();
  let issuesFound = 0;

  for (const account of revolvingAccounts) {
    const balance = account.balance ?? 0;
    const limit = account.creditLimit ?? 0;
    if (limit <= 0) continue;

    const utilization = (balance / limit) * 100;
    const snapshotDay = account.snapshotDate;

    // IF card balance above 30% at snapshot date
    if (utilization > 30) {
      issuesFound++;
      const targetBalance = Math.ceil(limit * 0.09); // under 10%

      const alert: SnapshotAlert = {
        id: `snap-${account.id}-${now.getTime()}`,
        profileId: profile.id,
        accountId: account.id,
        creditorName: account.creditorName,
        snapshotDate: snapshotDay ?? 1,
        currentBalance: balance,
        creditLimit: limit,
        currentUtilization: Math.round(utilization),
        targetBalance,
        targetUtilization: Math.round((targetBalance / limit) * 100),
        alertDate: getAlertDate(snapshotDay ?? 1),
        status: "pending",
        expectedImpact: `+20-50 points within 1 billing cycle`,
      };
      result.alerts.push(alert);

      const advisory: AdvisoryItem = {
        id: `adv-rdo-${account.id}-${now.getTime()}`,
        profileId: profile.id,
        module: "report_date_optimizer",
        priority: utilization > 50 ? "critical" : "high",
        condition: `${account.creditorName} reporting ${Math.round(utilization)}% utilization at statement close`,
        action: `Pay down to $${targetBalance} before statement closing date (day ${snapshotDay ?? "unknown"})`,
        specificDetails: `${account.creditorName} — $${balance} balance on $${limit} limit. Target: $${targetBalance} (under 10%)`,
        expectedImpact: "+20-50 points within 1 billing cycle",
        bureau: account.bureaus[0] ?? "all",
        timeframe: "1 billing cycle",
        status: "active",
        createdAt: now.toISOString(),
      };
      result.advisories.push(advisory);

      result.ifthenEntries.push({
        id: `ifth-rdo-${account.id}-${now.getTime()}`,
        module: "report_date_optimizer",
        triggeredAt: now.toISOString(),
        condition: `Card balance above 30% at snapshot date (${Math.round(utilization)}%)`,
        recommendation: `Pay down to under 10% before statement closes`,
        expectedImpact: "+20-50 points within 1 billing cycle",
        actionTaken: false,
        actionTakenAt: null,
        actualScoreDelta: null,
        dismissed: false,
      });

      // IF user cannot pay down → recommend CLI
      if (balance > limit * 0.5) {
        result.advisories.push({
          id: `adv-rdo-cli-${account.id}-${now.getTime()}`,
          profileId: profile.id,
          module: "report_date_optimizer",
          priority: "medium",
          condition: `${account.creditorName} at ${Math.round(utilization)}% utilization — may not be able to pay to target`,
          action: `Request credit limit increase on ${account.creditorName}`,
          specificDetails: `If limit increase approved from $${limit}, utilization drops automatically without paying. Call the number on back of card.`,
          expectedImpact: "+10-25 points if approved",
          bureau: "all",
          timeframe: "7-10 business days",
          status: "active",
          createdAt: now.toISOString(),
        });
      }
    }

    // IF card always reports $0 → leave 1-5% balance
    if (balance === 0 && limit > 0) {
      const optimalBalance = Math.max(1, Math.ceil(limit * 0.02)); // ~2%
      result.advisories.push({
        id: `adv-rdo-zero-${account.id}-${now.getTime()}`,
        profileId: profile.id,
        module: "report_date_optimizer",
        priority: "low",
        condition: `${account.creditorName} reporting $0 balance every cycle`,
        action: `Leave $${optimalBalance} balance on this card when statement closes`,
        specificDetails: `VantageScore rewards a small reported balance over zero. Leave 1-5% ($${optimalBalance}) before statement date.`,
        expectedImpact: "+3-8 points on VantageScore",
        bureau: "all",
        timeframe: "1-2 billing cycles",
        status: "active",
        createdAt: now.toISOString(),
      });
    }
  }

  // IF multiple cards closing same date → stagger paydowns
  const bySnapshotDate = new Map<number, CreditAccount[]>();
  for (const acct of revolvingAccounts) {
    if (acct.snapshotDate && acct.balance && acct.creditLimit && (acct.balance / acct.creditLimit) > 0.3) {
      const existing = bySnapshotDate.get(acct.snapshotDate) ?? [];
      existing.push(acct);
      bySnapshotDate.set(acct.snapshotDate, existing);
    }
  }
  for (const [day, accounts] of bySnapshotDate) {
    if (accounts.length > 1) {
      // Sort by utilization descending — prioritize highest first
      const sorted = accounts.sort((a, b) => {
        const utilA = (a.balance ?? 0) / (a.creditLimit ?? 1);
        const utilB = (b.balance ?? 0) / (b.creditLimit ?? 1);
        return utilB - utilA;
      });
      result.advisories.push({
        id: `adv-rdo-stagger-${day}-${now.getTime()}`,
        profileId: profile.id,
        module: "report_date_optimizer",
        priority: "high",
        condition: `${accounts.length} cards close on day ${day} — all above 30% utilization`,
        action: `Stagger paydowns: pay ${sorted[0]?.creditorName} first (highest utilization), then ${sorted[1]?.creditorName}`,
        specificDetails: sorted.map(a => `${a.creditorName}: ${Math.round(((a.balance ?? 0) / (a.creditLimit ?? 1)) * 100)}%`).join(", "),
        expectedImpact: "+10-30 points",
        bureau: "all",
        timeframe: "1 billing cycle",
        status: "active",
        createdAt: now.toISOString(),
      });
    }
  }

  // Store alerts
  const existing = snapshotAlerts.get(profile.id) ?? [];
  snapshotAlerts.set(profile.id, [...existing, ...result.alerts]);

  // Store advisories
  for (const adv of result.advisories) {
    addAdvisory(profile.id, adv);
  }

  result.summary = issuesFound > 0
    ? `Found ${issuesFound} card(s) reporting above 30% utilization at statement close. Pay-down alerts generated.`
    : `All revolving accounts reporting under 30% utilization. No immediate action needed.`;

  return result;
}

function getAlertDate(snapshotDay: number): string {
  const now = new Date();
  let alertDate = new Date(now.getFullYear(), now.getMonth(), snapshotDay - 5);
  if (alertDate <= now) {
    alertDate = new Date(now.getFullYear(), now.getMonth() + 1, snapshotDay - 5);
  }
  return alertDate.toISOString();
}
