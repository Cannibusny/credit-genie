import type { DisputeTemplate } from "../../types/index.js";

// ─── Dispute Letter Templates ────────────────────────────────────────────────
//
// Each template uses Handlebars-style {{double_brace}} placeholders that are
// resolved by the renderer. `current_date`, `bureau_name`, and `bureau_address`
// are auto-filled by the renderer / API and intentionally omitted from
// `requiredFields`.

const FORM_221: DisputeTemplate = {
  formId: "Form-221",
  name: "Late Payment Dispute",
  category: "Late Payments",
  description:
    "Formal dispute to a credit bureau challenging a late payment entry under FCRA § 611(a) and § 623.",
  body: `{{client_full_name}}
{{client_address}}
{{client_city}}, {{client_state}} {{client_zip}}

{{current_date}}

{{bureau_name}}
{{bureau_address}}

RE: FORMAL DISPUTE — LATE PAYMENT ENTRY
Account: {{creditor_name}}
Account Number: {{account_number}}
Last 4 of SSN: {{client_ssn}}

To Whom It May Concern:

I am writing pursuant to my rights under the Fair Credit Reporting Act
(FCRA), 15 U.S.C. § 1681 et seq., to formally dispute an inaccurate late
payment entry currently appearing on my credit file.

The above-referenced account with {{creditor_name}} (account ending
{{account_number}}) reflects one or more late payments that are inaccurate,
incomplete, or unverifiable as reported. I have no record of being late on
this obligation, and any such notation must be investigated and corrected.

LEGAL BASIS:
Under FCRA § 611(a), 15 U.S.C. § 1681i, you are required to conduct a
reasonable reinvestigation of any disputed item within 30 days of receipt
of this notice and to forward all relevant information to the furnisher
under § 611(a)(2). Under FCRA § 623, 15 U.S.C. § 1681s-2, the furnisher
is required to investigate and either verify, correct, or delete the
disputed information.

DEMAND:
1. Reinvestigate the disputed late payment entry within the 30-day period
   required by § 611(a)(1)(A).
2. Forward all dispute documentation to {{creditor_name}} as required by
   § 611(a)(2).
3. Provide written notification of the results of the reinvestigation as
   required by § 611(a)(6).
4. If the late payment cannot be verified through documented payment
   records, immediately delete the entry from my consumer file.

NOTICE:
Failure to comply with the FCRA's reinvestigation and accuracy obligations
will result in liability for statutory damages of $100–$1,000 per violation
under § 616(a)(1)(A), actual damages, punitive damages, and attorney's fees
under §§ 616 and 617.

This letter is sent via certified mail, return receipt requested. I expect
your written response within 30 days.

Sincerely,


{{client_full_name}}
Email: {{client_email}}
Phone: {{client_phone}}

Enclosures:
- Copy of credit report highlighting disputed late payment entry
- Copy of government-issued ID
- Proof of address`,
  legalCodes: [],
  attackType: "bureau" as const,
  requiredFields: [
    "client_full_name",
    "client_ssn",
    "client_address",
    "client_city",
    "client_state",
    "client_zip",
    "client_email",
    "client_phone",
    "creditor_name",
    "account_number",
  ],
};

const FORM_305: DisputeTemplate = {
  formId: "Form-305",
  name: "Collections Dispute",
  category: "Collections",
  description:
    "Disputes a collection account and demands debt validation under FCRA § 611 and FDCPA § 809.",
  body: `{{client_full_name}}
{{client_address}}
{{client_city}}, {{client_state}} {{client_zip}}

{{current_date}}

{{bureau_name}}
{{bureau_address}}

RE: FORMAL DISPUTE — COLLECTIONS ACCOUNT
Collection Agency: {{creditor_name}}
Original Creditor: {{original_creditor}}
Account Number: {{account_number}}
Alleged Amount: {{collection_amount}}
Last 4 of SSN: {{client_ssn}}

To Whom It May Concern:

I am formally disputing the above-referenced collections entry pursuant to
my rights under the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681
et seq., and the Fair Debt Collection Practices Act (FDCPA), 15 U.S.C.
§ 1692 et seq. The reported balance, ownership, and validity of this
alleged debt are unverified and inaccurate.

LEGAL BASIS:
- FCRA § 611, 15 U.S.C. § 1681i, requires you to conduct a reasonable
  reinvestigation of disputed items within 30 days.
- FDCPA § 809, 15 U.S.C. § 1692g, requires the collector to provide
  validation of any disputed debt, including the name of the original
  creditor, an itemized statement of the amount, and proof that the
  collector has the legal right to collect.
- A debt collector that continues collection activity without first
  obtaining and providing validation violates § 809(b).

DEMAND:
1. Provide complete validation of this alleged debt, including a copy of
   the original signed agreement, an itemized accounting, and chain of
   assignment from {{original_creditor}}.
2. Reinvestigate this item and notify {{creditor_name}} of the dispute
   under FCRA § 611(a)(2).
3. If the debt cannot be fully validated, immediately delete the
   collection entry from my consumer file.
4. Cease all collection activity until validation is provided as required
   by FDCPA § 809(b).

NOTICE:
Continued reporting or collection of an unvalidated debt subjects you to
statutory damages, actual damages, and attorney's fees under FCRA § 616
and FDCPA § 813.

This letter is sent via certified mail, return receipt requested.

Sincerely,


{{client_full_name}}
Email: {{client_email}}
Phone: {{client_phone}}

Enclosures:
- Copy of credit report highlighting disputed collection entry
- Copy of government-issued ID
- Proof of address`,
  legalCodes: [],
  attackType: "bureau" as const,
  requiredFields: [
    "client_full_name",
    "client_ssn",
    "client_address",
    "client_city",
    "client_state",
    "client_zip",
    "client_email",
    "client_phone",
    "creditor_name",
    "account_number",
    "collection_amount",
    "original_creditor",
  ],
};

const FORM_401: DisputeTemplate = {
  formId: "Form-401",
  name: "Charge-Off Dispute",
  category: "Charge-Offs",
  description:
    "Disputes a charge-off entry, arguing inaccurate or incomplete reporting under FCRA § 611(a) and § 623(a)(2).",
  body: `{{client_full_name}}
{{client_address}}
{{client_city}}, {{client_state}} {{client_zip}}

{{current_date}}

{{bureau_name}}
{{bureau_address}}

RE: FORMAL DISPUTE — CHARGE-OFF ENTRY
Creditor: {{creditor_name}}
Account Number: {{account_number}}
Last 4 of SSN: {{client_ssn}}

To Whom It May Concern:

I am writing to formally dispute the charge-off entry currently reported
on my credit file by {{creditor_name}} for account ending
{{account_number}}. The entry as reported is inaccurate and/or
incomplete and must be reinvestigated under the Fair Credit Reporting Act.

The reported balance, date of first delinquency, and status of this
account contain material inaccuracies. A charge-off is an accounting
event by the creditor; it does not extinguish my rights to accurate
reporting and it cannot be re-aged, altered, or assigned a misleading
status.

LEGAL BASIS:
- FCRA § 611(a), 15 U.S.C. § 1681i, requires a reasonable reinvestigation
  within 30 days of any disputed item.
- FCRA § 623(a)(2), 15 U.S.C. § 1681s-2(a)(2), requires the furnisher to
  promptly correct and update inaccurate information after notice.
- Reporting an inaccurate date of first delinquency in violation of
  § 605(c) impermissibly extends the seven-year reporting period and
  constitutes an independent FCRA violation.

DEMAND:
1. Reinvestigate the charge-off entry within the 30-day window of
   § 611(a)(1)(A).
2. Verify the original date of first delinquency, the reported balance,
   and the account status against {{creditor_name}}'s records.
3. If any aspect of the entry cannot be verified, delete the entry in
   full from my consumer file.
4. Provide written results of the reinvestigation as required by
   § 611(a)(6).

NOTICE:
Failure to comply will subject you to statutory damages, actual damages,
punitive damages, and attorney's fees under FCRA §§ 616 and 617.

This letter is sent via certified mail, return receipt requested.

Sincerely,


{{client_full_name}}
Email: {{client_email}}
Phone: {{client_phone}}

Enclosures:
- Copy of credit report highlighting disputed charge-off
- Copy of government-issued ID
- Proof of address`,
  legalCodes: [],
  attackType: "bureau" as const,
  requiredFields: [
    "client_full_name",
    "client_ssn",
    "client_address",
    "client_city",
    "client_state",
    "client_zip",
    "client_email",
    "client_phone",
    "creditor_name",
    "account_number",
  ],
};

const FORM_502: DisputeTemplate = {
  formId: "Form-502",
  name: "Identity Theft Dispute",
  category: "Identity Theft",
  description:
    "Identity theft block request under FCRA § 605B, with FTC report and police report references.",
  body: `{{client_full_name}}
{{client_address}}
{{client_city}}, {{client_state}} {{client_zip}}

{{current_date}}

{{bureau_name}}
{{bureau_address}}

RE: IDENTITY THEFT DISPUTE & BLOCK REQUEST
Fraudulent Account: {{creditor_name}}
Account Number: {{account_number}}
Police Report Number: {{police_report_number}}
Last 4 of SSN: {{client_ssn}}

To Whom It May Concern:

I am the victim of identity theft. The above-referenced account does not
belong to me and was opened and/or used fraudulently without my
authorization. I am invoking my rights under the Fair Credit Reporting
Act to have this fraudulent information blocked and removed from my
credit file.

LEGAL BASIS:
- FCRA § 605B, 15 U.S.C. § 1681c-2, requires a consumer reporting agency
  to block any information identified as resulting from identity theft
  no later than 4 business days after receipt of (1) appropriate proof
  of identity, (2) a copy of an identity theft report, (3) the
  identification of the information by the consumer, and (4) a statement
  that the information is not the result of any transaction by the
  consumer.
- FCRA § 611, 15 U.S.C. § 1681i, additionally requires reinvestigation
  of disputed information within 30 days.

ENCLOSED PROOF (per § 605B requirements):
1. Identity Theft Report (FTC Form 14039 / IdentityTheft.gov report).
2. Police Report Number {{police_report_number}}.
3. Copy of government-issued photo ID.
4. Proof of current address.
5. Sworn statement that the account is not the result of any transaction
   by me.

DEMAND:
1. Block the fraudulent account from my consumer file within 4 business
   days as required by § 605B(a).
2. Notify {{creditor_name}} that the information has been blocked as
   identity theft pursuant to § 605B(b).
3. Provide written confirmation of the block.
4. Refrain from reinserting the blocked information without complying
   with § 611(a)(5)(B).

NOTICE:
Failure to comply with § 605B subjects the agency to statutory damages,
actual damages, and attorney's fees under §§ 616 and 617.

This letter is sent via certified mail, return receipt requested.

Sincerely,


{{client_full_name}}
Email: {{client_email}}
Phone: {{client_phone}}

Enclosures:
- FTC Identity Theft Report
- Police Report (#{{police_report_number}})
- Copy of government-issued ID
- Proof of address`,
  legalCodes: [],
  attackType: "bureau" as const,
  requiredFields: [
    "client_full_name",
    "client_ssn",
    "client_address",
    "client_city",
    "client_state",
    "client_zip",
    "client_email",
    "client_phone",
    "creditor_name",
    "account_number",
    "police_report_number",
  ],
};

const FORM_609: DisputeTemplate = {
  formId: "Form-609",
  name: "Credit Disclosure Request",
  category: "Disclosure",
  description:
    "Requests full disclosure of the consumer's credit file under FCRA § 609.",
  body: `{{client_full_name}}
{{client_address}}
{{client_city}}, {{client_state}} {{client_zip}}

{{current_date}}

{{bureau_name}}
{{bureau_address}}

RE: REQUEST FOR FULL FILE DISCLOSURE
Last 4 of SSN: {{client_ssn}}

To Whom It May Concern:

Pursuant to my rights under FCRA § 609, 15 U.S.C. § 1681g, I am
requesting full disclosure of all information in my consumer file
maintained by your agency.

LEGAL BASIS:
FCRA § 609(a) requires you, upon request and proper identification, to
clearly and accurately disclose to me:
1. All information in my file at the time of the request, including the
   sources of the information.
2. The identification of each person that procured a consumer report for
   employment purposes during the 2-year period preceding the request,
   and for any other purpose during the 1-year period preceding the
   request.
3. The dates, original payees, and amounts of any checks upon which is
   based any adverse characterization of me, included in the file at the
   time of the request.
4. A record of all inquiries during the 1-year period preceding the
   request.

DEMAND:
1. Provide the full file disclosure described above within 15 days of
   receipt of this request.
2. Provide a written summary of my rights under § 609(c).
3. Identify each furnisher contributing to my file along with the date
   each item was reported.

This letter is sent via certified mail, return receipt requested.

Sincerely,


{{client_full_name}}
Email: {{client_email}}
Phone: {{client_phone}}

Enclosures:
- Copy of government-issued ID
- Proof of address`,
  legalCodes: [],
  attackType: "bureau" as const,
  requiredFields: [
    "client_full_name",
    "client_ssn",
    "client_address",
    "client_city",
    "client_state",
    "client_zip",
    "client_email",
    "client_phone",
  ],
};

const FORM_611: DisputeTemplate = {
  formId: "Form-611",
  name: "Investigation Demand",
  category: "Investigation",
  description:
    "Aggressive demand for reinvestigation of disputed items under FCRA § 611, citing the 30-day deadline.",
  body: `{{client_full_name}}
{{client_address}}
{{client_city}}, {{client_state}} {{client_zip}}

{{current_date}}

{{bureau_name}}
{{bureau_address}}

RE: DEMAND FOR REINVESTIGATION — 30-DAY STATUTORY DEADLINE
Disputed Account: {{creditor_name}}
Account Number: {{account_number}}
Last 4 of SSN: {{client_ssn}}

To Whom It May Concern:

This letter constitutes formal notice of dispute and demand for
reinvestigation under FCRA § 611, 15 U.S.C. § 1681i. The above-referenced
tradeline as reported by {{creditor_name}} is inaccurate, incomplete,
and/or unverifiable. The 30-day reinvestigation clock begins upon your
receipt of this letter.

LEGAL BASIS:
- FCRA § 611(a)(1)(A) requires a reasonable reinvestigation free of
  charge within 30 days of receipt of a dispute.
- FCRA § 611(a)(2) requires the agency to provide all relevant
  information to the furnisher within 5 business days.
- FCRA § 611(a)(5)(A) requires deletion or modification of any item
  that cannot be verified.
- FCRA § 611(a)(6) requires written notice of the results within 5
  business days of completion of the reinvestigation.

The procedures employed by your agency in past reinvestigations of this
item — including any reliance on automated e-OSCAR responses without
review of underlying documentation — do not satisfy the "reasonable
reinvestigation" standard articulated in Cushman v. Trans Union Corp.,
115 F.3d 220 (3d Cir. 1997), and Hinkle v. Midland Credit Mgmt., 827
F.3d 1295 (11th Cir. 2016).

DEMAND:
1. Conduct a substantive reinvestigation that includes review of the
   actual underlying account documents, not merely a "verification"
   ping to the furnisher.
2. Provide me with the name, business address, and telephone number of
   any person contacted in connection with the reinvestigation as
   required by § 611(a)(7).
3. If the disputed information cannot be verified through documentary
   evidence, immediately delete it from my consumer file.
4. Provide the reinvestigation results in writing within the statutory
   deadline.

NOTICE:
Failure to comply with FCRA § 611 subjects you to statutory damages of
$100–$1,000 per violation, actual damages, punitive damages where
willful, and attorney's fees under §§ 616 and 617.

This letter is sent via certified mail, return receipt requested.

Sincerely,


{{client_full_name}}
Email: {{client_email}}
Phone: {{client_phone}}

Enclosures:
- Copy of credit report highlighting the disputed item
- Copy of government-issued ID
- Proof of address`,
  legalCodes: [],
  attackType: "bureau" as const,
  requiredFields: [
    "client_full_name",
    "client_ssn",
    "client_address",
    "client_city",
    "client_state",
    "client_zip",
    "client_email",
    "client_phone",
    "creditor_name",
    "account_number",
  ],
};

const FORM_623: DisputeTemplate = {
  formId: "Form-623",
  name: "Direct Creditor Dispute",
  category: "Creditor Dispute",
  description:
    "Direct dispute to the furnisher (creditor) under FCRA § 623(a)(8) and § 623(b).",
  body: `{{client_full_name}}
{{client_address}}
{{client_city}}, {{client_state}} {{client_zip}}

{{current_date}}

{{creditor_name}}
Attn: Credit Reporting Disputes Department

RE: DIRECT DISPUTE OF FURNISHED INFORMATION
Account Number: {{account_number}}
Last 4 of SSN: {{client_ssn}}

To Whom It May Concern:

This is a direct dispute submitted under FCRA § 623(a)(8), 15 U.S.C.
§ 1681s-2(a)(8), and 12 C.F.R. § 1022.43, regarding the accuracy of
information you have furnished about me to one or more consumer
reporting agencies.

I dispute the accuracy and completeness of the above-referenced account
as you are reporting it. The reported balance, payment history, and/or
status are inaccurate and unsupported by your own records.

LEGAL BASIS:
- FCRA § 623(a)(8), 15 U.S.C. § 1681s-2(a)(8), provides a private right
  to submit a direct dispute to the furnisher and obligates you to
  conduct a reasonable investigation.
- 12 C.F.R. § 1022.43(e) requires you to investigate any direct dispute
  that is not frivolous within 30 days and to report the results of the
  investigation to the consumer.
- FCRA § 623(b), 15 U.S.C. § 1681s-2(b), governs your duties upon
  receipt of a notice of dispute from a consumer reporting agency,
  including reinvestigation, review of all relevant information, and
  reporting of corrected results to all CRAs to which you furnished the
  information.

DEMAND:
1. Conduct a reasonable investigation of the disputed account under
   § 623(a)(8) and 12 C.F.R. § 1022.43.
2. Review all internal records, including the original signed
   application, payment ledger, and any system notes.
3. Within 30 days, either correct the inaccurate information with all
   consumer reporting agencies or, if the information cannot be
   verified, instruct the agencies to delete it.
4. Provide me with the written results of your investigation.

NOTICE:
A furnisher that fails to comply with § 623(b) is subject to civil
liability under §§ 616 and 617, including statutory damages, actual
damages, punitive damages where willful, and attorney's fees.

This letter is sent via certified mail, return receipt requested.

Sincerely,


{{client_full_name}}
Email: {{client_email}}
Phone: {{client_phone}}

Enclosures:
- Copy of disputed account entry
- Copy of government-issued ID
- Proof of address`,
  legalCodes: [],
  attackType: "bureau" as const,
  requiredFields: [
    "client_full_name",
    "client_ssn",
    "client_address",
    "client_city",
    "client_state",
    "client_zip",
    "client_email",
    "client_phone",
    "creditor_name",
    "account_number",
  ],
};

const FORM_807: DisputeTemplate = {
  formId: "Form-807",
  name: "Debt Validation Letter",
  category: "Debt Validation",
  description:
    "Debt validation demand under FDCPA § 809(b) sent directly to a debt collector.",
  body: `{{client_full_name}}
{{client_address}}
{{client_city}}, {{client_state}} {{client_zip}}

{{current_date}}

{{debt_collector_name}}
{{debt_collector_address}}

RE: DEBT VALIDATION DEMAND — FDCPA § 809(b)
Alleged Account: {{account_number}}
Original Creditor: {{original_creditor}}
Alleged Amount: {{alleged_amount}}
Last 4 of SSN: {{client_ssn}}

To Whom It May Concern:

This letter is a formal demand for validation of the alleged debt
referenced above under the Fair Debt Collection Practices Act (FDCPA),
15 U.S.C. § 1692g(b). I dispute the validity of this debt in full and
require complete validation before any further communication or
collection activity.

LEGAL BASIS:
- FDCPA § 809(a), 15 U.S.C. § 1692g(a), requires you to provide written
  notice containing the amount of the debt, the name of the creditor,
  and a statement of my dispute and verification rights.
- FDCPA § 809(b), 15 U.S.C. § 1692g(b), requires that, upon written
  dispute within the validation period, you must cease collection of
  the debt until you obtain verification and mail a copy of such
  verification to me.
- FDCPA § 807, 15 U.S.C. § 1692e, prohibits false, deceptive, or
  misleading representations in connection with collection of any debt,
  including reporting an unverified debt to a consumer reporting agency.

DEMAND — provide each of the following:
1. The original signed agreement establishing the alleged debt.
2. A complete itemized accounting of all charges, payments, interest,
   and fees from inception to present.
3. The name and address of the original creditor ({{original_creditor}})
   and proof of your legal right to collect, including any chain of
   assignment or purchase agreements.
4. The license number and the name of the state agency issuing your
   debt-collection license, if collection licensing is required in my
   state.
5. Cease-and-desist confirmation that all collection activity, including
   any reporting to consumer reporting agencies, will stop until full
   validation is provided.

NOTICE:
Continued collection activity, or continued reporting of this alleged
debt to any consumer reporting agency without first providing
validation, violates §§ 807 and 809(b) and subjects you to statutory
damages of up to $1,000 per violation, actual damages, and attorney's
fees under § 813.

This letter is sent via certified mail, return receipt requested.

Sincerely,


{{client_full_name}}
Email: {{client_email}}
Phone: {{client_phone}}

Enclosures:
- Copy of government-issued ID
- Proof of address`,
  legalCodes: [],
  attackType: "bureau" as const,
  requiredFields: [
    "client_full_name",
    "client_ssn",
    "client_address",
    "client_city",
    "client_state",
    "client_zip",
    "client_email",
    "client_phone",
    "account_number",
    "original_creditor",
    "alleged_amount",
    "debt_collector_name",
    "debt_collector_address",
  ],
};

export const DISPUTE_TEMPLATES: DisputeTemplate[] = [
  FORM_221,
  FORM_305,
  FORM_401,
  FORM_502,
  FORM_609,
  FORM_611,
  FORM_623,
  FORM_807,
];

export function getTemplateByFormId(formId: string): DisputeTemplate | undefined {
  return DISPUTE_TEMPLATES.find((t) => t.formId === formId);
}
