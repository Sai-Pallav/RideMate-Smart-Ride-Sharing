import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { 
  getAdminReports, 
  resolveReport, 
  searchAdminUsers, 
  updateUserStatus, 
  getSafetyMetrics, 
  getVerificationQueue, 
  processVerification, 
  getAdminRideDetail 
} from '../api/admin';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import InputField from '../components/InputField';
import SkeletonLoader from '../components/SkeletonLoader';

export default function AdminDashboardScreen() {
  const navigate = useNavigate();

  // Admin access gate states
  const [isAdmin, setIsAdmin] = useState(() => {
    const user = useAuthStore.getState().user;
    const bypass = localStorage.getItem('devAdminBypass') === 'true';
    return bypass || (user && user.role === 'admin');
  });
  const [devAdminBypass, setDevAdminBypass] = useState(() => localStorage.getItem('devAdminBypass') === 'true');

  // Sidebar navigation tab state
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'users' | 'metrics' | 'verifications' | 'rides'

  // Data states
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [safetyMetrics, setSafetyMetrics] = useState({
    sos_activations: 0,
    avg_resolution_time_mins: 24,
    verification_rate: 100,
    active_rides: 0
  });

  // Loading states
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingVerifications, setLoadingVerifications] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // Report resolution form states
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [resolutionStatus, setResolutionStatus] = useState('resolved');
  const [resolutionNote, setResolutionNote] = useState('');
  const [actionTaken, setActionTaken] = useState('no_action');
  
  // User lookup states
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userActionModal, setUserActionModal] = useState(null); // { type: 'warn' | 'suspend' | 'ban', user: Object }
  const [userActionJustification, setUserActionJustification] = useState('');

  // Ride Log Lookup states
  const [rideSearchId, setRideSearchId] = useState('');
  const [searchedRideLog, setSearchedRideLog] = useState(null);

  // Verification queue states
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const [toastText, setToastText] = useState('');

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const res = await getAdminReports();
      setReports(res.reports || []);
    } catch (err) {
      console.error('Failed to load reports queue:', err);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await searchAdminUsers();
      setUsers(res.data || []);
    } catch (err) {
      console.error('Failed to load user directory:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const loadVerifications = useCallback(async () => {
    setLoadingVerifications(true);
    try {
      const res = await getVerificationQueue();
      setVerifications(res.data || []);
    } catch (err) {
      console.error('Failed to load verification queue:', err);
    } finally {
      setLoadingVerifications(false);
    }
  }, []);

  const loadMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      const res = await getSafetyMetrics();
      if (res && res.data) {
        setSafetyMetrics(res.data);
      }
    } catch (err) {
      console.error('Failed to load safety metrics:', err);
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  const loadAllData = useCallback(() => {
    loadReports();
    loadUsers();
    loadVerifications();
    loadMetrics();
  }, [loadReports, loadUsers, loadVerifications, loadMetrics]);

  // Check admin role or bypass
  useEffect(() => {
    const checkAuth = async () => {
      await Promise.resolve();
      const user = useAuthStore.getState().user;
      const bypass = localStorage.getItem('devAdminBypass') === 'true';
      setDevAdminBypass(bypass);

      if (bypass || (user && user.role === 'admin')) {
        setIsAdmin(true);
        loadAllData();
      } else {
        setIsAdmin(false);
        navigate('/home', { state: { error: '🚫 Access Denied: Admin privileges required.' } });
      }
    };

    checkAuth();
  }, [navigate, loadAllData]);

  const triggerToast = (msg) => {
    setToastText(msg);
    setTimeout(() => setToastText(''), 3000);
  };

  const handleDevBypassToggle = () => {
    const nextVal = !devAdminBypass;
    setDevAdminBypass(nextVal);
    localStorage.setItem('devAdminBypass', String(nextVal));
    if (nextVal) {
      setIsAdmin(true);
      loadAllData();
      triggerToast('🔑 Admin Role Bypassed (Bypass Mode Active)');
    } else {
      const user = useAuthStore.getState().user;
      if (!user || user.role !== 'admin') {
        setIsAdmin(false);
        triggerToast('🔒 Admin Bypass Disabled. Access Denied.');
      } else {
        triggerToast('✔️ Logged in as real Admin.');
      }
    }
  };

  // Status badge styling helper
  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'resolved':
        return <Badge variant="success">Resolved</Badge>;
      case 'under review':
      case 'under_review':
        return <Badge variant="info">Under Review</Badge>;
      case 'received':
      default:
        return <Badge variant="warning">Received</Badge>;
    }
  };

  // Report Resolution Handler
  const handleResolveReport = async (e) => {
    e.preventDefault();
    if (resolutionStatus === 'resolved' && !resolutionNote.trim()) {
      alert('Please enter a resolution note before resolving.');
      return;
    }

    try {
      await resolveReport(selectedReportId, {
        status: resolutionStatus,
        resolution_note: resolutionNote.trim(),
        action_taken: actionTaken
      });

      triggerToast(`✔️ Report #${selectedReportId} resolved.`);
      setSelectedReportId(null);
      setResolutionNote('');
      loadReports();
      loadUsers(); // reload users in case suspension occurred
    } catch (err) {
      console.error('Failed to resolve report:', err);
      alert(err.response?.data?.message || 'Failed to resolve report.');
    }
  };

  // User Actions Handler
  const handleUserAction = async () => {
    if (!userActionJustification.trim()) {
      alert('Please provide a typed justification.');
      return;
    }

    const targetUser = userActionModal.user;
    const action = userActionModal.type;

    try {
      // TODO: backend to enforce login block on suspended accounts
      await updateUserStatus(targetUser.user_id, {
        account_status: action === 'warn' ? 'active' : (action === 'suspend' ? 'suspended' : 'banned'),
        justification: userActionJustification
      });

      setUserActionModal(null);
      setUserActionJustification('');
      triggerToast(`Action "${action.toUpperCase()}" logged successfully for ${targetUser.name}.`);
      loadUsers();
      setSelectedUser(null);
    } catch (err) {
      console.error('Failed to perform user action:', err);
      alert(err.response?.data?.message || 'Failed to update user status.');
    }
  };

  // Verification Approvals
  const handleApproveVerification = async (id) => {
    try {
      await processVerification(id, { status: 'approved' });
      triggerToast(`Verification approved successfully.`);
      loadVerifications();
      loadUsers();
    } catch (err) {
      console.error('Failed to approve verification:', err);
      alert(err.response?.data?.message || 'Failed to approve verification.');
    }
  };

  const handleRejectVerification = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      alert('Please enter a rejection reason.');
      return;
    }

    try {
      await processVerification(rejectId, { status: 'rejected', reject_reason: rejectReason.trim() });
      setRejectId(null);
      setRejectReason('');
      triggerToast(`Verification rejected.`);
      loadVerifications();
    } catch (err) {
      console.error('Failed to reject verification:', err);
      alert(err.response?.data?.message || 'Failed to reject verification.');
    }
  };

  // Ride Log Lookup Search
  const handleRideSearch = async (e) => {
    e.preventDefault();
    if (!rideSearchId.trim()) return;

    try {
      const res = await getAdminRideDetail(rideSearchId.trim());
      if (res && res.data) {
        setSearchedRideLog(res.data);
      }
    } catch (err) {
      console.error('Failed to retrieve ride log details:', err);
      alert(err.response?.data?.message || 'Ride log not found for ID: ' + rideSearchId);
      setSearchedRideLog(null);
    }
  };

  // If user is not admin and Dev Bypass is off, render Access Denied Screen
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center font-sans">
        <Card className="max-w-md w-full p-8 border-red-500/20 space-y-6 shadow-2xl bg-slate-900/60">
          <div className="text-red-500 text-6xl">🔒</div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-200">Access Denied</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Admin operations require an authenticated admin user profile. Standard commuter access is restricted.
            </p>
          </div>

          <div className="pt-2 space-y-3">
            <button 
              onClick={handleDevBypassToggle}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition duration-150 active:scale-95 cursor-pointer shadow-md"
            >
              🔑 Enable Admin Bypass (Dev Mode)
            </button>
            <button 
              onClick={() => navigate('/home')}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
            >
              🏠 Return to Home Screen
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans antialiased text-left select-none">
      
      {/* 1. LEFT SIDEBAR */}
      <aside className="w-64 bg-slate-900 border-r border-slate-850 flex flex-col justify-between shrink-0">
        <div className="flex flex-col">
          {/* Logo Brand Header */}
          <div className="p-5 border-b border-slate-850 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🛡️</span>
              <span className="font-black text-sm uppercase tracking-wider text-slate-200">Admin Console</span>
            </div>
            <Badge variant="danger" className="text-[9px]">Admin</Badge>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <button 
              onClick={() => { setActiveTab('reports'); loadReports(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition cursor-pointer ${activeTab === 'reports' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'}`}
            >
              <span>📋</span> Report Queue
              {reports.filter(r => r.status !== 'Resolved').length > 0 && (
                <span className="ml-auto bg-rose-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                  {reports.filter(r => r.status !== 'Resolved').length}
                </span>
              )}
            </button>
            <button 
              onClick={() => { setActiveTab('users'); loadUsers(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition cursor-pointer ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'}`}
            >
              <span>👤</span> User Lookup
            </button>
            <button 
              onClick={() => { setActiveTab('metrics'); loadMetrics(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition cursor-pointer ${activeTab === 'metrics' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'}`}
            >
              <span>📊</span> Safety Metrics
            </button>
            <button 
              onClick={() => { setActiveTab('verifications'); loadVerifications(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition cursor-pointer ${activeTab === 'verifications' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'}`}
            >
              <span>🆔</span> Verification Queue
              {verifications.length > 0 && (
                <span className="ml-auto bg-indigo-550 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                  {verifications.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('rides')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition cursor-pointer ${activeTab === 'rides' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'}`}
            >
              <span>🚗</span> Ride Log Lookup
            </button>
          </nav>
        </div>

        {/* Sidebar Footer / Dev Control */}
        <div className="p-4 border-t border-slate-850 space-y-3">
          <div className="flex flex-col gap-1 text-[10px] text-slate-500 font-mono">
            <span>Server: Connected</span>
            <span>API Version: v1.0.4</span>
          </div>
          <button 
            onClick={handleDevBypassToggle}
            className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 rounded-lg text-[10px] font-bold transition cursor-pointer"
          >
            {devAdminBypass ? '🔒 Disable Bypass' : '🔑 Enable Bypass'}
          </button>
          <Link 
            to="/home" 
            className="block text-center py-2 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400 hover:text-slate-200 rounded-lg text-[10px] font-bold transition"
          >
            🏠 Return to App Home
          </Link>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 bg-slate-950 flex flex-col min-w-0">
        
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-850 px-6 flex items-center justify-between bg-slate-900/20">
          <h2 className="font-extrabold text-base text-slate-200 uppercase tracking-wide">
            {activeTab === 'reports' && '📋 Submitted Incident Reports Queue'}
            {activeTab === 'users' && '👤 User Credentials Directory'}
            {activeTab === 'metrics' && '📊 Trust & Safety Core Metrics'}
            {activeTab === 'verifications' && '🆔 Academic Affiliation Pending Queue'}
            {activeTab === 'rides' && '🚗 Assembled Ride logs lookup'}
          </h2>
          
          <div className="flex items-center gap-3">
            {toastText && (
              <span className="text-xs bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 px-3 py-1 rounded-full font-semibold">
                {toastText}
              </span>
            )}
            <div className="flex items-center gap-2">
              <Avatar name="Admin Manager" size="xs" />
              <span className="text-xs font-bold text-slate-355">Ops Team</span>
            </div>
          </div>
        </header>

        {/* Inner Scroll Content */}
        <div className="p-6 overflow-y-auto flex-1 max-w-4xl w-full">
          
          {/* TAB 1: REPORTS QUEUE */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              {loadingReports ? (
                <div className="space-y-4">
                  <SkeletonLoader variant="card" count={3} />
                </div>
              ) : reports.length === 0 ? (
                <Card className="p-8 text-center text-slate-500 text-xs border-dashed border-slate-800">
                  No reports in the queue.
                </Card>
              ) : (
                <div className="space-y-3">
                  {[...reports]
                    .sort((a, b) => {
                      const aPri = a.urgency === 'urgent' && a.status !== 'Resolved' ? 2 : (a.status !== 'Resolved' ? 1 : 0);
                      const bPri = b.urgency === 'urgent' && b.status !== 'Resolved' ? 2 : (b.status !== 'Resolved' ? 1 : 0);
                      return bPri - aPri;
                    })
                    .map((r) => {
                      const isUrgent = r.urgency === 'urgent' && r.status !== 'Resolved';
                      return (
                        <Card 
                          key={r.report_id} 
                          className={`p-4 transition duration-150 border-slate-850 bg-slate-900/10 text-xs text-slate-300 space-y-3 text-left ${isUrgent ? 'border-rose-500/30 bg-rose-950/5' : ''}`}
                        >
                          {/* Header */}
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={isUrgent ? 'danger' : 'warning'}>
                                {r.category === 'unsafe_driving' && '🚗 Unsafe Driving'}
                                {r.category === 'misbehavior' && '👤 Misbehavior'}
                                {r.category === 'fake_account' && '🆔 Fake Account'}
                                {r.category === 'harassment' && '⚠️ Harassment'}
                                {r.category === 'safety_sos' && '🚨 Emergency SOS'}
                                {r.category === 'no_show' && '⏳ No-Show'}
                              </Badge>
                              <span className="font-mono text-slate-500 font-bold">Report ID: #{r.report_id}</span>
                              {isUrgent && <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest animate-pulse">🚨 Urgent Safety Alert</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 font-mono">{r.timestamp}</span>
                              {getStatusBadge(r.status)}
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/40 p-3 rounded-xl border border-slate-850/80">
                            {r.description}
                          </p>

                          {/* Meta Detail Info */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px] pt-1.5 font-semibold text-slate-400 border-t border-slate-900">
                            <div>
                              <span className="block text-[9px] text-slate-500 uppercase tracking-wide">Reporter:</span>
                              <span className="text-slate-300">{r.reporter_name}</span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-slate-500 uppercase tracking-wide">Reported User:</span>
                              <span className="text-slate-300">{r.reported_user}</span>
                            </div>
                            {r.ride_id && (
                              <div>
                                <span className="block text-[9px] text-slate-500 uppercase tracking-wide">Ride Context:</span>
                                <button 
                                  onClick={() => { setRideSearchId(String(r.ride_id)); setActiveTab('rides'); }}
                                  className="text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer text-left"
                                >
                                  Ride #{r.ride_id} ➔
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Actions Taken Display */}
                          {r.status === 'Resolved' && (
                            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-900 text-[11px] space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-400">Resolution Action:</span>
                                <Badge variant="success" className="uppercase text-[9px]">{r.action_taken}</Badge>
                                <span className="text-emerald-400 font-bold">✔️ Reporter Notified</span>
                              </div>
                              <p className="text-slate-400 mt-1 italic">"{r.resolution_note}"</p>
                              {r.resolved_at && <span className="block text-[9px] text-slate-500 font-mono mt-1">Resolved at: {r.resolved_at}</span>}
                            </div>
                          )}

                          {/* Action Resolve Form */}
                          {r.status !== 'Resolved' && selectedReportId !== r.report_id && (
                            <div className="flex justify-end pt-1">
                              <Button 
                                onClick={() => { setSelectedReportId(r.report_id); setActionTaken('no_action'); setResolutionStatus('resolved'); }}
                                className="text-[10px] py-1 px-4 min-h-[30px]"
                              >
                                Resolve Report
                              </Button>
                            </div>
                          )}

                          {selectedReportId === r.report_id && (
                            <form onSubmit={handleResolveReport} className="bg-slate-900/60 p-4 rounded-xl border border-indigo-500/20 space-y-3 text-left">
                              <h4 className="font-bold text-indigo-400 uppercase text-[10px]">Report Resolution Panel</h4>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">Target Status</label>
                                  <select 
                                    value={resolutionStatus} 
                                    onChange={(e) => setResolutionStatus(e.target.value)}
                                    className="bg-brand-bg-card border border-slate-800 rounded-lg p-1.5 text-xs outline-none"
                                  >
                                    <option value="resolved">Resolved (Close & Notify)</option>
                                    <option value="under_review">Under Review</option>
                                  </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">Action to enforce</label>
                                  <select 
                                    value={actionTaken} 
                                    onChange={(e) => setActionTaken(e.target.value)}
                                    className="bg-brand-bg-card border border-slate-800 rounded-lg p-1.5 text-xs outline-none"
                                  >
                                    <option value="no_action">No Action (Dismiss)</option>
                                    <option value="warning_issued">Issue Formal Warning</option>
                                    <option value="suspended">Suspend Account</option>
                                    <option value="banned">Ban User Account</option>
                                  </select>
                                </div>
                              </div>

                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Resolution Note {resolutionStatus === 'resolved' && <span className="text-red-500">*</span>}</label>
                                <textarea 
                                  value={resolutionNote}
                                  onChange={(e) => setResolutionNote(e.target.value)}
                                  placeholder="e.g. Discussed route deviation with driver. Confirmed it was a detour due to roadblock. Standard warning logged."
                                  className="bg-brand-bg-card border border-slate-800 rounded-lg p-2 text-xs outline-none h-16 w-full text-slate-200"
                                />
                              </div>

                              <div className="flex gap-2 justify-end pt-1">
                                <Button type="submit" className="text-[10px] py-1 px-4 min-h-[30px]">Save Resolution</Button>
                                <Button onClick={() => setSelectedReportId(null)} variant="secondary" className="text-[10px] py-1 px-4 min-h-[30px]">Cancel</Button>
                              </div>
                            </form>
                          )}

                        </Card>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: USER LOOKUP */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              
              {/* User search bar */}
              <form onSubmit={(e) => e.preventDefault()} className="max-w-md">
                <InputField 
                  label="Search User Database"
                  placeholder="Enter name or phone number..."
                  value={userSearchQuery}
                  onChange={(e) => {
                    setUserSearchQuery(e.target.value);
                    setSelectedUser(null);
                  }}
                />
              </form>

              {/* Match list */}
              {userSearchQuery && (
                <div className="bg-slate-900 border border-slate-850 rounded-xl divide-y divide-slate-850 max-h-48 overflow-y-auto">
                  {users
                    .filter(u => u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || u.mobile.includes(userSearchQuery))
                    .map(u => (
                      <button
                        key={u.mobile}
                        onClick={() => { setSelectedUser(u); setUserSearchQuery(''); }}
                        className="w-full p-3 text-left hover:bg-slate-850 text-xs font-bold text-slate-350 flex justify-between items-center transition duration-150 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar name={u.name} size="xs" />
                          <span>{u.name}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 font-semibold">{u.mobile}</span>
                      </button>
                    ))}
                </div>
              )}

              {/* Selected User Details Card */}
              {loadingUsers ? (
                <SkeletonLoader variant="card" count={1} />
              ) : selectedUser ? (
                <Card className="p-5 border-slate-850 space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex gap-4 text-left">
                      <Avatar name={selectedUser.name} size="md" className="border border-indigo-500/10" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-sm text-slate-200">{selectedUser.name}</h3>
                          <Badge variant={
                            selectedUser.account_status === 'active' ? 'success' : 
                            (selectedUser.account_status === 'suspended' ? 'warning' : 'danger')
                          }>
                            {selectedUser.account_status.toUpperCase()}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-brand-text-secondary block font-mono">Mobile: +91 {selectedUser.mobile}</span>
                        <span className="text-[10px] text-brand-text-secondary block font-mono">Email: {selectedUser.email}</span>
                      </div>
                    </div>
                    <div className="text-right space-y-1 text-xs">
                      <div className="font-bold text-indigo-400">⭐ {selectedUser.rating || '5.0'} Rating</div>
                      <div className="text-slate-500 text-[10px] font-semibold">{selectedUser.ridesCount || 0} rides completed</div>
                    </div>
                  </div>

                  {/* Verification Credentials */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-bold text-slate-400 pt-2 border-t border-slate-900">
                    <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-850 text-center">
                      📱 Mobile OTP: {selectedUser.mobile ? <span className="text-emerald-400">Verified</span> : <span className="text-rose-400">Missing</span>}
                    </div>
                    <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-850 text-center">
                      📧 Institution Email: {selectedUser.email ? <span className="text-emerald-400">Verified</span> : <span className="text-slate-500">Unverified</span>}
                    </div>
                    <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-850 text-center">
                      🆔 Institution ID: {selectedUser.email ? <span className="text-emerald-400">Verified</span> : <span className="text-slate-500">Missing</span>}
                    </div>
                    <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-850 text-center">
                      ⚠️ Reports Received: <span className={selectedUser.reportsReceived > 0 ? 'text-rose-400' : 'text-slate-500'}>{selectedUser.reportsReceived || 0}</span>
                    </div>
                  </div>

                  {/* Account Action Buttons */}
                  <div className="flex gap-2 justify-end pt-2 border-t border-slate-900">
                    <Button 
                      onClick={() => setUserActionModal({ type: 'warn', user: selectedUser })}
                      className="text-[10px] py-1.5 bg-amber-600/10 text-amber-400 hover:bg-amber-600/20 border border-amber-600/20"
                    >
                      ⚠️ Issue Warning
                    </Button>
                    <Button 
                      onClick={() => setUserActionModal({ type: 'suspend', user: selectedUser })}
                      className="text-[10px] py-1.5 bg-rose-600/10 text-rose-400 hover:bg-rose-600/20 border border-rose-600/20"
                    >
                      🚫 Suspend Account
                    </Button>
                    <Button 
                      onClick={() => setUserActionModal({ type: 'ban', user: selectedUser })}
                      className="text-[10px] py-1.5 bg-red-650 text-white hover:bg-red-750"
                    >
                      💀 Ban User
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="p-8 border border-dashed border-slate-800 text-center text-xs text-slate-500 rounded-xl max-w-lg">
                  Use search bar above to look up user credentials, stats, ratings, and log history.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SAFETY METRICS */}
          {activeTab === 'metrics' && (
            <div className="space-y-6">
              
              {/* Metrics Grid */}
              {loadingMetrics ? (
                <SkeletonLoader variant="card" count={1} />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-bold text-slate-355">
                  <Card className="p-4 border-slate-850 bg-slate-900/10 text-left space-y-1.5">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wide">🚨 SOS Activations</span>
                    <span className="text-xl font-black text-rose-400 block">{safetyMetrics.sos_activations}</span>
                    <span className="text-[9px] text-slate-500 font-mono">Platform-wide cumulative</span>
                  </Card>
                  <Card className="p-4 border-slate-850 bg-slate-900/10 text-left space-y-1.5">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wide">⏳ Avg Resolution Time</span>
                    <span className="text-xl font-black text-indigo-400 block">{safetyMetrics.avg_resolution_time_mins} mins</span>
                    <span className="text-[9px] text-slate-500 font-mono">Last 30-day average</span>
                  </Card>
                  <Card className="p-4 border-slate-850 bg-slate-900/10 text-left space-y-1.5">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wide">🆔 Verification Rate</span>
                    <span className="text-xl font-black text-emerald-400 block">{safetyMetrics.verification_rate}%</span>
                    <span className="text-[9px] text-slate-500 font-mono">Domain matches complete</span>
                  </Card>
                  <Card className="p-4 border-slate-850 bg-slate-900/10 text-left space-y-1.5">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wide">🚗 Active Rides</span>
                    <span className="text-xl font-black text-slate-200 block">{safetyMetrics.active_rides}</span>
                    <span className="text-[9px] text-slate-500 font-mono">Ongoing in progress now</span>
                  </Card>
                </div>
              )}

              {/* Trend Chart */}
              <Card className="p-5 border-slate-850 bg-slate-900/5 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-left">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Incident Report Trends</h3>
                    <span className="text-[10px] text-slate-500 font-semibold block">Weekly total reports rate</span>
                  </div>
                  <Badge variant="danger" className="animate-pulse">Live Updates</Badge>
                </div>
                
                {/* SVG Chart Render */}
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850">
                  <svg viewBox="0 0 400 150" className="w-full h-44 text-indigo-400">
                    <line x1="40" y1="20" x2="380" y2="20" stroke="#1e293b" strokeDasharray="3,3" />
                    <line x1="40" y1="60" x2="380" y2="60" stroke="#1e293b" strokeDasharray="3,3" />
                    <line x1="40" y1="100" x2="380" y2="100" stroke="#1e293b" strokeDasharray="3,3" />
                    <line x1="40" y1="130" x2="380" y2="130" stroke="#334155" strokeWidth="1.5" />
                    
                    <path
                      d="M 50 110 L 100 120 L 150 70 L 200 40 L 250 80 L 300 50 L 350 30"
                      fill="none"
                      stroke="url(#chartGrad)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    
                    <circle cx="50" cy="110" r="4" className="fill-indigo-500 stroke-slate-900 stroke-2" />
                    <circle cx="100" cy="120" r="4" className="fill-indigo-500 stroke-slate-900 stroke-2" />
                    <circle cx="150" cy="70" r="4" className="fill-indigo-500 stroke-slate-900 stroke-2" />
                    <circle cx="200" cy="40" r="4" className="fill-indigo-500 stroke-slate-900 stroke-2" />
                    <circle cx="250" cy="80" r="4" className="fill-indigo-500 stroke-slate-900 stroke-2" />
                    <circle cx="300" cy="50" r="4" className="fill-indigo-500 stroke-slate-900 stroke-2" />
                    <circle cx="350" cy="30" r="4" className="fill-rose-500 stroke-slate-900 stroke-2 animate-pulse" />

                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#f43f5e" />
                      </linearGradient>
                    </defs>

                    <text x="40" y="145" className="fill-slate-500 text-[8px] font-bold font-mono">Mon</text>
                    <text x="90" y="145" className="fill-slate-500 text-[8px] font-bold font-mono">Tue</text>
                    <text x="140" y="145" className="fill-slate-500 text-[8px] font-bold font-mono">Wed</text>
                    <text x="190" y="145" className="fill-slate-500 text-[8px] font-bold font-mono">Thu</text>
                    <text x="240" y="145" className="fill-slate-500 text-[8px] font-bold font-mono">Fri</text>
                    <text x="290" y="145" className="fill-slate-500 text-[8px] font-bold font-mono">Sat</text>
                    <text x="340" y="145" className="fill-rose-400 text-[8px] font-bold font-mono">Sun (Today)</text>
                  </svg>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 4: VERIFICATION QUEUE */}
          {activeTab === 'verifications' && (
            <div className="space-y-4">
              {loadingVerifications ? (
                <div className="space-y-4">
                  <SkeletonLoader variant="card" count={2} />
                </div>
              ) : verifications.length === 0 ? (
                <Card className="p-8 text-center text-slate-500 text-xs border-dashed border-slate-800">
                  Verification queue is completely clear.
                </Card>
              ) : (
                <div className="space-y-3">
                  {verifications.map((v) => (
                    <Card key={v.id} className="p-4 border-slate-855 bg-slate-900/10 text-xs space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Avatar name={v.name} size="xs" />
                          <span className="font-bold text-slate-200">{v.name}</span>
                          <span className="text-slate-500 font-semibold font-mono">({v.email})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-mono">{v.requestedAt}</span>
                          <Badge variant="info">{v.role}</Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-left p-3 bg-slate-900/60 rounded-xl border border-slate-850">
                        <div>
                          <span className="block text-[9px] text-slate-500 uppercase tracking-wide">Target Domain:</span>
                          <span className="font-bold text-slate-350">{v.domain}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-500 uppercase tracking-wide">Document Match:</span>
                          <span className="font-bold text-emerald-400">Institutional ID scans pending confirmation</span>
                        </div>
                      </div>

                      {rejectId !== v.id ? (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleApproveVerification(v.id)}
                            className="px-3.5 py-1.5 rounded-lg bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-[10px] uppercase tracking-wider cursor-pointer transition active:scale-95"
                          >
                            Approve Match
                          </button>
                          <button 
                            onClick={() => setRejectId(v.id)}
                            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[10px] uppercase tracking-wider cursor-pointer transition"
                          >
                            Reject...
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handleRejectVerification} className="p-3.5 border border-red-500/20 bg-red-950/5 rounded-xl space-y-3 text-left animate-[fadeIn_0.2s_ease-out]">
                          <InputField 
                            label="Rejection Reason (Required)"
                            placeholder="e.g. Domain mismatch / ID document name does not match user profile."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                          />
                          <div className="flex gap-2 justify-end">
                            <button 
                              type="submit"
                              className="px-3 py-1.5 bg-red-650 hover:bg-red-750 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg transition cursor-pointer"
                            >
                              Confirm Reject
                            </button>
                            <button 
                              onClick={() => { setRejectId(null); setRejectReason(''); }}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[10px] uppercase tracking-wider rounded-lg cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}

                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: RIDE LOG LOOKUP */}
          {activeTab === 'rides' && (
            <div className="space-y-6">
              
              {/* Search bar */}
              <form onSubmit={handleRideSearch} className="max-w-md flex gap-2 items-end">
                <div className="flex-1">
                  <InputField 
                    label="Search Ride Log Database"
                    placeholder="Enter Ride ID (e.g. 1, 2, 3)..."
                    value={rideSearchId}
                    onChange={(e) => setRideSearchId(e.target.value)}
                  />
                </div>
                <Button type="submit" className="min-h-[46px] px-6 text-xs py-2">
                  Retrieve Log
                </Button>
              </form>

              {/* Ride Log Detail Output */}
              {searchedRideLog ? (
                <Card className="p-5 border-slate-855 space-y-5 text-xs text-slate-300">
                  
                  {/* Top info */}
                  <div className="flex justify-between border-b border-slate-900 pb-3">
                    <div className="text-left space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-200">Ride Log: #{searchedRideLog.ride_id}</span>
                        <Badge variant="success">{searchedRideLog.status?.toUpperCase()}</Badge>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block">Departure: {searchedRideLog.ride_date} at {searchedRideLog.departure_time}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Estimated Cost</span>
                      <span className="font-black text-sm text-indigo-400">₹{(searchedRideLog.estimated_total_cost || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Driver & Vehicle */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left bg-slate-900/30 p-3 rounded-xl border border-slate-900">
                    <div>
                      <span className="block text-[9px] text-slate-500 uppercase tracking-wide">Driver Info</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar name={searchedRideLog.driver_name} size="xs" />
                        <span className="font-bold text-slate-250">{searchedRideLog.driver_name}</span>
                        <span className="text-amber-400 font-bold font-mono">⭐ {searchedRideLog.driver_rating}</span>
                      </div>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-500 uppercase tracking-wide">Vehicle Registered</span>
                      <span className="font-bold text-slate-250 mt-1 block">
                        {searchedRideLog.vehicle_name} 
                      </span>
                    </div>
                  </div>

                  {/* Route points */}
                  <div className="bg-slate-900/30 p-3 rounded-xl border border-slate-900 text-left space-y-1.5">
                    <span className="block text-[9px] text-slate-500 uppercase tracking-wide mb-1.5">Route Waypoints</span>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5 text-[9px]">🟢</span>
                      <span className="font-bold text-slate-350">{searchedRideLog.source_label}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-rose-500 mt-0.5 text-[9px]">🔴</span>
                      <span className="font-bold text-slate-350">{searchedRideLog.destination_label}</span>
                    </div>
                  </div>

                  {/* Status lifecycle logs */}
                  <div className="space-y-2 text-left">
                    <span className="block text-[9px] text-slate-500 uppercase tracking-wide">Status Lifecycle Audits</span>
                    <div className="bg-slate-900/20 p-3.5 rounded-xl border border-slate-900 space-y-2.5 font-mono text-[10px]">
                      {searchedRideLog.statusHistory?.map((s, idx) => (
                        <div key={idx} className="flex gap-3 text-slate-400 items-start">
                          <span className="text-indigo-400 font-bold shrink-0">[{s.status.toUpperCase()}]</span>
                          <span>{s.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Linked bookings / passengers */}
                  <div className="space-y-2 text-left">
                    <span className="block text-[9px] text-slate-500 uppercase tracking-wide">Passengers & Bookings</span>
                    <div className="space-y-2">
                      {(!searchedRideLog.bookings || searchedRideLog.bookings.length === 0) ? (
                        <div className="p-3 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
                          No passenger bookings associated with this ride log.
                        </div>
                      ) : (
                        searchedRideLog.bookings.map((b, idx) => (
                          <div key={idx} className="bg-slate-900/40 p-3 rounded-xl border border-slate-900/60 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Avatar name={b.passenger_name} size="xs" />
                              <span className="font-bold text-slate-200">{b.passenger_name}</span>
                              <span className="text-slate-500 font-semibold font-mono">({b.pickup_point} ➔ {b.drop_point})</span>
                            </div>
                            <Badge variant={b.status === 'accepted' ? 'success' : 'warning'}>
                              {b.status?.toUpperCase()}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Linked reports */}
                  {searchedRideLog.reports && searchedRideLog.reports.length > 0 && (
                    <div className="space-y-2 text-left">
                      <span className="block text-[9px] text-rose-400 font-bold uppercase tracking-wide">Linked Incident Reports</span>
                      <div className="space-y-2">
                        {searchedRideLog.reports.map((r, idx) => (
                          <div key={idx} className="bg-rose-955/5 p-3 rounded-xl border border-rose-900/30 flex justify-between items-center text-rose-355 font-semibold">
                            <div>
                              <span className="font-bold">Report #{r.report_id}</span>
                              <span className="text-[10px] block mt-0.5 italic">"{r.description}"</span>
                            </div>
                            <Badge variant="danger">URGENT</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </Card>
              ) : (
                <div className="p-8 border border-dashed border-slate-800 text-center text-xs text-slate-500 rounded-xl max-w-lg">
                  Use search bar above to retrieve full database ride logs, bookings history, and safety incident logs.
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* 3. CONFIRMATION MODAL FOR BAN / SUSPEND */}
      {userActionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-sm w-full p-5 border-red-550/20 text-center space-y-4 shadow-2xl bg-slate-900">
            <span className="text-3xl block">⚠️</span>
            <div className="space-y-1">
              <h3 className="font-extrabold text-sm text-rose-455 uppercase tracking-wider">
                Confirm Account {userActionModal.type === 'warn' ? 'Warning' : (userActionModal.type === 'suspend' ? 'Suspension' : 'Ban')}?
              </h3>
              <p className="text-xs text-brand-text-secondary leading-relaxed">
                {userActionModal.type === 'warn' && `Are you sure you want to issue a warning log to ${userActionModal.user.name}?`}
                {userActionModal.type === 'suspend' && `Are you sure you want to suspend the account of ${userActionModal.user.name}? This will block all active rides and searches.`}
                {userActionModal.type === 'ban' && `Are you sure you want to permanently BAN the user account of ${userActionModal.user.name}? This action is irreversible.`}
              </p>
            </div>

            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Incident justification note</label>
              <textarea 
                value={userActionJustification}
                onChange={(e) => setUserActionJustification(e.target.value)}
                placeholder="e.g. Verified 3 independent safety complaints regarding tailgating and speeding."
                className="bg-brand-bg-card border border-slate-800 rounded-lg p-2 text-xs outline-none h-16 w-full text-slate-200"
              />
            </div>

            <div className="flex gap-2">
              <button 
                onClick={handleUserAction}
                className="flex-1 py-2.5 rounded-lg bg-red-650 hover:bg-red-750 text-white font-extrabold text-xs uppercase tracking-wider cursor-pointer transition"
              >
                Confirm
              </button>
              <button 
                onClick={() => { setUserActionModal(null); setUserActionJustification(''); }}
                className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-350 font-bold text-xs cursor-pointer transition"
              >
                Cancel
              </button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
