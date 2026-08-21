import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const CREDENTIALS_PATH = path.resolve(process.cwd(), 'server/config/google_credentials.json');

// Helper to resolve Google Authentication from environment variables or local key file
let lastAuthError = null;

export function getLastAuthError() {
  return lastAuthError;
}

// Helper to resolve Google Authentication from environment variables or local key file
function getGoogleAuth(scopes) {
  lastAuthError = null;

  // 1. Check environment variables containing full JSON (raw JSON or base64 encoded)
  const envJsonStr = process.env.GOOGLE_CREDENTIALS_JSON || 
                     process.env.GOOGLE_SERVICE_ACCOUNT_JSON || 
                     process.env.GOOGLE_CREDENTIALS ||
                     (process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GOOGLE_APPLICATION_CREDENTIALS.trim().startsWith('{') ? process.env.GOOGLE_APPLICATION_CREDENTIALS : null);

  if (envJsonStr) {
    try {
      let jsonContent = envJsonStr.trim();
      // Strip leading and trailing quotes (single or double)
      jsonContent = jsonContent.replace(/^['"]+|['"]+$/g, '').trim();

      // Handle base64 encoded JSON if applicable
      if (!jsonContent.startsWith('{')) {
        try {
          const decoded = Buffer.from(jsonContent, 'base64').toString('utf8').trim();
          if (decoded.startsWith('{')) {
            jsonContent = decoded;
          }
        } catch (b64Err) {
          // Keep original string if base64 decoding fails
        }
      }

      let credentials;
      try {
        credentials = JSON.parse(jsonContent);
      } catch (parseErr1) {
        // Attempt fallback for unescaped newlines in JSON strings
        try {
          const sanitized = jsonContent.replace(/\r/g, '').replace(/\n/g, '\\n');
          credentials = JSON.parse(sanitized);
        } catch (parseErr2) {
          console.error('[DriveService] Error parsing Google credentials from env JSON:', parseErr1.message);
          lastAuthError = `JSON parse error: ${parseErr1.message}`;
        }
      }

      if (credentials) {
        if (credentials.private_key && typeof credentials.private_key === 'string') {
          credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
        }
        return new google.auth.GoogleAuth({
          credentials,
          scopes
        });
      }
    } catch (e) {
      console.error('[DriveService] Error parsing Google credentials from env JSON:', e.message);
      lastAuthError = e.message;
    }
  }

  // 2. Check individual environment variables (GOOGLE_CLIENT_EMAIL & GOOGLE_PRIVATE_KEY)
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    try {
      const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
      const credentials = {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey,
        project_id: process.env.GOOGLE_PROJECT_ID || 'ic-income-data'
      };
      return new google.auth.GoogleAuth({
        credentials,
        scopes
      });
    } catch (e) {
      console.error('[DriveService] Error setting up Google auth from individual env vars:', e.message);
      lastAuthError = `Individual env vars error: ${e.message}`;
    }
  }

  // 3. Check GOOGLE_APPLICATION_CREDENTIALS file path if specified and exists
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    return new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes
    });
  }

  // 4. Fallback to local default file path
  if (fs.existsSync(CREDENTIALS_PATH)) {
    return new google.auth.GoogleAuth({
      keyFile: CREDENTIALS_PATH,
      scopes
    });
  }

  lastAuthError = 'GOOGLE_CREDENTIALS_JSON variable not found in Vercel environment';
  return null;
}

let driveClient = null;

// Initialize Google Drive API with Service Account credentials
export function getDriveClient() {
  if (driveClient) return driveClient;

  try {
    const auth = getGoogleAuth([
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/spreadsheets'
    ]);
    if (auth) {
      driveClient = google.drive({ version: 'v3', auth });
      console.log('[DriveService] Initialized Google Drive API with Service Account');
    } else {
      console.warn('[DriveService] No Google Service Account credentials found (env vars or key file)');
    }
  } catch (err) {
    console.error('[DriveService] Google Drive Auth setup notice:', err.message);
  }
  return driveClient;
}

let sheetsClient = null;

export function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  try {
    const auth = getGoogleAuth([
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/spreadsheets.readonly'
    ]);
    if (auth) {
      sheetsClient = google.sheets({ version: 'v4', auth });
      console.log('[DriveService] Initialized Google Sheets API with Service Account');
    } else {
      console.warn('[DriveService] No Google Service Account credentials found (env vars or key file)');
    }
  } catch (err) {
    console.error('[DriveService] Google Sheets Auth setup notice:', err.message);
  }
  return sheetsClient;
}

/**
 * Extracts Google Drive File ID or Folder ID from URL
 */
export function extractDriveFileId(url) {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : (url.length > 20 && !url.includes('/') ? url : null);
}

export function extractDriveFolderId(url) {
  if (!url) return null;
  const match = url.match(/folders\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : (url.length > 20 && !url.includes('/') ? url : null);
}

/**
 * Downloads a file buffer from Google Drive by File ID or Drive URL
 */
export async function downloadDriveFile(driveUrlOrId) {
  const fileId = extractDriveFileId(driveUrlOrId);
  if (!fileId) return null;

  const drive = getDriveClient();
  if (!drive) {
    return { error: 'Service Account credentials not configured for Google Drive. Please set GOOGLE_CREDENTIALS_JSON or GOOGLE_CLIENT_EMAIL & GOOGLE_PRIVATE_KEY environment variables in Vercel/Render, or add server/config/google_credentials.json.' };
  }

  try {
    const meta = await drive.files.get({ fileId, fields: 'id, name, mimeType' });
    const mimeType = meta.data.mimeType || 'application/pdf';

    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    return {
      buffer: Buffer.from(res.data),
      mimeType: mimeType === 'application/vnd.google-apps.document' ? 'application/pdf' : mimeType,
      fileName: meta.data.name
    };
  } catch (err) {
    console.error(`[DriveService] Could not download file ${fileId}:`, err.message);
    return {
      error: `Drive access error: ${err.message}. Please share folder/file with service account: ic-data@ic-income-data.iam.gserviceaccount.com`,
      fileId
    };
  }
}

/**
 * List files inside a Google Drive Folder
 */
export async function listDriveFolderFiles(folderUrl) {
  const folderId = extractDriveFolderId(folderUrl);
  const drive = getDriveClient();

  if (!drive || !folderId) {
    return { files: [], isSampleFallback: true };
  }

  try {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, webViewLink, thumbnailLink)',
      pageSize: 100
    });

    return {
      files: res.data.files || [],
      isSampleFallback: false,
      folderId
    };
  } catch (err) {
    console.error('[DriveService] Failed to list Drive folder files:', err.message);
    return { files: [], isSampleFallback: true, error: err.message };
  }
}

/**
 * Matches a student name to a file in the Drive folder list
 */
export function findMatchingFileForStudent(studentName, driveFiles = []) {
  if (!driveFiles || driveFiles.length === 0) return null;
  if (driveFiles.length === 1) return driveFiles[0];

  const normStudent = (studentName || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // 1. Check exact or substring token match
  for (const file of driveFiles) {
    const normFile = file.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normFile.includes(normStudent) || normStudent.includes(normFile)) {
      return file;
    }
  }

  // 2. Check individual name tokens (e.g. "Gujjidi" and "Naveen")
  const tokens = (studentName || '').toLowerCase().split(/\s+/).filter(t => t.length > 2);
  for (const file of driveFiles) {
    const fileNameLower = file.name.toLowerCase();
    if (tokens.length > 0 && tokens.every(t => fileNameLower.includes(t))) {
      return file;
    }
  }

  // 3. Fallback to any token match
  for (const file of driveFiles) {
    const fileNameLower = file.name.toLowerCase();
    if (tokens.some(t => fileNameLower.includes(t))) {
      return file;
    }
  }

  return null;
}

export function extractSpreadsheetId(url) {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : (url.length > 20 && !url.includes('/') ? url : null);
}

export async function fetchSpreadsheetData(spreadsheetUrl) {
  const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
  if (!spreadsheetId) {
    throw new Error('Invalid Google Spreadsheet URL');
  }

  const sheets = getSheetsClient();
  if (!sheets) {
    const detail = getLastAuthError() ? ` (${getLastAuthError()})` : '';
    throw new Error(`Service Account credentials not configured for Google Sheets${detail}. Please check GOOGLE_CREDENTIALS_JSON in Vercel/Render settings.`);
  }

  try {
    // We assume data is on the first sheet, so we can just request 'A1:Z' or something similar
    // Or we can get the spreadsheet metadata to find the first sheet name, but usually 'Sheet1' works or just the first sheet's ID.
    // Fetching the spreadsheet metadata first to get the first sheet's title
    const metaRes = await sheets.spreadsheets.get({ spreadsheetId });
    const firstSheetTitle = metaRes.data.sheets[0].properties.title;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${firstSheetTitle}'!A1:Z1000` // Assuming max 1000 rows for now and columns A-Z
    });

    const rows = response.data.values || [];
    if (rows.length < 2) {
      throw new Error('Spreadsheet appears empty or missing data rows');
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    return dataRows.map((rowArray, index) => {
      // Helper to get value by header name
      const getVal = (keys) => {
        for (const k of keys) {
          const colIndex = headers.findIndex(h => h && h.trim().toLowerCase() === k.toLowerCase());
          if (colIndex !== -1 && rowArray[colIndex] !== undefined && rowArray[colIndex] !== '') {
            return rowArray[colIndex];
          }
        }
        return '';
      };

      const name = getVal(['Name', 'Student Name', 'Applicant Name', 'Full Name', 'Candidate Name', 'Student']);
      const type = getVal(['Type', 'Document Type', 'Doc Type']) || 'IC';
      const rawIncome = getVal(['Annual Income', 'Income', 'Declared Income']);
      const language = getVal(['Language', 'Lang']) || 'Telugu';
      const driveUrl = getVal(['IC Drive URL', 'Drive URL', 'IC URL', 'File URL', 'IC File']);

      const declared_income = typeof rawIncome === 'number'
        ? rawIncome
        : parseFloat(String(rawIncome).replace(/[^0-9.]/g, '')) || 0;

      return {
        student_id: `row-${index + 1}`,
        name: name || `Student #${index + 1}`,
        type,
        declared_income,
        language,
        ic_drive_url: driveUrl
      };
    });

  } catch (err) {
    console.error('[DriveService] Failed to fetch spreadsheet:', err);
    throw new Error(`Spreadsheet fetch failed: ${err.message}. Please share with service account.`);
  }
}

export const SAMPLE_STUDENTS = [
  {
    student_id: 'row-1',
    name: 'Pusarla Sindhu',
    type: 'IC',
    declared_income: 180000,
    language: 'Telugu',
    ic_drive_url: 'https://drive.google.com/file/d/sample-ts-01/view',
    mockSample: {
      extracted_name: 'P. Sindhu',
      annual_income: 180000,
      issue_date: '2026-05-15',
      certificate_number: 'TS/IC/2026/00891',
      state_guess: 'Telangana',
      language_detected: 'Telugu',
      signature_present: true,
      seal_present: true,
      raw_ocr_notes: 'Telangana Meeseva official revenue certificate template',
      imageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800'
    }
  },
  {
    student_id: 'row-2',
    name: 'K. Venkat Reddy',
    type: 'IC',
    declared_income: 120000,
    language: 'Telugu',
    ic_drive_url: 'https://drive.google.com/file/d/sample-ts-02/view',
    mockSample: {
      extracted_name: 'Konduru Venkat Reddy',
      annual_income: 120000,
      issue_date: '2023-01-10', // EXPIRED for Telangana (1 yr validity -> expired Jan 2024)
      certificate_number: 'TS/IC/2023/04512',
      state_guess: 'Telangana',
      language_detected: 'Telugu',
      signature_present: true,
      seal_present: true,
      raw_ocr_notes: 'Certificate issued over 3 years ago',
      imageUrl: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&q=80&w=800'
    }
  },
  {
    student_id: 'row-3',
    name: 'G. Ananya Naidu',
    type: 'IC',
    declared_income: 250000,
    language: 'Telugu',
    ic_drive_url: 'https://drive.google.com/file/d/sample-ap-01/view',
    mockSample: {
      extracted_name: 'G. Ananya Naidu',
      annual_income: 250000,
      issue_date: '2024-08-20', // Valid for AP (4 yr validity -> expires Aug 2028)
      certificate_number: 'AP/MeeSeva/2024/88120',
      state_guess: 'Andhra Pradesh',
      language_detected: 'Telugu/English',
      signature_present: true,
      seal_present: true,
      raw_ocr_notes: 'Andhra Pradesh MeeSeva e-Certificate',
      imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800'
    }
  },
  {
    student_id: 'row-4',
    name: 'R. Rajesh Kumar',
    type: 'IC',
    declared_income: 150000,
    language: 'English',
    ic_drive_url: 'https://drive.google.com/file/d/sample-ts-03/view',
    mockSample: {
      extracted_name: 'R. Rajesh Kumar',
      annual_income: 210000, // Discrepancy (Excel 150k vs IC 210k -> REVIEW)
      issue_date: '2026-04-12',
      certificate_number: 'TS/IC/2026/11094',
      state_guess: 'Telangana',
      language_detected: 'English',
      signature_present: true,
      seal_present: true,
      raw_ocr_notes: 'Income stated as 2,10,000 INR on document',
      imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800'
    }
  },
  {
    student_id: 'row-5',
    name: 'B. Sravani',
    type: 'IC',
    declared_income: 90000,
    language: 'Telugu',
    ic_drive_url: 'https://drive.google.com/file/d/sample-ts-04/view',
    mockSample: {
      extracted_name: 'Boddu Sravani',
      annual_income: 90000,
      issue_date: '2026-07-01',
      certificate_number: 'TS/IC/2026/33419',
      state_guess: 'Telangana',
      language_detected: 'Telugu',
      signature_present: false, // Missing signature -> REVIEW
      seal_present: true,
      raw_ocr_notes: 'Official seal visible, signature line un-inked',
      imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800'
    }
  },
  {
    student_id: 'row-6',
    name: 'S. Karthik Subbaraj',
    type: 'IC',
    declared_income: 300000,
    language: 'Tamil',
    ic_drive_url: 'https://drive.google.com/file/d/sample-tn-01/view',
    mockSample: {
      extracted_name: 'S. Karthik',
      annual_income: 300000,
      issue_date: '2026-03-10',
      certificate_number: 'TN/REV/2026/77890',
      state_guess: 'Tamil Nadu',
      language_detected: 'Tamil',
      signature_present: true,
      seal_present: true,
      raw_ocr_notes: 'Tamil Nadu e-Sevai Revenue Dept certificate',
      imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800'
    }
  },
  {
    student_id: 'row-7',
    name: 'M. Divya Bharathi',
    type: 'Self-Declaration',
    declared_income: 60000,
    language: 'Telugu',
    ic_drive_url: 'https://drive.google.com/file/d/sample-sd-01/view',
    mockSample: {
      is_self_declaration: true,
      extracted_name: 'M. Divya Bharathi',
      annual_income: 60000,
      issue_date: '2026-01-15',
      certificate_number: 'SD-2026-0041',
      state_guess: 'Telangana',
      raw_ocr_notes: 'Student Self-Declaration Fallback Form'
    }
  },
  {
    student_id: 'row-8',
    name: 'V. Sai Sharath',
    type: 'IC',
    declared_income: 160000,
    language: 'Telugu',
    ic_drive_url: 'https://drive.google.com/file/d/sample-ts-05/view',
    mockSample: {
      extracted_name: 'V. Sharath Kumar', // Name mismatch -> REJECTED
      annual_income: 160000,
      issue_date: '2026-05-20',
      certificate_number: 'TS/IC/2026/44120',
      state_guess: 'Telangana',
      language_detected: 'Telugu',
      signature_present: true,
      seal_present: true,
      raw_ocr_notes: 'Certificate belongs to different applicant name',
      imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=800'
    }
  }
];
