# Technical Design Document
## Income Certificate (IC) Verification System

---

## 1. Architecture Overview

```
USER
 │
 ▼
Upload Excel ──► Paste Google Drive URL ──► IC Files
 │                                              │
 └──────────────────┬───────────────────────────┘
                     ▼
            ┌─────────────────┐
            │   GEMINI FLASH   │
            │  (OCR + Extract) │
            │  - Name          │
            │  - Income        │
            │  - Issue Date    │
            │  - Certificate # │
            │  - State         │
            │  - Language      │
            │  - Signature     │
            │  - Seal          │
            └────────┬─────────┘
                      ▼
              Structured JSON
                      ▼
               Name Matching
                      ▼
              State Detection
                      ▼
            IC Validation Rules
                      ▼
              Decision Engine
             /        │        \
            ▼         ▼         ▼
       VERIFIED   REJECTED    REVIEW
                                │
                                ▼
                         Human Review
                                │
                                ▼
                          Final Excel
```

This doc specifies each box as a module with clear inputs/outputs so it can be built independently and wired together in Antigravity.

---

## 2. Module Breakdown

### 2.1 Input Layer
**Inputs:** `.xlsx` file, Google Drive folder URL (or direct file uploads).
**Responsibilities:**
- Parse Excel, validate required columns: `Name`, `Type`, `Annual Income`, `Language`, `IC (Drive URL)`.
- Resolve the Drive folder URL → list of file IDs, or match per-row `IC Drive URL` to a specific file.
- Download/stream each file for the OCR step (PDF and common image formats).
**Output:** an internal `StudentRecord[]` list:
```json
{
  "student_id": "row-3",
  "name": "P. Sindhu",
  "type": "IC",
  "declared_income": 180000,
  "language": "Telugu",
  "ic_file_id": "drive-file-id-or-url"
}
```

### 2.2 Gemini Flash Extraction
**Input:** one IC file (image/PDF page), pre-processed (see 2.1a).
**Prompt contract:** always request the same JSON schema regardless of state, so downstream code doesn't branch per-state at this stage. See `03-Gemini-Extraction-Spec.md` for the exact prompt and schema.
**Output (Structured JSON):**
```json
{
  "extracted_name": "P. Sindhu",
  "annual_income": 180000,
  "issue_date": "2023-04-12",
  "certificate_number": "TS/IC/2023/00891",
  "state_guess": "Telangana",
  "language_detected": "Telugu",
  "signature_present": true,
  "seal_present": true,
  "field_confidences": {
    "name": 0.95,
    "income": 0.88,
    "issue_date": 0.91,
    "certificate_number": 0.80,
    "signature": 0.97,
    "seal": 0.93
  },
  "raw_ocr_notes": "template matches TS Meeseva format"
}
```

**2.1a — Image enhancement (pre-step, sits inside this module):**
Run a lightweight enhancement pass (contrast/sharpen/deskew) on low-quality scans before sending to Gemini. Trigger only when a quick blur/contrast heuristic flags the image, to avoid wasting calls on already-clean scans.

### 2.3 Name Matching
**Input:** `StudentRecord.name` (from Excel) + `extracted_name` (from Gemini JSON).
**Logic:** fuzzy string match (token-sort + Levenshtein ratio) to absorb spacing, initials, and transliteration differences (e.g. "P. Sindhu" vs "Pusarla Sindhu").
**Output:** `name_match_score` (0–1) and `name_match_status` (`MATCH` / `PARTIAL` / `NO_MATCH`), thresholds configurable (e.g. ≥0.85 MATCH, 0.6–0.85 PARTIAL, <0.6 NO_MATCH).

### 2.4 State Detection
**Input:** `state_guess` from Gemini + staff's selected state (from the dashboard) + template cues (layout keywords, seal text, certificate number prefix).
**Logic:** if staff explicitly selected a state, treat it as authoritative unless Gemini's `state_guess` strongly disagrees (flag to REVIEW in that case rather than silently overriding). If staff chose "auto-detect," use `state_guess` directly.
**Output:** `resolved_state` (Telangana / Andhra Pradesh / Tamil Nadu / Karnataka / Unknown).

### 2.5 IC Validation Rules (state-specific, config-driven — not hardcoded)
A single rules table drives this module so adding TN/KA in Phase 2 is a config change, not new code:

| State | Validity Period | Notes |
|---|---|---|
| Telangana | 1 year from issue date | |
| Andhra Pradesh | 4 years from issue date | |
| Tamil Nadu | 1 year from issue date | Phase 2 |
| Karnataka | 5 years from issue date | Phase 2 |

**Input:** `resolved_state`, `issue_date`, staff-selected validity year/reference date.
**Logic:**
```
expiry_date = issue_date + validity_period[resolved_state]
is_expired = today (or selected reference date) > expiry_date
```
**Output:** `expiry_date`, `is_expired` (bool), `days_until_expiry` (can be negative).

### 2.6 Decision Engine
**Input:** everything above, combined per student.
**Rules (evaluated in order):**

1. **REJECTED** if:
   - `is_expired == true`, OR
   - `name_match_status == NO_MATCH`, OR
   - `signature_present == false` AND `seal_present == false`, OR
   - No IC file found and no self-declaration submitted.
2. **REVIEW** if not REJECTED, and any of:
   - Any `field_confidences` value below threshold (e.g. < 0.75), OR
   - `name_match_status == PARTIAL`, OR
   - `resolved_state` conflicts between staff selection and Gemini's guess, OR
   - `declared_income` (Excel) differs from `annual_income` (extracted) by more than a configurable tolerance (e.g. 5%).
3. **VERIFIED** if none of the above triggered.

**Output per student:**
```json
{
  "student_id": "row-3",
  "status": "REVIEW",
  "reason": "Income mismatch: Excel says ₹180,000, IC shows ₹165,000",
  "extracted": { "...": "..." },
  "expiry_date": "2024-04-12",
  "name_match_score": 0.91
}
```

### 2.7 Human Review Queue
**Input:** all `status == REVIEW` records.
**UI:** side-by-side view — IC image/PDF on one side, editable extracted fields + Excel-declared fields on the other, with the specific `reason` highlighted. Reviewer actions: **Approve as Verified**, **Reject**, **Edit field and re-run decision**, **Request self-declaration**.
**Output:** updates `status` to `VERIFIED` / `REJECTED`, tags `reviewed_by: "manual"`.

### 2.8 Self-Declaration Fallback
Triggered when: no IC found for a student, or IC is expired/rejected and college policy allows a self-declaration in lieu.
**Flow:** generate a simple form (Name, Declared Income, Date, digital acknowledgment) → on submission, create a record with `status: VERIFIED (self-declared)` and `type: SD`, distinct from IC-based verification for audit purposes.

### 2.9 Export
Merges original Excel columns with: `Status`, `Reason`, `Extracted Income`, `Extracted Issue Date`, `Expiry Date`, `Certificate Number`, `Reviewed By`. Outputs `.xlsx` for download.

---

## 3. Data Storage (Google Sheets as DB)

One spreadsheet, three tabs, keyed by `student_id` (= Excel row reference + batch ID):

- **`Batches`** — batch_id, upload timestamp, state, validity year selected, staff email, counts (verified/rejected/review).
- **`Records`** — one row per student per batch: all fields from the Decision Engine output above.
- **`AuditLog`** — timestamped entries for every manual review action (who, what changed, when) — needed for the semester-recurrence/history requirement in Phase 2.

Rationale: Sheets is free, staff can eyeball/export it directly, and Antigravity can read/write via the Sheets API without standing up a database.

## 4. Error Handling

| Failure | Handling |
|---|---|
| Drive file not accessible (permissions) | Mark record `status: ERROR`, reason "Drive file inaccessible," surface in a separate "Errors" tab in the dashboard, don't silently drop the student. |
| Gemini API failure/timeout on a file | Retry with backoff (max 2 retries); if still failing, mark `status: REVIEW`, reason "OCR failed — needs manual read." |
| Excel missing required column | Block the run at upload time with a clear message naming the missing column. |
| Unrecognized state/template | `resolved_state: Unknown` → auto-route to REVIEW, never guess-VERIFY. |

## 5. Security & Privacy Notes

- No public sharing links for the working Sheet/Drive — restrict to the college's Google Workspace account running the app.
- Income data is sensitive: avoid logging raw extracted income/PII to any third-party analytics.
- Gemini API calls should not persist file content beyond the call unless explicitly required — check Gemini API data-retention settings for the tier used.

## 6. Open Questions for Staff/Stakeholder Input
- Exact income-mismatch tolerance before flagging REVIEW (proposed: 5%).
- Which reference date to use for "today" when computing expiry — date of verification run, or semester start date?
- Who has authority to approve a self-declaration in place of a rejected/expired IC?
