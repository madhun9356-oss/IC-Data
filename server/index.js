import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import rulesConfig from './config/validity_rules.json' with { type: 'json' };
import { parseStudentExcel, exportResultsExcel } from './services/excelService.js';
import { extractICData } from './services/geminiService.js';
import { matchStudentName } from './services/matcherService.js';
import { evaluateDecision } from './services/decisionEngine.js';
import { 
  SAMPLE_STUDENTS, 
  extractDriveFolderId, 
  downloadDriveFile, 
  listDriveFolderFiles, 
  findMatchingFileForStudent,
  fetchSpreadsheetData
} from './services/driveService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '20mb' }));

const storage = multer.memoryStorage();
const upload = multer({ storage });

// In-memory store for active verification sessions
let currentBatchRecords = [];
let batchMetadata = {
  batch_id: 'batch-001',
  timestamp: new Date().toISOString(),
  selectedState: 'Telangana'
};

// =====================================
// API ENDPOINTS
// =====================================

// Root Health & Dashboard Status
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>IC Verification API Server</title>
        <style>
          body { font-family: system-ui, sans-serif; background: #030712; color: #f3f4f6; text-align: center; padding: 4rem 1rem; }
          .card { background: #0f172a; border: 1px solid #1e293b; max-width: 500px; margin: 0 auto; padding: 2rem; border-radius: 1rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
          h1 { color: #38bdf8; font-size: 1.5rem; margin-bottom: 0.5rem; }
          p { color: #94a3b8; font-size: 0.9rem; margin-bottom: 1.5rem; }
          .status { display: inline-block; background: #064e3b; color: #34d399; padding: 0.5rem 1rem; border-radius: 9999px; font-weight: 600; font-size: 0.875rem; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🚀 IC Verification API Server</h1>
          <p>Backend API services are live and healthy.</p>
          <div class="status">● API Active</div>
        </div>
      </body>
    </html>
  `);
});

// 1. Get State Rules Config
app.get('/api/rules', (req, res) => {
  res.json(rulesConfig);
});

// 2. Get Sample Demo Batch Data
app.get('/api/sample-students', (req, res) => {
  res.json({
    students: SAMPLE_STUDENTS,
    count: SAMPLE_STUDENTS.length
  });
});

// 3. Parse Google Spreadsheet
app.post('/api/parse-spreadsheet', async (req, res) => {
  try {
    const { spreadsheetUrl } = req.body;
    
    if (!spreadsheetUrl) {
      return res.status(400).json({ error: 'No Spreadsheet URL provided' });
    }

    const students = await fetchSpreadsheetData(spreadsheetUrl);
    
    if (!students || students.length === 0) {
      return res.status(400).json({ error: 'Spreadsheet appears empty or missing required columns' });
    }

    currentBatchRecords = students;
    res.json({
      message: 'Spreadsheet parsed successfully',
      count: students.length,
      students
    });
  } catch (err) {
    console.error('[Parse Error]', err);
    res.status(500).json({ error: `Failed to process Spreadsheet: ${err.message}` });
  }
});

// 4. Run Verification Pipeline
app.post('/api/verify', async (req, res) => {
  try {
    const {
      students = [],
      selectedState = 'Telangana',
      driveFolderUrl = ''
    } = req.body;

    const listToProcess = students.length > 0 ? students : (currentBatchRecords.length > 0 ? currentBatchRecords : SAMPLE_STUDENTS);

    // If driveFolderUrl is provided, list all files in folder
    let folderFiles = [];
    if (driveFolderUrl) {
      console.log(`[Verify Pipeline] Listing files in Drive Folder URL: ${driveFolderUrl}`);
      const folderRes = await listDriveFolderFiles(driveFolderUrl);
      folderFiles = folderRes.files || [];
      console.log(`[Verify Pipeline] Found ${folderFiles.length} file(s) in Drive folder`);
    }

    batchMetadata = {
      batch_id: `batch-${Date.now()}`,
      timestamp: new Date().toISOString(),
      selectedState,
      driveFolderId: extractDriveFolderId(driveFolderUrl)
    };

    const results = [];

    for (const student of listToProcess) {
      // 1. OCR Extraction (via Gemini, Drive file download, or sample mock)
      let extractedData;
      let targetDriveFileId = null;

      if (student.mockSample) {
        extractedData = await extractICData(null, null, student.mockSample);
      } else {
        // Resolve IC file ID: check row URL first, then search Drive Folder
        if (student.ic_drive_url) {
          targetDriveFileId = student.ic_drive_url;
        } else if (folderFiles.length > 0) {
          const matchedFile = findMatchingFileForStudent(student.name, folderFiles);
          if (matchedFile) {
            targetDriveFileId = matchedFile.id;
            student.ic_drive_url = matchedFile.webViewLink; // Add the Drive link to the student record
            console.log(`[Verify Pipeline] Matched student "${student.name}" to Drive file "${matchedFile.name}" (${matchedFile.id})`);
          }
        }

        if (targetDriveFileId) {
          console.log(`[Verify Pipeline] Downloading IC file for student "${student.name}" (Drive ID/URL: ${targetDriveFileId})`);
          const fileObj = await downloadDriveFile(targetDriveFileId);
          if (fileObj && fileObj.buffer) {
            extractedData = await extractICData(fileObj.buffer, fileObj.mimeType);
          } else if (fileObj && fileObj.error) {
            extractedData = {
              error: fileObj.error,
              extracted_name: null,
              annual_income: null,
              issue_date: null,
              certificate_number: null
            };
          } else {
            extractedData = {
              error: `IC Drive URL '${targetDriveFileId}' could not be downloaded`,
              extracted_name: null,
              annual_income: null,
              issue_date: null,
              certificate_number: null
            };
          }
        } else {
          extractedData = {
            error: 'No IC Drive URL or matching IC file found in Drive folder for this student',
            extracted_name: null,
            annual_income: null,
            issue_date: null,
            certificate_number: null
          };
        }
      }

      // 2. Name Matching
      const nameMatch = matchStudentName(
        student.name,
        extractedData.extracted_name,
        rulesConfig.defaultMinNameScore,
        rulesConfig.partialNameScoreMin,
        extractedData.raw_ocr_notes
      );

      // 3. Decision Engine
      const decision = evaluateDecision({
        studentRecord: student,
        extractedData,
        nameMatch,
        staffSelectedState: selectedState
      });

      results.push({
        ...student,
        extracted: extractedData,
        extracted_name: extractedData.extracted_name,
        annual_income: extractedData.annual_income,
        issue_date: extractedData.issue_date,
        certificate_number: extractedData.certificate_number,
        state_guess: extractedData.state_guess,
        signature_present: extractedData.signature_present,
        seal_present: extractedData.seal_present,
        field_confidences: extractedData.field_confidences,
        raw_ocr_notes: extractedData.raw_ocr_notes,
        imageUrl: student.mockSample?.imageUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800',
        ...decision,
        reviewed_by: 'Auto-Decision'
      });
    }

    currentBatchRecords = results;

    // Calculate Summary Stats
    const stats = {
      total: results.length,
      verified: results.filter(r => r.status === 'VERIFIED').length,
      rejected: results.filter(r => r.status === 'REJECTED').length,
      review: results.filter(r => r.status === 'REVIEW').length
    };

    res.json({
      metadata: batchMetadata,
      stats,
      records: results
    });
  } catch (err) {
    console.error('[Verification Pipeline Error]', err);
    res.status(500).json({ error: `Verification failed: ${err.message}` });
  }
});

// 5. Manual Reviewer Update
app.post('/api/review/update', (req, res) => {
  try {
    const { student_id, newStatus, newReason, updatedFields = {}, reviewerName = 'College Staff' } = req.body;

    const index = currentBatchRecords.findIndex(r => r.student_id === student_id);
    if (index === -1) {
      return res.status(404).json({ error: `Student ID ${student_id} not found in current batch` });
    }

    currentBatchRecords[index] = {
      ...currentBatchRecords[index],
      status: newStatus,
      reason: newReason || `Manually override by ${reviewerName}`,
      reviewed_by: reviewerName,
      reviewed_at: new Date().toISOString(),
      ...updatedFields
    };

    const stats = {
      total: currentBatchRecords.length,
      verified: currentBatchRecords.filter(r => r.status === 'VERIFIED').length,
      rejected: currentBatchRecords.filter(r => r.status === 'REJECTED').length,
      review: currentBatchRecords.filter(r => r.status === 'REVIEW').length
    };

    res.json({
      message: 'Record updated successfully',
      updatedRecord: currentBatchRecords[index],
      stats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Export Results to Excel
app.post('/api/export', (req, res) => {
  try {
    const recordsToExport = req.body.records || currentBatchRecords;
    if (!recordsToExport || recordsToExport.length === 0) {
      return res.status(400).json({ error: 'No verification records to export' });
    }

    const excelBuffer = exportResultsExcel(recordsToExport);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="IC_Verification_Report_${Date.now()}.xlsx"`);
    res.send(excelBuffer);
  } catch (err) {
    console.error('[Export Error]', err);
    res.status(500).json({ error: `Export failed: ${err.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 IC Verification System Server running on http://localhost:${PORT}`);
});
