import type { DisputeTemplate } from "../../types/index.js";

// ─── Complete Form ID Library ───────────────────────────────────────────────
// Each form is a legally-coded dispute template with variable injection.

export const FORM_LIBRARY: DisputeTemplate[] = [
  // ═══ BUREAU DISPUTES ═══════════════════════════════════════════════════════

  {
    formId: "FORM-101",
    name: "Cross-Bureau Balance Mismatch",
    category: "Data Integrity",
    description: "Balance reported differently across bureaus — 15 U.S.C. § 1681i violation",
    legalCodes: ["15 U.S.C. § 1681i", "15 U.S.C. § 1681e(b)"],
    attackType: "bureau",
    requiredFields: ["client_name", "client_address", "bureau_name", "creditor_name", "account_number", "balance_reported", "balance_other_bureau", "other_bureau_name"],
    body: `{{client_name}}
{{client_address}}

{{date}}

{{bureau_name}}
Consumer Disputes Department

Re: Formal Dispute — Balance Discrepancy — Account {{account_number}}

To Whom It May Concern:

Pursuant to the Fair Credit Reporting Act, 15 U.S.C. § 1681i, I am formally disputing the accuracy of the following account on my credit report:

CREDITOR: {{creditor_name}}
ACCOUNT: {{account_number}}
BALANCE REPORTED BY {{bureau_name}}: {{balance_reported}}
BALANCE REPORTED BY {{other_bureau_name}}: {{balance_other_bureau}}

The balance reported by your agency is inconsistent with the balance reported by {{other_bureau_name}}. Under 15 U.S.C. § 1681e(b), you are required to "follow reasonable procedures to assure maximum possible accuracy." Cross-bureau balance discrepancies constitute a failure to maintain accurate records.

I demand that you:
1. Conduct a reasonable investigation of this account within 30 days as required by § 1681i(a)(1)
2. Provide the specific method of verification used
3. Delete or correct this entry if it cannot be verified with documentary evidence

Failure to respond within 30 days will result in a formal complaint to the Consumer Financial Protection Bureau and potential litigation under 15 U.S.C. § 1681n for willful noncompliance.

Sincerely,
{{client_name}}`,
  },

  {
    formId: "FORM-102",
    name: "Cross-Bureau Date Mismatch",
    category: "Data Integrity",
    description: "Late payment date differs between bureaus — § 611 violation",
    legalCodes: ["15 U.S.C. § 1681i", "15 U.S.C. § 1681s-2"],
    attackType: "bureau",
    requiredFields: ["client_name", "client_address", "bureau_name", "creditor_name", "account_number", "date_reported", "date_other_bureau", "other_bureau_name"],
    body: `{{client_name}}
{{client_address}}

{{date}}

{{bureau_name}}
Consumer Disputes Department

Re: Formal Dispute — Date Discrepancy — Account {{account_number}}

To Whom It May Concern:

Under 15 U.S.C. § 1681i, I dispute the following account which contains conflicting date information across credit reporting agencies:

CREDITOR: {{creditor_name}}
ACCOUNT: {{account_number}}
DATE PER {{bureau_name}}: {{date_reported}}
DATE PER {{other_bureau_name}}: {{date_other_bureau}}

If the data furnisher reported different dates to different bureaus, this constitutes a violation of 15 U.S.C. § 1681s-2(a)(1) — the duty to provide accurate information. You cannot both be correct.

I demand immediate investigation and correction or deletion within 30 days. If verification cannot produce documentary proof of the accurate date, this item must be removed per § 1681i(a)(5)(A).

Sincerely,
{{client_name}}`,
  },

  {
    formId: "FORM-201",
    name: "30-Day Late Payment Strike",
    category: "Late Payments",
    description: "Dispute a reported 30-day late payment",
    legalCodes: ["15 U.S.C. § 1681i", "15 U.S.C. § 1681e(b)"],
    attackType: "bureau",
    requiredFields: ["client_name", "client_address", "bureau_name", "creditor_name", "account_number", "late_date"],
    body: `{{client_name}}
{{client_address}}

{{date}}

{{bureau_name}}
Consumer Disputes Department

Re: Dispute of Late Payment — Account {{account_number}}

To Whom It May Concern:

Pursuant to the Fair Credit Reporting Act, 15 U.S.C. § 1681i, I dispute the late payment reported for the following account:

CREDITOR: {{creditor_name}}
ACCOUNT: {{account_number}}
REPORTED LATE DATE: {{late_date}}

I do not believe this late payment is accurately reported. Under § 1681e(b), you must follow reasonable procedures to assure maximum possible accuracy. I request that you:

1. Investigate this item within 30 days
2. Provide the name, address, and telephone number of the furnisher
3. Provide the specific method and documentation used to verify this late payment
4. Delete this item if it cannot be verified with actual payment records

Please send me an updated copy of my credit report reflecting the results of your investigation.

Sincerely,
{{client_name}}`,
  },

  {
    formId: "FORM-301",
    name: "Metro 2 Segment Error — Date Sequence",
    category: "Metro 2 Violations",
    description: "Date of Last Activity is after Date Closed — fatal Metro 2 error",
    legalCodes: ["15 U.S.C. § 1681e(b)", "Metro 2 Format Guidelines § 6"],
    attackType: "bureau",
    requiredFields: ["client_name", "client_address", "bureau_name", "creditor_name", "account_number", "date_closed", "date_last_activity"],
    body: `{{client_name}}
{{client_address}}

{{date}}

{{bureau_name}}
Consumer Disputes Department

Re: Metro 2 Data Format Violation — Account {{account_number}}

To Whom It May Concern:

I am writing pursuant to 15 U.S.C. § 1681i to dispute the following account which contains a fatal Metro 2 data format error:

CREDITOR: {{creditor_name}}
ACCOUNT: {{account_number}}
DATE CLOSED: {{date_closed}}
DATE OF LAST ACTIVITY: {{date_last_activity}}

The Date of Last Activity ({{date_last_activity}}) is AFTER the Date Closed ({{date_closed}}). This is a violation of Metro 2 Format Guidelines — an account cannot have activity after it has been closed. This constitutes a failure to maintain maximum possible accuracy under § 1681e(b).

Metro 2 segment errors are fatal data integrity violations. This item must be immediately deleted as the underlying data cannot be trusted.

I demand deletion within 30 days. Failure to act will result in litigation under 15 U.S.C. § 1681n.

Sincerely,
{{client_name}}`,
  },

  // ═══ DEBT VALIDATION & COLLECTORS ═════════════════════════════════════════

  {
    formId: "FORM-401",
    name: "Debt Validation Request (FDCPA § 809)",
    category: "Collections",
    description: "Demand collector prove the debt is valid and they have authority to collect",
    legalCodes: ["15 U.S.C. § 1692g", "15 U.S.C. § 1692e"],
    attackType: "collector",
    requiredFields: ["client_name", "client_address", "collector_name", "collector_address", "account_number", "alleged_amount"],
    body: `{{client_name}}
{{client_address}}

{{date}}

{{collector_name}}
{{collector_address}}

Re: Debt Validation Request — Alleged Account {{account_number}}

This letter is sent pursuant to the Fair Debt Collection Practices Act, 15 U.S.C. § 1692g.

I am requesting validation of the alleged debt you are attempting to collect:

ALLEGED AMOUNT: {{alleged_amount}}
ACCOUNT REFERENCE: {{account_number}}

Please provide the following within 30 days:

1. The name and address of the original creditor
2. A copy of the original signed agreement bearing my signature
3. A complete payment history from the original creditor
4. Proof that you are licensed to collect debts in my state
5. Proof that this debt is within the statute of limitations
6. The date of the original delinquency

Until this debt is validated, all collection activity must cease per § 1692g(b). Any continued collection or credit reporting of this unvalidated debt constitutes a violation of § 1692e (false or misleading representations).

Do not contact me by telephone. All communications must be in writing.

Sincerely,
{{client_name}}`,
  },

  {
    formId: "FORM-402",
    name: "Pay-For-Delete Offer",
    category: "Collections",
    description: "Offer settlement payment in exchange for removing the account from credit reports",
    legalCodes: [],
    attackType: "collector",
    requiredFields: ["client_name", "client_address", "collector_name", "collector_address", "account_number", "original_amount", "offer_amount"],
    body: `{{client_name}}
{{client_address}}

{{date}}

{{collector_name}}
{{collector_address}}

Re: Settlement Offer — Account {{account_number}}

To Whom It May Concern:

I am writing regarding the above-referenced account with an alleged balance of {{original_amount}}.

I am prepared to resolve this matter with a lump-sum payment of {{offer_amount}} under the following conditions:

1. Upon receipt of payment, you will request deletion of this account from all three major credit reporting agencies (Equifax, Experian, and TransUnion) within 10 business days
2. You will not sell, assign, or transfer this account to any other entity
3. You will consider this debt fully satisfied and resolved
4. You will provide written confirmation of this agreement before payment is remitted

This offer is contingent upon your written acceptance of ALL conditions above. Payment will be made via cashier's check or money order only.

This offer expires 15 days from the date of this letter.

Please respond in writing only. Do not contact me by telephone.

Sincerely,
{{client_name}}`,
  },

  {
    formId: "FORM-403",
    name: "Cease & Desist",
    category: "Collections",
    description: "Demand collector stop all contact — FDCPA § 805(c)",
    legalCodes: ["15 U.S.C. § 1692c(c)"],
    attackType: "collector",
    requiredFields: ["client_name", "client_address", "collector_name", "collector_address"],
    body: `{{client_name}}
{{client_address}}

{{date}}

{{collector_name}}
{{collector_address}}

Re: Cease and Desist — All Communications

Pursuant to 15 U.S.C. § 1692c(c) of the Fair Debt Collection Practices Act, I hereby demand that you cease all further communications with me regarding any alleged debts.

This includes but is not limited to:
- Telephone calls
- Letters or written correspondence
- Text messages or electronic communications
- Contact with third parties regarding this matter

Any further contact after receipt of this letter will constitute a violation of the FDCPA, and I will pursue all available legal remedies including statutory damages under 15 U.S.C. § 1692k.

This letter serves as your formal notification under § 1692c(c).

Sincerely,
{{client_name}}`,
  },

  // ═══ METHOD OF VERIFICATION ════════════════════════════════════════════════

  {
    formId: "FORM-501",
    name: "Method of Verification Demand",
    category: "Follow-Up",
    description: "After bureau says 'Verified' — demand proof of HOW they verified",
    legalCodes: ["15 U.S.C. § 1681i(a)(7)", "15 U.S.C. § 1681i(a)(6)(B)(iii)"],
    attackType: "bureau",
    requiredFields: ["client_name", "client_address", "bureau_name", "creditor_name", "account_number", "dispute_date"],
    body: `{{client_name}}
{{client_address}}

{{date}}

{{bureau_name}}
Consumer Disputes Department

Re: Request for Method of Verification — Account {{account_number}}

To Whom It May Concern:

On {{dispute_date}}, I submitted a dispute regarding the above-referenced account. You responded that the account was "verified." However, under 15 U.S.C. § 1681i(a)(7), upon request, you must provide me with a description of the procedure used to determine the accuracy and completeness of the information, including:

1. The business name, address, and telephone number of any furnisher contacted in connection with the reinvestigation
2. The specific method of verification used
3. The specific documents reviewed to verify the disputed information

Per § 1681i(a)(6)(B)(iii), this information must be provided within 15 days of my request.

Failure to provide this information will demonstrate that no reasonable investigation was conducted, which constitutes willful noncompliance under 15 U.S.C. § 1681n, carrying statutory damages of $100 to $1,000 per violation plus punitive damages and attorney's fees.

Sincerely,
{{client_name}}`,
  },

  // ═══ GOODWILL ═════════════════════════════════════════════════════════════

  {
    formId: "FORM-601",
    name: "Goodwill Adjustment Request",
    category: "Goodwill",
    description: "Request removal of late payment on otherwise good account — not legally required but often works",
    legalCodes: [],
    attackType: "furnisher",
    requiredFields: ["client_name", "client_address", "creditor_name", "creditor_address", "account_number", "late_date", "reason"],
    body: `{{client_name}}
{{client_address}}

{{date}}

{{creditor_name}}
{{creditor_address}}

Re: Goodwill Adjustment Request — Account {{account_number}}

Dear Sir or Madam:

I am writing to request a goodwill adjustment to remove the late payment reported on my account for {{late_date}}.

I have been a loyal customer and have otherwise maintained an excellent payment history with your company. The late payment in question was due to {{reason}}, and I have since taken steps to ensure this does not happen again.

I understand that you are under no obligation to make this adjustment, and I appreciate your consideration. Removing this single late payment would make a significant difference in my credit profile and my ability to secure favorable terms for important financial goals.

I would be grateful for your review of my account history and consideration of this request. Thank you for your time.

Respectfully,
{{client_name}}`,
  },

  // ═══ CFPB ESCALATION ══════════════════════════════════════════════════════

  {
    formId: "FORM-701",
    name: "CFPB Complaint Escalation",
    category: "Escalation",
    description: "File formal complaint with Consumer Financial Protection Bureau",
    legalCodes: ["12 U.S.C. § 5531", "15 U.S.C. § 1681i"],
    attackType: "cfpb",
    requiredFields: ["client_name", "client_address", "bureau_name", "creditor_name", "account_number", "original_dispute_date", "violation_description"],
    body: `Consumer Financial Protection Bureau
P.O. Box 4503
Iowa City, IA 52244

{{date}}

FROM: {{client_name}}
{{client_address}}

COMPLAINT AGAINST: {{bureau_name}}
REGARDING: {{creditor_name}} — Account {{account_number}}

STATEMENT OF FACTS:

On {{original_dispute_date}}, I submitted a written dispute to {{bureau_name}} regarding the above-referenced account. The specific issue: {{violation_description}}.

Despite my dispute, {{bureau_name}} has either:
(a) Failed to conduct a reasonable investigation as required by 15 U.S.C. § 1681i
(b) Failed to provide the method of verification as required by § 1681i(a)(7)
(c) Continued to report inaccurate information in violation of § 1681e(b)

REQUESTED RELIEF:
1. Order {{bureau_name}} to conduct a genuine reinvestigation
2. Order deletion of the disputed item if it cannot be properly verified
3. Investigation of {{bureau_name}}'s dispute handling procedures

I have attached copies of my original dispute letter, the bureau's response, and supporting documentation.

Respectfully submitted,
{{client_name}}`,
  },

  // ═══ INTENT TO SUE ════════════════════════════════════════════════════════

  {
    formId: "FORM-801",
    name: "Intent to Sue Notice",
    category: "Litigation",
    description: "Final warning before filing Small Claims — often triggers immediate deletion",
    legalCodes: ["15 U.S.C. § 1681n", "15 U.S.C. § 1681o"],
    attackType: "bureau",
    requiredFields: ["client_name", "client_address", "bureau_name", "creditor_name", "account_number", "violation_count", "estimated_damages"],
    body: `{{client_name}}
{{client_address}}

{{date}}

VIA CERTIFIED MAIL — RETURN RECEIPT REQUESTED

{{bureau_name}}
Legal Department

Re: NOTICE OF INTENT TO FILE LAWSUIT — Account {{account_number}}

To the Legal Department:

This letter serves as formal notice that I intend to file a lawsuit against {{bureau_name}} in Small Claims Court if the following matter is not resolved within 15 days of your receipt of this letter.

VIOLATIONS:
- Creditor: {{creditor_name}}
- Account: {{account_number}}
- Number of FCRA violations: {{violation_count}}
- Estimated statutory damages: {{estimated_damages}}

Despite multiple dispute attempts, {{bureau_name}} has failed to:
1. Conduct a reasonable investigation per § 1681i
2. Provide the method of verification per § 1681i(a)(7)
3. Delete inaccurate information per § 1681i(a)(5)(A)

Under 15 U.S.C. § 1681n (willful noncompliance), I am entitled to:
- Actual damages or statutory damages of $100 to $1,000 per violation
- Punitive damages
- Attorney's fees and costs

I am prepared to file this action within 15 days if this matter is not resolved. Resolution requires complete deletion of the disputed item(s) from my credit report.

This is your final opportunity to resolve this matter without litigation.

Sincerely,
{{client_name}}`,
  },
];

export function getFormLibrary(): DisputeTemplate[] {
  return FORM_LIBRARY;
}

export function getFormById(formId: string): DisputeTemplate | undefined {
  return FORM_LIBRARY.find((f) => f.formId === formId);
}

export function getFormsByCategory(category: string): DisputeTemplate[] {
  return FORM_LIBRARY.filter((f) => f.category.toLowerCase() === category.toLowerCase());
}
