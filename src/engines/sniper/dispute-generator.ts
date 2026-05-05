import Handlebars from "handlebars";
import { format } from "date-fns";
import type { Discrepancy, Bureau, Client, GeneratedDocument } from "../../types/index.js";

// ─── Dispute Letter Templates ────────────────────────────────────────────────

const DISPUTE_TEMPLATE = Handlebars.compile(`
{{clientName}}
{{clientAddress}}

{{date}}

{{bureauName}}
{{bureauAddress}}

RE: FORMAL DISPUTE — REQUEST FOR INVESTIGATION AND CORRECTION
Account: {{creditorName}} ({{accountNumber}})

To Whom It May Concern:

I am writing pursuant to my rights under the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681 et seq., to formally dispute inaccurate information appearing on my credit report.

DISPUTED ITEM:
Creditor: {{creditorName}}
Account Number: {{accountNumber}}
Field in Dispute: {{field}}

FACTUAL BASIS FOR DISPUTE:
{{description}}

The information currently reported is inaccurate and inconsistent across credit reporting agencies. Specifically:
{{#each bureauValues}}
• {{this.bureau}}: {{this.value}}
{{/each}}

LEGAL BASIS:
{{legalBasis}}

Under {{legalCitation}}, you are required to conduct a reasonable investigation of this dispute within 30 days of receipt. If you cannot verify the accuracy of the disputed information, you must promptly delete or modify it.

I further request that you:

1. Investigate this dispute within the 30-day period required by FCRA § 611(a)(1)(A).
2. Forward all relevant information to the furnisher of this data as required by FCRA § 611(a)(2).
3. Provide me with written notification of the results of your investigation as required by FCRA § 611(a)(6).
4. If the information is found to be inaccurate or unverifiable, delete it immediately and notify all parties who received my report in the last two years.

NOTICE: If this dispute is not resolved in compliance with the FCRA, I reserve my right to pursue statutory damages of $100–$1,000 per violation under § 616(a)(1)(A), actual damages, punitive damages, and attorney's fees under § 616(b) and § 617.

This letter was sent via certified mail, return receipt requested. I expect your written response within 30 days.

Sincerely,
{{clientName}}

Enclosures:
- Copy of credit report highlighting disputed item
- Copy of government-issued ID
- Proof of address
`.trim());

// ─── Bureau Addresses ────────────────────────────────────────────────────────

const bureauAddresses: Record<Bureau, { name: string; address: string }> = {
  equifax: {
    name: "Equifax Information Services LLC",
    address: "P.O. Box 740256\nAtlanta, GA 30374-0256",
  },
  experian: {
    name: "Experian\nNational Consumer Assistance Center",
    address: "P.O. Box 4500\nAllen, TX 75013",
  },
  transunion: {
    name: "TransUnion LLC\nConsumer Dispute Center",
    address: "P.O. Box 2000\nChester, PA 19016",
  },
};

// ─── Generate Dispute Letters ────────────────────────────────────────────────

export function generateDisputeLetter(
  discrepancy: Discrepancy,
  bureau: Bureau,
  client: Client,
): GeneratedDocument {
  const bureauInfo = bureauAddresses[bureau];
  const bureauValues = Object.entries(discrepancy.values)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([b, v]) => ({
      bureau: b.charAt(0).toUpperCase() + b.slice(1),
      value: String(v),
    }));

  const legalCitation = discrepancy.legalBasis.split("—")[0]?.trim() ?? "FCRA § 611";

  const content = DISPUTE_TEMPLATE({
    clientName: client.name,
    clientAddress: `${client.state}, ${client.county}`,
    date: format(new Date(), "MMMM d, yyyy"),
    bureauName: bureauInfo.name,
    bureauAddress: bureauInfo.address,
    creditorName: discrepancy.accountMatch.creditorName,
    accountNumber: discrepancy.accountMatch.accountNumberMask,
    field: discrepancy.field,
    description: discrepancy.description,
    bureauValues,
    legalBasis: discrepancy.legalBasis,
    legalCitation,
  });

  return {
    type: "dispute_letter",
    fileName: `dispute-${bureau}-${discrepancy.accountMatch.creditorName.replace(/\s+/g, "_")}-${Date.now()}.txt`,
    content,
    generatedAt: new Date().toISOString(),
  };
}

export function generateAllDisputeLetters(
  discrepancies: Discrepancy[],
  client: Client,
): GeneratedDocument[] {
  const documents: GeneratedDocument[] = [];

  for (const discrepancy of discrepancies) {
    const bureaus = Object.keys(discrepancy.values) as Bureau[];
    for (const bureau of bureaus) {
      documents.push(generateDisputeLetter(discrepancy, bureau, client));
    }
  }

  return documents;
}
