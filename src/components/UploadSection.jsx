import React, { useState } from 'react';
import { Upload, FileSpreadsheet, FolderGit2, CheckCircle2, Play, Sparkles, AlertCircle, HelpCircle, Layers } from 'lucide-react';

export default function UploadSection({ onStartVerification, onLoadDemoBatch, rulesConfig }) {
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [selectedState, setSelectedState] = useState('Telangana');

  const handleSubmit = (e) => {
    e.preventDefault();
    onStartVerification({
      spreadsheetUrl,
      driveUrl,
      selectedState
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 border border-purple-200 text-purple-800 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" /> Zero-Code Income Certificate Verification
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
          Upload Student Batch & <span className="gradient-text">Verify IC Certificates</span>
        </h2>
        <p className="text-gray-600 text-sm max-w-2xl mx-auto">
          Automated Gemini Flash OCR extraction, fuzzy student name matching, and state-aware validity rules for Telangana & Andhra Pradesh.
        </p>
      </div>

      {/* Main Upload Card */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6">
        
        {/* Quick Demo Mode Banner */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-xl bg-[#4a0b59] border border-[#370842] shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Want to test with sample data?</h4>
              <p className="text-xs text-purple-200">Run a 1-click test with 8 pre-loaded student IC records (TS, AP, TN, Expired, Mismatches).</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLoadDemoBatch}
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-[#ffc107] hover:bg-yellow-500 text-[#4a0b59] text-xs font-extrabold rounded-xl shadow-md transition-all glow-yellow"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Load Sample Batch
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Target State Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              State Validity Rule <span className="text-purple-600">*</span>
            </label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-[#4a0b59] focus:ring-1 focus:ring-[#4a0b59] transition-colors"
            >
              <option value="Telangana">Telangana (TS) — 1 Year Validity</option>
              <option value="Andhra Pradesh">Andhra Pradesh (AP) — 4 Years Validity</option>
              <option value="Tamil Nadu">Tamil Nadu (TN) — 1 Year Validity (Phase 2)</option>
              <option value="Karnataka">Karnataka (KA) — 5 Years Validity (Phase 2)</option>
              <option value="auto">⚡ Auto-Detect State from IC Template</option>
            </select>
            <p className="text-[11px] text-gray-500 flex items-center gap-1">
              <HelpCircle className="w-3 h-3 text-gray-400" />
              {selectedState === 'Telangana' && 'Valid for 12 months from revenue issue date.'}
              {selectedState === 'Andhra Pradesh' && 'Valid for 48 months from issue date per AP G.O.'}
              {selectedState === 'auto' && 'Gemini OCR will detect state from seal and letterhead format.'}
            </p>
          </div>

          {/* Google Spreadsheet URL */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              1. Google Spreadsheet URL <span className="text-purple-600">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <input
                type="url"
                required
                value={spreadsheetUrl}
                onChange={(e) => setSpreadsheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1a2b3c4d5e..."
                className="w-full bg-gray-50 border border-gray-300 rounded-xl pl-11 pr-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#4a0b59] focus:ring-1 focus:ring-[#4a0b59] transition-colors"
              />
            </div>
            <p className="text-[11px] text-gray-500">
              Columns required in the first sheet: <code className="text-purple-700 font-bold">Name</code>, <code className="text-purple-700 font-bold">Type</code>, <code className="text-purple-700 font-bold">Annual Income</code>, <code className="text-purple-700 font-bold">IC Drive URL</code>
            </p>
          </div>

          {/* Google Drive Folder URL */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              2. Google Drive IC Folder URL
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <FolderGit2 className="w-5 h-5" />
              </div>
              <input
                type="url"
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/1a2b3c4d5e..."
                className="w-full bg-gray-50 border border-gray-300 rounded-xl pl-11 pr-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#4a0b59] focus:ring-1 focus:ring-[#4a0b59] transition-colors"
              />
            </div>
            <p className="text-[11px] text-gray-500">
              Folder containing student PDF/Image income certificates.
            </p>
          </div>

          {/* Primary Submit Button */}
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-[#ffc107] hover:bg-yellow-500 text-[#4a0b59] font-extrabold text-sm rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 glow-yellow"
          >
            <Play className="w-4 h-4 fill-current" />
            Run IC Verification Pipeline
          </button>

        </form>
      </div>
    </div>
  );
}
