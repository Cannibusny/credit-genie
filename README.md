# Credit Genie

**ADgorhythms Legal Intelligence System** — The most aggressive credit repair tool on the planet.

Credit Genie is not a mail merge. It's a **Legal Intelligence System** that audits credit reports for FCRA violations, generates legally-cited dispute letters, and prepares Small Claims court filings when bureaus fail to comply.

## The Three Engines

### Engine 1: Metro 2 Sniper (Data Integrity)
- OCR pipeline extracts data from any credit report PDF (digital or scanned)
- Cross-bureau diffing compares Equifax, Experian, and TransUnion side-by-side
- Auto-detects Section 611 violations, Metro 2 format errors, balance mismatches, date conflicts, obsolete items, and duplicate accounts
- Generates dispute letters with specific FCRA citations and Metro 2 field references

### Engine 2: Automated Litigator
- Tracks dispute lifecycle with 30-day response deadlines
- Auto-escalates "verified but not corrected" disputes to litigation
- Generates Small Claims filing packages with jurisdiction-aware court forms
- Pre-fills complaints citing $1,000 per violation under FCRA § 616/617

### Engine 3: Liquid Credit Builder
- Cash flow analysis engine (Plaid-ready for Open Banking)
- Matches clients to credit building products based on real income/expense data
- Surfaces "hidden credit" — rent, utilities, and streaming payments reportable to bureaus
- Generates personalized credit building strategy with estimated score impact

## Quick Start

```bash
npm install
npm run smoke    # Test all three engines (no API keys needed)
npm run dev      # Start server on :3001
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/audit` | Upload PDFs, run cross-bureau audit |
| `GET` | `/api/audit/:id` | Get audit results |
| `POST` | `/api/audit/:id/disputes` | Generate dispute letters |
| `GET` | `/api/audit/:id/letters/:i` | Download a dispute letter |
| `POST` | `/api/litigation/package` | Generate court filing package |
| `POST` | `/api/builder/analyze` | Analyze cash flow & get recommendations |
| `GET` | `/health` | Service health check |

## Tech Stack

- **TypeScript** + **Express** — API server
- **Tesseract.js** — OCR for scanned PDFs
- **pdf-parse** — Native text extraction
- **Handlebars** — Legal document templating
- **Supabase** — Control plane (optional, stubs when not configured)
- **Anthropic Claude** — AI-powered analysis (optional)
- **Plaid** — Open Banking integration (Engine 3, optional)

## Environment

Copy `.env.example` to `.env` and configure. All external services are optional — the system runs fully with deterministic stubs for local development.

## License

Proprietary — ADgorhythms Inc.
