/**
 * Name Matching Service
 * Calculates fuzzy string match between Excel student name and Extracted IC name.
 * Absorbs parent/guardian relationship structures (e.g., "F/o Gujjidi Naveen").
 */

function normalizeName(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getLevenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function calculateSimilarity(str1, str2) {
  const norm1 = normalizeName(str1);
  const norm2 = normalizeName(str2);

  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 1.0;

  const tokens1 = norm1.split(' ').filter(Boolean);
  const tokens2 = norm2.split(' ').filter(Boolean);

  const initials1 = tokens1.map(t => t[0]).join('');
  const initials2 = tokens2.map(t => t[0]).join('');

  let initialMatch = initials1 === initials2;

  const maxLength = Math.max(norm1.length, norm2.length);
  const distance = getLevenshteinDistance(norm1, norm2);
  let baseScore = 1 - distance / maxLength;

  if (initialMatch && baseScore < 0.85) {
    baseScore = Math.max(baseScore, 0.88);
  }

  return Math.min(1.0, Math.max(0.0, Number(baseScore.toFixed(2))));
}

export function matchStudentName(excelName, extractedName, minMatch = 0.85, minPartial = 0.60, rawOcrNotes = '') {
  let score = calculateSimilarity(excelName, extractedName);

  // If score is low, search raw OCR notes for parent/student relationship text (e.g. "F/o GUJJUDI NAVEEN")
  if (score < minMatch && rawOcrNotes) {
    const normExcel = normalizeName(excelName);
    const normNotes = normalizeName(rawOcrNotes);

    const tokens = normExcel.split(' ').filter(t => t.length >= 3);
    const allTokensFound = tokens.length > 0 && tokens.every(t => normNotes.includes(t));

    if (allTokensFound) {
      score = 0.95; // Strong match found in child/parent relationship text
    } else {
      const notesScore = calculateSimilarity(excelName, rawOcrNotes);
      if (notesScore >= minMatch) {
        score = Math.max(score, notesScore);
      }
    }
  }

  let status = 'NO_MATCH';
  if (score >= minMatch) {
    status = 'MATCH';
  } else if (score >= minPartial) {
    status = 'PARTIAL';
  }

  return {
    score,
    status,
    excelName,
    extractedName
  };
}
