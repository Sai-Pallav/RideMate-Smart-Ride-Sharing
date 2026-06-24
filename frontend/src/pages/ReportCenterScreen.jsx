import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import InputField from '../components/InputField';
import Button from '../components/Button';
import Card from '../components/Card';
import Badge from '../components/Badge';
import ErrorBanner from '../components/ErrorBanner';
import NavigationBar from '../components/NavigationBar';

const DEFAULT_REPORTS = [
  {
    report_id: 601,
    category: "unsafe_driving",
    description: "Driver was speeding and swerving lanes on the highway.",
    timestamp: "3 days ago, 4:15 PM",
    status: "Resolved"
  },
  {
    report_id: 602,
    category: "misbehavior",
    description: "Passenger refused to wear seatbelt and talked loudly on the phone.",
    timestamp: "1 week ago, 10:30 AM",
    status: "Under Review"
  }
];

export default function ReportCenterScreen() {
  const navigate = useNavigate();
  const location = useLocation();

  // Core Form States
  const [category, setCategory] = useState('unsafe_driving');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastText, setToastText] = useState('');
  const [reports, setReports] = useState([]);

  // Dev Toolbar States
  const [simulateFailure, setSimulateFailure] = useState(false);

  useEffect(() => {
    initReportsDb();
    
    // Parse query params
    const queryParams = new URLSearchParams(location.search);
    const reportedUser = queryParams.get('reportedUser');
    const rideId = queryParams.get('rideId');
    
    if (reportedUser) {
      setCategory('misbehavior');
      setDescription(`Reporting User ${decodeURIComponent(reportedUser)}: `);
    } else if (rideId) {
      setCategory('unsafe_driving');
      setDescription(`Incident during Ride #${decodeURIComponent(rideId)}: `);
    }
  }, [location.search]);

  const initReportsDb = () => {
    if (!localStorage.getItem('mockReports')) {
      localStorage.setItem('mockReports', JSON.stringify(DEFAULT_REPORTS));
    }
    loadReports();
  };

  const loadReports = () => {
    const list = JSON.parse(localStorage.getItem('mockReports') || '[]');
    setReports(list);
  };

  const triggerToast = (msg) => {
    setToastText(msg);
    setTimeout(() => setToastText(''), 3000);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (description.trim().length < 10) {
      setErrorMsg('Please describe the issue in at least 10 characters.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);

      if (simulateFailure) {
        // Preserves form text! Do NOT clear description state
        setErrorMsg('Submission Failed: Remote server rejected report payload. (Simulated Failure Active)');
        return;
      }

      // Success path
      const newReport = {
        report_id: Date.now(),
        category,
        description: description.trim(),
        timestamp: "Just now",
        status: "Received"
      };

      const list = JSON.parse(localStorage.getItem('mockReports') || '[]');
      list.unshift(newReport);
      localStorage.setItem('mockReports', JSON.stringify(list));

      setDescription(''); // Wiped only on success
      loadReports();
      triggerToast('🎉 Report submitted successfully.');
    }, 1200);
  };

  const handleResetDb = () => {
    localStorage.setItem('mockReports', JSON.stringify(DEFAULT_REPORTS));
    loadReports();
    triggerToast('🔄 Reports log reset to default.');
  };

  const handleClearAll = () => {
    localStorage.setItem('mockReports', JSON.stringify([]));
    setReports([]);
    triggerToast('🗑️ Reports log cleared.');
  };

  const getCategoryLabel = (cat) => {
    switch (cat) {
      case 'unsafe_driving': return '🚗 Unsafe Driving';
      case 'misbehavior': return '👤 Misbehavior';
      case 'fake_account': return '🆔 Fake Account';
      case 'harassment': return '⚠️ Harassment';
      case 'no_show': return '⏳ No-Show';
      case 'other':
      default: return '❓ Other Issue';
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'resolved':
        return <Badge variant="success">Resolved</Badge>;
      case 'under review':
        return <Badge variant="info">Under Review</Badge>;
      case 'received':
      default:
        return <Badge variant="warning">Received</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg-base text-brand-text-primary font-sans flex flex-col pb-24 md:pb-6">
      
      {/* Dev Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap gap-2 items-center justify-between text-xs font-semibold">
        <span className="font-bold text-indigo-400">🔧 DEV TOOLBAR:</span>
        <div className="flex gap-2">
          <button 
            onClick={() => setSimulateFailure(!simulateFailure)} 
            className={`px-2 py-1 rounded font-semibold transition cursor-pointer ${simulateFailure ? 'bg-amber-600 text-white animate-pulse' : 'bg-slate-700 hover:bg-slate-650 text-slate-200'}`}
          >
            {simulateFailure ? 'Simulate Failure: ON' : 'Simulate Failure'}
          </button>
          <button 
            onClick={handleResetDb} 
            className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-650 text-slate-200 font-semibold transition cursor-pointer"
          >
            Reset DB
          </button>
          <button 
            onClick={handleClearAll} 
            className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-650 text-slate-200 font-semibold transition cursor-pointer"
          >
            Clear All
          </button>
        </div>
      </div>

      <NavigationBar className="relative z-10" />

      {toastText && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 border border-indigo-500/30 text-indigo-300 px-4 py-2.5 rounded-xl shadow-2xl text-xs md:text-sm font-semibold animate-bounce">
          {toastText}
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-900/60 border-b border-slate-850 px-4 py-3.5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate(-1)} 
              className="text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1 cursor-pointer transition"
            >
              <span>🡐</span> Back
            </button>
            <span className="text-slate-600">|</span>
            <h2 className="text-sm font-bold text-slate-200">Incident Report Center</h2>
          </div>
          <Badge variant="info">24/7 Response</Badge>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-lg mx-auto w-full px-4 pt-6 flex-1 space-y-6 text-left">
        
        {/* Form Error Banner */}
        {errorMsg && (
          <ErrorBanner message={errorMsg} />
        )}

        {/* 1. FILE A NEW REPORT FORM */}
        <Card className="p-4 space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-200">File a Safety/Conduct Ticket</h3>
            <p className="text-[11px] text-brand-text-secondary">
              Incident reports are forwarded immediately to institutional safety officers and reviewed within 15 minutes.
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Category Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="report-cat" className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">
                Report Category
              </label>
              <select
                id="report-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-brand-bg-card border border-slate-850 rounded-xl text-xs md:text-sm text-brand-text-primary outline-none hover:border-slate-700 focus:border-brand-primary transition cursor-pointer"
              >
                <option value="unsafe_driving">🚗 Unsafe Driving</option>
                <option value="misbehavior">👤 Passenger/Driver Misbehavior</option>
                <option value="fake_account">🆔 Fake Profile / Unmatching Vehicle</option>
                <option value="harassment">⚠️ Harassment / Threatening Tone</option>
                <option value="no_show">⏳ Driver / Rider No-Show</option>
                <option value="other">❓ Other Safety Violation</option>
              </select>
            </div>

            {/* Description textarea */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="report-desc" className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">
                Incident Description
              </label>
              <textarea
                id="report-desc"
                rows="4"
                placeholder="Please describe exactly what happened. Include timestamps, locations, or vehicle description if relevant."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-brand-bg-card border border-slate-850 rounded-xl text-xs md:text-sm text-brand-text-primary outline-none hover:border-slate-700 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/50 transition resize-none leading-relaxed"
              />
              <span className="text-[10px] text-brand-text-muted self-end">
                Min 10 characters ({description.length} entered)
              </span>
            </div>

            <Button 
              type="submit" 
              loading={isSubmitting} 
              className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-brand-glow text-xs uppercase tracking-wider font-extrabold"
            >
              File Official Report
            </Button>
          </form>
        </Card>

        {/* 2. INCIDENT REPORTS TIMELINE */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Filed Incident History</h3>
          
          {reports.length === 0 ? (
            <div className="p-6 border border-dashed border-slate-800 rounded-2xl text-center text-xs text-brand-text-muted">
              No reports submitted by your account.
            </div>
          ) : (
            <div className="space-y-2">
              {reports.map((report) => (
                <Card key={report.report_id} className="p-4 border-slate-850 hover:border-slate-800 transition duration-150">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold text-slate-200">
                      {getCategoryLabel(report.category)}
                    </span>
                    {getStatusBadge(report.status)}
                  </div>
                  <p className="text-xs text-brand-text-secondary leading-relaxed mt-2.5">
                    {report.description}
                  </p>
                  <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-slate-900 text-[10px]">
                    <span className="text-brand-text-muted font-mono font-bold">Ticket #{report.report_id}</span>
                    <span className="text-brand-text-muted font-bold">{report.timestamp}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

      </main>

      <NavigationBar className="block md:hidden" />
    </div>
  );
}
