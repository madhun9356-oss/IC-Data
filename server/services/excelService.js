import XLSX from 'xlsx';

/**
 * Parses uploaded Excel buffer into student records.
 */
export function parseStudentExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  // Map and validate columns
  return rawRows.map((row, index) => {
    // Standardize column keys
    const getVal = (keys) => {
      for (const k of keys) {
        const foundKey = Object.keys(row).find(rk => rk.trim().toLowerCase() === k.toLowerCase());
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== '') return row[foundKey];
      }
      return '';
    };

    const name = getVal(['Name', 'Student Name', 'Applicant Name']);
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
}

/**
 * Generates an Excel buffer for download containing verification audit results.
 */
export function exportResultsExcel(records) {
  const exportRows = records.map(r => ({
    'Student ID': r.student_id,
    'Name': r.name,
    'Type': r.type,
    'Declared Annual Income (₹)': r.declared_income,
    'Language': r.language,
    'IC Drive URL': r.ic_drive_url,
    'Verification Status': r.status,
    'Decision Reason': r.reason,
    'Extracted Name': r.extracted_name || 'N/A',
    'Extracted Income (₹)': r.annual_income || 'N/A',
    'Issue Date': r.issue_date || 'N/A',
    'Expiry Date': r.expiry_date || 'N/A',
    'Certificate Number': r.certificate_number || 'N/A',
    'State': r.resolvedState || 'N/A',
    'Name Match %': r.nameMatchScore ? `${Math.round(r.nameMatchScore * 100)}%` : 'N/A',
    'Reviewed By': r.reviewed_by || 'Auto-Decision'
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  
  // Set column widths
  const colWidths = [
    { wch: 12 }, { wch: 22 }, { wch: 10 }, { wch: 24 }, { wch: 12 },
    { wch: 35 }, { wch: 16 }, { wch: 45 }, { wch: 22 }, { wch: 20 },
    { wch: 14 }, { wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 16 }
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'IC Verification Export');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
