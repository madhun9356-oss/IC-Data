import React, { useEffect, useState } from 'react';
import { Cpu, FileText, Search, ShieldCheck, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

const STEPS = [
  { id: 1, name: 'Ingesting Student Excel & Drive Files', icon: FileText },
  { id: 2, name: 'Gemini 1.5 Flash Multimodal OCR Extraction', icon: Cpu },
  { id: 3, name: 'Fuzzy Student Name & Income Matching', icon: Search },
  { id: 4, name: 'Evaluating State Validity Rules (TS / AP)', icon: ShieldCheck },
  { id: 5, name: 'Classifying Records (Verified / Rejected / Review)', icon: CheckCircle2 }
];

export default function ProcessingPipeline({ currentProgress, totalCount = 8 }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 border border-purple-200 text-purple-800 text-xs font-bold">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing Batch
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Running Automated <span className="gradient-text">Income Verification</span>
        </h2>
        <p className="text-gray-600 text-sm">
          Analyzing student income certificates against state validity windows and Tahsildar seals.
        </p>
      </div>

      {/* Steps List */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="space-y-4">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isDone = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div
                key={step.id}
                className={`flex items-center space-x-4 p-4 rounded-xl border transition-all ${
                  isCurrent
                    ? 'border-[#4a0b59]/30 bg-purple-50 shadow-md glow-purple'
                    : isDone
                    ? 'border-green-500/30 bg-green-50'
                    : 'border-gray-200 bg-gray-50 opacity-60'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                    isCurrent
                      ? 'bg-[#4a0b59] text-white animate-pulse'
                      : isDone
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-5 h-5" /> : isCurrent ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
                </div>

                <div className="flex-1">
                  <h4 className={`text-sm font-bold ${isCurrent ? 'text-gray-900' : isDone ? 'text-green-700' : 'text-gray-500'}`}>
                    {step.name}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {isCurrent && 'Extracting signatures, issue dates, and annual income...'}
                    {isDone && 'Completed'}
                    {!isCurrent && !isDone && 'Pending'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between text-xs text-gray-500 font-bold">
            <span>Pipeline Execution</span>
            <span>{Math.round(((currentStepIndex + 1) / STEPS.length) * 100)}%</span>
          </div>
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden border border-gray-300">
            <div
              className="h-full bg-gradient-to-r from-[#4a0b59] to-[#ffc107] transition-all duration-500 ease-out"
              style={{ width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` }}
            ></div>
          </div>
        </div>

      </div>
    </div>
  );
}
