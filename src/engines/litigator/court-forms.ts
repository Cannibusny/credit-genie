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

// ─── Jurisdiction Database (expandable) ──────────────────────────────────────

const jurisdictionDb: Record<string, JurisdictionInfo> = {
  "NY:NEW YORK": { state: "NY", county: "New York", courtName: "New York City Civil Court, Small Claims Part", filingFee: 20, smallClaimsLimit: 10000 },
  "NY:KINGS": { state: "NY", county: "Kings", courtName: "Kings County Civil Court, Small Claims Part", filingFee: 20, smallClaimsLimit: 10000 },
  "CA:LOS ANGELES": { state: "CA", county: "Los Angeles", courtName: "Los Angeles County Superior Court, Small Claims Division", filingFee: 75, smallClaimsLimit: 10000 },
  "CA:SAN FRANCISCO": { state: "CA", county: "San Francisco", courtName: "San Francisco County Superior Court, Small Claims Division", filingFee: 75, smallClaimsLimit: 10000 },
  "TX:HARRIS": { state: "TX", county: "Harris", courtName: "Harris County Justice of the Peace Court", filingFee: 54, smallClaimsLimit: 20000 },
  "TX:DALLAS": { state: "TX", county: "Dallas", courtName: "Dallas County Justice of the Peace Court", filingFee: 54, smallClaimsLimit: 20000 },
  "FL:MIAMI-DADE": { state: "FL", county: "Miami-Dade", courtName: "Miami-Dade County Court, Small Claims Division", filingFee: 55, smallClaimsLimit: 8000 },
  "IL:COOK": { state: "IL", county: "Cook", courtName: "Cook County Circuit Court, Small Claims Division", filingFee: 75, smallClaimsLimit: 10000 },
  "GA:FULTON": { state: "GA", county: "Fulton", courtName: "Fulton County Magistrate Court", filingFee: 45, smallClaimsLimit: 15000 },
  "PA:PHILADELPHIA": { state: "PA", county: "Philadelphia", courtName: "Philadelphia Municipal Court", filingFee: 50, smallClaimsLimit: 12000 },
};

export function lookupJurisdiction(state: string, county: string): JurisdictionInfo {
  const key = `${state.toUpperCase()}:${county.toUpperCase()}`;
  return jurisdictionDb[key] ?? {
    state: state.toUpperCase(),
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
`.trim());

// ─── Bureau Defendant Info ───────────────────────────────────────────────────

const bureauDefendants: Record<string, { name: string; address: string }> = {
  equifax: {
    name: "Equifax Information Services LLC",
    address: "P.O. Box 740256, Atlanta, GA 30374-0256",
  },
  experian: {
    name: "Experian Information Solutions, Inc.",
    address: "P.O. Box 4500, Allen, TX 75013",
  },
  transunion: {
    name: "TransUnion LLC",
    address: "P.O. Box 2000, Chester, PA 19016",
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

  for (const [bureau, bureauDisputes] of byBureau) {
    const defendant = bureauDefendants[bureau];
    if (!defendant) continue;

    const violationCount = bureauDisputes.length;
    const damages = violationCount * 1000;
    totalDamages += Math.min(damages, jurisdiction.smallClaimsLimit);

    const cappedDamages = Math.min(damages, jurisdiction.smallClaimsLimit);
    const wasVerified = bureauDisputes.some((d) => d.status === "verified");

    const violations = bureauDisputes.map(
      (d, i) =>
        `${10 + i}. Violation ${i + 1}: ${d.discrepancyId} — Inaccurate information persists after formal dispute. Letter sent ${d.sentAt ? format(new Date(d.sentAt), "MMMM d, yyyy") : "N/A"}.`,
    );

    const content = COMPLAINT_TEMPLATE({
      courtName: jurisdiction.courtName.toUpperCase(),
      clientName: client.name,
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
      disputeDate: bureauDisputes[0]?.sentAt
        ? format(new Date(bureauDisputes[0].sentAt), "MMMM d, yyyy")
        : "N/A",
      wasVerified,
      violations,
      demandTotal: (cappedDamages + jurisdiction.filingFee).toLocaleString(),
    });

    documents.push({
      type: "court_complaint",
      fileName: `complaint-${bureau}-${Date.now()}.txt`,
      content,
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
