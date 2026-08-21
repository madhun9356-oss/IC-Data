# Gemini Flash Extraction Spec
## Prompt + JSON schema contract for the OCR/extraction module

This is the one piece of the pipeline where prompt quality directly determines accuracy across 4 different state templates and 2+ languages, so it gets its own spec.

---

## 1. Design principle

**One fixed output schema, regardless of state or language.** The extraction step should not need to know state-specific rules — it just reads what's on the document and reports a confidence per field. All state-specific *decisions* happen downstream in the Validation Rules / Decision Engine modules (see Technical Design doc). This keeps the prompt simple and keeps state logic in one place (a config file, not scattered across prompts).

## 2. Suggested system/task prompt

```
You are extracting structured data from an Indian state government
Income Certificate (IC) document. The document may be in English,
Telugu, Tamil, or Kannada, and may be a scan, photo, or PDF page.

Extract the following fields exactly as they appear on the document.
If a field is not visible or not present, return null for it — do not
guess or fabricate a value.

Return ONLY valid JSON matching this schema, with no extra commentary:

{
  "extracted_name": string | null,
  "annual_income": number | null,       // numeric value only, no currency symbols/commas
  "issue_date": string | null,          // ISO format YYYY-MM-DD
  "certificate_number": string | null,
  "state_guess": string | null,         // one of: "Telangana", "Andhra Pradesh", "Tamil Nadu", "Karnataka", "Unknown"
  "language_detected": string | null,
  "signature_present": boolean,
  "seal_present": boolean,
  "field_confidences": {
    "name": number,            // 0.0 - 1.0
    "income": number,
    "issue_date": number,
    "certificate_number": number,
    "signature": number,
    "seal": number
  },
  "raw_ocr_notes": string      // brief note on template cues used for state_guess, or any ambiguity
}

Guidance for state_guess: look for letterhead text, seal wording,
certificate number prefixes/format, and layout style. If uncertain,
return "Unknown" rather than guessing — a wrong guess is worse than
an honest "Unknown" here.

Guidance for signature_present / seal_present: these should reflect
what is physically visible on the document (an ink signature and an
official round/rectangular seal/stamp), not whether the certificate
looks "official" overall.
```

## 3. Field-by-field notes

| Field | Extraction notes |
|---|---|
| `extracted_name` | Take the applicant's name exactly as printed, including initials. Don't normalize case/spacing — that's the Name Matching module's job. |
| `annual_income` | Strip currency symbols, commas, and words like "Rupees" — numeric value only. If the document states income in words only (e.g. "One Lakh Eighty Thousand"), convert to a number. |
| `issue_date` | Normalize to `YYYY-MM-DD` regardless of the document's original date format/language. |
| `certificate_number` | Copy verbatim, including any prefix (e.g. `TS/IC/2023/00891`). |
| `state_guess` | Used as a hint only — the app's State Detection module treats the staff's manual selection as authoritative unless there's a strong conflict (see Technical Design doc §2.4). |
| `signature_present` / `seal_present` | Both being `false` is one of the hard REJECT triggers in the Decision Engine — keep this conservative (only `true` if clearly visible). |
| `field_confidences` | This is what routes low-confidence extractions to the human REVIEW queue — don't let the model return blanket high confidence; ask it to genuinely reflect extraction difficulty (blur, handwriting, cropped text, etc.). |

## 4. Handling PDFs and multi-page files

Convert each PDF page to an image before calling Gemini (see Tech Stack doc — `pdf2image`/`PyMuPDF` or `pdf.js`). Most ICs are single-page; if a file has multiple pages, extract from page 1 by default and flag `raw_ocr_notes` if the certificate content seems to continue onto page 2.

## 5. Validation before trusting the output

After receiving the JSON:
1. Verify it parses as valid JSON — if not, retry once with a stricter "return only JSON" reminder appended.
2. Verify `issue_date` parses as a real date — if not, null it out and drop `field_confidences.issue_date` to 0.
3. Verify `annual_income` is numeric — if not, same treatment.

This guards the Decision Engine from crashing on malformed model output rather than trusting it blindly.

## 6. Testing this module against the sample data

Before wiring into the full pipeline, run this prompt against the 12 sample ICs (TS×5, AP×2+, TN×1, KA×1, Self-Declaration×1) and hand-check the JSON output against what's actually on each document. This is the fastest way to catch prompt issues (e.g. consistent misreads of a particular state's date format) before the 1-week clock runs out on debugging downstream logic instead.
