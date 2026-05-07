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
  | "metro2_segment_error"
  | "cross_bureau_discrepancy"
  | "balance_mismatch"
  | "date_mismatch"
  | "status_mismatch"
  | "duplicate_account"
  | "zombie_debt"
  | "date_sequence_error";

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
  dateClosed: string | null;
  dateOfLastActivity: string | null;
  dateOfFirstDelinquency: string | null;
  paymentHistory: PaymentHistoryEntry[];
  highBalance: number | null;
  monthlyPayment: number | null;
  remarks: string[];
  originalCreditor: string | null;
  collectionAgency: string | null;
  metro2SegmentId: string | null;
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
  segmentErrors: SegmentError[];
  zombieDebts: ZombieDebt[];
  totalViolations: number;
  estimatedDamages: number; // $1,000 per violation baseline
  summary: string; // AI-generated plain-English summary
}

// ─── Metro 2 Segment Errors ─────────────────────────────────────────────────

export interface SegmentError {
  id: string;
  accountMatch: AccountMatch;
  bureau: Bureau;
  errorType: "date_sequence" | "invalid_status_combo" | "missing_required_field" | "format_violation";
  field1: string;
  field1Value: string | null;
  field2: string;
  field2Value: string | null;
  description: string;
  legalBasis: string;
  severity: "critical" | "high" | "medium";
}

// ─── Shadow / Zombie Debt Detection ─────────────────────────────────────────

export interface ZombieDebt {
  id: string;
  originalCreditor: string;
  agencies: { agency: string; bureau: Bureau; balance: number | null; accountNumber: string }[];
  description: string;
  legalBasis: string;
  estimatedDamage: number;
}

// ─── Disputes & Litigation ──────────────────────────────────────────────────

export interface Dispute {
  id: string;
  clientId: string;
  auditId: string;
  discrepancyId: string;
  bureau: Bureau;
  status: DisputeStatus;
  round: number; // Round 1, 2, 3...
  letterContent: string;
  formId: string | null; // Form ID reference
  sentAt: string | null;
  responseDeadline: string | null;
  responseReceivedAt: string | null;
  responseContent: string | null;
  movSentAt: string | null; // Method of Verification sent
  movResponseAt: string | null;
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
  type: "dispute_letter" | "court_complaint" | "summons" | "evidence_exhibit"
    | "proof_of_service" | "cover_letter" | "mov_letter" | "goodwill_letter"
    | "debt_validation" | "pay_for_delete" | "cfpb_complaint" | "cease_desist"
    | "intent_to_sue";
  fileName: string;
  content: string;
  generatedAt: string;
}

// ─── Client & Profiles ──────────────────────────────────────────────────────

export interface Client {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  ssn: string | null; // last 4 digits only
  dob: string | null;
  street: string | null;
  city: string | null;
  state: string;
  county: string;
  zip: string | null;
  notes: ClientNote[];
  documents: VaultDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface ClientNote {
  id: string;
  content: string;
  createdAt: string;
}

// ─── Score Tracking ─────────────────────────────────────────────────────────

export interface ScoreEntry {
  id: string;
  clientId: string;
  bureau: Bureau;
  score: number;
  scoreModel: "fico8" | "fico9" | "vantage3" | "vantage4" | "unknown";
  recordedAt: string; // ISO date
  source: "manual" | "import"; // how the score was entered
}

export interface ScoreGoal {
  clientId: string;
  targetScore: number;
  targetDate: string | null; // ISO date
  purpose: string; // e.g., "SBA Loan", "Mortgage", "Credit Card"
}

// ─── Manual Account Entry ───────────────────────────────────────────────────

export interface ManualAccount {
  id: string;
  clientId: string;
  creditorName: string;
  accountNumber: string;
  accountType: string;
  bureau: Bureau;
  accountStatus: AccountStatus;
  balance: number | null;
  creditLimit: number | null;
  dateOpened: string | null;
  dateClosed: string | null;
  dateOfFirstDelinquency: string | null;
  monthlyPayment: number | null;
  paymentStatus: PaymentStatus;
  isNegative: boolean;
  negativeReason: string | null; // "late_payment", "collection", "charge_off", etc.
  notes: string;
  createdAt: string;
}

// ─── AI Score Simulator ─────────────────────────────────────────────────────

export interface SimulationScenario {
  action: "remove_item" | "pay_down" | "add_tradeline" | "pay_off" | "dispute_inquiry";
  accountId: string | null;
  targetBalance: number | null;
  description: string;
}

export interface SimulationResult {
  clientId: string;
  currentScore: Partial<Record<Bureau, number>>;
  projectedScore: Partial<Record<Bureau, number>>;
  scoreDelta: Partial<Record<Bureau, number>>;
  scenarios: SimulationScenario[];
  factors: ScoreFactor[];
  dtiAnalysis: DTIAnalysis | null;
}

export interface ScoreFactor {
  category: "payment_history" | "utilization" | "age_of_credit" | "credit_mix" | "new_credit" | "derogatory";
  impact: "high_positive" | "positive" | "neutral" | "negative" | "high_negative";
  description: string;
  weight: number; // 0-100
}

export interface DTIAnalysis {
  totalMonthlyDebt: number;
  monthlyIncome: number;
  currentDTI: number; // percentage
  targetDTI: number; // recommended max
  debtPayoffOrder: { creditor: string; balance: number; monthlyPayment: number; priority: number }[];
  borrowingPower: number; // estimated max mortgage
}

// ─── Document Vault ─────────────────────────────────────────────────────────

export interface VaultDocument {
  id: string;
  clientId: string;
  type: "id" | "ssn_card" | "utility_bill" | "credit_report" | "dispute_letter"
    | "court_document" | "mail_receipt" | "other";
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  // Content stored in memory or file system; not in this type
}

// ─── Notifications & Alerts ─────────────────────────────────────────────────

export interface Alert {
  id: string;
  clientId: string;
  type: "deadline_approaching" | "deadline_expired" | "score_change" | "new_negative"
    | "dispute_response" | "bureau_pull" | "action_required";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// ─── Reporting ──────────────────────────────────────────────────────────────

export interface ClientReport {
  clientId: string;
  generatedAt: string;
  scoreHistory: ScoreEntry[];
  disputesSent: number;
  disputesResolved: number;
  itemsDeleted: number;
  itemsUpdated: number;
  estimatedSavings: number;
  rounds: DisputeRound[];
}

export interface DisputeRound {
  round: number;
  sentAt: string;
  totalDisputes: number;
  deleted: number;
  verified: number;
  updated: number;
  pending: number;
}

// ─── Form ID System ─────────────────────────────────────────────────────────

export interface DisputeTemplate {
  formId: string; // e.g., "Form-221"
  name: string; // e.g., "Late Payment Dispute"
  category: string; // e.g., "Late Payments"
  description: string;
  body: string; // Handlebars template with {{dynamic_brackets}}
  requiredFields: string[];
  legalCodes: string[]; // FCRA sections cited
  attackType: "bureau" | "furnisher" | "collector" | "cfpb";
}

export interface RenderedDocument {
  formId: string;
  formName: string;
  content: string;
  missingFields: string[];
  complete: boolean;
}

// ─── E-Oscar Attack ─────────────────────────────────────────────────────────

export interface EOscarCode {
  code: string; // 2-digit code
  meaning: string;
  counterStrategy: string;
  letterTemplate: string;
}

// ─── Tradeline Recommendations ──────────────────────────────────────────────

export interface TradelineRecommendation {
  id: string;
  type: "revolving" | "installment" | "authorized_user" | "secured_card" | "credit_builder_loan";
  provider: string;
  productName: string;
  creditLimit: number | null;
  annualFee: number;
  approvalLikelihood: number; // 0-100
  estimatedScoreImpact: number;
  requirements: string[];
  reasonRecommended: string; // e.g., "Client lacks revolving credit"
  applyUrl: string | null;
}

// ─── Credit Building (existing, enhanced) ───────────────────────────────────

export interface CreditBuildingRecommendation {
  type: "rent_reporting" | "utility_reporting" | "secured_card" | "credit_builder_loan" | "authorized_user" | "streaming_reporting";
  provider: string;
  description: string;
  estimatedScoreImpact: number;
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
  creditCapacity: number;
  recommendations: CreditBuildingRecommendation[];
}

// ─── Business Mode (stubs) ──────────────────────────────────────────────────

export type LeadStatus = "new" | "contacted" | "consultation" | "enrolled" | "active" | "completed" | "cancelled";

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: LeadStatus;
  source: string | null;
  assignedTo: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ─── 4-Stage Workflow ───────────────────────────────────────────────────────

export type WorkflowStage = "intake" | "strike" | "follow_up" | "rebuild";

export interface ClientWorkflow {
  clientId: string;
  currentStage: WorkflowStage;
  intake: { completedAt: string | null; violationsFound: number };
  strike: { completedAt: string | null; lettersSent: number; round: number };
  followUp: { completedAt: string | null; responsesReceived: number; movSent: number };
  rebuild: { completedAt: string | null; tradelinesAdded: number; scoreGain: number };
}
