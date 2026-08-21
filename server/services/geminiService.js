import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const SYSTEM_PROMPT = `
You are an expert OCR system extracting structured fields from an Indian State Government Income Certificate (IC) document (Telangana Meeseva, Andhra Pradesh MeeSeva, Tamil Nadu e-Sevai, Karnataka Nadakacheri, Maharashtra, etc.).
The document may be in ANY Indian regional language (e.g., Telugu, Kannada, Tamil, Hindi, Marathi, Bengali, etc.) or a mix of English and a regional language.

Carefully scan the image/document and extract:
1. "extracted_name": The full name of the Student/Applicant. 
   - NOTE: On many revenue certificates, the text reads "Sri/Smt [Parent Name] F/o / S/o / D/o / W/o [Student Name]". Always look for the student/child name.
   - CRITICAL: If the name is written in a regional Indian script (e.g., Kannada, Telugu, Hindi), you MUST transliterate/translate the name into English characters (e.g., "ಕುಮಾರಿ. ಮೇಘನ" -> "Kumari Meghana"). Return ONLY the English transliteration.
2. "annual_income": The total annual income in numeric Rupees (look for "Annual Income ... is Rs. [Amount]", e.g. "Rs. 98000/-" -> 98000. Strip commas, currency symbols, and words like "Rupees").
3. "issue_date": The official date of issue in ISO format YYYY-MM-DD (e.g., "10/06/2026" -> "2026-06-10").
4. "certificate_number": The unique Application/Certificate reference number (e.g. "IC266055122720" or "TS/IC/2026/00891").
5. "state_guess": State name ("Telangana", "Andhra Pradesh", "Tamil Nadu", "Karnataka", or "Unknown").
6. "signature_present": true if a Tahsildar/Mandal Revenue Officer signature (ink, digital, or official seal signature) is physically visible, else false.
7. "seal_present": true if an official government round or rectangular stamp/emblem seal is visible, else false.

Return ONLY valid JSON matching this schema, with no commentary:
{
  "extracted_name": string | null,
  "annual_income": number | null,
  "issue_date": string | null,
  "certificate_number": string | null,
  "state_guess": string | null,
  "language_detected": string | null, // e.g., "Kannada/English", "Telugu", "Hindi"
  "signature_present": boolean,
  "seal_present": boolean,
  "field_confidences": {
    "name": number,
    "income": number,
    "issue_date": number,
    "certificate_number": number,
    "signature": number,
    "seal": number
  },
  "raw_ocr_notes": string
}
`;

export async function extractICData(imageBuffer, mimeType = 'image/jpeg', mockSample = null) {
  if (mockSample) {
    return simulateExtractionFromMock(mockSample);
  }

  if (!imageBuffer) {
    return {
      error: 'No IC document file supplied for this student record',
      extracted_name: null,
      annual_income: null,
      issue_date: null,
      certificate_number: null,
      state_guess: 'Unknown',
      signature_present: false,
      seal_present: false,
      field_confidences: { name: 0, income: 0, issue_date: 0, certificate_number: 0, signature: 0, seal: 0 },
      raw_ocr_notes: 'Missing document image buffer'
    };
  }

  const apiKey = process.env.OMNIROUTE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      error: 'GEMINI_API_KEY or OMNIROUTE_API_KEY is not configured in server .env',
      extracted_name: null,
      annual_income: null,
      issue_date: null,
      certificate_number: null,
      state_guess: 'Unknown',
      signature_present: false,
      seal_present: false
    };
  }

  const baseUrl = process.env.OMNIROUTE_BASE_URL;

  try {
    // If OmniRoute key (sk-...) or explicit OMNIROUTE_BASE_URL is set, use OpenAI-compatible endpoint format
    if (apiKey.startsWith('sk-') || baseUrl) {
      const endpoint = baseUrl 
        ? `${baseUrl.replace(/\/$/, '')}/chat/completions` 
        : 'http://localhost:20128/v1/chat/completions';

      console.log(`[GeminiService] Routing OCR request via OmniRoute endpoint (${endpoint})`);

      const base64Data = imageBuffer.toString('base64');
      const dataUrl = `data:${mimeType || 'image/jpeg'};base64,${base64Data}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: process.env.OMNIROUTE_MODEL || 'gemini/gemini-3-flash-preview',
          stream: false,
          messages: [
            {
              role: 'system',
              content: SYSTEM_PROMPT
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Extract structured JSON fields from this Income Certificate image as specified in system prompt.' },
                { type: 'image_url', image_url: { url: dataUrl } }
              ]
            }
          ],
          temperature: 0.1
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OmniRoute gateway response (${response.status}): ${errText}`);
      }

      const json = await response.json();
      const rawContent = json.choices?.[0]?.message?.content || '';
      const cleanedText = rawContent.replace(/```json\n?|\n?```/g, '').trim();
      const parsedData = JSON.parse(cleanedText);

      return validateAndSanitizeExtraction(parsedData);
    }

    // Direct Google Gemini API Key with automatic model fallback
    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-1.5-pro'];

    const imagePart = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: mimeType || 'application/pdf'
      }
    };

    let lastError = null;
    for (const modelName of candidateModels) {
      try {
        console.log(`[GeminiService] Attempting OCR with model "${modelName}"...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([SYSTEM_PROMPT, imagePart]);
        const responseText = result.response.text();

        const cleanedText = responseText.replace(/```json\n?|\n?```/g, '').trim();
        const parsedData = JSON.parse(cleanedText);

        return validateAndSanitizeExtraction(parsedData);
      } catch (err) {
        console.warn(`[GeminiService] Model "${modelName}" failed (${err.message}). Trying next fallback model...`);
        lastError = err;
      }
    }

    throw lastError || new Error('All candidate Gemini models failed');
  } catch (err) {
    console.error('[GeminiService] OCR extraction error:', err.message);
    return {
      error: `OCR extraction failed: ${err.message}`,
      extracted_name: null,
      annual_income: null,
      issue_date: null,
      certificate_number: null,
      state_guess: 'Unknown',
      signature_present: false,
      seal_present: false,
      raw_ocr_notes: `Error during API extraction: ${err.message}`
    };
  }
}

function validateAndSanitizeExtraction(data) {
  let annual_income = data.annual_income;
  if (typeof annual_income === 'string') {
    annual_income = parseFloat(annual_income.replace(/[^0-9.]/g, ''));
  }

  let issue_date = data.issue_date;
  if (issue_date && isNaN(Date.parse(issue_date))) {
    issue_date = null;
    if (data.field_confidences) data.field_confidences.issue_date = 0;
  }

  return {
    extracted_name: data.extracted_name || null,
    annual_income: typeof annual_income === 'number' && !isNaN(annual_income) ? annual_income : null,
    issue_date: issue_date || null,
    certificate_number: data.certificate_number || null,
    state_guess: data.state_guess || 'Telangana',
    language_detected: data.language_detected || 'English/Telugu',
    signature_present: Boolean(data.signature_present),
    seal_present: Boolean(data.seal_present),
    field_confidences: data.field_confidences || {
      name: 0.9, income: 0.9, issue_date: 0.9, certificate_number: 0.9, signature: 0.9, seal: 0.9
    },
    raw_ocr_notes: data.raw_ocr_notes || 'Extracted via Gemini 1.5 Flash'
  };
}

function simulateExtractionFromMock(mockSample) {
  return {
    extracted_name: mockSample.extracted_name,
    annual_income: mockSample.annual_income,
    issue_date: mockSample.issue_date,
    certificate_number: mockSample.certificate_number,
    state_guess: mockSample.state_guess,
    language_detected: mockSample.language_detected || 'Telugu',
    signature_present: mockSample.signature_present ?? true,
    seal_present: mockSample.seal_present ?? true,
    field_confidences: mockSample.field_confidences || {
      name: 0.94, income: 0.92, issue_date: 0.95, certificate_number: 0.89, signature: 0.98, seal: 0.96
    },
    raw_ocr_notes: mockSample.raw_ocr_notes || 'Meeseva official layout detected'
  };
}
