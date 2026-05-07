# Credit Genie — Owner's Manual

**Version**: Midnight Terminal (v2.0)  
**Last Updated**: May 2026  
**Product**: ADgorhythms Legal Intelligence — Credit Genie

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard](#2-dashboard)
3. [Clients Tab](#3-clients-tab)
4. [Audit Tab](#4-audit-tab)
5. [Disputes Tab](#5-disputes-tab)
6. [Litigation Tab](#6-litigation-tab)
7. [Simulator Tab](#7-simulator-tab)
8. [Form Library Tab](#8-form-library-tab)
9. [Credit Builder Tab](#9-credit-builder-tab)
10. [Vault Tab](#10-vault-tab)
11. [The Golden Ticket — 4-Stage Workflow](#11-the-golden-ticket--4-stage-workflow)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Getting Started

### What is Credit Genie?

Credit Genie is a legal intelligence platform that automates credit repair. It finds errors on credit reports, generates legally-cited dispute letters, tracks bureau responses, and — when bureaus refuse to cooperate — prepares Small Claims court filings. It also simulates score improvements and recommends credit-building strategies.

### How to Access

Open your browser and navigate to:
- **Live**: `https://credit-genie.vercel.app`
- **Local Development**: `http://localhost:3456`

You will see the **Midnight Terminal** interface — a dark navy background with sharp-edged, monospace typography. The navigation bar at the top shows 9 tabs.

### First-Time Setup

No account creation is needed. Credit Genie runs as a self-contained tool. Your first step should be:

1. **Go to the Clients tab** to add yourself (and anyone else you're helping).
2. **Enter your credit scores** — you do NOT need a credit report PDF to get started.
3. **Add your accounts manually** if you know what's on your report.
4. **Upload PDFs** later when you have them for a deep-dive audit.

---

## 2. Dashboard

**What it shows**: The 4-Stage Workflow overview and quick stats.

### The 4 Stages

| Stage | Name | What Happens |
|-------|------|-------------|
| **01** | **Intake** | Client uploads report or enters data manually. Genie finds legal violations in seconds. |
| **02** | **Strike** | You select a Form ID (e.g., FORM-101). Genie drafts unique dispute letters for each bureau. |
| **03** | **Follow-Up** | Bureau responds "Verified." Genie auto-triggers a Method of Verification (MOV) demand letter. |
| **04** | **Rebuild** | Bad items removed. Genie directs client to tradelines and credit-building products. |

### How to Use

1. Click the **Dashboard** tab (it's the default landing page).
2. Review the workflow stages to understand the process.
3. The Dashboard gives you a bird's-eye view — the real work starts in the **Clients** tab.

---

## 3. Clients Tab

**What it does**: Manage everyone you're helping — yourself, family members, clients.

### Adding a New Client

1. Click the **Clients** tab in the navigation bar.
2. Click the **"+ Add Client"** button.
3. Fill in the intake form:
   - **Name**: Full legal name (e.g., "JJ Williams")
   - **Email**: Contact email
   - **State**: Two-letter state code (e.g., "NY")
   - **County**: County name (e.g., "Orange")
4. Click **"Save Client"**.
5. The client card will appear in the list showing their name, email, state, and county.

### Viewing a Client's Profile

1. Click on any client card in the list.
2. You'll see their full profile with:
   - **Score Tracker** — credit scores by bureau
   - **Add Score** — enter new scores
   - **Set Goal** — define a target score and purpose (e.g., "680 for SBA Loan")
   - **Score History** — chart tracking score changes over time
   - **Manual Accounts** — list of credit accounts you've entered
   - **Notes** — free-text notes about the client

### Entering Credit Scores (No PDF Required)

1. Open a client's profile by clicking their card.
2. In the **"Add Score"** section:
   - **Bureau**: Select Equifax, Experian, or TransUnion
   - **Score**: Enter the credit score (e.g., 642)
   - **Date**: Select the date this score was pulled
3. Click **"Add Score"**.
4. The score gauge will update immediately — the number appears under the bureau name.
   - **Green** (680+): Good
   - **Orange** (580–679): Fair
   - **Red** (below 580): Poor
5. Repeat for each bureau. You can enter scores from Credit Karma, myFICO, or your bank.

### Setting a Goal

1. In the **"Set Goal"** section:
   - **Target Score**: The number you're aiming for (e.g., 680)
   - **Purpose**: Why you need this score (e.g., "SBA Loan", "Mortgage", "Auto Loan")
2. Click **"Set Goal"**.
3. The goal will be tracked against your current scores.

### Adding Accounts Manually

If you know what accounts are on your credit report (even without the PDF), you can enter them:

1. Scroll down to **"Add Account Manually"**.
2. Fill in the fields:
   - **Creditor Name** (required): e.g., "Capital One", "Midland Collections"
   - **Account # (last 4)**: Last 4 digits of the account number
   - **Bureau**: Which bureau reports this account
   - **Type**: Revolving, Installment, Mortgage, Collection, or Other
   - **Status**: Open, Closed, Collection, Charge Off, or Paid
   - **Balance**: Current balance in dollars
   - **Credit Limit**: For revolving accounts (credit cards)
   - **Monthly Payment**: What you pay monthly
   - **Negative?**: Select "Yes" if this account has negative marks
   - **Negative Reason**: Late Payment, Collection, Charge Off, Repossession, Bankruptcy, or Hard Inquiry
3. Click **"Add Account"**.
4. The account will appear in the Manual Accounts section.
   - Negative accounts have a **red left border**.
   - The subtitle shows the bureau, type, status, and reason.

### Adding Notes

1. Scroll to the **Notes** section.
2. Type your note in the text area.
3. Click **"Add Note"**.
4. Notes are timestamped and stored with the client.

---

## 4. Audit Tab

**What it does**: Upload credit report PDFs and let the Genie find every reporting error automatically.

### Running an Audit

1. Click the **Audit** tab.
2. **Upload PDFs**: Click the drop zone or drag-and-drop your credit report PDFs.
   - Supports Equifax, Experian, and TransUnion reports
   - Files must be PDF format
   - You can upload 1, 2, or 3 reports
3. **Set Bureau Labels**: The system auto-detects which bureau each file belongs to based on the filename. Verify the dropdown next to each file is correct:
   - `equifax-report.pdf` → Equifax
   - `experian-report.pdf` → Experian
   - `transunion-report.pdf` → TransUnion
4. Click **"Run Free Credit Audit"**.
5. Wait for the analysis to complete (usually a few seconds).

### Reading the Results

After the audit completes, you'll see:

- **Violations**: Number of reporting errors found
- **Est. Damages**: Statutory damages at $1,000 per violation (under FCRA)
- **Bureaus**: How many bureaus were analyzed
- **Accounts Matched**: How many accounts were compared across bureaus

### Cross-Bureau Discrepancy Map

This table shows side-by-side comparisons of every account across all 3 bureaus:

| Column | What It Shows |
|--------|--------------|
| **Account** | The creditor/account name |
| **Field** | Which data field differs (balance, status, date, etc.) |
| **Equifax** | What Equifax reports |
| **Experian** | What Experian reports |
| **TransUnion** | What TransUnion reports |
| **Violation** | The specific FCRA violation code |

Red-highlighted cells indicate mismatches — these are your legal ammunition.

### Generating Dispute Letters from the Audit

1. Scroll down to **"Generate Dispute Letters"**.
2. Fill in:
   - **Full Name**: Your legal name
   - **Email**: Your email
   - **State**: Your state
   - **County**: Your county
3. Click **"Generate All Dispute Letters"**.
4. Letters are created for every violation found, one per bureau.

---

## 5. Disputes Tab

**What it does**: Track your dispute rounds and bureau responses.

### Understanding Dispute Rounds

Credit repair typically takes 2–3 rounds of disputes:
- **Round 1**: Initial dispute letters sent to bureaus
- **Round 2**: Follow-up if bureau responds "Verified" (MOV demand)
- **Round 3**: Escalation to CFPB or Small Claims if still unresolved

### How to Use

1. Click the **Disputes** tab.
2. After generating dispute letters (from the Audit tab), they'll appear here.
3. Each dispute shows:
   - **Creditor name** and account details
   - **Bureau** the dispute was sent to
   - **Status**: Pending, In Progress, Resolved, Escalated
   - **Deadline**: 30-day countdown (bureaus must respond within 30 days by law)
   - **Round number**: Which dispute round this is

### Recording Bureau Responses

When a bureau responds to your dispute:

1. Find the dispute in the list.
2. Click **"Record Response"**.
3. Select the response type:
   - **Deleted**: Bureau removed the item (you win!)
   - **Corrected**: Bureau fixed the error (you win!)
   - **Verified**: Bureau says the info is correct (triggers MOV)
   - **No Response**: Bureau didn't respond within 30 days (automatic violation)
4. If the bureau responded "Verified," the Genie automatically escalates:
   - Generates a **Method of Verification (MOV) demand letter**
   - Moves the dispute to the **Litigation** tab if needed

---

## 6. Litigation Tab

**What it does**: Prepares Small Claims court filing packages when bureaus refuse to fix errors.

### When Does This Activate?

The Litigation tab auto-populates when:
- A bureau responds "Verified" to a valid dispute
- A bureau fails to respond within 30 days
- You manually escalate a dispute

### What's in the Filing Package?

For each bureau you're suing, the Genie creates:

| Form | Purpose |
|------|---------|
| **Complaint** | The formal legal complaint filed with the court |
| **Summons** | Notice served to the bureau to appear in court |
| **Proof of Service** | Certification that you properly served the bureau |
| **Cover Letter** | Professional cover letter for the court clerk |
| **Evidence Exhibit** | Your dispute letters, bureau responses, and violation evidence |

### How to Use

1. Click the **Litigation** tab.
2. Review the filing package for each bureau.
3. Each package shows:
   - **Court**: Your local Small Claims court (based on your county/state)
   - **Filing Fee**: Estimated court filing fee
   - **Damages**: $1,000 per violation under FCRA § 1681n
4. Click each form to view and download it.
5. **Print all forms**, sign where indicated, and file at your local courthouse.

### Important Notes

- Small Claims limits vary by state ($3,000–$25,000 depending on jurisdiction).
- You do NOT need a lawyer for Small Claims court.
- Statutory damages under FCRA are $100–$1,000 per violation.
- Attorney fees are recoverable — mention this if a bureau tries to settle.

---

## 7. Simulator Tab

**What it does**: Predicts how your credit score will change if negative items are removed.

### Running a Simulation

1. Click the **Simulator** tab.
2. **Select Client**: Choose the person from the dropdown.
3. **Monthly Income**: Enter their gross monthly income (e.g., 5000).
4. **What-If Scenarios**: All negative accounts appear as checkboxes.
   - **Checked** = the item is removed from the report (simulate deletion)
   - **Unchecked** = the item stays
5. Click **"Run Simulation"**.

### Reading the Results

| Section | What It Shows |
|---------|--------------|
| **Projected Scores** | New estimated score for each bureau, with the point increase in green (e.g., "+28 pts") |
| **Score Factors** | 5 FICO categories with impact ratings: Payment History (35%), Utilization (30%), Age of Credit (15%), Credit Mix (10%), New Credit (10%) |
| **DTI Analysis** | Current Debt-to-Income ratio, Target DTI (36%), Borrowing Power (how much mortgage you qualify for), Monthly Debt total |

### Tips

- Try toggling individual items on/off to see which ones are hurting the most.
- The **Borrowing Power** figure is based on standard mortgage guidelines (28% front-end ratio).
- Use "Clear All" to reset and try different combinations.

---

## 8. Form Library Tab

**What it does**: 11 pre-written legal dispute letter templates. Pick a form, pick a client, and the Genie auto-fills everything.

### Available Forms

| Form ID | Name | Use When... |
|---------|------|------------|
| **FORM-101** | Cross-Bureau Balance Mismatch | Equifax says $2,500 but Experian says $3,200 |
| **FORM-102** | Cross-Bureau Date Mismatch | Late payment date differs between bureaus |
| **FORM-201** | 30-Day Late Payment Strike | Disputing a reported 30-day late payment |
| **FORM-301** | Metro 2 Segment Error — Date Sequence | Date of Last Activity is after Date Closed (fatal error) |
| **FORM-401** | Debt Validation Request (FDCPA § 809) | Demand collector prove the debt is valid |
| **FORM-402** | Pay-For-Delete Offer | Offer to pay in exchange for removal |
| **FORM-403** | Cease & Desist | Tell collector to stop contacting you |
| **FORM-501** | Method of Verification Demand | Bureau said "Verified" — demand proof |
| **FORM-601** | Goodwill Adjustment Request | Ask nicely for removal on otherwise good account |
| **FORM-701** | CFPB Complaint Escalation | File formal complaint with Consumer Financial Protection Bureau |
| **FORM-801** | Intent to Sue Notice | Final warning before Small Claims filing |

### Generating a Letter

1. Click the **Form Library** tab.
2. **Filter by Category** (optional): Choose a category to narrow the list:
   - Data Integrity, Late Payments, Collections, Metro 2 Violations, Follow-Up (MOV), Goodwill, Escalation (CFPB), Litigation
3. **Select Client**: Choose the person from the dropdown.
4. **Click a Form Card**: The form detail section appears below.
5. **Fill in the Variables**: Each form has specific fields (account number, bureau name, creditor name, balances, etc.).
   - **Client name, address, and date are auto-populated** — you do NOT need to enter these.
6. Click **"Generate Letter"**.
7. The letter preview appears with:
   - Your client's name and address at the top
   - The bureau's address
   - Legal citations (e.g., "15 U.S.C. § 1681i")
   - Account-specific details injected into the body
8. Click **"Download Letter"** to save as a text file.

### Recommended Dispute Order

1. Start with **FORM-101** or **FORM-102** for cross-bureau discrepancies (strongest legal position).
2. Use **FORM-201** for late payment disputes.
3. Use **FORM-401** for collections (debt validation).
4. If bureau responds "Verified," use **FORM-501** (MOV demand).
5. If still unresolved after 30 days, use **FORM-701** (CFPB escalation).
6. Last resort: **FORM-801** (Intent to Sue), then **Litigation tab** for court filings.

---

## 9. Credit Builder Tab

**What it does**: Analyzes your cash flow and recommends credit-building products.

### Running an Analysis

1. Click the **Credit Builder** tab.
2. Enter your monthly financial details:
   - **Monthly Income**: Gross monthly income
   - **Monthly Rent**: Rent/mortgage payment
   - **Monthly Utilities**: Electric, gas, water, internet, phone
3. Click **"Analyze"**.

### Reading the Results

| Section | What It Shows |
|---------|--------------|
| **Cash Flow** | Monthly disposable income after expenses |
| **Product Recommendations** | Credit-building products you qualify for |
| **Score Projections** | Estimated score improvement at 30, 60, 180+ days |

### Recommended Products

The Genie recommends products based on your cash flow and credit profile:
- **Secured Credit Cards**: Build credit with a cash deposit (e.g., Discover it Secured)
- **Credit Builder Loans**: Small loans designed to build payment history
- **Rent Reporting**: Report your on-time rent payments to bureaus
- **Utility Reporting**: Report utility payments to bureaus
- **Authorized User Tradelines**: Get added to someone else's card for instant history

---

## 10. Vault Tab

**What it does**: Secure storage for sensitive documents.

### Uploading Documents

1. Click the **Vault** tab.
2. Click **"Upload Document"** or drag-and-drop files.
3. Supported documents:
   - Government ID (driver's license, passport)
   - Social Security card
   - Utility bills (for address verification)
   - Credit reports
   - Dispute letters (sent and received)
   - Bureau response letters
   - Court documents
4. Documents are stored per-client and can be attached to dispute letters automatically.

### Why Use the Vault?

- Every dispute letter needs a copy of your ID and proof of address.
- The Vault keeps everything organized per client.
- When you generate dispute letters, the Genie can pull documents from the Vault to attach.

---

## 11. The Golden Ticket — 4-Stage Workflow

This is the complete credit repair process from start to finish.

### Stage 1: The Intake

**Goal**: Find every legal violation on the credit report.

1. **Add the client** in the Clients tab.
2. **Enter their scores** (manually or from Credit Karma/myFICO).
3. **Add their accounts** manually if you know them, OR:
4. **Upload their credit report PDFs** in the Audit tab.
5. **Run the audit** — the Genie finds violations in seconds.
6. Review the **Cross-Bureau Discrepancy Map** for mismatches.

### Stage 2: The Strike

**Goal**: Send legally-cited dispute letters to every bureau with errors.

1. Go to the **Form Library** tab.
2. Select the client.
3. For each violation found, pick the appropriate form:
   - Balance mismatch → FORM-101
   - Date mismatch → FORM-102
   - Late payment → FORM-201
   - Metro 2 error → FORM-301
   - Collection → FORM-401
4. Fill in the account details.
5. Click **"Generate Letter"**.
6. Download and **print** each letter.
7. **Mail via certified mail** (return receipt requested) to each bureau.

**Mailing Addresses:**
- **Equifax**: P.O. Box 740256, Atlanta, GA 30374-0256
- **Experian**: P.O. Box 4500, Allen, TX 75013
- **TransUnion**: P.O. Box 2000, Chester, PA 19016

### Stage 3: The Follow-Up

**Goal**: Handle bureau responses and escalate if needed.

1. Wait 30 days for bureau responses (they're legally required to respond).
2. When a response arrives, go to the **Disputes** tab.
3. Click **"Record Response"** and select the outcome.
4. If the bureau says **"Verified"**:
   - The Genie auto-generates a **MOV demand letter** (FORM-501).
   - Download, print, and mail it.
   - The bureau must provide proof of HOW they verified.
5. If the bureau says **"Deleted"** or **"Corrected"** — that item is resolved.
6. If **no response** within 30 days — this is an automatic FCRA violation.

### Stage 4: The Rebuild

**Goal**: Lock in score improvements with positive tradelines.

1. Go to the **Simulator** tab to see projected scores after removals.
2. Go to the **Credit Builder** tab for product recommendations.
3. Open the recommended credit products:
   - Get a **secured card** to build payment history.
   - Sign up for **rent reporting** if you pay rent.
   - Consider a **credit builder loan** from a credit union.
4. Monitor scores monthly — enter new scores in the Clients tab.
5. Repeat the cycle if new negative items appear.

---

## 12. Troubleshooting

### Common Questions

**Q: Do I need a credit report PDF to use Credit Genie?**  
A: No. You can enter scores and accounts manually in the Clients tab. PDFs give you a more thorough automated audit, but manual entry works for everything else — the Simulator, Form Library, and Credit Builder all work with manually entered data.

**Q: Where do I get my credit reports?**  
A: Visit [AnnualCreditReport.com](https://www.annualcreditreport.com) for free reports from all 3 bureaus. You can also use Credit Karma (Equifax + TransUnion) or Experian.com for free Experian reports.

**Q: How long does credit repair take?**  
A: Typically 2–6 months for a full cycle. Bureaus have 30 days to respond to each dispute round. Most cases take 2–3 rounds.

**Q: Can I use Credit Genie for other people?**  
A: Yes. Add each person as a separate client. You can manage multiple people simultaneously — each has their own scores, accounts, disputes, and vault.

**Q: What's the difference between a dispute letter and a debt validation letter?**  
A: Dispute letters go to **credit bureaus** (Equifax, Experian, TransUnion) under the FCRA. Debt validation letters go to **debt collectors** under the FDCPA. Use FORM-101 through FORM-301 for bureaus. Use FORM-401 for collectors.

**Q: What happens if a bureau ignores my dispute?**  
A: If they don't respond within 30 days, that's an automatic FCRA violation worth $1,000 in statutory damages. The Genie will flag this and prepare a Small Claims filing in the Litigation tab.

**Q: Do I need a lawyer?**  
A: Not for Small Claims court. Credit Genie generates all the legal documents you need. For larger claims (Federal court), you may want an attorney — FCRA allows recovery of attorney fees.

### Tips for Success

1. **Always send certified mail** with return receipt — this proves the bureau received your letter.
2. **Keep copies of everything** — upload to the Vault.
3. **Be patient** — the 30-day response window is your friend. Bureaus that miss it give you an automatic win.
4. **Don't dispute everything at once** — start with the strongest violations (cross-bureau mismatches) and work your way down.
5. **Check your scores monthly** — enter updated scores in the Clients tab to track progress.
6. **Use the Simulator before each round** — it tells you which items to prioritize.

---

*Credit Genie is built by ADgorhythms. For support, contact the development team.*
