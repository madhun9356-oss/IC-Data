import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import UploadSection from './components/UploadSection';
import ProcessingPipeline from './components/ProcessingPipeline';
import ResultsDashboard from './components/ResultsDashboard';
import SideBySideReviewModal from './components/SideBySideReviewModal';
import SelfDeclarationModal from './components/SelfDeclarationModal';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function App() {
  const [activeStep, setActiveStep] = useState('UPLOAD'); // UPLOAD | PROCESSING | DASHBOARD
  const [batchData, setBatchData] = useState({
    records: [],
    stats: null,
    metadata: null
  });
  const [rulesConfig, setRulesConfig] = useState(null);
  const [reviewModalRecord, setReviewModalRecord] = useState(null);
  const [selfDeclarationRecord, setSelfDeclarationRecord] = useState(null);

  // Fetch state rules config on load
  useEffect(() => {
    fetch(`${API_BASE}/api/rules`)
      .then((res) => res.json())
      .then((data) => setRulesConfig(data))
      .catch((err) => console.log('Using default rules configuration'));
  }, []);

  // Handle verification pipeline run
  const handleStartVerification = async ({ spreadsheetUrl, driveUrl, selectedState }) => {
    setActiveStep('PROCESSING');

    try {
      let studentList = [];

      // If spreadsheet URL provided, fetch data first
      if (spreadsheetUrl) {
        const response = await fetch(`${API_BASE}/api/parse-spreadsheet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spreadsheetUrl })
        });
        const uploadData = await response.json();
        
        if (!response.ok) {
          throw new Error(uploadData.error || 'Failed to fetch spreadsheet data');
        }
        
        studentList = uploadData.students || [];
      }

      // Trigger verification API
      const response = await fetch(`${API_BASE}/api/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          students: studentList,
          selectedState,
          driveFolderUrl: driveUrl
        })
      });

      const data = await response.json();

      setTimeout(() => {
        setBatchData({
          records: data.records || [],
          stats: data.stats || null,
          metadata: data.metadata || null
        });
        setActiveStep('DASHBOARD');
      }, 1500);
    } catch (err) {
      console.error('Pipeline error:', err);
      alert(`Pipeline error: ${err.message}`);
      setActiveStep('UPLOAD');
    }
  };

  // Handle 1-click Demo Load
  const handleLoadDemoBatch = async () => {
    setActiveStep('PROCESSING');

    try {
      const response = await fetch(`${API_BASE}/api/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          students: [], // triggers sample batch
          selectedState: 'Telangana'
        })
      });

      const data = await response.json();

      setTimeout(() => {
        setBatchData({
          records: data.records || [],
          stats: data.stats || null,
          metadata: data.metadata || null
        });
        setActiveStep('DASHBOARD');
      }, 1800);
    } catch (err) {
      console.error('Demo load error:', err);
    }
  };

  // Handle manual review status update
  const handleUpdateStatus = async (updatePayload) => {
    try {
      const response = await fetch(`${API_BASE}/api/review/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });
      const data = await response.json();

      // Update local state
      setBatchData((prev) => {
        const newRecords = prev.records.map((r) =>
          r.student_id === updatePayload.student_id ? data.updatedRecord : r
        );
        return {
          ...prev,
          records: newRecords,
          stats: data.stats
        };
      });
    } catch (err) {
      console.error('Review update failed:', err);
    }
  };

  // Handle Excel Export
  const handleExportExcel = () => {
    fetch(`${API_BASE}/api/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: batchData.records })
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `IC_Verification_Audit_Report_${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((err) => console.error('Export error:', err));
  };

  const handleReset = () => {
    setActiveStep('UPLOAD');
    setBatchData({ records: [], stats: null, metadata: null });
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Navbar
        activeStep={activeStep}
        currentBatchStats={batchData.stats}
        onReset={handleReset}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeStep === 'UPLOAD' && (
          <UploadSection
            onStartVerification={handleStartVerification}
            onLoadDemoBatch={handleLoadDemoBatch}
            rulesConfig={rulesConfig}
          />
        )}

        {activeStep === 'PROCESSING' && (
          <ProcessingPipeline totalCount={batchData.records.length || 8} />
        )}

        {activeStep === 'DASHBOARD' && (
          <ResultsDashboard
            records={batchData.records}
            stats={batchData.stats}
            metadata={batchData.metadata}
            onOpenReviewModal={(record) => setReviewModalRecord(record)}
            onOpenSelfDeclaration={(record) => setSelfDeclarationRecord(record)}
            onExportExcel={handleExportExcel}
          />
        )}
      </main>

      {/* Review Side-by-Side Modal */}
      {reviewModalRecord && (
        <SideBySideReviewModal
          record={reviewModalRecord}
          onClose={() => setReviewModalRecord(null)}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {/* Self-Declaration Fallback Modal */}
      {selfDeclarationRecord && (
        <SelfDeclarationModal
          record={selfDeclarationRecord}
          onClose={() => setSelfDeclarationRecord(null)}
          onSubmitSelfDeclaration={handleUpdateStatus}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-500 bg-white">
        <p>TNS India Foundation • Partners in Economic Transformation • IC-Verify System</p>
      </footer>
    </div>
  );
}
