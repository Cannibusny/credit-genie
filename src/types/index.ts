// ─── Credit Genie Core Types ─────────────────────────────────────────────────

export type Bureau = "equifax" | "experian" | "transunion";

export type AccountStatus =
  | "open"
  | "closed"
  | "collection"
  | "charge_off"
  | "paid"
  | "settled"
  | "unknown";

export type PaymentStatus =
  | "current"
  | "late_30"
  | "late_60"
  | "late_90"
  | "late_120"
  | "late_150"
  | "late_180"
  | "collection"
  | "charge_off"
  | "unknown";

export type DisputeStatus =
  | "draft"
  | "sent"
  | "pending_response"
  | "verified"
  | "deleted"
  | "updated"
  | "escalated_litigation"
  | "expired";

export type ViolationType =
  | "section_611_inaccurate"
  | "section_611_incomplete"
  | "section_623_failure_to_investigate"
  | "section_605_obsolete"
  | "section_609_disclosure"
  | "metro2_format_error"
  | "cross_bureau_discrepancy"
  | "balance_mismatch"
  | "date_mismatch"
  | "status_mismatch"
  | "duplicate_account";

// ─── Raw parsed data from a single bureau report ─────────────────────────────

export interface ParsedAccount {
  creditorName: string;
  accountNumber: string; // last 4 or masked
  accountType: string;
  accountStatus: AccountStatus;
  balance: number | null;
  creditLimit: number | null;
  dateOpened: string | null; // ISO date
  dateReported: string | null;
  dateOfFirstDelinquency: string | null;
  paymentHistory: PaymentHistoryEntry[];
  highBalance: number | null;
  monthlyPayment: number | null;
  remarks: string[];
}

export interface PaymentHistoryEntry {
  month: string; // YYYY-MM
  status: PaymentStatus;
}

export interface ParsedCreditReport {
  bureau: Bureau;
  reportDate: string; // ISO date
  personalInfo: {
    name: string;
    ssn: string; // last 4 only
    dob: string | null;
    addresses: string[];
  };
  accounts: ParsedAccount[];
  inquiries: Inquiry[];
  publicRecords: PublicRecord[];
  rawText: string; // OCR output for audit trail
}

export interface Inquiry {
  creditorName: string;
  date: string;
  type: "hard" | "soft" | "unknown";
}

export interface PublicRecord {
  type: string;
  court: string | null;
  date: string | null;
  amount: number | null;
  status: string;
}

// ─── Cross-Bureau Analysis ──────────────────────────────────────────────────

export interface AccountMatch {
  creditorName: string;
  accountNumberMask: string;
  entries: Partial<Record<Bureau, ParsedAccount>>;
}

export interface Discrepancy {
  id: string;
  accountMatch: AccountMatch;
  field: string; // e.g., "paymentHistory.2024-10", "balance", "dateOpened"
  values: Partial<Record<Bureau, string | number | null>>;
  violationType: ViolationType;
  severity: "critical" | "high" | "medium" | "low";
  legalBasis: string; // FCRA section citation
  description: string;
}

export interface AuditResult {
  id: string;
  clientId: string;
  createdAt: string;
  reports: ParsedCreditReport[];
  matchedAccounts: AccountMatch[];
  discrepancies: Discrepancy[];
  totalViolations: number;
  estimatedDamages: number; // $1,000 per violation baseline
  summary: string; // AI-generated plain-English summary
}

// ─── Disputes & Litigation ──────────────────────────────────────────────────

export interface Dispute {
  id: string;
  clientId: string;
  auditId: string;
  discrepancyId: string;
  bureau: Bureau;
  status: DisputeStatus;
  letterContent: string;
  sentAt: string | null;
  responseDeadline: string | null;
  responseReceivedAt: string | null;
  responseContent: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LitigationPackage {
  id: string;
  clientId: string;
  disputes: Dispute[]; // disputes that were "verified" but not corrected
  jurisdiction: JurisdictionInfo;
  courtForms: GeneratedDocument[];
  estimatedDamages: number;
  createdAt: string;
}

export interface JurisdictionInfo {
  state: string;
  county: string;
  courtName: string;
  filingFee: number;
  smallClaimsLimit: number;
}

export interface GeneratedDocument {
  type: "dispute_letter" | "court_complaint" | "summons" | "evidence_exhibit";
  fileName: string;
  content: string; // HTML or Markdown
  generatedAt: string;
}

// ─── Client & Credit Building ───────────────────────────────────────────────

export interface Client {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  state: string;
  county: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreditBuildingRecommendation {
  type: "rent_reporting" | "utility_reporting" | "secured_card" | "credit_builder_loan" | "authorized_user" | "streaming_reporting";
  provider: string;
  description: string;
  estimatedScoreImpact: number; // points
  monthlyCost: number | null;
  requirements: string[];
}

export interface CashFlowAnalysis {
  clientId: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  rentPayment: number | null;
  utilityPayments: number;
  subscriptions: { name: string; amount: number }[];
  creditCapacity: number; // estimated credit they can handle
  recommendations: CreditBuildingRecommendation[];
}
