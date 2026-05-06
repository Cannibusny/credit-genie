/**
 * Smoke test — exercises all three engines without external dependencies.
 */
import { parseReport, runAudit, generateAllDisputeLetters } from "../src/engines/sniper/index.js";
import { createDispute, markDisputeSent, checkDeadlines, summarizeDisputes, generateLitigationPackage, lookupJurisdiction } from "../src/engines/litigator/index.js";
import { analyzeCashFlow, generateBuildingPlan } from "../src/engines/builder/index.js";
import type { Bureau, Client } from "../src/types/index.js";

// ─── Simulated credit report text ───────────────────────────────────────────

const equifaxText = `
Equifax Information Services
Report Date: 01/15/2025
Name: John A Smith
SSN: XXX-XX-1234
DOB: 03/15/1985
Address: 123 Main St, New York, NY 10001

Account Name: Chase Bank
Account #: XXXX-4567
Type: Credit Card
Status: Open
Balance: $2,500
Credit Limit: $10,000
Date Opened: 06/15/2019
Date Reported: 01/01/2025
High Balance: $8,000
Monthly Payment: $75
Payment History:
2024-10: OK
2024-09: OK
2024-08: 30

Remarks: None

Account Name: Capital One
Account #: XXXX-8901
Type: Credit Card
Status: Charged Off
Balance: $4,200
Credit Limit: $5,000
Date Opened: 03/10/2018
Date Reported: 12/15/2024
High Balance: $5,000
Monthly Payment: $0
Payment History:
2024-10: CO
2024-09: 120
2024-08: 90

Inquiries
Chase Bank 06/15/2024 Hard
`;

const transunionText = `
TransUnion LLC
Report Date: 01/16/2025
Name: John A Smith
SSN: XXX-XX-1234
DOB: 03/15/1985
Address: 123 Main St, New York, NY 10001

Account Name: Chase Bank
Account #: XXXX-4567
Type: Credit Card
Status: Open
Balance: $2,750
Credit Limit: $10,000
Date Opened: 06/15/2019
Date Reported: 01/02/2025
High Balance: $8,000
Monthly Payment: $75
Payment History:
2024-10: OK
2024-09: OK
2024-08: OK

Account Name: Capital One
Account #: XXXX-8901
Type: Credit Card
Status: Collection
Balance: $4,500
Credit Limit: $5,000
Date Opened: 03/10/2018
Date Reported: 12/16/2024
High Balance: $5,000
Monthly Payment: $0
Payment History:
2024-10: CL
2024-09: 120
2024-08: 90
`;

// ─── Engine 1: Metro 2 Sniper ───────────────────────────────────────────────

console.log("\n=== ENGINE 1: METRO 2 SNIPER ===\n");

const eqReport = parseReport(equifaxText, "equifax");
const tuReport = parseReport(transunionText, "transunion");

console.log(`Equifax: ${eqReport.accounts.length} accounts parsed`);
console.log(`TransUnion: ${tuReport.accounts.length} accounts parsed`);

const audit = runAudit("test-client-1", [eqReport, tuReport]);
console.log(`\nAudit ID: ${audit.id}`);
console.log(`Total Violations: ${audit.totalViolations}`);
console.log(`Estimated Damages: $${audit.estimatedDamages.toLocaleString()}`);
console.log(`Summary: ${audit.summary}`);
console.log(`\nDiscrepancies:`);
for (const d of audit.discrepancies) {
  console.log(`  [${d.severity.toUpperCase()}] ${d.description}`);
  console.log(`    Legal: ${d.legalBasis.substring(0, 80)}...`);
}

// ─── Engine 1: Dispute Letters ──────────────────────────────────────────────

const client: Client = {
  id: "test-client-1",
  email: "john@example.com",
  name: "John A Smith",
  phone: "555-0123",
  state: "NY",
  county: "New York",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const letters = generateAllDisputeLetters(audit.discrepancies, client);
console.log(`\nGenerated ${letters.length} dispute letters`);
for (const l of letters) {
  console.log(`  - ${l.fileName} (${l.content.length} chars)`);
}

// ─── Engine 2: Automated Litigator ──────────────────────────────────────────

console.log("\n=== ENGINE 2: AUTOMATED LITIGATOR ===\n");

const disputes = audit.discrepancies.flatMap((d) => {
  const bureaus = Object.keys(d.values) as Bureau[];
  return bureaus.map((bureau) => {
    const dispute = createDispute(client.id, audit.id, d, bureau, "letter content");
    return markDisputeSent(dispute);
  });
});

console.log(`Created ${disputes.length} disputes`);
const deadlines = checkDeadlines(disputes);
console.log(`Deadline alerts: ${deadlines.length}`);
const summary = summarizeDisputes(disputes);
console.log(`Summary: ${JSON.stringify(summary.byStatus)}`);
console.log(`Ready for litigation: ${summary.readyForLitigation.length}`);

// Jurisdiction lookup
const nyJurisdiction = lookupJurisdiction("NY", "Orange");
console.log(`\nJurisdiction: ${nyJurisdiction.courtName}`);
console.log(`Filing Fee: $${nyJurisdiction.filingFee}, Limit: $${nyJurisdiction.smallClaimsLimit}`);

const flJurisdiction = lookupJurisdiction("FL", "Miami-Dade");
console.log(`FL Jurisdiction: ${flJurisdiction.courtName}`);

// Litigation package
const litPkg = generateLitigationPackage(client, disputes);
console.log(`\nLitigation Package: ${litPkg.id}`);
console.log(`Court Forms: ${litPkg.courtForms.length}`);
console.log(`Estimated Damages: $${litPkg.estimatedDamages}`);
for (const f of litPkg.courtForms) {
  console.log(`  - ${f.type}: ${f.fileName} (${f.content.length} chars)`);
}

// ─── Engine 3: Liquid Credit Builder ────────────────────────────────────────

console.log("\n=== ENGINE 3: LIQUID CREDIT BUILDER ===\n");

const transactions = [
  { date: "2025-01-05", amount: 4200, description: "Direct Deposit - Employer", category: "income" },
  { date: "2025-01-06", amount: -1500, description: "Rent Payment", category: "housing" },
  { date: "2025-01-07", amount: -120, description: "Electric Company", category: "utility" },
  { date: "2025-01-08", amount: -15.99, description: "Netflix", category: "subscription" },
  { date: "2025-01-09", amount: -9.99, description: "Spotify", category: "subscription" },
  { date: "2025-01-10", amount: -85, description: "Gas Company", category: "utility" },
  { date: "2025-01-15", amount: -450, description: "Groceries", category: "food" },
  { date: "2025-01-20", amount: -200, description: "Car Insurance", category: "insurance" },
];

const analysis = analyzeCashFlow("test-client-1", transactions, 1500);
console.log(`Monthly Income: $${analysis.monthlyIncome}`);
console.log(`Monthly Expenses: $${analysis.monthlyExpenses}`);
console.log(`Credit Capacity: $${analysis.creditCapacity}`);
console.log(`Recommendations: ${analysis.recommendations.length}`);

const plan = generateBuildingPlan(analysis);
console.log(`\n${plan}`);

// ─── Summary ────────────────────────────────────────────────────────────────

console.log("\n=== SMOKE TEST COMPLETE ===");
console.log(`Engine 1 (Sniper): ${audit.totalViolations} violations, ${letters.length} letters`);
console.log(`Engine 2 (Litigator): ${disputes.length} disputes tracked`);
console.log(`Engine 3 (Builder): ${analysis.recommendations.length} recommendations`);
console.log("All engines operational.\n");
