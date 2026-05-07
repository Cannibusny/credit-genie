// Credit Report Text Parser
// Parses raw credit report text (from copy-paste or PDF extraction) into CreditAccount objects.
// Handles common formats from Experian, TransUnion, Equifax, and AnnualCreditReport.com

import type { CreditAccount, Bureau, AccountType, AccountStatus, PaymentStatus } from "../types/index.js";

interface ParseResult {
  accounts: Partial<CreditAccount>[];
  personalInfo: {
    name: string | null;
    addresses: string[];
    ssn: string | null;
  };
  bureau: Bureau | null;
  errors: string[];
  rawSections: string[];
}

export function parseReportText(text: string, defaultBureau: Bureau = "equifax"): ParseResult {
  const result: ParseResult = {
    accounts: [],
    personalInfo: { name: null, addresses: [], ssn: null },
    bureau: null,
    errors: [],
    rawSections: [],
  };

  if (!text || text.trim().length < 50) {
    result.errors.push("Text too short to be a credit report. Please paste the full report text.");
    return result;
  }

  // Detect bureau from text
  result.bureau = detectBureau(text) ?? defaultBureau;

  // Extract personal info
  result.personalInfo = extractPersonalInfo(text);

  // Split into account sections and parse each
  const sections = splitIntoAccountSections(text);
  result.rawSections = sections;

  for (const section of sections) {
    const account = parseAccountSection(section, result.bureau);
    if (account && account.creditorName) {
      result.accounts.push(account);
    }
  }

  if (result.accounts.length === 0) {
    result.errors.push("Could not parse any accounts from the provided text. Try pasting a different section or the full report.");
  }

  return result;
}

function detectBureau(text: string): Bureau | null {
  const lower = text.toLowerCase();
  if (lower.includes("experian") || lower.includes("exp ")) return "experian";
  if (lower.includes("transunion") || lower.includes("trans union")) return "transunion";
  if (lower.includes("equifax")) return "equifax";
  return null;
}

function extractPersonalInfo(text: string): ParseResult["personalInfo"] {
  const info: ParseResult["personalInfo"] = { name: null, addresses: [], ssn: null };

  // Name extraction (use [ \t] instead of \s to avoid capturing across newlines)
  const namePatterns = [
    /(?:name|consumer|borrower)[:\s]*([A-Z][A-Za-z]+[ \t]+[A-Z][A-Za-z]+(?:[ \t]+[A-Z][A-Za-z]+)?)/i,
    /^([A-Z][A-Z]+[ \t]+[A-Z][A-Z]+(?:[ \t]+[A-Z])?)[ \t]*$/m,
  ];
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) { info.name = match[1].trim(); break; }
  }

  // SSN (last 4)
  const ssnMatch = text.match(/(?:SSN|Social)[:\s]*(?:XXX-XX-|[\d*]{5,7})(\d{4})/i);
  if (ssnMatch?.[1]) info.ssn = ssnMatch[1];

  // Addresses
  const addrPattern = /(\d+\s+[A-Za-z0-9\s]+(?:St|Ave|Rd|Dr|Blvd|Ln|Way|Ct|Pl|Cir)[.\s]*(?:#\s*\d+|Apt\s*\d+|Unit\s*\d+)?[\s,]*[A-Za-z\s]+,?\s*[A-Z]{2}\s+\d{5})/gi;
  const addrMatches = text.match(addrPattern);
  if (addrMatches) {
    info.addresses = [...new Set(addrMatches.map(a => a.trim()))].slice(0, 5);
  }

  return info;
}

function splitIntoAccountSections(text: string): string[] {
  const sections: string[] = [];

  // Try splitting by separator lines FIRST (strongest signal of account boundaries)
  const sepSplit = text.split(/[-=_]{10,}/).filter(c => c.trim().length > 20);
  if (sepSplit.length > 2) {
    return filterNonAccountSections(sepSplit);
  }

  // Try splitting by double newlines followed by a capitalized word (common in text reports)
  const chunks = text.split(/\n{2,}(?=[A-Z])/).filter(c => c.trim().length > 20);
  if (chunks.length > 2) {
    return filterNonAccountSections(chunks);
  }

  // Fallback: look for account-like patterns and extract surrounding context
  const accountStartPattern = /(?:^|\n)([A-Z][A-Z\s&.,'()-]+(?:BANK|CREDIT|FINANCIAL|CAPITAL|AMERICAN|DISCOVER|CHASE|CITI|WELLS|SYNCHRONY|PORTFOLIO|MIDLAND|CAVALRY|ENCORE|HOSPITAL|MEDICAL|HEALTH|DOCTOR)[A-Z\s&.,'()-]*)/gm;
  let match;
  const positions: number[] = [];
  while ((match = accountStartPattern.exec(text)) !== null) {
    positions.push(match.index);
  }

  if (positions.length > 0) {
    for (let i = 0; i < positions.length; i++) {
      const start = positions[i] ?? 0;
      const end = positions[i + 1] ?? text.length;
      const section = text.slice(start, end);
      if (section.trim().length > 20) {
        sections.push(section.trim());
      }
    }
    return sections;
  }

  // Last resort: treat entire text as one section
  return [text];
}

function filterNonAccountSections(sections: string[]): string[] {
  return sections.filter(section => {
    const trimmed = section.trim();
    // Skip sections that are just report headers or personal info without account data
    const hasAccountIndicator =
      /account\s*#/i.test(trimmed) ||
      /balance[:\s]/i.test(trimmed) ||
      /(?:credit\s*limit|limit)[:\s]/i.test(trimmed) ||
      /(?:status|type)[:\s]/i.test(trimmed) ||
      /(?:date\s*opened|opened)[:\s]/i.test(trimmed) ||
      /(?:payment|monthly)/i.test(trimmed) ||
      /(?:collection|derogatory|charge.?off)/i.test(trimmed) ||
      /(?:revolving|installment|mortgage)/i.test(trimmed);
    return hasAccountIndicator;
  });
}

function parseAccountSection(section: string, bureau: Bureau): Partial<CreditAccount> | null {
  const account: Partial<CreditAccount> = {
    bureaus: [bureau],
    bureauData: {},
    paymentHistory: [],
    remarks: [],
    source: "import",
  };

  // Creditor name — first significant capitalized line
  const creditorMatch = section.match(/^([A-Z][A-Za-z\s&.,'()-]{2,50})(?:\n|$)/m)
    ?? section.match(/(?:creditor|company|account)\s*(?:name)?[:\s]*(.+)/i);
  if (creditorMatch?.[1]) {
    account.creditorName = creditorMatch[1].trim().replace(/\s+/g, " ");
  }

  // Account number
  const acctNumMatch = section.match(/(?:account|acct)\s*(?:#|number|no)[:\s]*([A-Za-z0-9*X-]+)/i);
  if (acctNumMatch?.[1]) {
    const num = acctNumMatch[1].replace(/[^0-9]/g, "");
    account.accountNumber = num.slice(-4) || acctNumMatch[1].slice(-4);
  }

  // Account type
  const typeIndicators: [RegExp, AccountType][] = [
    [/revolving|credit\s*card|visa|mastercard|amex|discover/i, "revolving"],
    [/installment|personal\s*loan|student\s*loan/i, "installment"],
    [/mortgage|home\s*loan/i, "mortgage"],
    [/collection|collections/i, "collection"],
    [/auto\s*loan|vehicle|automobile/i, "auto_loan"],
    [/student/i, "student_loan"],
  ];
  for (const [pattern, type] of typeIndicators) {
    if (pattern.test(section)) {
      account.accountType = type;
      break;
    }
  }
  if (!account.accountType) account.accountType = "revolving";

  // Status
  const statusIndicators: [RegExp, AccountStatus][] = [
    [/(?:status|condition)[:\s]*(?:open|current|pays?\s*as\s*agreed)/i, "open"],
    [/(?:status|condition)[:\s]*closed/i, "closed"],
    [/(?:status|condition)[:\s]*(?:collection|sold|transferred)/i, "collection"],
    [/charge[\s-]*off/i, "charge_off"],
    [/(?:status|condition)[:\s]*paid/i, "paid"],
    [/(?:status|condition)[:\s]*settled/i, "settled"],
  ];
  for (const [pattern, status] of statusIndicators) {
    if (pattern.test(section)) {
      account.accountStatus = status;
      break;
    }
  }
  if (!account.accountStatus) account.accountStatus = "open";

  // Balance
  const balanceMatch = section.match(/(?:balance|amount\s*owed|current\s*balance)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i);
  if (balanceMatch?.[1]) {
    account.balance = parseFloat(balanceMatch[1].replace(/,/g, ""));
  }

  // Credit limit
  const limitMatch = section.match(/(?:credit\s*limit|high\s*credit|limit)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i);
  if (limitMatch?.[1]) {
    account.creditLimit = parseFloat(limitMatch[1].replace(/,/g, ""));
  }

  // High balance
  const highMatch = section.match(/(?:high\s*balance|highest\s*balance)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i);
  if (highMatch?.[1]) {
    account.highBalance = parseFloat(highMatch[1].replace(/,/g, ""));
  }

  // Monthly payment
  const paymentMatch = section.match(/(?:monthly\s*payment|payment\s*amount)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i);
  if (paymentMatch?.[1]) {
    account.monthlyPayment = parseFloat(paymentMatch[1].replace(/,/g, ""));
  }

  // Date opened
  const openedMatch = section.match(/(?:date\s*opened|opened|open\s*date)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\w+\s+\d{4}|\d{4}-\d{2}-\d{2})/i);
  if (openedMatch?.[1]) {
    account.dateOpened = normalizeDate(openedMatch[1]);
  }

  // Date reported
  const reportedMatch = section.match(/(?:date\s*reported|reported|last\s*reported)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\w+\s+\d{4}|\d{4}-\d{2}-\d{2})/i);
  if (reportedMatch?.[1]) {
    account.dateReported = normalizeDate(reportedMatch[1]);
  }

  // Original creditor (for collections)
  const origMatch = section.match(/(?:original\s*creditor|original\s*lender)[:\s]*(.+)/i);
  if (origMatch?.[1]) {
    account.originalCreditor = origMatch[1].trim();
  }

  // Negative indicators
  const negativePatterns = [
    /late\s*(?:30|60|90|120|150|180)/i,
    /charge[\s-]*off/i,
    /collection/i,
    /derogatory/i,
    /delinquen/i,
    /past\s*due/i,
    /repossess/i,
    /foreclosure/i,
  ];
  account.isNegative = negativePatterns.some(p => p.test(section));

  if (account.isNegative) {
    if (/charge[\s-]*off/i.test(section)) account.negativeReason = "charge_off";
    else if (/late/i.test(section)) account.negativeReason = "late_payment";
    else if (/collection/i.test(section)) account.negativeReason = "collection";
  }

  // Medical detection
  account.isMedical = /(?:medical|hospital|health|doctor|physician|clinic|lab|radiology|emergency|urgent\s*care)/i.test(section);

  // AU detection
  account.isAuthorizedUser = /authorized\s*user/i.test(section);

  return account;
}

function normalizeDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  } catch {}

  // Try MM/DD/YYYY
  const mdyMatch = dateStr.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (mdyMatch) {
    const year = mdyMatch[3]?.length === 2 ? `20${mdyMatch[3]}` : mdyMatch[3];
    return `${year}-${mdyMatch[1]?.padStart(2, "0")}-${mdyMatch[2]?.padStart(2, "0")}`;
  }

  return dateStr;
}
