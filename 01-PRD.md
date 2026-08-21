# Product Requirements Document (PRD)
## Income Certificate (IC) Verification System

**Version:** 1.0
**Build target:** Google Antigravity
**Timeline:** 1 week
**Budget:** ₹0 (free-tier tools only)

---

## 1. Problem Statement

College staff currently verify student Income Certificates (ICs) manually — opening each PDF/image, checking it against a student's claimed income, checking the issue date against a state-specific validity window, and looking for a tahsildar signature and seal. With hundreds of students per semester across 4+ states, each with a different IC template and validity rule, this is slow and error-prone.

## 2. Goal

Build a web app where a staff member with zero coding knowledge can:
1. Upload an Excel sheet (Name, Type, Annual Income, Language, IC Drive URL).
2. Point the app at a Google Drive folder containing the IC files.
3. Pick the validity year/rule to apply.
4. Click one button and get back a reviewed, exportable Excel with a verification status per student.

## 3. Users

- **Primary:** College administrative staff (non-technical) running verification once per semester.
- **Secondary:** A human reviewer who resolves the "REVIEW" queue.
- **Not a user:** Students (no student-facing interface in this scope).

## 4. Scope

### In scope (Week 1 / Phase 1)
- States: **Telangana** and **Andhra Pradesh** (highest sample volume, build first).
- Excel upload + Drive folder URL input.
- Gemini Flash OCR extraction of: Name, Income, Issue Date, Certificate #, State, Language, Signature presence, Seal presence.
- Name matching between Excel row and extracted IC.
- State-aware validity check (issue date vs. selected year).
- Decision engine producing **VERIFIED / REJECTED / REVIEW**.
- Manual override UI for the REVIEW queue.
- Final Excel export.
- Self-declaration form fallback for missing/expired ICs.
- Basic image enhancement for blurry scans before OCR.

### Phase 2 (post Week 1)
- Tamil Nadu and Karnataka support.
- Semester-over-semester history/recurrence tracking.
- Bulk re-run / audit trail.

### Out of scope entirely
- Payments, multi-tenant college accounts, mobile app, student self-serve portal.

## 5. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR1 | Staff can upload an `.xlsx` file matching the agreed column structure (Name, Type, Annual Income, Language, IC Drive URL). |
| FR2 | Staff can paste a Google Drive folder URL containing all IC files, or upload files directly if Drive access fails. |
| FR3 | Staff selects a state and a validity year/rule before running verification. |
| FR4 | System fetches each IC file, runs OCR via Gemini Flash, and returns structured JSON per document. |
| FR5 | System matches the extracted name to the Excel name using fuzzy matching (handles spelling/spacing variance). |
| FR6 | System detects which state's template the IC belongs to (auto-detect, with the staff's selection as an override/hint). |
| FR7 | System applies state-specific validation rules (validity period, required fields) to compute a status. |
| FR8 | Every record is classified as VERIFIED, REJECTED, or REVIEW, with a reason string attached. |
| FR9 | REVIEW records are shown in a queue where a human can view the source IC image side-by-side with extracted fields and manually accept/reject/edit. |
| FR10 | If a student has no IC or an expired IC, the system offers a self-declaration form as fallback, and flags that record accordingly in the export. |
| FR11 | Staff can export a final Excel with one row per student: original columns + Status + Reason + Extracted Income + Extracted Issue Date + Reviewer (if manually reviewed). |
| FR12 | Blurry/low-quality scans are auto-enhanced (contrast/sharpen) before being sent to OCR. |

## 6. Non-Functional Requirements

- **Usability:** No technical knowledge required — upload, click, download. Target: a first-time staff member completes a run without help.
- **Cost:** Must run entirely on free tiers (Gemini Flash free tier, Google Drive/Sheets API, free hosting).
- **Turnaround:** A batch of ~50 ICs should process in well under 10 minutes.
- **Transparency:** Every REJECTED or REVIEW result must show a human-readable reason (e.g. "Certificate expired: issued 2019, TS validity is 1 year").
- **Data handling:** Student income data is sensitive — no public exposure of the Sheet/Drive links; access should be restricted to the college's own Google account.

## 7. User Flow

1. Staff logs in / opens the app.
2. Uploads Excel → app validates column headers and row count.
3. Pastes Drive folder URL → app checks it can list/read the folder.
4. Selects state (or "auto-detect") and the validity year.
5. Clicks **Run Verification**.
6. Progress view shows per-student status as the pipeline runs (OCR → match → validate → decide).
7. Results dashboard: counts of VERIFIED / REJECTED / REVIEW, filterable table.
8. Staff opens the REVIEW tab, resolves each flagged case (approve, reject, or request self-declaration).
9. Staff clicks **Export** → downloads final Excel.

## 8. Success Metrics

- % of ICs correctly auto-classified without needing manual review (target: >70% in Phase 1 for TS/AP).
- Time to process a batch of 50 vs. manual baseline.
- Zero false VERIFIEDs on expired certificates (this is the highest-risk failure mode — treat as a hard requirement, not just a metric).

## 9. Constraints & Assumptions

- Built with **Antigravity** in ~1 week by a solo/small builder.
- Google Sheets used as the database (no separate DB server).
- Sample data available: 12 IC PDFs (TS×5, AP×2+, TN×1, KA×1, Self-Declaration×1) + demo Excel with 8 students.
- Assumes staff has (or the college provides) a Google account with Drive/Sheets access for the app to use.

## 10. Risks

| Risk | Mitigation |
|------|------------|
| Gemini Flash misreads handwritten/regional-language dates or numbers | Confidence-score threshold routes low-confidence extractions to REVIEW instead of auto-deciding |
| Only 1-2 sample ICs for AP/TN/KA — template detection may overfit to Telangana | Ship TS+AP first with a manual "state override" dropdown as safety net; expand rules as more samples arrive |
| Free-tier API rate limits during a big batch run | Process sequentially/batched with retry+backoff; show progress so staff isn't confused by a slow run |
| 1-week deadline | Phase scope tightly to TS+AP; TN/KA and history tracking pushed to Phase 2 (see Section 4) |
