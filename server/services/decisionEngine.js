import rulesConfig from '../config/validity_rules.json' with { type: 'json' };

/**
 * Calculates expiry date based on state validity rules.
 */
export function calculateExpiry(issueDateStr, resolvedState) {
  if (!issueDateStr) return { expiryDate: null, isExpired: true, daysRemaining: null };

  const issueDate = new Date(issueDateStr);
  if (isNaN(issueDate.getTime())) {
    return { expiryDate: null, isExpired: true, daysRemaining: null };
  }

  const stateRule = rulesConfig.states[resolvedState] || { validityYears: 1 };
  const expiryDate = new Date(issueDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + stateRule.validityYears);

  const today = new Date();
  const diffTime = expiryDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isExpired = daysRemaining < 0;

  return {
    expiryDate: expiryDate.toISOString().split('T')[0],
    isExpired,
    daysRemaining
  };
}

/**
 * Decision Engine core classifier
 * Evaluates rules in strict order:
 * 1. REJECTED triggers
 * 2. REVIEW triggers
 * 3. VERIFIED default
 */
export function evaluateDecision({
  studentRecord,
  extractedData,
  nameMatch,
  staffSelectedState
}) {
  const {
    declared_income,
    name: excelName,
    type: docType
  } = studentRecord;

  const {
    extracted_name,
    annual_income,
    issue_date,
    certificate_number,
    state_guess,
    signature_present,
    seal_present,
    field_confidences = {},
    raw_ocr_notes
  } = extractedData || {};

  // Resolve State: Staff selection overrides state_guess unless auto-detect is chosen
  let resolvedState = staffSelectedState && staffSelectedState !== 'auto'
    ? staffSelectedState
    : (state_guess || 'Telangana');

  // Handle Self-Declaration or missing document
  if (docType === 'Self-Declaration' || docType === 'SD' || extractedData?.is_self_declaration) {
    return {
      status: 'VERIFIED',
      reason: 'Verified via Self-Declaration fallback form',
      resolvedState,
      expiryDate: 'N/A',
      isExpired: false,
      nameMatchScore: nameMatch?.score || 1.0,
      incomeMatch: true,
      confidenceScore: 1.0,
      isSelfDeclared: true
    };
  }

  if (!extractedData || extractedData.error) {
    return {
      status: 'REJECTED',
      reason: extractedData?.error || 'No Income Certificate file found or readable',
      resolvedState,
      expiryDate: null,
      isExpired: true,
      nameMatchScore: 0,
      incomeMatch: false,
      confidenceScore: 0
    };
  }

  // Calculate Expiry
  const { expiryDate, isExpired, daysRemaining } = calculateExpiry(issue_date, resolvedState);

  // Income Comparison & Tolerance
  const incomeDiff = Math.abs((declared_income || 0) - (annual_income || 0));
  const incomePercentDiff = declared_income ? (incomeDiff / declared_income) * 100 : 0;
  const incomeTolerance = rulesConfig.defaultIncomeTolerancePercent || 5;
  const incomeMatch = incomePercentDiff <= incomeTolerance;

  // Minimum field confidence
  const confValues = Object.values(field_confidences).filter(v => typeof v === 'number');
  const minConf = confValues.length > 0 ? Math.min(...confValues) : 0.8;

  // ==========================================
  // RULE 1: REJECTED Triggers
  // ==========================================
  if (isExpired) {
    const validYears = rulesConfig.states[resolvedState]?.validityYears || 1;
    return {
      status: 'REJECTED',
      reason: `Certificate expired: issued ${issue_date || 'Unknown'}, ${resolvedState} validity is ${validYears} year(s) (Expired on ${expiryDate || 'N/A'})`,
      resolvedState,
      expiryDate,
      isExpired: true,
      nameMatchScore: nameMatch.score,
      incomeMatch,
      confidenceScore: minConf
    };
  }

  if (nameMatch.status === 'NO_MATCH') {
    return {
      status: 'REJECTED',
      reason: `Name mismatch: Excel has "${excelName}" but IC extracted "${extracted_name || 'N/A'}" (similarity ${Math.round(nameMatch.score * 100)}%)`,
      resolvedState,
      expiryDate,
      isExpired: false,
      nameMatchScore: nameMatch.score,
      incomeMatch,
      confidenceScore: minConf
    };
  }

  if (!signature_present && !seal_present) {
    return {
      status: 'REJECTED',
      reason: 'Missing authentication: Neither Tahsildar signature nor official seal visible on certificate',
      resolvedState,
      expiryDate,
      isExpired: false,
      nameMatchScore: nameMatch.score,
      incomeMatch,
      confidenceScore: minConf
    };
  }

  // ==========================================
  // RULE 2: REVIEW Triggers
  // ==========================================
  if (nameMatch.status === 'PARTIAL') {
    return {
      status: 'REVIEW',
      reason: `Partial name match: "${excelName}" vs "${extracted_name}" (${Math.round(nameMatch.score * 100)}% match) requires manual confirmation`,
      resolvedState,
      expiryDate,
      isExpired: false,
      nameMatchScore: nameMatch.score,
      incomeMatch,
      confidenceScore: minConf
    };
  }

  if (!incomeMatch) {
    return {
      status: 'REVIEW',
      reason: `Income mismatch: Excel states ₹${(declared_income || 0).toLocaleString('en-IN')}, IC shows ₹${(annual_income || 0).toLocaleString('en-IN')} (${incomePercentDiff.toFixed(1)}% variance exceeds ${incomeTolerance}% threshold)`,
      resolvedState,
      expiryDate,
      isExpired: false,
      nameMatchScore: nameMatch.score,
      incomeMatch: false,
      confidenceScore: minConf
    };
  }

  if (staffSelectedState && staffSelectedState !== 'auto' && state_guess && state_guess !== 'Unknown' && staffSelectedState !== state_guess) {
    return {
      status: 'REVIEW',
      reason: `State template conflict: Selected state is "${staffSelectedState}", but OCR detected "${state_guess}" format`,
      resolvedState,
      expiryDate,
      isExpired: false,
      nameMatchScore: nameMatch.score,
      incomeMatch,
      confidenceScore: minConf
    };
  }

  if (minConf < rulesConfig.minConfidenceThreshold) {
    return {
      status: 'REVIEW',
      reason: `Low OCR extraction confidence (${Math.round(minConf * 100)}%): Image quality or layout ambiguity detected`,
      resolvedState,
      expiryDate,
      isExpired: false,
      nameMatchScore: nameMatch.score,
      incomeMatch,
      confidenceScore: minConf
    };
  }

  if (!signature_present || !seal_present) {
    return {
      status: 'REVIEW',
      reason: `Partial authentication: ${!signature_present ? 'Signature missing' : 'Seal missing'} - requires reviewer verification`,
      resolvedState,
      expiryDate,
      isExpired: false,
      nameMatchScore: nameMatch.score,
      incomeMatch,
      confidenceScore: minConf
    };
  }

  // ==========================================
  // RULE 3: VERIFIED Default
  // ==========================================
  return {
    status: 'VERIFIED',
    reason: `Valid ${resolvedState} certificate issued ${issue_date} (Expires ${expiryDate})`,
    resolvedState,
    expiryDate,
    isExpired: false,
    nameMatchScore: nameMatch.score,
    incomeMatch: true,
    confidenceScore: minConf
  };
}
