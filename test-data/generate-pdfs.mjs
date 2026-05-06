import PDFDocument from 'pdfkit';
import { writeFileSync, mkdirSync } from 'fs';

mkdirSync('/home/ubuntu/repos/credit-genie/test-data', { recursive: true });

function createPdf(text, filename) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {
      const buf = Buffer.concat(chunks);
      writeFileSync(filename, buf);
      console.log(`Created: ${filename} (${buf.length} bytes)`);
      resolve();
    });
    doc.fontSize(10).font('Helvetica');
    const lines = text.split('\n');
    for (const line of lines) {
      doc.text(line);
    }
    doc.end();
  });
}

// ── Equifax Report ──
// Balance: $5,200 | Status: Open | Date Opened: 03/15/2020
// Has an obsolete collection with DOFD 01/15/2017 (>7 years ago)
// Has an XSS attempt in creditor name
const equifaxText = `Equifax Information Services
Credit Report
Report Date: 01/15/2025
Name: John Doe
SSN: XXX-XX-1234

Account Name: Chase Bank
Account #: XXXX-5678
Account Type: Revolving
Status: Open
Balance: $5,200
Credit Limit: $10,000
Date Opened: 03/15/2020
Date Reported: 12/01/2024
High Balance: $6,000
Monthly Payment: $150
Payment History:
2024-10: OK
2024-09: OK
2024-08: 30

Account Name: Capital One Financial
Account #: XXXX-9012
Account Type: Installment
Status: Charged Off
Balance: $3,400
Date Opened: 06/01/2015
Date Reported: 11/15/2024
Date of First Delinquency: 01/15/2017
High Balance: $5,000
Monthly Payment: $200

Account Name: <img src=x onerror=alert(1)> Credit
Account #: XXXX-3456
Account Type: Revolving
Status: Collection
Balance: $1,200
Date Opened: 01/01/2018
Date Reported: 10/01/2024`;

// ── Experian Report ──
// Balance: $4,800 (different from Equifax $5,200 → balance_mismatch)
// Status: Closed (different from Equifax Open → status_mismatch)
// Date Opened: 03/20/2020 (different → date_mismatch)
// Payment history 2024-08: OK (vs Equifax 30 → payment_history discrepancy)
const experianText = `Experian Information Solutions
Credit Report
Report Date: 01/15/2025
Name: John Doe
SSN: XXX-XX-1234

Account Name: Chase Bank
Account #: XXXX-5678
Account Type: Revolving
Status: Closed
Balance: $4,800
Credit Limit: $10,000
Date Opened: 03/20/2020
Date Reported: 12/01/2024
High Balance: $6,500
Monthly Payment: $150
Payment History:
2024-10: OK
2024-09: OK
2024-08: OK

Account Name: Capital One Financial
Account #: XXXX-9012
Account Type: Installment
Status: Charged Off
Balance: $3,400
Date Opened: 06/01/2015
Date Reported: 11/15/2024
Date of First Delinquency: 01/15/2017
High Balance: $5,000
Monthly Payment: $200`;

await createPdf(equifaxText.trim(), '/home/ubuntu/repos/credit-genie/test-data/equifax-report.pdf');
await createPdf(experianText.trim(), '/home/ubuntu/repos/credit-genie/test-data/experian-report.pdf');
console.log('Done! Test PDFs created.');
