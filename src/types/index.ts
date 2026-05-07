// ─── Credit Genie v3 — Unified Data Model ────────────────────────────────────
// All modules share the creditProfile object. Data entered once flows everywhere.

export type Bureau = "equifax" | "experian" | "transunion";

export type AccountType = "revolving" | "installment" | "mortgage" | "collection" | "student_loan" | "auto_loan" | "other";

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
  | "escalated_mov"
  | "escalated_cfpb"
  | "escalated_ag"
  | "escalated_litigation"
  | "expired"
  | "frivolous_rejected";

export type DisputeMethod = "online" | "certified_mail" | "fax" | "phone" | "cfpb" | "ag_complaint";

export type ViolationType =
  | "section_611_inaccurate"
  | "section_611_incomplete"
  | "section_611_failure_to_investigate"
  | "section_623_failure_to_investigate"
  | "section_605_obsolete"
  | "section_609_disclosure"
  | "section_1681i_max_accuracy"
  | "metro2_format_error"
  | "metro2_segment_error"
  | "cross_bureau_discrepancy"
  | "balance_mismatch"
  | "date_mismatch"
  | "status_mismatch"
  | "duplicate_account"
  | "zombie_debt"
  | "mixed_file"
  | "date_sequence_error"
  | "medical_under_500"
  | "medical_under_12_months"
  | "medical_ny_state_ban"
  | "limit_mismatch"
  | "payment_history_mismatch"
  | "address_mismatch"
  | "name_mismatch";

export type GoalType =
  | "buying_home"
  | "business_financing"
  | "renting_apartment"
  | "better_score"
  | "auto_loan"
  | "credit_card";

export type SubscriptionTier = "free" | "builder" | "authority";

// ─── UNIFIED CREDIT PROFILE ─────────────────────────────────────────────────
// The single source of truth shared across ALL 8 modules.

export interface CreditProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  ssn: string | null; // last 4 only
  dob: string | null;
  state: string; // for state-law filters
  county: string;
  addresses: ProfileAddress[];
  goal: GoalType | null;
  tier: SubscriptionTier;

  // All tradelines
  accounts: CreditAccount[];

  // Dispute history
  disputes: DisputeRecord[];

  // Bureau behavior profiles
  bureauProfile: Record<Bureau, BureauProfile>;

  // Medical debts (separate for state-law engine)
  medicalDebts: MedicalDebt[];

  // If/Then advisory log
  ifthenLog: IfThenLogEntry[];

  // Score tracking
  scores: ScoreEntry[];
  scoreGoal: ScoreGoal | null;

  // Partners (Authority tier — business financing)
  partnerIds: string[];

  createdAt: string;
  updatedAt: string;
}

export interface ProfileAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  isCurrent: boolean;
  verifiedAt: string | null;
}

// ─── CREDIT ACCOUNT (tradeline) ─────────────────────────────────────────────

export interface CreditAccount {
  id: string;
  creditorName: string;
  accountNumber: string; // last 4 or masked
  accountType: AccountType;
  accountStatus: AccountStatus;
  balance: number | null;
  creditLimit: number | null;
  highBalance: number | null;
  monthlyPayment: number | null;
  dateOpened: string | null;
  dateClosed: string | null;
  dateReported: string | null;
  dateOfLastActivity: string | null;
  dateOfFirstDelinquency: string | null;
  paymentHistory: PaymentHistoryEntry[];
  remarks: string[];
  originalCreditor: string | null;
  collectionAgency: string | null;
  metro2SegmentId: string | null;

  // Which bureaus report this account
  bureaus: Bureau[];
  // Per-bureau data if different
  bureauData: Partial<Record<Bureau, BureauAccountSnapshot>>;

  // Module 1: Report Date Optimizer
  snapshotDate: number | null; // day of month statement closes
  paymentDueDate: number | null; // day of month payment is due
  lastTransactionDate: string | null; // Module 7: Dormant Monitor

  // Module 6: AU tracking
  isAuthorizedUser: boolean;
  primaryHolderName: string | null;

  // Flags
  isNegative: boolean;
  negativeReason: string | null;
  isMedical: boolean;
  isDisputed: boolean;

  source: "import" | "manual";
}

export interface BureauAccountSnapshot {
  balance: number | null;
  creditLimit: number | null;
  accountStatus: AccountStatus;
  dateOpened: string | null;
  dateClosed: string | null;
  dateReported: string | null;
  paymentStatus: PaymentStatus;
  remarks: string[];
}

export interface PaymentHistoryEntry {
  month: string; // YYYY-MM
  status: PaymentStatus;
}

// ─── BUREAU BEHAVIOR PROFILER ───────────────────────────────────────────────

export interface BureauProfile {
  bureau: Bureau;
  avgResponseDays: number;
  reliefRate: number; // percentage 0-100
  preferredChannel: DisputeMethod;
  investigationWindow: number; // days (30 or 45)
  notes: string;
  // Track actual user outcomes
  disputesSent: number;
  disputesWon: number;
  disputesVerified: number;
  frivolousRejections: number;
  lastUpdated: string;
}

// ─── DISPUTE RECORD ─────────────────────────────────────────────────────────

export interface DisputeRecord {
  id: string;
  accountId: string;
  bureau: Bureau;
  status: DisputeStatus;
  round: number;
  method: DisputeMethod;
  category: DisputeCategory;
  letterContent: string;
  formId: string | null;
  sentAt: string | null;
  responseDeadline: string | null;
  responseReceivedAt: string | null;
  responseContent: string | null;
  outcome: string | null;

  // MoV tracking
  movSentAt: string | null;
  movResponseAt: string | null;
  movResponseContent: string | null;

  // Escalation tracking
  cfpbFiledAt: string | null;
  agFiledAt: string | null;
  litigationFiledAt: string | null;

  createdAt: string;
  updatedAt: string;
}

export type DisputeCategory =
  | "payment_history"
  | "account_status"
  | "credit_limit"
  | "duplicate_listing"
  | "personal_info"
  | "outdated_negative"
  | "au_issue"
  | "mixed_file"
  | "medical_debt"
  | "collection"
  | "escalation_mov"
  | "escalation_cfpb"
  | "escalation_ag";

// ─── MEDICAL DEBT ───────────────────────────────────────────────────────────

export interface MedicalDebt {
  id: string;
  accountId: string; // links to CreditAccount
  provider: string;
  balance: number;
  age: number; // months since first reported
  dateOfService: string | null;
  insurancePending: boolean;
  stateReportable: boolean; // based on state law
  disputeStrategy: "non_reportable_under_500" | "premature_under_12_months" | "ny_state_ban" | "nsa_violation" | "pay_for_delete" | "standard";
}

// ─── IF/THEN ADVISORY LOG ───────────────────────────────────────────────────

export interface IfThenLogEntry {
  id: string;
  module: ModuleId;
  triggeredAt: string;
  condition: string; // the IF condition that fired
  recommendation: string; // the THEN action
  expectedImpact: string; // e.g., "+20-50 points within 1 billing cycle"
  actionTaken: boolean;
  actionTakenAt: string | null;
  actualScoreDelta: number | null; // measured after action
  dismissed: boolean;
}

export type ModuleId =
  | "report_date_optimizer"
  | "mixed_file_detector"
  | "dispute_calendar"
  | "mov_escalation"
  | "pay_for_delete"
  | "medical_debt"
  | "au_audit"
  | "credit_mix"
  | "dormant_monitor"
  | "master_advisory";

// ─── SCORE TRACKING ─────────────────────────────────────────────────────────

export interface ScoreEntry {
  id: string;
  profileId: string;
  bureau: Bureau;
  score: number;
  scoreModel: "fico8" | "fico9" | "vantage3" | "vantage4" | "unknown";
  recordedAt: string;
  source: "manual" | "import" | "soft_pull";
}

export interface ScoreGoal {
  targetScore: number;
  targetDate: string | null;
  purpose: GoalType;
  description: string;
}

// ─── MODULE 1: REPORT DATE OPTIMIZER ────────────────────────────────────────

export interface SnapshotAlert {
  id: string;
  profileId: string;
  accountId: string;
  creditorName: string;
  snapshotDate: number; // day of month
  currentBalance: number;
  creditLimit: number;
  currentUtilization: number; // percentage
  targetBalance: number; // what to pay down to
  targetUtilization: number; // target percentage
  alertDate: string; // 5 days before snapshot
  status: "pending" | "sent" | "acted" | "missed";
  expectedImpact: string;
}

export interface UtilizationCycle {
  profileId: string;
  accountId: string;
  month: string; // YYYY-MM
  reportedBalance: number;
  reportedUtilization: number;
  scoreBefore: number | null;
  scoreAfter: number | null;
  delta: number | null;
}

// ─── MODULE 2: MIXED FILE DETECTOR ─────────────────────────────────────────

export interface MixedFileFlag {
  id: string;
  profileId: string;
  accountId: string;
  reason: "name_mismatch" | "address_mismatch" | "single_bureau_negative" | "duplicate_collection" | "ssn_variant";
  details: string;
  affectedBureaus: Bureau[];
  disputeStrategy: string;
  identityDocsRequired: string[];
  severity: "critical" | "high" | "medium";
  resolved: boolean;
  resolvedAt: string | null;
}

// ─── MODULE 3: DISPUTE CALENDAR ─────────────────────────────────────────────

export interface DisputeCalendarEntry {
  id: string;
  profileId: string;
  month: number; // 1-4 in rolling window
  category: DisputeCategory;
  bureau: Bureau;
  accountId: string;
  scheduledDate: string;
  status: "scheduled" | "sent" | "completed" | "skipped";
  notes: string;
}

export interface DisputeCalendar {
  profileId: string;
  startDate: string;
  entries: DisputeCalendarEntry[];
  currentMonth: number; // 1-4
}

// ─── MODULE 4: MoV & REGULATORY ESCALATION ─────────────────────────────────

export interface MoVDemand {
  id: string;
  profileId: string;
  disputeId: string;
  bureau: Bureau;
  letterContent: string;
  sentAt: string;
  responseDeadline: string; // 15 days from sent
  responseReceived: boolean;
  responseContent: string | null;
  escalatedToCfpb: boolean;
  escalatedToAg: boolean;
}

export interface RegulatoryEscalation {
  id: string;
  profileId: string;
  disputeId: string;
  type: "cfpb" | "state_ag" | "legal_notice";
  bureau: Bureau;
  content: string;
  filedAt: string;
  status: "filed" | "acknowledged" | "resolved" | "no_response";
  outcome: string | null;
}

// ─── MODULE 5: PAY-FOR-DELETE ───────────────────────────────────────────────

export interface CollectionAnalysis {
  id: string;
  profileId: string;
  accountId: string;
  creditorName: string;
  collectionAgency: string | null;
  originalBalance: number;
  currentBalance: number;
  ageMonths: number;
  stateSOL: number; // state statute of limitations in months
  fcraExpiry: string; // date 7-year window expires
  monthsUntilExpiry: number;
  isZombiDebt: boolean; // outside SOL
  paymentWouldResetClock: boolean;
  strategy: "do_not_pay_dispute" | "pay_for_delete_50" | "pay_for_delete_75" | "pay_for_delete_100" | "wait_out_clock" | "dispute_medical";
  offerTier: number; // 1=50%, 2=75%, 3=100%
  letterContent: string | null;
}

// ─── MODULE 6: AU AUDIT & CREDIT MIX ───────────────────────────────────────

export interface AUAuditResult {
  id: string;
  profileId: string;
  accountId: string;
  primaryHolder: string;
  reportedUtilization: number;
  paymentStatus: PaymentStatus;
  isOldestAccount: boolean;
  netPositive: boolean;
  recommendation: "keep" | "remove_immediately" | "monitor" | "confirm_reporting";
  reason: string;
  expectedImpact: string;
}

export interface CreditMixAnalysis {
  profileId: string;
  hasRevolving: boolean;
  hasInstallment: boolean;
  hasMortgage: boolean;
  revolvingCount: number;
  installmentCount: number;
  recommendation: CreditMixRecommendation | null;
  warnings: string[];
}

export interface CreditMixRecommendation {
  type: "credit_builder_loan" | "secured_card" | "replacement_loan";
  provider: string;
  productName: string;
  reason: string;
  expectedImpact: string;
  monthlyCost: number | null;
  requirements: string[];
}

// ─── MODULE 7: DORMANT ACCOUNT MONITOR ──────────────────────────────────────

export interface DormantAlert {
  id: string;
  profileId: string;
  accountId: string;
  creditorName: string;
  creditLimit: number;
  daysSinceLastTransaction: number;
  riskLevel: "warning" | "critical";
  recommendation: string;
  minimumSpend: number; // dollars to keep active
  status: "active" | "acknowledged" | "limit_reduced" | "closed_by_issuer";
}

export interface LimitReductionEvent {
  id: string;
  profileId: string;
  accountId: string;
  previousLimit: number;
  newLimit: number;
  detectedAt: string;
  utilizationBefore: number;
  utilizationAfter: number;
  compensationActions: string[]; // what to do to offset
}

// ─── MODULE 8: STATE-AWARE MEDICAL DEBT ENGINE ──────────────────────────────

export interface MedicalDebtAction {
  id: string;
  profileId: string;
  medicalDebtId: string;
  rule: "under_500" | "under_12_months" | "ny_state_ban" | "nsa_violation" | "insurance_pending";
  letterContent: string;
  targetBureau: Bureau | null;
  targetFurnisher: string | null;
  status: "generated" | "sent" | "resolved";
  expectedImpact: string;
}

export interface StateLaw {
  state: string;
  medicalDebtBan: boolean;
  medicalDebtBanDetails: string | null;
  solMonths: Record<string, number>; // by debt type
  additionalProtections: string[];
}

// ─── MASTER IF/THEN ADVISORY ────────────────────────────────────────────────

export interface AdvisoryItem {
  id: string;
  profileId: string;
  module: ModuleId;
  priority: "critical" | "high" | "medium" | "low";
  condition: string; // what triggered this
  action: string; // what to do
  specificDetails: string; // card/account/dollar amount/date
  expectedImpact: string; // point range
  bureau: Bureau | "all";
  timeframe: string; // when impact is expected
  status: "active" | "acted" | "dismissed" | "expired";
  createdAt: string;
}

// ─── ONBOARDING ─────────────────────────────────────────────────────────────

export interface OnboardingState {
  profileId: string;
  currentScreen: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  completedAt: string | null;
  scanResults: ScanResults | null;
}

export interface ScanResults {
  totalIssuesFound: number;
  moduleResults: Partial<Record<ModuleId, number>>; // issues per module
  topThreePerBureau: Partial<Record<Bureau, string[]>>;
  highestImpactAdvisory: AdvisoryItem | null;
}

// ─── CROA COMPLIANCE ────────────────────────────────────────────────────────

export interface CROAContract {
  profileId: string;
  signedAt: string;
  tier: SubscriptionTier;
  monthlyCost: number;
  servicesDescription: string;
  cancellationAcknowledged: boolean;
  rightsDisclosureShown: boolean;
}

// ─── DOCUMENT GENERATION ────────────────────────────────────────────────────

export interface GeneratedDocument {
  id: string;
  profileId: string;
  type: DocumentType;
  fileName: string;
  content: string;
  relatedDisputeId: string | null;
  relatedAccountId: string | null;
  generatedAt: string;
}

export type DocumentType =
  | "dispute_letter"
  | "mov_demand"
  | "cfpb_complaint"
  | "ag_complaint"
  | "pay_for_delete"
  | "debt_validation"
  | "goodwill_letter"
  | "cease_desist"
  | "intent_to_sue"
  | "mixed_file_package"
  | "medical_cease_report"
  | "nsa_violation_notice"
  | "court_complaint"
  | "summons"
  | "evidence_exhibit"
  | "proof_of_service"
  | "cover_letter"
  | "identity_affidavit";

// ─── UPSELL & MONETIZATION ──────────────────────────────────────────────────

export interface UpsellTrigger {
  id: string;
  profileId: string;
  triggerType: "multiple_disputable" | "near_threshold" | "business_goal" | "au_negative";
  message: string;
  targetTier: SubscriptionTier;
  shown: boolean;
  convertedAt: string | null;
}

// ─── DISPUTE TEMPLATES (Form ID System) ─────────────────────────────────────

export interface DisputeTemplate {
  formId: string;
  name: string;
  category: string;
  description: string;
  body: string; // Handlebars template
  requiredFields: string[];
  legalCodes: string[];
  attackType: "bureau" | "furnisher" | "collector" | "cfpb" | "ag";
  module: ModuleId;
}

// ─── PARSED CREDIT REPORT (import) ─────────────────────────────────────────

export interface ParsedCreditReport {
  bureau: Bureau;
  reportDate: string;
  personalInfo: {
    name: string;
    ssn: string;
    dob: string | null;
    addresses: string[];
  };
  accounts: ParsedReportAccount[];
  inquiries: Inquiry[];
  publicRecords: PublicRecord[];
  rawText: string;
}

export interface ParsedReportAccount {
  creditorName: string;
  accountNumber: string;
  accountType: string;
  accountStatus: AccountStatus;
  balance: number | null;
  creditLimit: number | null;
  dateOpened: string | null;
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

// ─── VAULT ──────────────────────────────────────────────────────────────────

export interface VaultDocument {
  id: string;
  profileId: string;
  type: "id" | "ssn_card" | "utility_bill" | "credit_report" | "dispute_letter"
    | "court_document" | "mail_receipt" | "insurance_eob" | "other";
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

// ─── ALERTS ─────────────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  profileId: string;
  module: ModuleId;
  type: "snapshot_approaching" | "deadline_approaching" | "deadline_expired"
    | "score_change" | "new_negative" | "limit_reduction" | "dormant_card"
    | "au_negative" | "re_insertion" | "action_required" | "upsell";
  title: string;
  message: string;
  priority: "critical" | "high" | "medium" | "low";
  read: boolean;
  actionUrl: string | null;
  createdAt: string;
}

// ─── STATE STATUTE OF LIMITATIONS DATABASE ──────────────────────────────────

export interface StateSOL {
  state: string;
  writtenContract: number; // months
  oralContract: number;
  promissoryNote: number;
  openAccount: number; // credit cards
  medicalDebtBan: boolean;
  medicalDebtDetails: string | null;
  agOffice: string;
  agAddress: string;
  agWebsite: string;
}
