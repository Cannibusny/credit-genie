import Handlebars from "handlebars";
import { format } from "date-fns";
import type {
  Client,
  Dispute,
  JurisdictionInfo,
  LitigationPackage,
  GeneratedDocument,
} from "../../types/index.js";
import { randomUUID } from "node:crypto";

// ─── Jurisdiction Database — All 50 States + DC ─────────────────────────────
// Each state has a default entry and optional county-specific overrides.
// Filing fees and small claims limits are based on published court data (2024).

interface StateDefaults {
  courtNameTemplate: string;
  filingFee: number;
  smallClaimsLimit: number;
}

const stateDefaults: Record<string, StateDefaults> = {
  AL: { courtNameTemplate: "{county} County Small Claims Court", filingFee: 50, smallClaimsLimit: 6000 },
  AK: { courtNameTemplate: "{county} District Court, Small Claims", filingFee: 75, smallClaimsLimit: 10000 },
  AZ: { courtNameTemplate: "{county} County Justice Court", filingFee: 35, smallClaimsLimit: 3500 },
  AR: { courtNameTemplate: "{county} County Small Claims Division", filingFee: 30, smallClaimsLimit: 5000 },
  CA: { courtNameTemplate: "{county} County Superior Court, Small Claims Division", filingFee: 75, smallClaimsLimit: 10000 },
  CO: { courtNameTemplate: "{county} County Court, Small Claims Division", filingFee: 31, smallClaimsLimit: 7500 },
  CT: { courtNameTemplate: "Connecticut Superior Court, Small Claims — {county}", filingFee: 65, smallClaimsLimit: 5000 },
  DE: { courtNameTemplate: "Delaware Justice of the Peace Court — {county}", filingFee: 35, smallClaimsLimit: 15000 },
  DC: { courtNameTemplate: "District of Columbia Superior Court, Small Claims", filingFee: 5, smallClaimsLimit: 10000 },
  FL: { courtNameTemplate: "{county} County Court, Small Claims Division", filingFee: 55, smallClaimsLimit: 8000 },
  GA: { courtNameTemplate: "{county} County Magistrate Court", filingFee: 45, smallClaimsLimit: 15000 },
  HI: { courtNameTemplate: "Hawaii District Court — {county}", filingFee: 35, smallClaimsLimit: 5000 },
  ID: { courtNameTemplate: "{county} County Magistrate Court, Small Claims", filingFee: 69, smallClaimsLimit: 5000 },
  IL: { courtNameTemplate: "{county} County Circuit Court, Small Claims Division", filingFee: 75, smallClaimsLimit: 10000 },
  IN: { courtNameTemplate: "{county} County Small Claims Court", filingFee: 35, smallClaimsLimit: 8000 },
  IA: { courtNameTemplate: "{county} County Small Claims Court", filingFee: 32, smallClaimsLimit: 6500 },
  KS: { courtNameTemplate: "{county} County District Court, Small Claims", filingFee: 54, smallClaimsLimit: 4000 },
  KY: { courtNameTemplate: "{county} County Small Claims Division", filingFee: 30, smallClaimsLimit: 2500 },
  LA: { courtNameTemplate: "{county} Parish City Court, Small Claims", filingFee: 45, smallClaimsLimit: 5000 },
  ME: { courtNameTemplate: "Maine District Court — {county}, Small Claims", filingFee: 50, smallClaimsLimit: 6000 },
  MD: { courtNameTemplate: "Maryland District Court — {county}", filingFee: 34, smallClaimsLimit: 5000 },
  MA: { courtNameTemplate: "{county} County District Court, Small Claims", filingFee: 40, smallClaimsLimit: 7000 },
  MI: { courtNameTemplate: "{county} County District Court, Small Claims Division", filingFee: 30, smallClaimsLimit: 6500 },
  MN: { courtNameTemplate: "{county} County District Court, Conciliation Court", filingFee: 65, smallClaimsLimit: 15000 },
  MS: { courtNameTemplate: "{county} County Justice Court", filingFee: 30, smallClaimsLimit: 3500 },
  MO: { courtNameTemplate: "{county} County Circuit Court, Small Claims Division", filingFee: 35, smallClaimsLimit: 5000 },
  MT: { courtNameTemplate: "{county} County Justice Court", filingFee: 30, smallClaimsLimit: 7000 },
  NE: { courtNameTemplate: "{county} County Court, Small Claims", filingFee: 26, smallClaimsLimit: 3600 },
  NV: { courtNameTemplate: "{county} County Justice Court, Small Claims", filingFee: 75, smallClaimsLimit: 10000 },
  NH: { courtNameTemplate: "New Hampshire Circuit Court — {county}", filingFee: 50, smallClaimsLimit: 10000 },
  NJ: { courtNameTemplate: "New Jersey Superior Court — {county} Vicinage, Small Claims", filingFee: 35, smallClaimsLimit: 5000 },
  NM: { courtNameTemplate: "{county} County Metropolitan Court, Small Claims", filingFee: 25, smallClaimsLimit: 10000 },
  NY: { courtNameTemplate: "{county} County Small Claims Court", filingFee: 20, smallClaimsLimit: 10000 },
  NC: { courtNameTemplate: "{county} County Small Claims Court", filingFee: 96, smallClaimsLimit: 10000 },
  ND: { courtNameTemplate: "{county} County District Court, Small Claims", filingFee: 20, smallClaimsLimit: 15000 },
  OH: { courtNameTemplate: "{county} County Municipal Court, Small Claims Division", filingFee: 40, smallClaimsLimit: 6000 },
  OK: { courtNameTemplate: "{county} County District Court, Small Claims", filingFee: 58, smallClaimsLimit: 10000 },
  OR: { courtNameTemplate: "{county} County Circuit Court, Small Claims Department", filingFee: 55, smallClaimsLimit: 10000 },
  PA: { courtNameTemplate: "{county} County Magisterial District Court", filingFee: 50, smallClaimsLimit: 12000 },
  RI: { courtNameTemplate: "Rhode Island District Court — {county}", filingFee: 30, smallClaimsLimit: 5000 },
  SC: { courtNameTemplate: "{county} County Magistrate Court", filingFee: 40, smallClaimsLimit: 7500 },
  SD: { courtNameTemplate: "{county} County Small Claims Court", filingFee: 39, smallClaimsLimit: 12000 },
  TN: { courtNameTemplate: "{county} County General Sessions Court, Small Claims", filingFee: 60, smallClaimsLimit: 25000 },
  TX: { courtNameTemplate: "{county} County Justice of the Peace Court", filingFee: 54, smallClaimsLimit: 20000 },
  UT: { courtNameTemplate: "{county} County Justice Court, Small Claims", filingFee: 60, smallClaimsLimit: 11000 },
  VT: { courtNameTemplate: "Vermont Superior Court — {county} Unit, Small Claims", filingFee: 75, smallClaimsLimit: 5000 },
  VA: { courtNameTemplate: "{county} County General District Court, Small Claims", filingFee: 46, smallClaimsLimit: 5000 },
  WA: { courtNameTemplate: "{county} County District Court, Small Claims", filingFee: 35, smallClaimsLimit: 10000 },
  WV: { courtNameTemplate: "{county} County Magistrate Court", filingFee: 20, smallClaimsLimit: 10000 },
  WI: { courtNameTemplate: "{county} County Circuit Court, Small Claims", filingFee: 50, smallClaimsLimit: 10000 },
  WY: { courtNameTemplate: "{county} County Circuit Court, Small Claims", filingFee: 10, smallClaimsLimit: 6000 },
};

// County-specific overrides for major jurisdictions
const countyOverrides: Record<string, JurisdictionInfo> = {
  "NY:NEW YORK": { state: "NY", county: "New York", courtName: "New York City Civil Court, Small Claims Part", filingFee: 20, smallClaimsLimit: 10000 },
  "NY:KINGS": { state: "NY", county: "Kings", courtName: "Kings County Civil Court, Small Claims Part", filingFee: 20, smallClaimsLimit: 10000 },
  "NY:ORANGE": { state: "NY", county: "Orange", courtName: "Orange County Small Claims Court", filingFee: 20, smallClaimsLimit: 10000 },
  "NY:DUTCHESS": { state: "NY", county: "Dutchess", courtName: "Dutchess County Small Claims Court", filingFee: 20, smallClaimsLimit: 10000 },
  "NY:ULSTER": { state: "NY", county: "Ulster", courtName: "Ulster County Small Claims Court", filingFee: 20, smallClaimsLimit: 10000 },
  "CA:LOS ANGELES": { state: "CA", county: "Los Angeles", courtName: "Los Angeles County Superior Court, Small Claims Division", filingFee: 75, smallClaimsLimit: 10000 },
  "CA:SAN FRANCISCO": { state: "CA", county: "San Francisco", courtName: "San Francisco County Superior Court, Small Claims Division", filingFee: 75, smallClaimsLimit: 10000 },
  "TX:HARRIS": { state: "TX", county: "Harris", courtName: "Harris County Justice of the Peace Court", filingFee: 54, smallClaimsLimit: 20000 },
  "TX:DALLAS": { state: "TX", county: "Dallas", courtName: "Dallas County Justice of the Peace Court", filingFee: 54, smallClaimsLimit: 20000 },
  "TX:BEXAR": { state: "TX", county: "Bexar", courtName: "Bexar County Justice of the Peace Court", filingFee: 54, smallClaimsLimit: 20000 },
  "FL:MIAMI-DADE": { state: "FL", county: "Miami-Dade", courtName: "Miami-Dade County Court, Small Claims Division", filingFee: 55, smallClaimsLimit: 8000 },
  "FL:BROWARD": { state: "FL", county: "Broward", courtName: "Broward County Court, Small Claims Division", filingFee: 55, smallClaimsLimit: 8000 },
  "FL:ORANGE": { state: "FL", county: "Orange", courtName: "Orange County Court, Small Claims Division", filingFee: 55, smallClaimsLimit: 8000 },
  "IL:COOK": { state: "IL", county: "Cook", courtName: "Cook County Circuit Court, Small Claims Division", filingFee: 75, smallClaimsLimit: 10000 },
  "GA:FULTON": { state: "GA", county: "Fulton", courtName: "Fulton County Magistrate Court", filingFee: 45, smallClaimsLimit: 15000 },
  "PA:PHILADELPHIA": { state: "PA", county: "Philadelphia", courtName: "Philadelphia Municipal Court", filingFee: 50, smallClaimsLimit: 12000 },
  "OH:CUYAHOGA": { state: "OH", county: "Cuyahoga", courtName: "Cleveland Municipal Court, Small Claims Division", filingFee: 40, smallClaimsLimit: 6000 },
  "MI:WAYNE": { state: "MI", county: "Wayne", courtName: "36th District Court, Small Claims Division", filingFee: 30, smallClaimsLimit: 6500 },
  "NJ:ESSEX": { state: "NJ", county: "Essex", courtName: "New Jersey Superior Court — Essex Vicinage, Small Claims Section", filingFee: 35, smallClaimsLimit: 5000 },
  "NJ:HUDSON": { state: "NJ", county: "Hudson", courtName: "New Jersey Superior Court — Hudson Vicinage, Small Claims Section", filingFee: 35, smallClaimsLimit: 5000 },
};

export function lookupJurisdiction(state: string, county: string): JurisdictionInfo {
  const upperState = state.toUpperCase();
  const upperCounty = county.toUpperCase();

  const overrideKey = `${upperState}:${upperCounty}`;
  const override = countyOverrides[overrideKey];
  if (override) return override;

  const defaults = stateDefaults[upperState];
  if (defaults) {
    return {
      state: upperState,
      county,
      courtName: defaults.courtNameTemplate.replace("{county}", county),
      filingFee: defaults.filingFee,
      smallClaimsLimit: defaults.smallClaimsLimit,
    };
  }

  return {
    state: upperState,
    county,
    courtName: `${county} County Small Claims Court`,
    filingFee: 50,
    smallClaimsLimit: 10000,
  };
}

// ─── Complaint Template ──────────────────────────────────────────────────────

const COMPLAINT_TEMPLATE = Handlebars.compile(`
IN THE {{courtName}}

{{clientName}},
    Plaintiff,
                                          Case No.: ______________
v.

{{defendantName}},
{{defendantAddress}}
    Defendant.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SMALL CLAIMS COMPLAINT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Filed: {{date}}
Filing Fee: \${{filingFee}}

I. PARTIES

1. Plaintiff {{clientName}} is a consumer residing in {{county}} County, {{state}}.
2. Defendant {{defendantName}} is a consumer reporting agency that maintains and furnishes consumer credit reports.

II. JURISDICTION

3. This Court has jurisdiction under state small claims statute.
4. The amount in controversy is \${{totalDamages}}, which does not exceed the jurisdictional limit of \${{smallClaimsLimit}}.

III. FACTUAL ALLEGATIONS

5. Plaintiff obtained copies of their consumer credit report from Defendant.
6. Upon review, Plaintiff identified {{violationCount}} inaccuracies/violations on the report furnished by Defendant.
7. On {{disputeDate}}, Plaintiff submitted a written dispute to Defendant via certified mail, identifying the specific inaccuracies and requesting investigation.
8. Defendant was required to conduct a reasonable investigation within 30 days pursuant to FCRA § 611(a)(1)(A).

{{#if wasVerified}}
9. Defendant responded that the disputed information was "verified" but failed to correct the inaccuracies, constituting a failure to conduct a reasonable reinvestigation.
{{else}}
9. Defendant failed to respond within the legally mandated 30-day period, constituting a violation of FCRA § 611(a)(1)(A).
{{/if}}

IV. VIOLATIONS

{{#each violations}}
{{this}}
{{/each}}

V. CAUSES OF ACTION

Count 1: Violation of FCRA § 611(a) — Failure to Conduct Reasonable Investigation
Count 2: Violation of FCRA § 616(a) — Willful Noncompliance
Count 3: Violation of FCRA § 617 — Negligent Noncompliance

VI. DAMAGES SOUGHT

Plaintiff seeks:
{{#if isCapped}}
a. Statutory damages of \${{totalDamages}} (\$1,000 per violation × {{violationCount}} violations = \${{uncappedDamages}}, capped to jurisdictional small claims limit of \${{smallClaimsLimit}}) under FCRA § 616(a)(1)(A).
{{else}}
a. Statutory damages of \${{totalDamages}} (\$1,000 per violation × {{violationCount}} violations) under FCRA § 616(a)(1)(A).
{{/if}}
b. Court costs and filing fees of \${{filingFee}}.
c. Such other relief as the Court deems just and proper.

VII. DEMAND

Plaintiff demands judgment against Defendant in the total amount of \${{demandTotal}}.

Respectfully submitted,

_________________________
{{clientName}}, Pro Se
Date: {{date}}
`.trim(), { noEscape: true });

// ─── Summons Template ────────────────────────────────────────────────────────

const SUMMONS_TEMPLATE = Handlebars.compile(`
IN THE {{courtName}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUMMONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Case No.: ______________

TO: {{defendantName}}
    {{defendantAddress}}

YOU ARE HEREBY NOTIFIED that a Small Claims Complaint has been filed against you in the above-entitled court by the following Plaintiff:

    {{clientName}}
    {{clientAddress}}

NATURE OF CLAIM: Violations of the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681 et seq.

AMOUNT CLAIMED: \${{totalDamages}} plus court costs and fees.

YOU ARE SUMMONED to appear on:

    Date: ____________________
    Time: ____________________
    Place: {{courtName}}

If you fail to appear, a default judgment may be entered against you for the amount claimed plus costs.

IMPORTANT: Bring all documents, witnesses, and evidence you wish to present to the court on the above date.

Issued: {{date}}

_________________________
Clerk of the Court
`.trim(), { noEscape: true });

// ─── Proof of Service Template ───────────────────────────────────────────────

const PROOF_OF_SERVICE_TEMPLATE = Handlebars.compile(`
IN THE {{courtName}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROOF OF SERVICE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Case No.: ______________

{{clientName}} v. {{defendantName}}

I, {{clientName}}, declare:

1. I am the Plaintiff in this action. I am over 18 years of age and not a party to this action (for purposes of service by mail).

2. On ________________ (date), I served the attached Small Claims Complaint and Summons on the Defendant by the following method:

    [ ] CERTIFIED MAIL, RETURN RECEIPT REQUESTED
        Mailed to: {{defendantName}}
                   {{defendantAddress}}
        
        Tracking Number: ____________________________
        
    [ ] PERSONAL SERVICE
        Served by: ____________________________
        Date/Time: ____________________________
        Location:  ____________________________

3. {{#if wasVerified}}The original dispute letters were sent via certified mail on {{disputeDate}} and the Defendant responded with a "verified" determination without correcting the identified inaccuracies.{{else}}The original dispute letters were sent via certified mail on {{disputeDate}} and the Defendant failed to respond within the legally mandated 30-day period.{{/if}}

I declare under penalty of perjury that the foregoing is true and correct.

Executed on: ________________

_________________________
{{clientName}}
`.trim(), { noEscape: true });

// ─── Cover Letter Template ───────────────────────────────────────────────────

const COVER_LETTER_TEMPLATE = Handlebars.compile(`
{{clientName}}
{{clientAddress}}

{{date}}

Clerk of Court
{{courtName}}
{{county}} County, {{state}}

Re: Small Claims Filing — {{clientName}} v. {{defendantName}}
    Fair Credit Reporting Act Violations

Dear Clerk:

Please accept the enclosed documents for filing in the Small Claims Division:

    1. Small Claims Complaint ({{violationCount}} FCRA violations, \${{totalDamages}} damages sought)
    2. Summons for Defendant
    3. Proof of Service form
    4. Copies of certified mail receipts for original dispute letters
    5. Filing fee of \${{filingFee}} (check/money order enclosed)

BACKGROUND:

On {{disputeDate}}, I sent a written dispute to {{defendantName}} identifying {{violationCount}} inaccuracies on my credit report, as required under the Fair Credit Reporting Act, 15 U.S.C. § 1681i. {{#if wasVerified}}The bureau responded that the information was "verified" without conducting a reasonable investigation or correcting the errors.{{else}}The bureau failed to respond within the legally mandated 30-day investigation period.{{/if}}

This filing seeks statutory damages under FCRA § 616(a)(1)(A) at \$1,000 per violation, plus court costs.

Please process this filing at your earliest convenience and mail the assigned case number and hearing date to the address above.

Thank you for your assistance.

Sincerely,

_________________________
{{clientName}}, Pro Se
{{clientEmail}}

Enclosures: As listed above
`.trim(), { noEscape: true });

// ─── Evidence Exhibit Template ───────────────────────────────────────────────

const EVIDENCE_TEMPLATE = Handlebars.compile(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXHIBIT A — EVIDENCE OF CREDIT REPORTING VIOLATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Case: {{clientName}} v. {{defendantName}}
Bureau: {{bureau}}
Prepared: {{date}}

This exhibit documents {{violationCount}} violations of the Fair Credit Reporting Act identified through cross-bureau comparison of consumer credit reports.

────────────────────────────────────────────────────────────────────
VIOLATION DETAILS
────────────────────────────────────────────────────────────────────

{{#each violationDetails}}
VIOLATION {{this.number}}:
  Account: {{this.accountName}}
  Field: {{this.field}}
  Type: {{this.violationType}}
  Severity: {{this.severity}}
  
  Discrepancy: {{this.description}}
  
  Cross-Bureau Values:
  {{#each this.bureauValues}}
    - {{this.bureau}}: {{this.value}}
  {{/each}}
  
  Legal Basis: {{this.legalBasis}}
  Statutory Damages: \$1,000

────────────────────────────────────────────────────────────────────
{{/each}}

TOTAL VIOLATIONS: {{violationCount}}
TOTAL STATUTORY DAMAGES: \${{totalDamages}}

────────────────────────────────────────────────────────────────────
CERTIFICATION
────────────────────────────────────────────────────────────────────

I, {{clientName}}, certify that the information in this exhibit was obtained from my own consumer credit reports and accurately represents the discrepancies identified through comparison of reports from multiple consumer reporting agencies.

_________________________
{{clientName}}
Date: ________________
`.trim(), { noEscape: true });

// ─── Bureau Defendant Info ───────────────────────────────────────────────────

const bureauDefendants: Record<string, { name: string; address: string; registeredAgent: string }> = {
  equifax: {
    name: "Equifax Information Services LLC",
    address: "P.O. Box 740256, Atlanta, GA 30374-0256",
    registeredAgent: "CT Corporation System, 289 S Culver St, Lawrenceville, GA 30046",
  },
  experian: {
    name: "Experian Information Solutions, Inc.",
    address: "P.O. Box 4500, Allen, TX 75013",
    registeredAgent: "CT Corporation System, 1999 Bryan St, Suite 900, Dallas, TX 75201",
  },
  transunion: {
    name: "TransUnion LLC",
    address: "P.O. Box 2000, Chester, PA 19016",
    registeredAgent: "CT Corporation System, 208 S LaSalle St, Suite 814, Chicago, IL 60604",
  },
};

// ─── Package Generator ───────────────────────────────────────────────────────

export function generateLitigationPackage(
  client: Client,
  disputes: Dispute[],
): LitigationPackage {
  const jurisdiction = lookupJurisdiction(client.state, client.county);
  const documents: GeneratedDocument[] = [];

  const byBureau = new Map<string, Dispute[]>();
  for (const d of disputes) {
    const existing = byBureau.get(d.bureau) ?? [];
    existing.push(d);
    byBureau.set(d.bureau, existing);
  }

  let totalDamages = 0;
  const clientAddress = `${client.county}, ${client.state}`;

  for (const [bureau, bureauDisputes] of byBureau) {
    const defendant = bureauDefendants[bureau];
    if (!defendant) continue;

    const violationCount = bureauDisputes.length;
    const damages = violationCount * 1000;
    totalDamages += Math.min(damages, jurisdiction.smallClaimsLimit);

    const cappedDamages = Math.min(damages, jurisdiction.smallClaimsLimit);
    const wasVerified = bureauDisputes.some((d) => d.status === "verified");

    const firstSentAt = bureauDisputes.find((d) => d.sentAt)?.sentAt;
    const disputeDateStr = firstSentAt
      ? format(new Date(firstSentAt), "MMMM d, yyyy")
      : "N/A";

    const violations = bureauDisputes.map(
      (d, i) =>
        `${10 + i}. Violation ${i + 1}: ${d.discrepancyId} — Inaccurate information persists after formal dispute. Letter sent ${d.sentAt ? format(new Date(d.sentAt), "MMMM d, yyyy") : "N/A"}.`,
    );

    const templateData = {
      courtName: jurisdiction.courtName.toUpperCase(),
      clientName: client.name,
      clientAddress,
      clientEmail: client.email,
      defendantName: defendant.name,
      defendantAddress: defendant.address,
      date: format(new Date(), "MMMM d, yyyy"),
      filingFee: jurisdiction.filingFee,
      county: jurisdiction.county,
      state: jurisdiction.state,
      totalDamages: cappedDamages.toLocaleString(),
      uncappedDamages: damages.toLocaleString(),
      smallClaimsLimit: jurisdiction.smallClaimsLimit.toLocaleString(),
      violationCount,
      isCapped: damages > jurisdiction.smallClaimsLimit,
      disputeDate: disputeDateStr,
      wasVerified,
      violations,
      demandTotal: (cappedDamages + jurisdiction.filingFee).toLocaleString(),
      bureau: bureau.charAt(0).toUpperCase() + bureau.slice(1),
    };

    // 1. Complaint
    documents.push({
      type: "court_complaint",
      fileName: `complaint-${bureau}-${Date.now()}.txt`,
      content: COMPLAINT_TEMPLATE(templateData),
      generatedAt: new Date().toISOString(),
    });

    // 2. Summons
    documents.push({
      type: "summons",
      fileName: `summons-${bureau}-${Date.now()}.txt`,
      content: SUMMONS_TEMPLATE(templateData),
      generatedAt: new Date().toISOString(),
    });

    // 3. Proof of Service
    documents.push({
      type: "proof_of_service",
      fileName: `proof-of-service-${bureau}-${Date.now()}.txt`,
      content: PROOF_OF_SERVICE_TEMPLATE(templateData),
      generatedAt: new Date().toISOString(),
    });

    // 4. Cover Letter
    documents.push({
      type: "cover_letter",
      fileName: `cover-letter-${bureau}-${Date.now()}.txt`,
      content: COVER_LETTER_TEMPLATE(templateData),
      generatedAt: new Date().toISOString(),
    });

    // 5. Evidence Exhibit
    const violationDetails = bureauDisputes.map((d, i) => ({
      number: i + 1,
      accountName: d.discrepancyId,
      field: d.discrepancyId,
      violationType: "Cross-bureau discrepancy",
      severity: "HIGH",
      description: `Inaccurate information identified via cross-bureau comparison`,
      bureauValues: [{ bureau, value: "See attached credit report" }],
      legalBasis: "FCRA § 611(a) — Failure to conduct reasonable investigation",
    }));

    documents.push({
      type: "evidence_exhibit",
      fileName: `evidence-exhibit-${bureau}-${Date.now()}.txt`,
      content: EVIDENCE_TEMPLATE({
        ...templateData,
        violationDetails,
      }),
      generatedAt: new Date().toISOString(),
    });
  }

  return {
    id: randomUUID(),
    clientId: client.id,
    disputes,
    jurisdiction,
    courtForms: documents,
    estimatedDamages: totalDamages,
    createdAt: new Date().toISOString(),
  };
}
