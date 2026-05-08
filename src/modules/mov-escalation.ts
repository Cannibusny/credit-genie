// MODULE 4: METHOD OF VERIFICATION ENGINE & REGULATORY ESCALATION
// Priority: CRITICAL | Expected Score Impact: +15 to +60 points
// After any failed first dispute, auto-generate MoV demand letter.

import type { CreditProfile, CreditAccount, MoVDemand, RegulatoryEscalation, AdvisoryItem, GeneratedDocument, Bureau } from "../types/index.js";
import { addAdvisory, addDocument, movDemands, escalations } from "../lib/store.js";
import { getStateSOL, hasMedicalDebtBan } from "./state-sol.js";

interface MoVResult {
  demands: MoVDemand[];
  escalationPackages: RegulatoryEscalation[];
  documents: GeneratedDocument[];
  advisories: AdvisoryItem[];
  summary: string;
}

export function generateMoVDemand(profile: CreditProfile, disputeId: string, bureau: Bureau, accountId: string): MoVResult {
  const now = new Date();
  const account = profile.accounts.find(a => a.id === accountId);
  const result: MoVResult = { demands: [], escalationPackages: [], documents: [], advisories: [], summary: "" };

  if (!account) {
    result.summary = "Account not found.";
    return result;
  }

  // Generate MoV demand letter
  const movContent = generateMoVLetter(profile, account, bureau);
  const responseDeadline = new Date(now);
  responseDeadline.setDate(responseDeadline.getDate() + 15);

  const demand: MoVDemand = {
    id: `mov-${disputeId}-${now.getTime()}`,
    profileId: profile.id,
    disputeId,
    bureau,
    letterContent: movContent,
    sentAt: now.toISOString(),
    responseDeadline: responseDeadline.toISOString(),
    responseReceived: false,
    responseContent: null,
    escalatedToCfpb: false,
    escalatedToAg: false,
  };
  result.demands.push(demand);

  const doc: GeneratedDocument = {
    id: `doc-mov-${disputeId}-${now.getTime()}`,
    profileId: profile.id,
    type: "mov_demand",
    fileName: `MOV-Demand-${bureau}-${account.creditorName.replace(/\s+/g, "-")}.txt`,
    content: movContent,
    relatedDisputeId: disputeId,
    relatedAccountId: accountId,
    generatedAt: now.toISOString(),
  };
  result.documents.push(doc);

  result.advisories.push({
    id: `adv-mov-${disputeId}-${now.getTime()}`,
    profileId: profile.id,
    module: "mov_escalation",
    priority: "high",
    condition: `Bureau responded "Verified" for ${account.creditorName} on ${bureau} with no documentation`,
    action: `MoV demand generated. Send via certified mail within 5 days. Do NOT file second standard dispute.`,
    specificDetails: `Demand requires: name of investigator, documents reviewed, whether automated or manual, data furnisher contact info.`,
    expectedImpact: "+15-60 points if MoV forces removal",
    bureau,
    timeframe: "15 days for response, then escalation",
    status: "active",
    createdAt: now.toISOString(),
  });

  // Check if data furnisher is defunct
  if (account.collectionAgency && account.originalCreditor) {
    result.advisories.push({
      id: `adv-mov-defunct-${disputeId}-${now.getTime()}`,
      profileId: profile.id,
      module: "mov_escalation",
      priority: "medium",
      condition: `Original creditor "${account.originalCreditor}" may no longer exist or has been acquired`,
      action: "Research if furnisher still exists. If defunct, explicitly note in MoV demand — bureau cannot verify with nonexistent entity.",
      specificDetails: `Collection agency: ${account.collectionAgency}. Original creditor: ${account.originalCreditor}. Strong removal case if furnisher dissolved.`,
      expectedImpact: "+20-60 points, strong removal case",
      bureau,
      timeframe: "Include in next MoV or escalation letter",
      status: "active",
      createdAt: now.toISOString(),
    });
  }

  // NY medical debt auto-generation
  if (profile.state === "NY" && account.isMedical) {
    const ceaseContent = generateNYMedicalCeaseLetter(profile, account, bureau);
    result.documents.push({
      id: `doc-ny-med-${account.id}-${now.getTime()}`,
      profileId: profile.id,
      type: "medical_cease_report",
      fileName: `NY-Medical-Cease-Report-${bureau}-${account.creditorName.replace(/\s+/g, "-")}.txt`,
      content: ceaseContent,
      relatedDisputeId: disputeId,
      relatedAccountId: accountId,
      generatedAt: now.toISOString(),
    });

    result.advisories.push({
      id: `adv-mov-nymed-${account.id}-${now.getTime()}`,
      profileId: profile.id,
      module: "mov_escalation",
      priority: "critical",
      condition: `NY user with medical collection "${account.creditorName}" — state ban applies`,
      action: "Send NY state-law cease-reporting letter to bureau AND data furnisher simultaneously.",
      specificDetails: `New York has banned medical debt from credit reports. This overrides federal rules. Letter generated.`,
      expectedImpact: "+20-40 points per removed medical collection",
      bureau,
      timeframe: "30 days",
      status: "active",
      createdAt: now.toISOString(),
    });
  }

  // Store
  const existingDemands = movDemands.get(profile.id) ?? [];
  movDemands.set(profile.id, [...existingDemands, ...result.demands]);
  for (const d of result.documents) addDocument(profile.id, d);
  for (const adv of result.advisories) addAdvisory(profile.id, adv);

  result.summary = `MoV demand generated for ${account.creditorName} on ${bureau}. Response deadline: 15 days. Auto-escalation to CFPB/AG if no response.`;
  return result;
}

export function generateEscalationPackage(profile: CreditProfile, disputeId: string, bureau: Bureau, accountId: string): MoVResult {
  const now = new Date();
  const account = profile.accounts.find(a => a.id === accountId);
  const result: MoVResult = { demands: [], escalationPackages: [], documents: [], advisories: [], summary: "" };

  if (!account) {
    result.summary = "Account not found.";
    return result;
  }

  const stateInfo = getStateSOL(profile.state);

  // CFPB Complaint
  const cfpbContent = generateCFPBComplaint(profile, account, bureau);
  result.documents.push({
    id: `doc-cfpb-${disputeId}-${now.getTime()}`,
    profileId: profile.id,
    type: "cfpb_complaint",
    fileName: `CFPB-Complaint-${bureau}-${account.creditorName.replace(/\s+/g, "-")}.txt`,
    content: cfpbContent,
    relatedDisputeId: disputeId,
    relatedAccountId: accountId,
    generatedAt: now.toISOString(),
  });

  result.escalationPackages.push({
    id: `esc-cfpb-${disputeId}-${now.getTime()}`,
    profileId: profile.id,
    disputeId,
    type: "cfpb",
    bureau,
    content: cfpbContent,
    filedAt: now.toISOString(),
    status: "filed",
    outcome: null,
  });

  // State AG Complaint
  const agContent = generateAGComplaint(profile, account, bureau, stateInfo);
  result.documents.push({
    id: `doc-ag-${disputeId}-${now.getTime()}`,
    profileId: profile.id,
    type: "ag_complaint",
    fileName: `AG-Complaint-${profile.state}-${bureau}-${account.creditorName.replace(/\s+/g, "-")}.txt`,
    content: agContent,
    relatedDisputeId: disputeId,
    relatedAccountId: accountId,
    generatedAt: now.toISOString(),
  });

  result.escalationPackages.push({
    id: `esc-ag-${disputeId}-${now.getTime()}`,
    profileId: profile.id,
    disputeId,
    type: "state_ag",
    bureau,
    content: agContent,
    filedAt: now.toISOString(),
    status: "filed",
    outcome: null,
  });

  // Goodwill deletion to original creditor (separate track)
  if (account.originalCreditor) {
    const goodwillContent = generateGoodwillLetter(profile, account);
    result.documents.push({
      id: `doc-goodwill-${account.id}-${now.getTime()}`,
      profileId: profile.id,
      type: "goodwill_letter",
      fileName: `Goodwill-${account.originalCreditor.replace(/\s+/g, "-")}.txt`,
      content: goodwillContent,
      relatedDisputeId: disputeId,
      relatedAccountId: accountId,
      generatedAt: now.toISOString(),
    });
  }

  result.advisories.push({
    id: `adv-esc-${disputeId}-${now.getTime()}`,
    profileId: profile.id,
    module: "mov_escalation",
    priority: "critical",
    condition: `Bureau failed to respond to MoV demand within 15 days OR continued to verify without documentation`,
    action: "File CFPB complaint AND state AG complaint simultaneously. All documents generated.",
    specificDetails: `CFPB complaint citing FCRA Section 611. ${profile.state} AG complaint to ${stateInfo?.agOffice ?? "State Attorney General"}. Goodwill letter to original creditor as parallel track.`,
    expectedImpact: "Builds legal record. Forces formal investigation. Statutory damages apply.",
    bureau,
    timeframe: "File immediately — all documents ready",
    status: "active",
    createdAt: now.toISOString(),
  });

  // Store
  const existingEsc = escalations.get(profile.id) ?? [];
  escalations.set(profile.id, [...existingEsc, ...result.escalationPackages]);
  for (const d of result.documents) addDocument(profile.id, d);
  for (const adv of result.advisories) addAdvisory(profile.id, adv);

  result.summary = `Full escalation package generated: CFPB complaint, ${profile.state} AG complaint, and goodwill letter. Ready to file.`;
  return result;
}

// ─── Letter Generation ──────────────────────────────────────────────────────

function generateMoVLetter(profile: CreditProfile, account: CreditAccount, bureau: Bureau): string {
  const bureauAddress = getBureauAddress(bureau);
  return `${profile.firstName} ${profile.lastName}
${profile.addresses.find(a => a.isCurrent)?.street ?? ""}
${profile.addresses.find(a => a.isCurrent)?.city ?? ""}, ${profile.state} ${profile.addresses.find(a => a.isCurrent)?.zip ?? ""}

Date: ${new Date().toLocaleDateString()}

${bureauAddress}

Re: Method of Verification Demand
Account: ${account.creditorName} — ${account.accountNumber}

Dear ${getBureauName(bureau)} Investigations Department:

On or about [DISPUTE DATE], I submitted a formal dispute regarding the above-referenced account pursuant to 15 U.S.C. § 1681i. Your office responded that the item was "verified" without providing any documentation supporting that verification.

Pursuant to 15 U.S.C. § 1681i(a)(6)(B)(iii), I am entitled to receive a description of the procedure used to determine the accuracy and completeness of the disputed information. I hereby demand the following:

1. The name of the person who conducted the reinvestigation
2. The specific documents reviewed during the reinvestigation
3. Whether the verification was conducted through automated e-Oscar system or manual review
4. The name, address, and telephone number of the data furnisher who was consulted
5. A copy of any documentation the furnisher provided in support of verification

If you are unable to provide this information within fifteen (15) days of receipt of this letter, the disputed item must be deleted from my credit file immediately pursuant to FCRA § 611(a)(5)(A).

I am sending this letter via certified mail, return receipt requested, as evidence of delivery.

Sincerely,
${profile.firstName} ${profile.lastName}
SSN (last 4): XXX-XX-${profile.ssn ?? "XXXX"}`;
}

function generateNYMedicalCeaseLetter(profile: CreditProfile, account: CreditAccount, bureau: Bureau): string {
  return `${profile.firstName} ${profile.lastName}
${profile.addresses.find(a => a.isCurrent)?.street ?? ""}
${profile.addresses.find(a => a.isCurrent)?.city ?? ""}, ${profile.state} ${profile.addresses.find(a => a.isCurrent)?.zip ?? ""}

Date: ${new Date().toLocaleDateString()}

${getBureauAddress(bureau)}

Re: Demand to Cease Reporting Medical Debt — New York State Law
Account: ${account.creditorName} — ${account.accountNumber}

Dear ${getBureauName(bureau)}:

I am a resident of the State of New York. The above-referenced account is a medical debt currently appearing on my credit report.

Pursuant to New York State law, medical debts are prohibited from appearing on consumer credit reports. This ban is independent of the vacated federal CFPB medical debt rule and remains in full force and effect.

I demand that you immediately cease reporting this medical debt on my credit file. Continued reporting constitutes a violation of New York State consumer protection law.

Additionally, I request that you notify the data furnisher (${account.collectionAgency ?? account.creditorName}) that they must cease furnishing this information to any consumer reporting agency for New York residents.

If this item is not removed within thirty (30) days, I will file a complaint with the New York Attorney General's Office and pursue all available legal remedies.

Sincerely,
${profile.firstName} ${profile.lastName}`;
}

function generateCFPBComplaint(profile: CreditProfile, account: CreditAccount, bureau: Bureau): string {
  return `CONSUMER FINANCIAL PROTECTION BUREAU COMPLAINT

Complainant: ${profile.firstName} ${profile.lastName}
State: ${profile.state}
Date: ${new Date().toLocaleDateString()}

Company Complained About: ${getBureauName(bureau)}

Product: Credit reporting
Issue: Incorrect information on credit report
Sub-issue: Information belongs to someone else / Information is inaccurate

NARRATIVE:

I submitted a formal dispute to ${getBureauName(bureau)} regarding account ${account.creditorName} (${account.accountNumber}) pursuant to 15 U.S.C. § 1681i.

${getBureauName(bureau)} responded that the item was "verified" without providing adequate documentation. I then submitted a Method of Verification demand letter via certified mail. ${getBureauName(bureau)} failed to respond within 15 days or provide the requested verification documentation.

This constitutes a violation of FCRA Section 611(a)(6)(B)(iii) which requires the bureau to provide a description of the procedure used to determine the accuracy of disputed information.

The inaccurate information is causing direct harm to my credit score and ability to obtain credit/financing.

DESIRED RESOLUTION:
1. Immediate deletion of the disputed item from my credit file
2. Confirmation that the item will not be re-inserted
3. Updated credit report reflecting the correction

SUPPORTING DOCUMENTATION:
- Original dispute letter (sent [DATE])
- Bureau "verified" response (received [DATE])
- Method of Verification demand letter (sent [DATE])
- Certified mail receipts`;
}

function generateAGComplaint(profile: CreditProfile, account: CreditAccount, bureau: Bureau, stateInfo: ReturnType<typeof getStateSOL>): string {
  return `STATE ATTORNEY GENERAL COMPLAINT

To: ${stateInfo?.agOffice ?? "Office of the Attorney General"}
${stateInfo?.agAddress ?? ""}

From: ${profile.firstName} ${profile.lastName}
${profile.addresses.find(a => a.isCurrent)?.street ?? ""}
${profile.addresses.find(a => a.isCurrent)?.city ?? ""}, ${profile.state} ${profile.addresses.find(a => a.isCurrent)?.zip ?? ""}

Date: ${new Date().toLocaleDateString()}

COMPLAINT AGAINST: ${getBureauName(bureau)}

NATURE OF COMPLAINT:
${getBureauName(bureau)} has failed to comply with the Fair Credit Reporting Act (FCRA) by:
1. Reporting inaccurate information (${account.creditorName} — ${account.accountNumber})
2. Failing to conduct a reasonable reinvestigation upon receipt of my dispute
3. Failing to respond to my Method of Verification demand within the required timeframe
4. Using automated e-Oscar verification without genuine investigation

TIMELINE:
- Dispute submitted: [DATE]
- Bureau response "Verified": [DATE]
- MoV demand sent via certified mail: [DATE]
- Bureau response to MoV: NONE / INADEQUATE

REQUESTED ACTION:
I respectfully request that your office investigate ${getBureauName(bureau)}'s failure to comply with federal consumer protection law and take appropriate enforcement action.

Respectfully submitted,
${profile.firstName} ${profile.lastName}`;
}

function generateGoodwillLetter(profile: CreditProfile, account: CreditAccount): string {
  return `${profile.firstName} ${profile.lastName}
${profile.addresses.find(a => a.isCurrent)?.street ?? ""}
${profile.addresses.find(a => a.isCurrent)?.city ?? ""}, ${profile.state} ${profile.addresses.find(a => a.isCurrent)?.zip ?? ""}

Date: ${new Date().toLocaleDateString()}

${account.originalCreditor ?? account.creditorName}
Customer Relations Department

Re: Goodwill Adjustment Request
Account: ${account.accountNumber}

Dear Customer Relations:

I am writing to request a goodwill adjustment on the above-referenced account. I have been a customer of ${account.originalCreditor ?? account.creditorName} and value our relationship.

[EXPLAIN CIRCUMSTANCE — e.g., temporary hardship, medical emergency, etc.]

Since that time, I have maintained perfect payment history and am committed to responsible credit use. The negative mark is the only blemish on an otherwise strong payment record.

I respectfully request that you consider removing the negative notation as a goodwill gesture. I understand this is at your discretion and I appreciate your consideration.

Thank you for your time.

Sincerely,
${profile.firstName} ${profile.lastName}`;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getBureauName(bureau: Bureau): string {
  const names: Record<Bureau, string> = {
    equifax: "Equifax Information Services",
    experian: "Experian",
    transunion: "TransUnion LLC",
  };
  return names[bureau];
}

function getBureauAddress(bureau: Bureau): string {
  const addresses: Record<Bureau, string> = {
    equifax: "Equifax Information Services LLC\nP.O. Box 740256\nAtlanta, GA 30374-0256",
    experian: "Experian\nP.O. Box 4500\nAllen, TX 75013",
    transunion: "TransUnion LLC\nP.O. Box 2000\nChester, PA 19016",
  };
  return addresses[bureau];
}
