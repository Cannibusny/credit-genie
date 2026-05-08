// MODULE 7: DORMANT ACCOUNT MONITOR & INACTIVITY SHIELD
// Priority: HIGH | Expected Score Impact: +10 to +25 points
// Prevents: Limit reductions and account closures from card inactivity

import type { CreditProfile, CreditAccount, DormantAlert, LimitReductionEvent, AdvisoryItem } from "../types/index.js";
import { addAdvisory, dormantAlerts } from "../lib/store.js";

interface DormantResult {
  alerts: DormantAlert[];
  advisories: AdvisoryItem[];
  summary: string;
}

export function runDormantMonitor(profile: CreditProfile): DormantResult {
  const now = new Date();
  const result: DormantResult = { alerts: [], advisories: [], summary: "" };

  // Only check open revolving accounts
  const revolvingAccounts = profile.accounts.filter(
    a => a.accountType === "revolving" && a.accountStatus === "open" && !a.isAuthorizedUser
  );

  if (revolvingAccounts.length === 0) {
    result.summary = "No open revolving accounts to monitor.";
    return result;
  }

  // Sort by credit limit descending — save largest limit cards first
  const sorted = [...revolvingAccounts].sort((a, b) => (b.creditLimit ?? 0) - (a.creditLimit ?? 0));
  const atRisk: DormantAlert[] = [];

  for (const account of sorted) {
    const lastActivity = account.lastTransactionDate ? new Date(account.lastTransactionDate) : null;
    const daysSinceTransaction = lastActivity
      ? Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
      : 999; // Unknown = assume at risk

    if (daysSinceTransaction < 60) continue; // Active — no concern

    const riskLevel: DormantAlert["riskLevel"] = daysSinceTransaction >= 90 ? "critical" : "warning";
    const minimumSpend = Math.max(1, Math.min(25, Math.ceil((account.creditLimit ?? 100) * 0.001))); // $1-$25

    const alert: DormantAlert = {
      id: `dorm-${account.id}-${now.getTime()}`,
      profileId: profile.id,
      accountId: account.id,
      creditorName: account.creditorName,
      creditLimit: account.creditLimit ?? 0,
      daysSinceLastTransaction: daysSinceTransaction,
      riskLevel,
      recommendation: `Make a small purchase ($${minimumSpend}) on ${account.creditorName} and pay it off before statement closes.`,
      minimumSpend,
      status: "active",
    };
    atRisk.push(alert);

    const priority = riskLevel === "critical" ? "critical" as const : "high" as const;
    result.advisories.push({
      id: `adv-dorm-${account.id}-${now.getTime()}`,
      profileId: profile.id,
      module: "dormant_monitor",
      priority,
      condition: `${account.creditorName} (limit: $${account.creditLimit ?? 0}) inactive for ${daysSinceTransaction} days — issuer may reduce limit or close`,
      action: `Make one small purchase ($${minimumSpend}) this week and pay off before statement closes`,
      specificDetails: `Last transaction: ${lastActivity ? lastActivity.toLocaleDateString() : "Unknown"}. At ${daysSinceTransaction} days, issuers commonly reduce limits or close without notice.`,
      expectedImpact: riskLevel === "critical" ? "Prevents -20-40 points from limit reduction" : "Prevents potential -10-30 points",
      bureau: "all",
      timeframe: "This week — make one purchase",
      status: "active",
      createdAt: now.toISOString(),
    });
  }

  result.alerts = atRisk;

  // IF multiple dormant cards → generate rotating schedule
  if (atRisk.length > 1) {
    const cardNames = atRisk.map(a => a.creditorName).join(", ");
    result.advisories.push({
      id: `adv-dorm-schedule-${now.getTime()}`,
      profileId: profile.id,
      module: "dormant_monitor",
      priority: "high",
      condition: `${atRisk.length} cards at risk of inactivity closure: ${cardNames}`,
      action: "Set up a rotating purchase schedule — one card per week, small recurring charge (Netflix, Spotify, etc.)",
      specificDetails: `Prioritize by limit size: ${atRisk.slice(0, 3).map(a => `${a.creditorName} ($${a.creditLimit})`).join(" > ")}`,
      expectedImpact: `Prevents -30-80 points if multiple limits cut simultaneously`,
      bureau: "all",
      timeframe: "Set up this week — ongoing monthly",
      status: "active",
      createdAt: now.toISOString(),
    });
  }

  // Store
  const existing = dormantAlerts.get(profile.id) ?? [];
  dormantAlerts.set(profile.id, [...existing, ...atRisk]);
  for (const adv of result.advisories) addAdvisory(profile.id, adv);

  result.summary = atRisk.length > 0
    ? `${atRisk.length} card(s) at risk of inactivity closure. ${atRisk.filter(a => a.riskLevel === "critical").length} critical (90+ days). Largest at-risk limit: $${atRisk[0]?.creditLimit ?? 0}.`
    : "All revolving accounts active. No dormancy risk detected.";

  return result;
}

export function detectLimitReduction(profile: CreditProfile, accountId: string, previousLimit: number, newLimit: number): LimitReductionEvent & { advisories: AdvisoryItem[] } {
  const now = new Date();
  const account = profile.accounts.find(a => a.id === accountId);
  const balance = account?.balance ?? 0;
  const utilizationBefore = previousLimit > 0 ? (balance / previousLimit) * 100 : 0;
  const utilizationAfter = newLimit > 0 ? (balance / newLimit) * 100 : 100;

  const compensationActions: string[] = [];
  if (utilizationAfter > 30) {
    compensationActions.push(`Pay down ${account?.creditorName ?? "card"} balance to $${Math.ceil(newLimit * 0.09)} (under 10%)`);
  }
  compensationActions.push(`Call ${account?.creditorName ?? "issuer"} to request reinstatement of original $${previousLimit} limit`);
  compensationActions.push("Request limit increases on other open cards to offset lost available credit");

  const event: LimitReductionEvent = {
    id: `lr-${accountId}-${now.getTime()}`,
    profileId: profile.id,
    accountId,
    previousLimit,
    newLimit,
    detectedAt: now.toISOString(),
    utilizationBefore: Math.round(utilizationBefore),
    utilizationAfter: Math.round(utilizationAfter),
    compensationActions,
  };

  const advisories: AdvisoryItem[] = [{
    id: `adv-lr-${accountId}-${now.getTime()}`,
    profileId: profile.id,
    module: "dormant_monitor",
    priority: "critical",
    condition: `${account?.creditorName ?? "Card"} limit reduced from $${previousLimit} to $${newLimit} — utilization jumped from ${Math.round(utilizationBefore)}% to ${Math.round(utilizationAfter)}%`,
    action: compensationActions[0] ?? "Pay down balance immediately",
    specificDetails: compensationActions.join(" | "),
    expectedImpact: "Prevents -20-40 points. Reinstatement call is +10-20 points if successful.",
    bureau: "all",
    timeframe: "Immediate — call today, pay down this week",
    status: "active",
    createdAt: now.toISOString(),
  }];

  for (const adv of advisories) addAdvisory(profile.id, adv);

  return { ...event, advisories };
}
