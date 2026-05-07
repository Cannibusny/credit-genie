// MODULE 5: PAY-FOR-DELETE NEGOTIATOR & COLLECTION ACCOUNT MANAGER
// Priority: HIGH | Expected Score Impact: +20 to +50 points
// Key insight: Paying a collection does NOT remove it. Must negotiate deletion.

import type { CreditProfile, CreditAccount, CollectionAnalysis, AdvisoryItem, GeneratedDocument } from "../types/index.js";
import { addAdvisory, addDocument, collectionAnalyses } from "../lib/store.js";
import { getSOLMonths } from "./state-sol.js";

interface PayForDeleteResult {
  analyses: CollectionAnalysis[];
  advisories: AdvisoryItem[];
  documents: GeneratedDocument[];
  summary: string;
}

export function analyzeCollections(profile: CreditProfile): PayForDeleteResult {
  const now = new Date();
  const result: PayForDeleteResult = { analyses: [], advisories: [], documents: [], summary: "" };
  const collections = profile.accounts.filter(a => a.accountType === "collection");

  if (collections.length === 0) {
    result.summary = "No collection accounts found.";
    return result;
  }

  for (const account of collections) {
    const analysis = analyzeCollectionAccount(account, profile, now);
    result.analyses.push(analysis);

    // Generate advisory based on strategy
    const advisory = generateCollectionAdvisory(analysis, account, profile, now);
    result.advisories.push(advisory);

    // Generate letter if applicable
    if (analysis.strategy === "pay_for_delete_50" || analysis.strategy === "pay_for_delete_75" || analysis.strategy === "pay_for_delete_100") {
      const letter = generatePayForDeleteLetter(profile, account, analysis);
      result.documents.push(letter);
    } else if (analysis.strategy === "do_not_pay_dispute") {
      const letter = generateTimeBaredDisputeLetter(profile, account, analysis);
      result.documents.push(letter);
    }
  }

  // Store
  const existing = collectionAnalyses.get(profile.id) ?? [];
  collectionAnalyses.set(profile.id, [...existing, ...result.analyses]);
  for (const adv of result.advisories) addAdvisory(profile.id, adv);
  for (const doc of result.documents) addDocument(profile.id, doc);

  const zombieCount = result.analyses.filter(a => a.isZombiDebt).length;
  const pfdCount = result.analyses.filter(a => a.strategy.startsWith("pay_for_delete")).length;
  const waitCount = result.analyses.filter(a => a.strategy === "wait_out_clock").length;

  result.summary = `Analyzed ${collections.length} collections: ${zombieCount} zombie debts (DO NOT PAY), ${pfdCount} pay-for-delete candidates, ${waitCount} waiting out clock.`;
  return result;
}

function analyzeCollectionAccount(account: CreditAccount, profile: CreditProfile, now: Date): CollectionAnalysis {
  const dofd = account.dateOfFirstDelinquency ? new Date(account.dateOfFirstDelinquency) : new Date(account.dateOpened ?? now.toISOString());
  const ageMonths = Math.floor((now.getTime() - dofd.getTime()) / (1000 * 60 * 60 * 24 * 30));
  const solMonths = getSOLMonths(profile.state, account.isMedical ? "medical" : "credit_card");
  const fcraExpiry = new Date(dofd);
  fcraExpiry.setFullYear(fcraExpiry.getFullYear() + 7);
  const monthsUntilExpiry = Math.floor((fcraExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));
  const isZombie = ageMonths > solMonths;
  const balance = account.balance ?? 0;

  let strategy: CollectionAnalysis["strategy"];
  let offerTier = 0;

  if (isZombie) {
    strategy = "do_not_pay_dispute";
  } else if (account.isMedical && balance < 500) {
    strategy = "dispute_medical";
  } else if (monthsUntilExpiry <= 18) {
    strategy = "wait_out_clock";
  } else if (ageMonths < 48 && balance < 2500) {
    strategy = "pay_for_delete_50";
    offerTier = 1;
  } else if (ageMonths < 48) {
    strategy = "pay_for_delete_75";
    offerTier = 2;
  } else {
    strategy = "pay_for_delete_100";
    offerTier = 3;
  }

  return {
    id: `col-${account.id}-${now.getTime()}`,
    profileId: profile.id,
    accountId: account.id,
    creditorName: account.creditorName,
    collectionAgency: account.collectionAgency,
    originalBalance: account.highBalance ?? balance,
    currentBalance: balance,
    ageMonths,
    stateSOL: solMonths,
    fcraExpiry: fcraExpiry.toISOString(),
    monthsUntilExpiry,
    isZombiDebt: isZombie,
    paymentWouldResetClock: !isZombie && ageMonths > solMonths - 6,
    strategy,
    offerTier,
    letterContent: null,
  };
}

function generateCollectionAdvisory(analysis: CollectionAnalysis, account: CreditAccount, profile: CreditProfile, now: Date): AdvisoryItem {
  const strategyMessages: Record<CollectionAnalysis["strategy"], { action: string; impact: string; priority: "critical" | "high" | "medium" }> = {
    do_not_pay_dispute: {
      action: `DO NOT PAY — ${account.creditorName} is outside state statute of limitations. Dispute as time-barred.`,
      impact: "+15-40 points if removed via dispute, no payment needed",
      priority: "critical",
    },
    pay_for_delete_50: {
      action: `Send pay-for-delete letter to ${account.collectionAgency ?? account.creditorName} at 50% offer ($${Math.ceil((account.balance ?? 0) * 0.5)})`,
      impact: "+20-50 points per deleted collection",
      priority: "high",
    },
    pay_for_delete_75: {
      action: `Send pay-for-delete letter to ${account.collectionAgency ?? account.creditorName} at 75% offer ($${Math.ceil((account.balance ?? 0) * 0.75)})`,
      impact: "+20-50 points per deleted collection",
      priority: "high",
    },
    pay_for_delete_100: {
      action: `Send pay-for-delete letter to ${account.collectionAgency ?? account.creditorName} at full balance ($${account.balance ?? 0})`,
      impact: "+20-50 points per deleted collection",
      priority: "high",
    },
    wait_out_clock: {
      action: `Wait — ${account.creditorName} expires from report in ${analysis.monthsUntilExpiry} months. DO NOT make any payment.`,
      impact: "Prevents unnecessary payment. Auto-removes at expiry.",
      priority: "medium",
    },
    dispute_medical: {
      action: `Dispute ${account.creditorName} as non-reportable medical debt under $500 — zero cost removal`,
      impact: "+5-25 points per removal, zero cost",
      priority: "high",
    },
  };

  const msg = strategyMessages[analysis.strategy];
  return {
    id: `adv-pfd-${account.id}-${now.getTime()}`,
    profileId: profile.id,
    module: "pay_for_delete",
    priority: msg.priority,
    condition: `${account.creditorName}: $${account.balance ?? 0} collection, ${analysis.ageMonths} months old, SOL: ${analysis.stateSOL} months (${profile.state})`,
    action: msg.action,
    specificDetails: `Age: ${analysis.ageMonths}mo | SOL: ${analysis.stateSOL}mo | FCRA expiry: ${new Date(analysis.fcraExpiry).toLocaleDateString()} | Zombie: ${analysis.isZombiDebt ? "YES" : "no"}`,
    expectedImpact: msg.impact,
    bureau: account.bureaus[0] ?? "all",
    timeframe: analysis.strategy === "wait_out_clock" ? `${analysis.monthsUntilExpiry} months` : "30-45 days",
    status: "active",
    createdAt: now.toISOString(),
  };
}

function generatePayForDeleteLetter(profile: CreditProfile, account: CreditAccount, analysis: CollectionAnalysis): GeneratedDocument {
  const offerAmount = Math.ceil((account.balance ?? 0) * (analysis.offerTier === 1 ? 0.5 : analysis.offerTier === 2 ? 0.75 : 1.0));
  const offerPct = analysis.offerTier === 1 ? "50%" : analysis.offerTier === 2 ? "75%" : "100%";

  const content = `${profile.firstName} ${profile.lastName}
${profile.addresses.find(a => a.isCurrent)?.street ?? ""}
${profile.addresses.find(a => a.isCurrent)?.city ?? ""}, ${profile.state} ${profile.addresses.find(a => a.isCurrent)?.zip ?? ""}

Date: ${new Date().toLocaleDateString()}

${account.collectionAgency ?? account.creditorName}

Re: Settlement and Deletion Offer
Account: ${account.accountNumber}
Balance: $${account.balance ?? 0}

Dear Collections Department:

I am writing regarding the above-referenced account. I am prepared to resolve this matter in exchange for complete deletion of this tradeline from all three credit bureaus (Equifax, Experian, and TransUnion).

SETTLEMENT OFFER:
I will pay $${offerAmount} (${offerPct} of the claimed balance) as payment in full settlement of this account, contingent upon your written agreement to:

1. Accept $${offerAmount} as payment in full satisfaction of this debt
2. Request deletion of this tradeline from all three credit bureaus within 30 days of payment
3. Cease all collection activity immediately upon payment
4. Not sell, assign, or transfer any remaining balance to another entity

CONDITIONS:
- This offer is valid for 30 days from the date of this letter
- Payment will be made via cashier's check or money order only after written acceptance is received
- Acceptance must be on company letterhead with authorized signature

Please respond in writing to the address above. This is not an acknowledgment of the validity of this debt. All rights under the FDCPA are expressly reserved.

Sincerely,
${profile.firstName} ${profile.lastName}`;

  return {
    id: `doc-pfd-${account.id}-${Date.now()}`,
    profileId: profile.id,
    type: "pay_for_delete",
    fileName: `Pay-For-Delete-${account.creditorName.replace(/\s+/g, "-")}-${offerPct}.txt`,
    content,
    relatedDisputeId: null,
    relatedAccountId: account.id,
    generatedAt: new Date().toISOString(),
  };
}

function generateTimeBaredDisputeLetter(profile: CreditProfile, account: CreditAccount, analysis: CollectionAnalysis): GeneratedDocument {
  const content = `${profile.firstName} ${profile.lastName}
${profile.addresses.find(a => a.isCurrent)?.street ?? ""}
${profile.addresses.find(a => a.isCurrent)?.city ?? ""}, ${profile.state} ${profile.addresses.find(a => a.isCurrent)?.zip ?? ""}

Date: ${new Date().toLocaleDateString()}

To: ${account.bureaus.length > 0 ? (account.bureaus[0] ?? "").charAt(0).toUpperCase() + (account.bureaus[0] ?? "").slice(1) : "Bureau"} Consumer Disputes
Re: Time-Barred Debt — Demand for Removal
Account: ${account.creditorName} — ${account.accountNumber}

This account is ${analysis.ageMonths} months old. The state statute of limitations for this type of debt in ${profile.state} is ${analysis.stateSOL} months.

This debt is time-barred under ${profile.state} state law and cannot be legally collected. Continued reporting of a time-barred debt that the furnisher knows or should know cannot be collected constitutes a violation of FCRA § 1681s-2(a)(1)(A) — duty to provide accurate information.

I demand immediate deletion of this tradeline.

Sincerely,
${profile.firstName} ${profile.lastName}`;

  return {
    id: `doc-zombie-${account.id}-${Date.now()}`,
    profileId: profile.id,
    type: "dispute_letter",
    fileName: `Time-Barred-Dispute-${account.creditorName.replace(/\s+/g, "-")}.txt`,
    content,
    relatedDisputeId: null,
    relatedAccountId: account.id,
    generatedAt: new Date().toISOString(),
  };
}
