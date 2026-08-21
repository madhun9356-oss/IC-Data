# Tech Stack
## Income Certificate (IC) Verification System — built in Antigravity, ₹0 budget, 1-week timeline

| Layer | Choice | Why |
|---|---|---|
| **Build environment** | Google Antigravity | Agentic IDE — good fit for scaffolding a full-stack app fast from a spec like this. |
| **Frontend** | React (Vite) or plain Next.js, minimal component library (e.g. shadcn/ui or plain Tailwind) | Simple dashboard UI, no need for a heavy framework. Keep it to: Upload page, Progress/Results page, Review queue page. |
| **Backend** | Node.js (Express) or Python (FastAPI) — pick whichever Antigravity scaffolds more cleanly with the Gemini SDK | Handles orchestration: Excel parsing, Drive calls, Gemini calls, decision engine, Sheets writes. |
| **OCR / Extraction** | Gemini Flash API (free tier) | Cheap/fast multimodal model, good enough for structured field extraction from certificate images/PDFs; keep prompts to a fixed JSON schema (see Extraction Spec doc). |
| **File source** | Google Drive API | Read-only access to the shared IC folder; no need to re-host files. |
| **Database** | Google Sheets API | Zero-cost, staff-visible, no server to maintain. Three tabs: Batches, Records, AuditLog (see Technical Design doc §3). |
| **Excel I/O** | `xlsx`/`openpyxl`/`SheetJS` (language-dependent) | Parse uploaded Excel, generate the final export Excel. |
| **Image preprocessing** | Lightweight client- or server-side enhancement (e.g. `sharp` in Node, or `Pillow`/`OpenCV` in Python) | Contrast/sharpen/deskew pass before sending blurry scans to Gemini. |
| **Auth** | Google OAuth (Sign in with Google), scoped to Drive + Sheets access | Free, and naturally restricts the app to people with a college Google account — no separate user DB needed. |
| **Hosting (frontend + backend)** | Vercel (frontend) + a free-tier backend host (Render/Fly.io free tier, or a Google Cloud Run free tier if staying in-ecosystem) | ₹0 hosting, fast to deploy from Antigravity. |
| **Fuzzy name matching** | `fuzzywuzzy`/`rapidfuzz` (Python) or `fuse.js`/`string-similarity` (JS) | Off-the-shelf libraries, no need to write matching logic from scratch. |
| **State/config rules** | Plain JSON/YAML config file, not hardcoded in the decision engine | Makes adding Tamil Nadu/Karnataka in Phase 2 a data change, not a code change. |
| **PDF/image handling** | `pdf-lib`/`pdf.js` (JS) or `pdf2image`/`PyMuPDF` (Python) to turn PDF pages into images before OCR | Gemini Flash handles images most reliably as rendered pages. |

## Suggested repo/module layout (for Antigravity to scaffold)

```
/frontend
  /pages (Upload, Results, Review)
/backend
  /modules
    excel_ingest.*
    drive_client.*
    gemini_extract.*
    name_matcher.*
    state_rules.json
    decision_engine.*
    sheets_store.*
    export.*
  /config
    validity_rules.json
```

## Notes on choosing between Node and Python
- **Python** has slightly stronger out-of-the-box libraries for OCR/image preprocessing and fuzzy matching, and Gemini's Python SDK is mature.
- **Node** may integrate more smoothly if the frontend and backend are one Next.js app (simpler deploy, one language).
Either is fine — pick whichever Antigravity's scaffolding leans toward faster, since the 1-week clock is the binding constraint, not language choice.

## What's deliberately excluded to hit the 1-week/₹0 constraints
- No dedicated database server (Postgres/Mongo) — Sheets substitutes for Phase 1 volumes.
- No custom-trained OCR/classification model — Gemini Flash's general multimodal extraction is used as-is.
- No mobile app.
- No payment/billing infrastructure (not applicable here anyway).
