import { randomUUID } from "node:crypto";
import type {
  Bureau,
  ParsedCreditReport,
  ParsedAccount,
  AccountMatch,
  Discrepancy,
  AuditResult,
  ViolationType,
} from "../../types/index.js";
import { log } from "../../lib/logger.js";

// ─── Account Matching ────────────────────────────────────────────────────────

const CREDITOR_STOP_WORDS = new Set([
  "bank", "financial", "services", "corp", "inc", "llc", "na", "co", "the",
]);

function normalizeCreditor(name: string): string {
  return name
    .toLowerCase()
    .split(/[\s.,\-\/&']+/)
    .filter((w) => w.length > 0 && !CREDITOR_STOP_WORDS.has(w))
    .join("")
    .replace(/[^a-z0-9]/g, "");
}

function accountsMatch(a: ParsedAccount, b: ParsedAccount): boolean {
  const nameMatch = normalizeCreditor(a.creditorName) === normalizeCreditor(b.creditorName);
  if (!nameMatch) return false;

  if (a.accountNumber !== "XXXX" && b.accountNumber !== "XXXX") {
    const lastA = a.accountNumber.slice(-4);
    const lastB = b.accountNumber.slice(-4);
    return lastA === lastB;
  }

  return true;
}

export function matchAccountsAcrossBureaus(
  reports: ParsedCreditReport[],
): AccountMatch[] {
  const matches: AccountMatch[] = [];
  const used = new Set<string>();

  const allAccounts = reports.flatMap((r) =>
    r.accounts.map((a) => ({ bureau: r.bureau, account: a })),
  );

  for (let i = 0; i < allAccounts.length; i++) {
    const entry = allAccounts[i]!;
    const key = `${entry.bureau}:${normalizeCreditor(entry.account.creditorName)}:${entry.account.accountNumber}`;
    if (used.has(key)) continue;
    used.add(key);

    const match: AccountMatch = {
      creditorName: entry.account.creditorName,
      accountNumberMask: entry.account.accountNumber,
      entries: { [entry.bureau]: entry.account },
    };

    for (let j = i + 1; j < allAccounts.length; j++) {
      const other = allAccounts[j]!;
      const otherKey = `${other.bureau}:${normalizeCreditor(other.account.creditorName)}:${other.account.accountNumber}`;
      if (used.has(otherKey)) continue;

      if (accountsMatch(entry.account, other.account)) {
        match.entries[other.bureau] = other.account;
        used.add(otherKey);
      }
    }

    if (Object.keys(match.entries).length >= 1) {
      matches.push(match);
    }
  }

  log.info({ matched: matches.length }, "Matched accounts across bureaus");
  return matches;
}

// ─── Discrepancy Detection ───────────────────────────────────────────────────

interface FieldCheck {
  field: string;
  extract: (a: ParsedAccount) => string | number | null;
  violationType: ViolationType;
  severity: "critical" | "high" | "medium" | "low";
  legalBasis: string;
}

const fieldChecks: FieldCheck[] = [
  {
    field: "balance",
    extract: (a) => a.balance,
    violationType: "balance_mismatch",
    severity: "high",
    legalBasis: "FCRA § 611(a)(1)(A) — Inaccurate information; Metro 2 Field 26 (Current Balance) must be consistent across all CRAs.",
  },
  {
    field: "accountStatus",
    extract: (a) => a.accountStatus,
    violationType: "status_mismatch",
    severity: "critical",
    legalBasis: "FCRA § 611(a) — Account status reported differently across bureaus constitutes inaccurate reporting.",
  },
  {
    field: "dateOpened",
    extract: (a) => a.dateOpened,
    violationType: "date_mismatch",
    severity: "high",
    legalBasis: "FCRA § 611(a)(1)(A) — Date discrepancy; Metro 2 Field 14 (Date Opened) must match furnisher records.",
  },
  {
    field: "creditLimit",
    extract: (a) => a.creditLimit,
    violationType: "cross_bureau_discrepancy",
    severity: "medium",
    legalBasis: "FCRA § 611(a) — Credit limit inconsistency indicates furnisher reporting error.",
  },
  {
    field: "highBalance",
    extract: (a) => a.highBalance,
    violationType: "cross_bureau_discrepancy",
    severity: "medium",
    legalBasis: "FCRA § 611(a) — High balance mismatch across bureaus.",
  },
  {
    field: "monthlyPayment",
    extract: (a) => a.monthlyPayment,
    violationType: "cross_bureau_discrepancy",
    severity: "low",
    legalBasis: "FCRA § 611(a) — Monthly payment amount reported inconsistently.",
  },
];

function detectFieldDiscrepancies(match: AccountMatch): Discrepancy[] {
  const discrepancies: Discrepancy[] = [];
  const bureaus = Object.keys(match.entries) as Bureau[];
  if (bureaus.length < 2) return discrepancies;

  for (const check of fieldChecks) {
    const values: Partial<Record<Bureau, string | number | null>> = {};
    for (const bureau of bureaus) {
      const account = match.entries[bureau];
      if (account) values[bureau] = check.extract(account);
    }

    const uniqueValues = new Set(
      Object.values(values)
        .filter((v) => v !== null && v !== undefined)
        .map(String),
    );

    if (uniqueValues.size > 1) {
      const bureauDetails = Object.entries(values)
        .map(([b, v]) => `${b}: "${v}"`)
        .join(", ");

      discrepancies.push({
        id: randomUUID(),
        accountMatch: match,
        field: check.field,
        values,
        violationType: check.violationType,
        severity: check.severity,
        legalBasis: check.legalBasis,
        description: `${check.field} mismatch for ${match.creditorName}: ${bureauDetails}`,
      });
    }
  }

  return discrepancies;
}

function detectPaymentHistoryDiscrepancies(match: AccountMatch): Discrepancy[] {
  const discrepancies: Discrepancy[] = [];
  const bureaus = Object.keys(match.entries) as Bureau[];
  if (bureaus.length < 2) return discrepancies;

  const allMonths = new Set<string>();
  for (const bureau of bureaus) {
    const account = match.entries[bureau];
    if (account) {
      for (const entry of account.paymentHistory) {
        allMonths.add(entry.month);
      }
    }
  }

  for (const month of allMonths) {
    const values: Partial<Record<Bureau, string | number | null>> = {};
    for (const bureau of bureaus) {
      const account = match.entries[bureau];
      if (account) {
        const entry = account.paymentHistory.find((e) => e.month === month);
        values[bureau] = entry?.status ?? null;
      }
    }

    const nonNull = Object.values(values).filter((v) => v !== null);
    const uniqueValues = new Set(nonNull.map(String));

    if (uniqueValues.size > 1) {
      const bureauDetails = Object.entries(values)
        .filter(([, v]) => v !== null)
        .map(([b, v]) => `${b}: "${v}"`)
        .join(", ");

      discrepancies.push({
        id: randomUUID(),
        accountMatch: match,
        field: `paymentHistory.${month}`,
        values,
        violationType: "date_mismatch",
        severity: "critical",
        legalBasis:
          "FCRA § 611(a)(1)(A) — Payment status for the same month reported differently across bureaus. Metro 2 Field 25 (Payment Rating) conflict constitutes verifiable inaccuracy.",
        description: `Payment status mismatch for ${match.creditorName} in ${month}: ${bureauDetails}`,
      });
    }
  }

  return discrepancies;
}

function detectDuplicateAccounts(
  reports: ParsedCreditReport[],
): Discrepancy[] {
  const discrepancies: Discrepancy[] = [];

  for (const report of reports) {
    const seen = new Map<string, ParsedAccount>();
    for (const account of report.accounts) {
      const key = normalizeCreditor(account.creditorName) + ":" + account.accountNumber;
      if (seen.has(key)) {
        discrepancies.push({
          id: randomUUID(),
          accountMatch: {
            creditorName: account.creditorName,
            accountNumberMask: account.accountNumber,
            entries: { [report.bureau]: account },
          },
          field: "duplicate",
          values: { [report.bureau]: `${account.creditorName} appears multiple times` },
          violationType: "duplicate_account",
          severity: "high",
          legalBasis:
            "FCRA § 611(a) — Duplicate tradeline reporting inflates debt-to-credit ratio and constitutes inaccurate reporting.",
          description: `Duplicate account "${account.creditorName}" on ${report.bureau}`,
        });
      } else {
        seen.set(key, account);
      }
    }
  }

  return discrepancies;
}

function parseDate(raw: string): Date | null {
  const parts = raw.split(/[\/\-]/);
  if (parts.length < 3) return null;
  const month = parseInt(parts[0]!, 10);
  const day = parseInt(parts[1]!, 10);
  let year = parseInt(parts[2]!, 10);
  if (year < 100) year += 2000;
  const d = new Date(year, month - 1, day);
  return Number.isNaN(d.getTime()) ? null : d;
}

function detectObsoleteItems(reports: ParsedCreditReport[]): Discrepancy[] {
  const discrepancies: Discrepancy[] = [];
  const now = new Date();
  const sevenYearsAgo = new Date(now.getFullYear() - 7, now.getMonth(), now.getDate());

  for (const report of reports) {
    for (const account of report.accounts) {
      if (account.accountStatus !== "collection" && account.accountStatus !== "charge_off") continue;

      const referenceDate =
        account.dateOfFirstDelinquency ?? account.dateReported ?? null;
      if (!referenceDate) continue;

      const parsed = parseDate(referenceDate);
      if (!parsed) continue;

      if (parsed < sevenYearsAgo) {
        const dateLabel = account.dateOfFirstDelinquency
          ? `first delinquency ${referenceDate}`
          : `reported ${referenceDate}`;
        discrepancies.push({
          id: randomUUID(),
          accountMatch: {
            creditorName: account.creditorName,
            accountNumberMask: account.accountNumber,
            entries: { [report.bureau]: account },
          },
          field: "obsolete",
          values: { [report.bureau]: referenceDate },
          violationType: "section_605_obsolete",
          severity: "critical",
          legalBasis:
            "FCRA § 605(a) — Negative information older than 7 years from date of first delinquency must be removed from consumer reports.",
          description: `"${account.creditorName}" on ${report.bureau} ${dateLabel} exceeds the 7-year reporting window.`,
        });
      }
    }
  }

  return discrepancies;
}

// ─── Main Audit Orchestrator ─────────────────────────────────────────────────

const DAMAGES_PER_VIOLATION = 1000;

export function runAudit(
  clientId: string,
  reports: ParsedCreditReport[],
): AuditResult {
  const t0 = performance.now();

  const matchedAccounts = matchAccountsAcrossBureaus(reports);

  const discrepancies: Discrepancy[] = [];

  for (const match of matchedAccounts) {
    discrepancies.push(...detectFieldDiscrepancies(match));
    discrepancies.push(...detectPaymentHistoryDiscrepancies(match));
  }

  discrepancies.push(...detectDuplicateAccounts(reports));
  discrepancies.push(...detectObsoleteItems(reports));

  const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
  const totalViolations = discrepancies.length;
  const estimatedDamages = totalViolations * DAMAGES_PER_VIOLATION;

  const criticalCount = discrepancies.filter((d) => d.severity === "critical").length;
  const highCount = discrepancies.filter((d) => d.severity === "high").length;

  const summary = [
    `Audit completed in ${elapsed}s.`,
    `Found ${totalViolations} violation${totalViolations !== 1 ? "s" : ""} across ${reports.length} bureau report${reports.length !== 1 ? "s" : ""}.`,
    criticalCount > 0 ? `${criticalCount} CRITICAL violations (payment history conflicts, obsolete items).` : "",
    highCount > 0 ? `${highCount} HIGH severity violations (balance/status mismatches, duplicates).` : "",
    totalViolations > 0
      ? `Estimated statutory damages: $${estimatedDamages.toLocaleString()} ($1,000 per violation under FCRA § 616/617).`
      : "No discrepancies detected. Report data appears consistent across bureaus.",
  ]
    .filter(Boolean)
    .join(" ");

  log.info({ totalViolations, elapsed, estimatedDamages }, "Audit complete");

  return {
    id: randomUUID(),
    clientId,
    createdAt: new Date().toISOString(),
    reports,
    matchedAccounts,
    discrepancies,
    segmentErrors: [],
    zombieDebts: [],
    totalViolations,
    estimatedDamages,
    summary,
  };
}
