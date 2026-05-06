# Credit Genie — End-to-End Test Plan

## What Changed
Complete UI overhaul from single-page audit to 4-tab navigation (Audit, Disputes, Litigation, Credit Builder). Three new engines wired to frontend: dispute lifecycle tracking with deadlines, jurisdiction-aware litigation package generation with 5 court form types, and credit builder with 9 product recommendations and score projection.

## Primary Flow: Full Lifecycle (Audit → Disputes → Litigation → Credit Builder)

### Test 1: Upload PDFs & Run Audit
**Steps:**
1. Navigate to `http://localhost:3001`
2. Verify 4 tab buttons visible: "Audit", "Disputes", "Litigation", "Credit Builder"
3. Click the upload zone → select `test-data/equifax-report.pdf` and `test-data/experian-report.pdf`
4. Verify both file names appear as chips in the upload zone
5. Set bureau dropdowns: first file = "Equifax", second = "Experian"
6. Click "Run Full Audit"

**Pass/Fail Criteria:**
- Violations Found stat card shows a number ≥ 3 (not 0)
- Estimated Damages stat card shows a dollar amount ≥ $3,000
- Bureaus Processed stat card shows "2"
- At least one violation card shows severity badge ("HIGH" or "CRITICAL")
- At least one violation card shows cross-bureau values (two bureau names with different values)
- "Generate All Dispute Letters" button becomes enabled (not grayed out)

### Test 2: Generate Dispute Letters & Verify Disputes Tab
**Steps:**
1. Fill client info: Name = "John Doe", Email = "john@test.com", State = "FL", County = "Miami-Dade"
2. Click "Generate All Dispute Letters"
3. Verify letters appear as downloadable links
4. Click a letter link → verify it opens/downloads with content containing "John Doe" (not "Client")
5. Click the "Disputes" tab

**Pass/Fail Criteria:**
- "Letters Generated" count ≥ 6 (each violation generates per-bureau letters)
- Downloaded letter contains "John Doe" as client name
- Disputes tab badge shows count > 0 (red badge on tab)
- Disputes tab shows "Total Disputes" stat > 0
- "Awaiting Response" count matches total (all start as pending)
- Each dispute item shows a deadline countdown (e.g., "30d left" or "29d left")
- Dispute items show bureau names (e.g., "Equifax — Dispute", "Experian — Dispute")

### Test 3: Record Bureau Response & Escalate to Litigation
**Steps:**
1. On Disputes tab, select a dispute from the "Select dispute..." dropdown
2. Set response type to "Verified (not fixed)"
3. Click "Record Response"
4. Verify the dispute status changes from pending (yellow) to verified (orange)
5. Verify "Escalate to Litigation" button becomes enabled
6. Fill litigation client info: Name = "John Doe", State = "FL", County = "Miami-Dade"
7. Click "Escalate to Litigation"

**Pass/Fail Criteria:**
- Alert confirms response recorded
- Dispute item status changes visually (yellow → orange indicator)
- "Escalated" count in stats becomes ≥ 1
- Auto-switches to "Litigation" tab after escalation
- Litigation tab shows jurisdiction info: court name contains "Miami-Dade" or "Florida"
- Filing fee is displayed (a dollar amount > $0)
- Small Claims Limit shows a dollar amount > $0
- Estimated Damages shows a dollar amount > $0

### Test 4: Verify Litigation Package & Court Forms
**Steps:**
1. On Litigation tab, verify court forms are displayed
2. Count the number of form cards
3. Verify form types include: Court Complaint, Summons, Proof of Service, Cover Letter, Evidence Exhibit
4. Click a "Court Complaint" form link → verify it opens with text content
5. Verify the complaint mentions "John Doe" and "Miami-Dade" or "Florida"

**Pass/Fail Criteria:**
- Court forms count ≥ 5 (5 types for at least 1 bureau)
- All 5 form types are present: Court Complaint, Summons, Proof of Service, Cover Letter, Evidence Exhibit
- Complaint text contains "John Doe"
- Complaint text contains a Florida/Miami-Dade court reference
- Filing instructions section is visible with numbered steps (1-7)

### Test 5: Credit Builder Analysis
**Steps:**
1. Click "Credit Builder" tab
2. Verify form pre-filled with income $4,000
3. Enter rent: $1,200
4. Verify Utilities and Streaming checkboxes are checked by default
5. Click "Analyze My Credit Potential"

**Pass/Fail Criteria:**
- "Net Cash Flow" stat shows a positive dollar amount (> $0)
- "Credit Capacity" stat shows a dollar amount
- "Products Available" count ≥ 7 (expect 9 with these inputs)
- "Est. Score Impact" shows a number > 100 (expect ~280)
- Recommendations list shows product cards with provider names (e.g., "Boom Pay", "RentTrack", "Self")
- Each recommendation card shows "+XX pts" impact badge
- Score Impact Projection section shows 3 tiers: "Immediate (30 days)", "Short-term (60-90 days)", "Medium-term (6+ months)"
- Total projected points displayed at bottom matches the Est. Score Impact stat
