import React, { useState } from 'react';
import { X, FileSignature, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

export default function SelfDeclarationModal({ record, onClose, onSubmitSelfDeclaration }) {
  if (!record) return null;

  const [declaredIncome, setDeclaredIncome] = useState(record.declared_income || '');
  const [fatherOccupation, setFatherOccupation] = useState('Agriculture / Farming');
  const [reasonForFallback, setReasonForFallback] = useState(
    record.isExpired ? 'Income Certificate Expired - Renewal under process' : 'Certificate pending issue at Tahsildar Office'
  );
  const [acknowledged, setAcknowledged] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!acknowledged) return;

    onSubmitSelfDeclaration({
      student_id: record.student_id,
      newStatus: 'VERIFIED',
      newReason: `Verified via Student Self-Declaration Fallback Form (${reasonForFallback})`,
      updatedFields: {
        type: 'Self-Declaration',
        declared_income: parseFloat(declaredIncome) || record.declared_income,
        isSelfDeclared: true,
        reviewed_by: 'Staff (Self-Declared)'
      }
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="glass-panel w-full max-w-lg rounded-2xl border-slate-700 shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Self-Declaration Fallback</h3>
              <p className="text-xs text-slate-400">Student: <strong className="text-slate-200">{record.name}</strong></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400" /> College Audit Fallback
            </div>
            <p className="text-slate-300">
              This form converts the record status to <strong className="text-indigo-300">VERIFIED (Self-Declared)</strong> for temporary admission processing.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Student Name</label>
            <input
              type="text"
              value={record.name}
              disabled
              className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Self-Declared Annual Income (₹)</label>
            <input
              type="number"
              value={declaredIncome}
              onChange={(e) => setDeclaredIncome(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Parent / Guardian Occupation</label>
            <input
              type="text"
              value={fatherOccupation}
              onChange={(e) => setFatherOccupation(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Reason for Self-Declaration Fallback</label>
            <select
              value={reasonForFallback}
              onChange={(e) => setReasonForFallback(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500"
            >
              <option value="Income Certificate Expired - Renewal under process">Income Certificate Expired - Renewal under process</option>
              <option value="Certificate pending issue at Tahsildar / Meeseva Office">Certificate pending issue at Tahsildar / Meeseva Office</option>
              <option value="Applied fresh certificate - Acknowledgment receipt available">Applied fresh certificate - Acknowledgment receipt available</option>
            </select>
          </div>

          <div className="pt-2">
            <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500"
              />
              <span>
                I confirm that the college staff has verified the student's undertaking and accepts this self-declaration for Phase 1 verification.
              </span>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!acknowledged}
              className="flex items-center gap-1.5 px-5 py-2 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
            >
              <CheckCircle2 className="w-4 h-4" /> Submit Self-Declaration
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
