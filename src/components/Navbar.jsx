import React from 'react';
import { ShieldCheck, FileCheck2, Sparkles, Building2 } from 'lucide-react';

const TNSLogo = () => (
  <svg width="220" height="60" viewBox="0 0 220 60" xmlns="http://www.w3.org/2000/svg">
    {/* Dots Diamond */}
    <circle cx="30" cy="12" r="5" fill="#4a0b59" />
    
    <circle cx="18" cy="22" r="5" fill="#4a0b59" />
    <circle cx="42" cy="22" r="5" fill="#4a0b59" />
    
    <circle cx="6" cy="32" r="5" fill="#4a0b59" />
    <circle cx="30" cy="32" r="5" fill="#ffc107" />
    <circle cx="54" cy="32" r="5" fill="#4a0b59" />
    
    <circle cx="18" cy="42" r="5" fill="#ffc107" />
    <circle cx="42" cy="42" r="5" fill="#ffc107" />
    
    <circle cx="30" cy="52" r="5" fill="#388e3c" />
    
    {/* Text: TNS */}
    <text x="68" y="38" fontFamily="Arial, sans-serif" fontSize="34" fontWeight="bold" fill="#4a0b59">TNS</text>
    
    {/* Text: INDIA FOUNDATION */}
    <text x="140" y="24" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="bold" fill="#4a0b59">INDIA</text>
    <text x="140" y="38" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="bold" fill="#4a0b59">FOUNDATION</text>
    
    {/* Tagline */}
    <text x="68" y="50" fontFamily="Arial, sans-serif" fontSize="9" fill="#4a0b59">Partners in Economic Transformation</text>
    <text x="68" y="59" fontFamily="Arial, sans-serif" fontSize="9" fill="#005b9f">Registered under the FCRA</text>
  </svg>
);

export default function Navbar({ activeStep, currentBatchStats, onReset }) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand logo & title */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={onReset}>
          <TNSLogo />
          <div className="ml-4 pl-4 border-l border-gray-300">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-gray-800 tracking-tight">IC-Verify</h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-purple-100 text-purple-800 border border-purple-200 rounded-full">
                Phase 1
              </span>
            </div>
            <p className="text-xs text-gray-500">Automated Audit System</p>
          </div>
        </div>

        {/* Status badges */}
        {currentBatchStats && (
          <div className="hidden md:flex items-center space-x-3 text-xs font-medium">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Verified: {currentBatchStats.verified}
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Review: {currentBatchStats.review}
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              Rejected: {currentBatchStats.rejected}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-[#4a0b59] hover:bg-yellow-500 bg-[#ffc107] rounded-xl shadow-md transition-all"
          >
            <Sparkles className="w-4 h-4" />
            New Batch Run
          </button>
        </div>

      </div>
    </header>
  );
}
