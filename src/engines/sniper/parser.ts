import type {
  Bureau,
  ParsedCreditReport,
  ParsedAccount,
  PaymentHistoryEntry,
  PaymentStatus,
  AccountStatus,
  Inquiry,
  PublicRecord,
} from "../../types/index.js";
import { log } from "../../lib/logger.js";

// ─── Bureau Detection ────────────────────────────────────────────────────────

const bureauPatterns: Record<Bureau, RegExp[]> = {
  equifax: [/equifax/i, /EFX/i, /Equifax Information Services/i],
  experian: [/experian/i, /Experian Information Solutions/i],
  transunion: [/transunion/i, /trans\s*union/i, /TransUnion LLC/i],
};

export function detectBureau(text: string): Bureau {
  for (const [bureau, patterns] of Object.entries(bureauPatterns)) {
    if (patterns.some((p) => p.test(text))) return bureau as Bureau;
  }
  log.warn("Could not auto-detect bureau — defaulting to equifax");
  return "equifax";
}

// ─── Personal Info Extraction ────────────────────────────────────────────────

function extractPersonalInfo(text: string) {
  const nameMatch = text.match(/(?:Name|Consumer)[:\s]+([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){1,3})/);
  const ssnMatch = text.match(/(?:SSN|Social)[:\s#]*(?:XXX-XX-|[\d*]{3}-[\d*]{2}-)(\d{4})/);
  const dobMatch = text.match(/(?:DOB|Date of Birth|Born)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
  const addresses = [...text.matchAll(/(\d+\s+[A-Z][A-Za-z\s]+(?:St|Ave|Blvd|Dr|Rd|Ln|Ct|Way|Pl|Cir)\.?[,\s]+[A-Z][A-Za-z\s]+,?\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)/g)]
    .map((m) => m[1]?.trim())
    .filter((a): a is string => !!a);

  return {
    name: nameMatch?.[1]?.trim() ?? "Unknown",
    ssn: ssnMatch?.[1] ?? "0000",
    dob: dobMatch?.[1] ?? null,
    addresses: addresses.length > 0 ? addresses : ["Address not parsed"],
  };
}

// ─── Account Parsing ─────────────────────────────────────────────────────────

const statusMap: Record<string, AccountStatus> = {
  "paid/closed": "paid",
  "charged off": "charge_off",
  "charge-off": "charge_off",
  collection: "collection",
  current: "open",
  settled: "settled",
  closed: "closed",
  open: "open",
  paid: "paid",
};

const paymentMap: Record<string, PaymentStatus> = {
  ok: "current",
  current: "current",
  "30": "late_30",
  "60": "late_60",
  "90": "late_90",
  "120": "late_120",
  "150": "late_150",
  "180": "late_180",
  co: "charge_off",
  cl: "collection",
};

function parsePaymentStatus(raw: string): PaymentStatus {
  const lower = raw.toLowerCase().trim();
  return paymentMap[lower] ?? "unknown";
}

function parseAccountStatus(raw: string): AccountStatus {
  const lower = raw.toLowerCase().trim();
  for (const [key, value] of Object.entries(statusMap)) {
    if (lower.includes(key)) return value;
  }
  return "unknown";
}

function parseMoney(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[$,\s]/g, "");
  const num = Number(cleaned);
  return Number.isNaN(num) ? null : num;
}

/**
 * Split OCR text into account blocks and extract structured data.
 * This handles the common credit report format where accounts are
 * separated by lines/headers.
 */
export function parseAccounts(text: string): ParsedAccount[] {
  const accounts: ParsedAccount[] = [];

  // Split on account name headers only (not "Account #" which is the number field)
  const blocks = text.split(/(?=(?:Account\s+Name|Creditor\s*(?:Name)?|Tradeline\s*(?:Name)?)\s*[:\s])/i);

  for (const block of blocks) {
    if (block.trim().length < 30) continue;

    const creditorMatch = block.match(/(?:Account\s+Name|Creditor\s*(?:Name)?|Tradeline\s*(?:Name)?)[:\s]+([^\n]+)/i);
    if (!creditorMatch) continue;

    const acctNumMatch = block.match(/(?:Account\s*(?:#|Number|No))[:\s]+([X\d*-]+)/i);
    const typeMatch = block.match(/(?:Type|Account Type)[:\s]+([^\n]+)/i);
    const statusMatch = block.match(/(?:Status|Account Status|Condition)[:\s]+([^\n]+)/i);
    const balanceMatch = block.match(/(?:Balance|Current Balance)[:\s]+\$?([\d,.]+)/i);
    const limitMatch = block.match(/(?:Credit Limit|Limit)[:\s]+\$?([\d,.]+)/i);
    const openedMatch = block.match(/(?:Date Opened|Opened)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
    const reportedMatch = block.match(/(?:Date Reported|Reported|Last Reported)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
    const dofdMatch = block.match(/(?:Date of First Delinquency|First Delinquency|DOFD|Date of 1st Delinquency|First Reported Late)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
    const highMatch = block.match(/(?:High Balance|Highest Balance)[:\s]+\$?([\d,.]+)/i);
    const monthlyMatch = block.match(/(?:Monthly Payment|Payment)[:\s]+\$?([\d,.]+)/i);

    // Parse payment history grid
    const paymentHistory: PaymentHistoryEntry[] = [];
    const historyMatch = block.match(/(?:Payment History|Payment Pattern|Status History)[:\s]*\n([\s\S]*?)(?:\n\s*\n|$)/i);
    if (historyMatch?.[1]) {
      const months = [...historyMatch[1].matchAll(/(\d{4}[\/\-]\d{2})\s*[:\-]?\s*(\w+)/g)];
      for (const m of months) {
        if (m[1] && m[2]) {
          paymentHistory.push({
            month: m[1].replace("/", "-"),
            status: parsePaymentStatus(m[2]),
          });
        }
      }
    }

    const remarks: string[] = [];
    const remarkMatch = block.match(/(?:Remarks?|Comments?)[:\s]+([^\n]+)/i);
    if (remarkMatch?.[1]) remarks.push(remarkMatch[1].trim());

    accounts.push({
      creditorName: creditorMatch[1]!.trim(),
      accountNumber: acctNumMatch?.[1]?.trim() ?? "XXXX",
      accountType: typeMatch?.[1]?.trim() ?? "Unknown",
      accountStatus: parseAccountStatus(statusMatch?.[1] ?? ""),
      balance: parseMoney(balanceMatch?.[1]),
      creditLimit: parseMoney(limitMatch?.[1]),
      dateOpened: openedMatch?.[1] ?? null,
      dateReported: reportedMatch?.[1] ?? null,
      dateClosed: null,
      dateOfLastActivity: null,
      dateOfFirstDelinquency: dofdMatch?.[1] ?? null,
      paymentHistory,
      highBalance: parseMoney(highMatch?.[1]),
      monthlyPayment: parseMoney(monthlyMatch?.[1]),
      remarks,
      originalCreditor: null,
      collectionAgency: null,
      metro2SegmentId: null,
    });
  }

  log.info({ count: accounts.length }, "Parsed accounts from report text");
  return accounts;
}

// ─── Inquiry & Public Record Parsing ─────────────────────────────────────────

function parseInquiries(text: string): Inquiry[] {
  const inquiries: Inquiry[] = [];
  const section = text.match(/(?:Inquiries|Credit Inquiries)([\s\S]*?)(?:Public Records|$)/i);
  if (!section?.[1]) return inquiries;

  const lines = [...section[1].matchAll(/([A-Z][A-Za-z\s&'.]+)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*(Hard|Soft)?/gi)];
  for (const m of lines) {
    if (m[1] && m[2]) {
      inquiries.push({
        creditorName: m[1].trim(),
        date: m[2],
        type: m[3]?.toLowerCase() === "soft" ? "soft" : m[3]?.toLowerCase() === "hard" ? "hard" : "unknown",
      });
    }
  }
  return inquiries;
}

function parsePublicRecords(text: string): PublicRecord[] {
  const records: PublicRecord[] = [];
  const section = text.match(/(?:Public Records)([\s\S]*?)(?:Inquiries|$)/i);
  if (!section?.[1]) return records;

  const blocks = section[1].split(/\n\s*\n/);
  for (const block of blocks) {
    if (block.trim().length < 10) continue;
    const typeMatch = block.match(/(?:Type)[:\s]+([^\n]+)/i);
    const courtMatch = block.match(/(?:Court|Source)[:\s]+([^\n]+)/i);
    const dateMatch = block.match(/(?:Filed|Date)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
    const amountMatch = block.match(/(?:Amount|Liability)[:\s]+\$?([\d,.]+)/i);
    const statusMatch = block.match(/(?:Status)[:\s]+([^\n]+)/i);

    if (typeMatch?.[1]) {
      records.push({
        type: typeMatch[1].trim(),
        court: courtMatch?.[1]?.trim() ?? null,
        date: dateMatch?.[1] ?? null,
        amount: parseMoney(amountMatch?.[1]),
        status: statusMatch?.[1]?.trim() ?? "Unknown",
      });
    }
  }
  return records;
}

// ─── Main Parser ─────────────────────────────────────────────────────────────

export function parseReport(text: string, bureauOverride?: Bureau): ParsedCreditReport {
  const bureau = bureauOverride ?? detectBureau(text);
  const personalInfo = extractPersonalInfo(text);
  const accounts = parseAccounts(text);
  const inquiries = parseInquiries(text);
  const publicRecords = parsePublicRecords(text);

  const dateMatch = text.match(/(?:Report Date|Date Generated|As of)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);

  return {
    bureau,
    reportDate: dateMatch?.[1] ?? new Date().toISOString().split("T")[0]!,
    personalInfo,
    accounts,
    inquiries,
    publicRecords,
    rawText: text,
  };
}
