import React, { useState } from 'react';
import { 
  CheckCircle2, XCircle, AlertTriangle, Download, Eye, Search, Filter, 
  Sparkles, FileText, ArrowUpDown, UserCheck, ShieldAlert, FileSignature 
} from 'lucide-react';

export default function ResultsDashboard({ 
  records = [], 
  stats, 
  metadata, 
  onOpenReviewModal, 
  onOpenSelfDeclaration, 
  onExportExcel 
}) {
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRecords = records.filter(r => {
    const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
    const matchesSearch = searchQuery === '' || 
      r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.extracted_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.certificate_number?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-8 py-4">
      
      {/* Header & Export Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Verification <span className="gradient-text">Results Dashboard</span>
            </h2>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Target State: <strong className="text-gray-800">{metadata?.selectedState || 'Telangana'}</strong> • Batch ID: {metadata?.batch_id || 'batch-001'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onExportExcel}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#ffc107] hover:bg-yellow-500 text-[#4a0b59] font-extrabold text-xs rounded-xl shadow-md transition-all glow-yellow"
          >
            <Download className="w-4 h-4" />
            Export Final Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Students */}
        <div className="glass-panel p-5 rounded-2xl border-gray-200 space-y-2">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Evaluated</span>
            <FileText className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-3xl font-extrabold text-gray-900">{stats?.total || records.length}</div>
          <p className="text-[11px] text-gray-500">Student IC records processed</p>
        </div>

        {/* Auto-Verified */}
        <div 
          onClick={() => setFilterStatus('VERIFIED')}
          className="glass-panel-interactive p-5 rounded-2xl border-green-200 cursor-pointer space-y-2 bg-green-50/50"
        >
          <div className="flex items-center justify-between text-green-600">
            <span className="text-xs font-bold uppercase tracking-wider">Verified</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-3xl font-extrabold text-green-600">{stats?.verified || 0}</div>
          <p className="text-[11px] text-green-700/70">Meets validity & income rules</p>
        </div>

        {/* Human Review Needed */}
        <div 
          onClick={() => setFilterStatus('REVIEW')}
          className="glass-panel-interactive p-5 rounded-2xl border-yellow-200 cursor-pointer space-y-2 bg-yellow-50/50"
        >
          <div className="flex items-center justify-between text-yellow-600">
            <span className="text-xs font-bold uppercase tracking-wider">Review Queue</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-3xl font-extrabold text-yellow-600">{stats?.review || 0}</div>
          <p className="text-[11px] text-yellow-700/70">Partial match or income variance</p>
        </div>

        {/* Auto-Rejected */}
        <div 
          onClick={() => setFilterStatus('REJECTED')}
          className="glass-panel-interactive p-5 rounded-2xl border-red-200 cursor-pointer space-y-2 bg-red-50/50"
        >
          <div className="flex items-center justify-between text-red-600">
            <span className="text-xs font-bold uppercase tracking-wider">Rejected</span>
            <XCircle className="w-4 h-4" />
          </div>
          <div className="text-3xl font-extrabold text-red-600">{stats?.rejected || 0}</div>
          <p className="text-[11px] text-red-700/70">Expired or name mismatch</p>
        </div>

      </div>

      {/* Search & Filter Bar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Filter Tabs */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 w-full sm:w-auto">
          {['ALL', 'VERIFIED', 'REVIEW', 'REJECTED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex-1 sm:flex-initial ${
                filterStatus === status
                  ? 'bg-white text-[#4a0b59] shadow-sm border border-gray-200'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {status === 'ALL' ? `All (${records.length})` : status}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student or cert #..."
            className="w-full bg-white border border-gray-300 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#4a0b59] focus:ring-1 focus:ring-[#4a0b59]"
          />
        </div>

      </div>

      {/* Main Records Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border-gray-200 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Student Name</th>
                <th className="py-3.5 px-4">Declared Income</th>
                <th className="py-3.5 px-4">Extracted IC Data</th>
                <th className="py-3.5 px-4">State</th>
                <th className="py-3.5 px-4">Expiry Date</th>
                <th className="py-3.5 px-4">Status & Reason</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-sans bg-white">
              {filteredRecords.map((r) => {
                const isVerified = r.status === 'VERIFIED';
                const isRejected = r.status === 'REJECTED';
                const isReview = r.status === 'REVIEW';

                return (
                  <tr key={r.student_id} className="hover:bg-gray-50 transition-colors">
                    
                    {/* Student Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900 text-sm">{r.name}</div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                        <span>Extracted:</span>
                        <span className="font-mono text-[#4a0b59] font-bold">{r.extracted_name || 'N/A'}</span>
                        <span className="text-gray-400">({Math.round((r.nameMatchScore || 0) * 100)}%)</span>
                      </div>
                    </td>

                    {/* Declared Income */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="text-gray-800 font-semibold">₹{(r.declared_income || 0).toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-gray-500">Excel Declared</div>
                    </td>

                    {/* Extracted Data */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="text-[#4a0b59] font-bold">₹{(r.annual_income || 0).toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <span>Cert #:</span>
                        <span className="text-gray-600">{r.certificate_number || 'N/A'}</span>
                      </div>
                    </td>

                    {/* State */}
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                        {r.resolvedState || 'Telangana'}
                      </span>
                    </td>

                    {/* Expiry Date */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className={r.isExpired ? 'text-red-600 font-bold' : 'text-green-600 font-semibold'}>
                        {r.expiry_date || 'N/A'}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        Issued: {r.issue_date || 'N/A'}
                      </div>
                    </td>

                    {/* Decision Status & Reason */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex items-center gap-2">
                        {isVerified && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                            <XCircle className="w-3.5 h-3.5" /> REJECTED
                          </span>
                        )}
                        {isReview && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200 animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5" /> REVIEW
                          </span>
                        )}
                        {r.reviewed_by && r.reviewed_by !== 'Auto-Decision' && (
                          <span className="text-[10px] text-[#4a0b59] bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200 font-bold">
                            Manual
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-600 mt-1 line-clamp-2" title={r.reason}>
                        {r.reason}
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right space-x-2 flex items-center justify-end">
                      <a
                        href={r.ic_drive_url || r.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-purple-100 hover:bg-purple-200 text-[#4a0b59] border border-purple-200 rounded-lg transition-all"
                        title="View Certificate Image"
                      >
                        <FileText className="w-3.5 h-3.5" /> View IC
                      </a>
                      {isReview && (
                        <button
                          onClick={() => onOpenReviewModal(r)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border border-yellow-300 rounded-lg transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" /> Side-by-Side Review
                        </button>
                      )}
                      {isRejected && (
                        <button
                          onClick={() => onOpenSelfDeclaration(r)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-[#4a0b59] hover:bg-purple-900 text-white rounded-lg transition-all shadow-sm"
                        >
                          <FileSignature className="w-3.5 h-3.5" /> Self-Declaration
                        </button>
                      )}
                      {isVerified && (
                        <button
                          onClick={() => onOpenReviewModal(r)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg transition-all"
                        >
                          Inspect
                        </button>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
