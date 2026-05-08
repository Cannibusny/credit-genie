// MODULE 6: AUTHORIZED USER AUDIT & CREDIT MIX ADVISOR
// Priority: HIGH | Expected Score Impact: +10 to +30 points

import type { CreditProfile, CreditAccount, AUAuditResult, CreditMixAnalysis, CreditMixRecommendation, AdvisoryItem } from "../types/index.js";
import { addAdvisory, auAuditResults } from "../lib/store.js";

interface AUMixResult {
  auResults: AUAuditResult[];
  mixAnalysis: CreditMixAnalysis;
  advisories: AdvisoryItem[];
  summary: string;
}

export function runAUAuditAndMixAdvisor(profile: CreditProfile): AUMixResult {
  const now = new Date();
  const result: AUMixResult = {
    auResults: [],
    mixAnalysis: { profileId: profile.id, hasRevolving: false, hasInstallment: false, hasMortgage: false, revolvingCount: 0, installmentCount: 0, recommendation: null, warnings: [] },
    advisories: [],
    summary: "",
  };

  // ─── AU Audit ─────────────────────────────────────────────────────────────
  const auAccounts = profile.accounts.filter(a => a.isAuthorizedUser);

  for (const account of auAccounts) {
    const utilization = (account.balance ?? 0) / (account.creditLimit ?? 1) * 100;
    const paymentStatus = getLatestPaymentStatus(account);
    const isOldest = isOldestAccount(account, profile);
    const netPositive = utilization < 30 && paymentStatus === "current";

    let recommendation: AUAuditResult["recommendation"];
    let reason: string;
    let expectedImpact: string;

    if (paymentStatus !== "current") {
      recommendation = "remove_immediately";
      reason = `Primary holder on ${account.creditorName} has missed payment (${paymentStatus}). One missed payment costs 50-100 points.`;
      expectedImpact = "Prevents -50-100 points";
    } else if (utilization > 50) {
      recommendation = "remove_immediately";
      reason = `${account.creditorName} AU account at ${Math.round(utilization)}% utilization — hurting your score.`;
      expectedImpact = "Prevents -20-40 points from high utilization";
    } else if (isOldest && netPositive) {
      recommendation = "keep";
      reason = `${account.creditorName} is your oldest account and net positive (${Math.round(utilization)}% util, current). Removal would shorten credit history.`;
      expectedImpact = "Keeps +15-40 points of history benefit";
    } else if (netPositive) {
      recommendation = "keep";
      reason = `${account.creditorName} is net positive — low utilization and 100% on-time payments.`;
      expectedImpact = "+15-40 points maintained";
    } else {
      recommendation = "monitor";
      reason = `${account.creditorName} is borderline. Monitor monthly for changes.`;
      expectedImpact = "Monitor — no immediate action";
    }

    const auResult: AUAuditResult = {
      id: `au-${account.id}-${now.getTime()}`,
      profileId: profile.id,
      accountId: account.id,
      primaryHolder: account.primaryHolderName ?? "Unknown",
      reportedUtilization: Math.round(utilization),
      paymentStatus: paymentStatus === "current" ? "current" : "late_30",
      isOldestAccount: isOldest,
      netPositive,
      recommendation,
      reason,
      expectedImpact,
    };
    result.auResults.push(auResult);

    // Generate advisory for urgent actions
    if (recommendation === "remove_immediately") {
      result.advisories.push({
        id: `adv-au-${account.id}-${now.getTime()}`,
        profileId: profile.id,
        module: "au_audit",
        priority: "critical",
        condition: reason,
        action: `Request immediate removal from ${account.creditorName}. Contact issuer to remove yourself as AU.`,
        specificDetails: `Primary holder: ${account.primaryHolderName ?? "Unknown"}. Utilization: ${Math.round(utilization)}%. Status: ${paymentStatus}.`,
        expectedImpact,
        bureau: "all",
        timeframe: "Immediate — call issuer today",
        status: "active",
        createdAt: now.toISOString(),
      });
    }
  }

  // ─── Credit Mix Advisor ───────────────────────────────────────────────────
  const openAccounts = profile.accounts.filter(a => a.accountStatus === "open" && !a.isAuthorizedUser);
  const revolving = openAccounts.filter(a => a.accountType === "revolving");
  const installment = openAccounts.filter(a => a.accountType === "installment" || a.accountType === "auto_loan" || a.accountType === "student_loan");
  const mortgage = openAccounts.filter(a => a.accountType === "mortgage");

  result.mixAnalysis = {
    profileId: profile.id,
    hasRevolving: revolving.length > 0,
    hasInstallment: installment.length > 0,
    hasMortgage: mortgage.length > 0,
    revolvingCount: revolving.length,
    installmentCount: installment.length,
    recommendation: null,
    warnings: [],
  };

  // Only revolving → recommend installment
  if (revolving.length > 0 && installment.length === 0 && mortgage.length === 0) {
    result.mixAnalysis.recommendation = {
      type: "credit_builder_loan",
      provider: "Self Financial or local credit union",
      productName: "Credit Builder Loan ($500-$1,000)",
      reason: "You have only revolving credit (credit cards). Adding an installment loan improves credit mix.",
      expectedImpact: "+5-15 points within 6 months",
      monthlyCost: 25,
      requirements: ["No credit check for Self Financial", "Minimum income verification for credit union"],
    };
    result.advisories.push({
      id: `adv-mix-install-${now.getTime()}`,
      profileId: profile.id,
      module: "credit_mix",
      priority: "medium",
      condition: `Only revolving credit (${revolving.length} cards). No installment loans.`,
      action: "Open a credit-builder installment loan ($500-$1,000) to improve credit mix",
      specificDetails: "Self Financial (no credit check) or local credit union. $25-50/month. Builds positive installment history.",
      expectedImpact: "+5-15 points within 6 months",
      bureau: "all",
      timeframe: "6 months to see full impact",
      status: "active",
      createdAt: now.toISOString(),
    });
  }

  // Only installment → recommend secured card
  if (installment.length > 0 && revolving.length === 0) {
    result.mixAnalysis.recommendation = {
      type: "secured_card",
      provider: "Discover it Secured or Capital One Secured",
      productName: "Secured Credit Card ($200-$500 deposit)",
      reason: "You have only installment accounts. Adding a revolving credit card improves credit mix.",
      expectedImpact: "+5-15 points within 3-6 months",
      monthlyCost: 0,
      requirements: ["Security deposit ($200-$500)", "Basic income verification"],
    };
    result.advisories.push({
      id: `adv-mix-revolv-${now.getTime()}`,
      profileId: profile.id,
      module: "credit_mix",
      priority: "medium",
      condition: `Only installment accounts (${installment.length}). No revolving credit.`,
      action: "Open one secured credit card (Discover it Secured or Capital One Secured)",
      specificDetails: "$200-$500 deposit. Use for one small recurring charge. Pay in full monthly. Do NOT open multiple cards.",
      expectedImpact: "+5-15 points within 3-6 months",
      bureau: "all",
      timeframe: "3-6 months",
      status: "active",
      createdAt: now.toISOString(),
    });
  }

  // Warning: installment loan about to close
  for (const loan of installment) {
    if (loan.balance !== null && loan.balance < 100 && loan.accountStatus === "open") {
      result.mixAnalysis.warnings.push(`${loan.creditorName} is nearly paid off (${loan.balance}). Once closed, you lose installment mix if it's your only one.`);
      if (installment.length === 1) {
        result.advisories.push({
          id: `adv-mix-closing-${loan.id}-${now.getTime()}`,
          profileId: profile.id,
          module: "credit_mix",
          priority: "medium",
          condition: `Your only installment loan (${loan.creditorName}) is nearly paid off — $${loan.balance} remaining`,
          action: "Open a small credit-builder loan BEFORE this loan closes to maintain installment mix",
          specificDetails: "Once your only installment loan closes, credit mix drops. Open replacement first.",
          expectedImpact: "Prevents -5-15 points from mix drop",
          bureau: "all",
          timeframe: "Before current loan closes",
          status: "active",
          createdAt: now.toISOString(),
        });
      }
    }
  }

  // Store
  const existing = auAuditResults.get(profile.id) ?? [];
  auAuditResults.set(profile.id, [...existing, ...result.auResults]);
  for (const adv of result.advisories) addAdvisory(profile.id, adv);

  result.summary = `AU Audit: ${auAccounts.length} AU accounts (${result.auResults.filter(r => r.recommendation === "remove_immediately").length} need immediate removal). Mix: ${revolving.length} revolving, ${installment.length} installment. ${result.mixAnalysis.recommendation ? "Recommendation generated." : "Mix is balanced."}`;
  return result;
}

function getLatestPaymentStatus(account: CreditAccount): string {
  if (account.paymentHistory.length === 0) return "current";
  const latest = account.paymentHistory[account.paymentHistory.length - 1];
  return latest?.status ?? "current";
}

function isOldestAccount(account: CreditAccount, profile: CreditProfile): boolean {
  if (!account.dateOpened) return false;
  const accountDate = new Date(account.dateOpened);
  for (const other of profile.accounts) {
    if (other.id === account.id) continue;
    if (other.dateOpened && new Date(other.dateOpened) < accountDate) return false;
  }
  return true;
}
