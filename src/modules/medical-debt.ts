// MODULE 8: STATE-AWARE MEDICAL DEBT ENGINE
// Priority: NY PRIORITY | Expected Score Impact: +20 to +40 points
// Applies: NY state ban, under-$500 rule, under-12-months rule, NSA violations

import type { CreditProfile, CreditAccount, MedicalDebt, MedicalDebtAction, AdvisoryItem, GeneratedDocument, Bureau } from "../types/index.js";
import { addAdvisory, addDocument, medicalDebtActions } from "../lib/store.js";
import { hasMedicalDebtBan } from "./state-sol.js";

interface MedicalDebtResult {
  actions: MedicalDebtAction[];
  advisories: AdvisoryItem[];
  documents: GeneratedDocument[];
  summary: string;
}

export function runMedicalDebtEngine(profile: CreditProfile): MedicalDebtResult {
  const now = new Date();
  const result: MedicalDebtResult = { actions: [], advisories: [], documents: [], summary: "" };

  // Find all medical accounts
  const medicalAccounts = profile.accounts.filter(a => a.isMedical);
  const stateBan = hasMedicalDebtBan(profile.state);

  if (medicalAccounts.length === 0) {
    result.summary = "No medical debts detected on credit profile.";
    return result;
  }

  for (const account of medicalAccounts) {
    const balance = account.balance ?? 0;
    const dofd = account.dateOfFirstDelinquency ?? account.dateOpened;
    const ageMonths = dofd ? Math.floor((now.getTime() - new Date(dofd).getTime()) / (1000 * 60 * 60 * 24 * 30)) : 0;

    // Determine which rule applies
    let rule: MedicalDebtAction["rule"];
    let letterContent: string;

    if (stateBan) {
      // NY state ban takes priority — ALL medical debts barred
      rule = "ny_state_ban";
      letterContent = generateNYCeaseReportingLetter(profile, account);
    } else if (balance < 500) {
      // Under $500 — bureaus voluntarily committed to not report
      rule = "under_500";
      letterContent = generateUnder500DisputeLetter(profile, account);
    } else if (ageMonths < 12) {
      // Under 12 months old — should not be on report yet
      rule = "under_12_months";
      letterContent = generatePrematureReportingLetter(profile, account);
    } else {
      // Check for insurance pending or NSA
      const medicalDebt = profile.medicalDebts.find(md => md.accountId === account.id);
      if (medicalDebt?.insurancePending) {
        rule = "insurance_pending";
        letterContent = generateInsurancePendingLetter(profile, account);
      } else {
        // Standard — pay-for-delete with medical provider directly
        rule = "under_500"; // fallback
        letterContent = generateMedicalPayForDeleteLetter(profile, account);
      }
    }

    const action: MedicalDebtAction = {
      id: `mda-${account.id}-${now.getTime()}`,
      profileId: profile.id,
      medicalDebtId: account.id,
      rule,
      letterContent,
      targetBureau: account.bureaus[0] ?? null,
      targetFurnisher: account.collectionAgency ?? account.creditorName,
      status: "generated",
      expectedImpact: getImpactForRule(rule),
    };
    result.actions.push(action);

    // Generate document
    const doc: GeneratedDocument = {
      id: `doc-med-${account.id}-${now.getTime()}`,
      profileId: profile.id,
      type: rule === "ny_state_ban" ? "medical_cease_report" : "dispute_letter",
      fileName: `Medical-${rule}-${account.creditorName.replace(/\s+/g, "-")}.txt`,
      content: letterContent,
      relatedDisputeId: null,
      relatedAccountId: account.id,
      generatedAt: now.toISOString(),
    };
    result.documents.push(doc);

    // Advisory
    result.advisories.push(generateMedicalAdvisory(profile, account, rule, now));
  }

  // Store
  const existing = medicalDebtActions.get(profile.id) ?? [];
  medicalDebtActions.set(profile.id, [...existing, ...result.actions]);
  for (const doc of result.documents) addDocument(profile.id, doc);
  for (const adv of result.advisories) addAdvisory(profile.id, adv);

  const nyCount = result.actions.filter(a => a.rule === "ny_state_ban").length;
  const under500 = result.actions.filter(a => a.rule === "under_500").length;
  const premature = result.actions.filter(a => a.rule === "under_12_months").length;

  result.summary = `Processed ${medicalAccounts.length} medical debts. ${stateBan ? `NY state ban applies to all ${nyCount}.` : ""} ${under500} under $500 (non-reportable). ${premature} premature (under 12 months).`;
  return result;
}

function generateMedicalAdvisory(profile: CreditProfile, account: CreditAccount, rule: MedicalDebtAction["rule"], now: Date): AdvisoryItem {
  const messages: Record<MedicalDebtAction["rule"], { condition: string; action: string; impact: string; priority: "critical" | "high" | "medium" }> = {
    ny_state_ban: {
      condition: `NY resident with medical debt "${account.creditorName}" ($${account.balance ?? 0}) — state ban applies`,
      action: "Send NY state-law cease-reporting letter to bureau AND data furnisher simultaneously",
      impact: "+20-40 points per removed debt",
      priority: "critical",
    },
    under_500: {
      condition: `Medical collection "${account.creditorName}" is under $500 ($${account.balance ?? 0}) — non-reportable per bureau policy`,
      action: "Dispute as voluntary policy violation — no payment needed, zero cost removal",
      impact: "+5-25 points per removal, zero cost",
      priority: "high",
    },
    under_12_months: {
      condition: `Medical collection "${account.creditorName}" is under 12 months old — premature reporting`,
      action: "Dispute as premature reporting — bureaus committed to waiting 12 months",
      impact: "+10-30 points if removed",
      priority: "high",
    },
    insurance_pending: {
      condition: `Medical debt "${account.creditorName}" has insurance reimbursement still processing`,
      action: "Dispute as unresolved insurance claim — balance may be zeroed once insurance pays",
      impact: "+15-40 points if balance zeroed out",
      priority: "high",
    },
    nsa_violation: {
      condition: `Medical service may be covered by No Surprises Act — surprise billing violation`,
      action: "Generate No Surprises Act violation notice to provider and insurer",
      impact: "+15-40 points if balance voided",
      priority: "high",
    },
  };

  const msg = messages[rule];
  return {
    id: `adv-med-${account.id}-${now.getTime()}`,
    profileId: profile.id,
    module: "medical_debt",
    priority: msg.priority,
    condition: msg.condition,
    action: msg.action,
    specificDetails: `Provider: ${account.creditorName} | Balance: $${account.balance ?? 0} | Bureau: ${account.bureaus.join(", ")} | Rule: ${rule}`,
    expectedImpact: msg.impact,
    bureau: account.bureaus[0] ?? "all",
    timeframe: "30 days",
    status: "active",
    createdAt: now.toISOString(),
  };
}

function getImpactForRule(rule: MedicalDebtAction["rule"]): string {
  const impacts: Record<MedicalDebtAction["rule"], string> = {
    ny_state_ban: "+20-40 points",
    under_500: "+5-25 points",
    under_12_months: "+10-30 points",
    insurance_pending: "+15-40 points",
    nsa_violation: "+15-40 points",
  };
  return impacts[rule];
}

// ─── Letter Templates ───────────────────────────────────────────────────────

function generateNYCeaseReportingLetter(profile: CreditProfile, account: CreditAccount): string {
  return `${profile.firstName} ${profile.lastName}
${profile.addresses.find(a => a.isCurrent)?.street ?? ""}
${profile.addresses.find(a => a.isCurrent)?.city ?? ""}, ${profile.state} ${profile.addresses.find(a => a.isCurrent)?.zip ?? ""}

Date: ${new Date().toLocaleDateString()}

To: ${account.bureaus.map(b => b.charAt(0).toUpperCase() + b.slice(1)).join(", ")}
CC: ${account.collectionAgency ?? account.creditorName}

Re: DEMAND TO CEASE REPORTING — New York Medical Debt Ban
Account: ${account.creditorName} — ${account.accountNumber}
Balance Claimed: $${account.balance ?? 0}

I am a resident of the State of New York. The above-referenced account is a medical debt.

LEGAL BASIS:
New York State has enacted a medical debt credit reporting ban that prohibits consumer reporting agencies from including medical debt information in consumer credit files for New York residents. This state law is independent of, and unaffected by, the vacated federal CFPB medical debt rule.

DEMAND:
1. Immediately cease reporting this medical debt on my credit file
2. Delete all record of this tradeline from my consumer file
3. Notify the data furnisher to cease furnishing this information for NY residents
4. Provide written confirmation of deletion within 30 days

CONSEQUENCES OF NON-COMPLIANCE:
Continued reporting of medical debt for a New York resident constitutes a violation of New York State consumer protection law. I will file complaints with the New York Attorney General's Office and pursue all available legal remedies including statutory damages.

Sent via Certified Mail, Return Receipt Requested.

Sincerely,
${profile.firstName} ${profile.lastName}`;
}

function generateUnder500DisputeLetter(profile: CreditProfile, account: CreditAccount): string {
  return `${profile.firstName} ${profile.lastName}
${profile.addresses.find(a => a.isCurrent)?.street ?? ""}
${profile.addresses.find(a => a.isCurrent)?.city ?? ""}, ${profile.state} ${profile.addresses.find(a => a.isCurrent)?.zip ?? ""}

Date: ${new Date().toLocaleDateString()}

To: ${account.bureaus.map(b => b.charAt(0).toUpperCase() + b.slice(1)).join(", ")} Consumer Disputes

Re: Dispute — Non-Reportable Medical Debt Under $500
Account: ${account.creditorName} — ${account.accountNumber}
Balance: $${account.balance ?? 0}

I am disputing the above-referenced medical collection account.

Per the voluntary commitments made by all three major credit bureaus (effective 2023), medical debts with a balance under $500 are not to be included on consumer credit reports.

This account has a balance of $${account.balance ?? 0}, which is below the $500 threshold. It should never have appeared on my credit file.

I demand immediate deletion of this tradeline pursuant to your own stated policy.

Sincerely,
${profile.firstName} ${profile.lastName}`;
}

function generatePrematureReportingLetter(profile: CreditProfile, account: CreditAccount): string {
  return `${profile.firstName} ${profile.lastName}
${profile.addresses.find(a => a.isCurrent)?.street ?? ""}
${profile.addresses.find(a => a.isCurrent)?.city ?? ""}, ${profile.state} ${profile.addresses.find(a => a.isCurrent)?.zip ?? ""}

Date: ${new Date().toLocaleDateString()}

To: ${account.bureaus.map(b => b.charAt(0).toUpperCase() + b.slice(1)).join(", ")} Consumer Disputes

Re: Dispute — Premature Medical Debt Reporting (Under 12 Months)
Account: ${account.creditorName} — ${account.accountNumber}

Per the voluntary commitments made by all three major credit bureaus, medical debts less than 12 months old are not to be included on consumer credit reports.

This medical collection was first reported less than 12 months ago and should not appear on my credit file until at least 12 months have passed from the date of first delinquency.

I demand immediate removal until the 12-month waiting period has elapsed.

Sincerely,
${profile.firstName} ${profile.lastName}`;
}

function generateInsurancePendingLetter(profile: CreditProfile, account: CreditAccount): string {
  return `${profile.firstName} ${profile.lastName}
${profile.addresses.find(a => a.isCurrent)?.street ?? ""}
${profile.addresses.find(a => a.isCurrent)?.city ?? ""}, ${profile.state} ${profile.addresses.find(a => a.isCurrent)?.zip ?? ""}

Date: ${new Date().toLocaleDateString()}

To: ${account.bureaus.map(b => b.charAt(0).toUpperCase() + b.slice(1)).join(", ")} Consumer Disputes
CC: ${account.collectionAgency ?? account.creditorName}

Re: Dispute — Unresolved Insurance Claim
Account: ${account.creditorName} — ${account.accountNumber}
Balance Claimed: $${account.balance ?? 0}

I am disputing this medical collection. The underlying medical service is covered by my health insurance, and the insurance reimbursement is still being processed.

The reported balance is inaccurate because:
1. An insurance claim has been filed for this service
2. The insurance company has not yet completed adjudication
3. The actual patient responsibility may be $0 or significantly less than claimed

Reporting an inaccurate balance while insurance is still processing violates FCRA requirements for maximum possible accuracy (15 U.S.C. § 1681e(b)).

I demand this tradeline be removed or corrected to reflect the actual patient responsibility once insurance adjudication is complete.

Sincerely,
${profile.firstName} ${profile.lastName}`;
}

function generateMedicalPayForDeleteLetter(profile: CreditProfile, account: CreditAccount): string {
  return `${profile.firstName} ${profile.lastName}
${profile.addresses.find(a => a.isCurrent)?.street ?? ""}
${profile.addresses.find(a => a.isCurrent)?.city ?? ""}, ${profile.state} ${profile.addresses.find(a => a.isCurrent)?.zip ?? ""}

Date: ${new Date().toLocaleDateString()}

${account.creditorName}
[PROVIDER ADDRESS]

Re: Settlement and Deletion Request — Medical Account
Account: ${account.accountNumber}
Balance: $${account.balance ?? 0}

I am reaching out directly to your office (not the collection agency) regarding the above medical account.

I am prepared to pay the full balance of $${account.balance ?? 0} in exchange for your agreement to:
1. Request deletion of this account from all three credit bureaus
2. Recall the account from any collection agency currently holding it
3. Provide written confirmation of deletion within 30 days

Medical providers often have the authority to recall accounts from collections and request bureau deletion directly. I respectfully ask for your consideration.

Please respond in writing to confirm this arrangement.

Sincerely,
${profile.firstName} ${profile.lastName}`;
}
