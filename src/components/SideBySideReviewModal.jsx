import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, FileSignature, Edit3, Save, RefreshCw } from 'lucide-react';

export default function SideBySideReviewModal({ record, onClose, onUpdateStatus }) {
  if (!record) return null;

  const [extractedName, setExtractedName] = useState(record.extracted_name || '');
  const [annualIncome, setAnnualIncome] = useState(record.annual_income || '');
  const [issueDate, setIssueDate] = useState(record.issue_date || '');
  const [certNumber, setCertNumber] = useState(record.certificate_number || '');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleApprove = () => {
    onUpdateStatus({
      student_id: record.student_id,
      newStatus: 'VERIFIED',
      newReason: reviewerNotes ? `Manually Approved: ${reviewerNotes}` : 'Manually approved by reviewer after side-by-side inspection',
      updatedFields: {
        extracted_name: extractedName,
        annual_income: parseFloat(annualIncome) || record.annual_income,
        issue_date: issueDate,
        certificate_number: certNumber
      }
    });
    onClose();
  };

  const handleReject = () => {
    onUpdateStatus({
      student_id: record.student_id,
      newStatus: 'REJECTED',
      newReason: reviewerNotes ? `Manually Rejected: ${reviewerNotes}` : 'Manually rejected by reviewer during side-by-side inspection',
      updatedFields: {
        extracted_name: extractedName,
        annual_income: parseFloat(annualIncome) || record.annual_income,
        issue_date: issueDate,
        certificate_number: certNumber
      }
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="glass-panel w-full max-w-6xl rounded-2xl border-slate-700 shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Human Review Queue: {record.name}</h3>
              <p className="text-xs text-slate-400">Student ID: {record.student_id} • Review Flag: <span className="text-amber-300 font-medium">{record.reason}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split Screen */}
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 flex-1 overflow-y-auto">
          
          {/* LEFT: Document Image Viewer */}
          <div className="p-6 bg-slate-950/60 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-slate-300">Income Certificate Preview</span>
              <a 
                href={record.ic_drive_url} 
                target="_blank" 
                rel="noreferrer"
                className="text-cyan-400 hover:underline"
              >
                Open Original Drive Link ↗
              </a>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900/80 flex items-center justify-center min-h-[350px]">
              {record.imageUrl ? (
                <img
                  src={record.imageUrl}
                  alt="Income Certificate Scan"
                  className="max-h-[420px] w-full object-contain p-2"
                />
              ) : (
                <div className="text-center p-8 space-y-2 text-slate-500">
                  <ShieldCheck className="w-12 h-12 mx-auto text-slate-600" />
                  <p className="text-sm font-medium">Original PDF Document Preview</p>
                  <p className="text-xs">{record.ic_drive_url}</p>
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
              <div className="font-semibold text-slate-300">Raw Gemini OCR Cues:</div>
              <p className="text-slate-400 font-mono text-[11px]">{record.raw_ocr_notes || 'Official seal and revenue letterhead detected.'}</p>
            </div>
          </div>

          {/* RIGHT: Extracted Fields & Controls */}
          <div className="p-6 space-y-6 flex flex-col justify-between bg-slate-900/40">
            
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-sm font-semibold text-white">Extracted vs Excel Declared</h4>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {isEditing ? 'Done Editing' : 'Edit OCR Values'}
                </button>
              </div>

              {/* Discrepancy Alert */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" /> Discrepancy Reason
                </div>
                <p className="text-slate-300">{record.reason}</p>
              </div>

              {/* Field 1: Name */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Student Name (Excel: <strong className="text-slate-200">{record.name}</strong>)</span>
                  <span className="text-cyan-400 font-mono">Match: {Math.round((record.nameMatchScore || 0) * 100)}%</span>
                </div>
                <input
                  type="text"
                  value={extractedName}
                  disabled={!isEditing}
                  onChange={(e) => setExtractedName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500 disabled:opacity-75"
                />
              </div>

              {/* Field 2: Annual Income */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Annual Income (Excel: <strong className="text-slate-200">₹{(record.declared_income || 0).toLocaleString('en-IN')}</strong>)</span>
                  <span className={record.incomeMatch ? 'text-emerald-400' : 'text-amber-400 font-bold'}>
                    {record.incomeMatch ? 'Matched' : 'Variance Warning'}
                  </span>
                </div>
                <input
                  type="number"
                  value={annualIncome}
                  disabled={!isEditing}
                  onChange={(e) => setAnnualIncome(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-cyan-500 disabled:opacity-75"
                />
              </div>

              {/* Field 3: Issue Date & Expiry */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Issue Date (YYYY-MM-DD)</label>
                  <input
                    type="date"
                    value={issueDate}
                    disabled={!isEditing}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 disabled:opacity-75"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Computed Expiry ({record.resolvedState})</label>
                  <div className={`w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono ${record.isExpired ? 'text-rose-400 font-bold' : 'text-emerald-400'}`}>
                    {record.expiry_date || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Field 4: Certificate Number & Authenticity */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Certificate #</label>
                  <input
                    type="text"
                    value={certNumber}
                    disabled={!isEditing}
                    onChange={(e) => setCertNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 disabled:opacity-75"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Tahsildar Sign / Seal</label>
                  <div className="flex items-center space-x-2 pt-2 text-xs">
                    <span className={`px-2 py-0.5 rounded ${record.signature_present ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                      Sign: {record.signature_present ? '✓' : '✗'}
                    </span>
                    <span className={`px-2 py-0.5 rounded ${record.seal_present ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                      Seal: {record.seal_present ? '✓' : '✗'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reviewer Note */}
              <div className="space-y-1 pt-2">
                <label className="text-xs text-slate-400">Reviewer Audit Note (Optional)</label>
                <input
                  type="text"
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  placeholder="e.g. Verified original physical seal in office register..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500"
                />
              </div>

            </div>

            {/* Decision Action Buttons */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
              <button
                onClick={handleReject}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition-all"
              >
                <XCircle className="w-4 h-4" /> Reject Certificate
              </button>
              <button
                onClick={handleApprove}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold shadow-lg transition-all glow-emerald"
              >
                <CheckCircle2 className="w-4 h-4" /> Approve as VERIFIED
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
