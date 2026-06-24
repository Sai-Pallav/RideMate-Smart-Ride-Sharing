import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { 
  getNotificationPreferences, 
  updateNotificationPreferences 
} from '../api/notifications';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import NavigationBar from '../components/NavigationBar';

export default function SettingsScreen() {
  const navigate = useNavigate();

  // Core Preferences States
  const [rideReminder, setRideReminder] = useState(true);
  const [bookingStatus, setBookingStatus] = useState(true);
  const [ratingPrompt, setRatingPrompt] = useState(true);
  const [systemAlert, setSystemAlert] = useState(true);
  
  const [loading, setLoading] = useState(true);
  const [toastText, setToastText] = useState('');

  const [language, setLanguage] = useState('en');
  const [phoneVisibility, setPhoneVisibility] = useState('masked'); // 'masked' | 'visible'
  
  // Dialog / Confirmation State
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  // Mock Active Sessions
  const [sessions, setSessions] = useState([
    { id: 1, device: "Chrome Browser on Windows", location: "Campus IT Center Library", current: true, time: "Active Now" },
    { id: 2, device: "Safari Mobile on Apple iPhone 15", location: "Downtown Residential Hub", current: false, time: "2 hours ago" }
  ]);

  const triggerToast = useCallback((msg) => {
    setToastText(msg);
    setTimeout(() => setToastText(''), 3000);
  }, []);

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        setLoading(true);
        const res = await getNotificationPreferences();
        if (res && res.data) {
          const prefs = res.data;
          setRideReminder(!!prefs.ride_reminder);
          setBookingStatus(!!prefs.booking_status);
          setRatingPrompt(!!prefs.rating_prompt);
          setSystemAlert(!!prefs.system_alert);
        }
      } catch (err) {
        console.error('Failed to fetch notification preferences:', err);
        triggerToast('Failed to load notification preferences.');
      } finally {
        setLoading(false);
      }
    };
    const init = async () => {
      await Promise.resolve();
      fetchPrefs();
    };
    init();
  }, [triggerToast]);

  const handleTogglePref = async (prefName, currentValue, setter) => {
    const nextValue = !currentValue;
    setter(nextValue);

    // Build the full preferences payload
    const updatedPrefs = {
      ride_reminder: prefName === 'ride_reminder' ? nextValue : rideReminder,
      booking_status: prefName === 'booking_status' ? nextValue : bookingStatus,
      rating_prompt: prefName === 'rating_prompt' ? nextValue : ratingPrompt,
      system_alert: prefName === 'system_alert' ? nextValue : systemAlert
    };

    try {
      await updateNotificationPreferences(updatedPrefs);
      triggerToast(`Preferences updated successfully.`);
    } catch (err) {
      console.error(`Failed to update preference ${prefName}:`, err);
      // Revert state
      setter(currentValue);
      triggerToast(`Error: Failed to update preference. Reverted.`);
    }
  };

  const toggleRideReminder = () => handleTogglePref('ride_reminder', rideReminder, setRideReminder);
  const toggleBookingStatus = () => handleTogglePref('booking_status', bookingStatus, setBookingStatus);
  const toggleRatingPrompt = () => handleTogglePref('rating_prompt', ratingPrompt, setRatingPrompt);
  const toggleSystemAlert = () => handleTogglePref('system_alert', systemAlert, setSystemAlert);

  const handleRevokeSession = (id) => {
    if (window.confirm('Are you sure you want to log out of this active device session?')) {
      setSessions(sessions.filter(s => s.id !== id));
      triggerToast('Session revoked successfully.');
    }
  };

  const handleDeactivateAccount = () => {
    setShowDeactivateModal(false);
    // TODO: backend to support DELETE /api/profile/me endpoint to deactivate user account
    alert('Contact support to deactivate your account.');
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out of Community Ride?')) {
      useAuthStore.getState().clearAuth();
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg-base text-brand-text-primary font-sans flex flex-col pb-24 md:pb-6 text-left">
      
      <NavigationBar className="relative z-10" />

      {toastText && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 border border-indigo-500/30 text-indigo-300 px-4 py-2.5 rounded-xl shadow-2xl text-xs md:text-sm font-semibold animate-bounce">
          {toastText}
        </div>
      )}

      {/* Screen Header */}
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
            <h2 className="text-sm font-bold text-slate-200">Account Preferences</h2>
          </div>
          <Badge variant="info">v1.0.4</Badge>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-lg mx-auto w-full px-4 pt-6 flex-1 space-y-6">
        
        {/* 1. NOTIFICATION PREFERENCES */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Notification Settings</h3>
          <Card className="p-4 border-slate-800 space-y-4">
            
            {/* Toggle Category A (Unlocked) */}
            <div className="flex items-center justify-between">
              <div className="text-left pr-4">
                <span className="text-xs font-bold text-slate-200 block">Commute Status Updates (`booking_status`)</span>
                <span className="text-[10px] text-brand-text-secondary block">
                  Notify me when a ride request is received, accepted, declined, or cancelled.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={bookingStatus} 
                  onChange={toggleBookingStatus} 
                  disabled={loading}
                  className="sr-only peer" 
                />
                <div className="w-8 h-4.5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-500"></div>
              </label>
            </div>

            {/* Toggle Category B (Unlocked) */}
            <div className="flex items-center justify-between border-t border-slate-850 pt-4">
              <div className="text-left pr-4">
                <span className="text-xs font-bold text-slate-200 block">Ride Departure Reminders (`ride_reminder`)</span>
                <span className="text-[10px] text-brand-text-secondary block">
                  Notify me 30 minutes before my ride departs.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={rideReminder} 
                  onChange={toggleRideReminder} 
                  disabled={loading}
                  className="sr-only peer" 
                />
                <div className="w-8 h-4.5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-500"></div>
              </label>
            </div>

            {/* Toggle Category C (Unlocked) */}
            <div className="flex items-center justify-between border-t border-slate-850 pt-4">
              <div className="text-left pr-4">
                <span className="text-xs font-bold text-slate-200 block">Rating & Review Prompts (`rating_prompt`)</span>
                <span className="text-[10px] text-brand-text-secondary block">
                  Notify me to rate my co-traveler after a completed ride.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={ratingPrompt} 
                  onChange={toggleRatingPrompt} 
                  disabled={loading}
                  className="sr-only peer" 
                />
                <div className="w-8 h-4.5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-500"></div>
              </label>
            </div>

            {/* Toggle Category D (Unlocked) */}
            <div className="flex items-center justify-between border-t border-slate-850 pt-4">
              <div className="text-left pr-4">
                <span className="text-xs font-bold text-slate-200 block">System Alerts & Updates (`system_alert`)</span>
                <span className="text-[10px] text-brand-text-secondary block">
                  Notify me of general platform announcements and report updates.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={systemAlert} 
                  onChange={toggleSystemAlert} 
                  disabled={loading}
                  className="sr-only peer" 
                />
                <div className="w-8 h-4.5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-500"></div>
              </label>
            </div>

            {/* Toggle Category E (LOCKED SAFETY-CRITICAL) */}
            <div className="flex items-center justify-between border-t border-slate-850 pt-4 opacity-75">
              <div className="text-left pr-4">
                <span className="text-xs font-bold text-slate-250 block">🚨 Emergency SOS dispatch (`safety_alert`)</span>
                <span className="text-[9px] text-rose-400 font-semibold block mt-0.5">
                  Locked: Required for safety policy and emergency services coordination.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-not-allowed select-none">
                <input 
                  type="checkbox" 
                  checked={true} 
                  disabled={true}
                  className="sr-only peer" 
                />
                <div className="w-8 h-4.5 bg-slate-900 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-600 after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-rose-900/50"></div>
              </label>
            </div>

            {/* Toggle Category F (LOCKED SAFETY-CRITICAL) */}
            <div className="flex items-center justify-between border-t border-slate-850 pt-4 opacity-75">
              <div className="text-left pr-4">
                <span className="text-xs font-bold text-slate-250 block">⚠️ Security Incident Alerts (`safety_alert`)</span>
                <span className="text-[9px] text-rose-400 font-semibold block mt-0.5">
                  Locked: Mandatory notification for institutional safety broadcasts.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-not-allowed select-none">
                <input 
                  type="checkbox" 
                  checked={true} 
                  disabled={true}
                  className="sr-only peer" 
                />
                <div className="w-8 h-4.5 bg-slate-900 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-600 after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-rose-900/50"></div>
              </label>
            </div>

          </Card>
        </div>

        {/* 2. LANGUAGE SELECTOR */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Language Settings</h3>
          <Card className="p-4 border-slate-800 space-y-2.5">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-bold text-slate-400">System Language</label>
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-2.5 bg-brand-bg-card border border-slate-850 rounded-xl text-xs md:text-sm text-brand-text-primary outline-none"
              >
                <option value="en">🇺🇸 English (US)</option>
                <option value="hi">🇮🇳 Hindi / हिन्दी</option>
                <option value="te">🇮🇳 Telugu / తెలుగు</option>
              </select>
              <span className="text-[10px] text-brand-text-muted italic">
                * Cosmetic configuration: Current translations fallback to English.
              </span>
            </div>
          </Card>
        </div>

        {/* 3. PHONE NUMBER VISIBILITY PRIVACY */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Privacy & Number Masking</h3>
          <Card className="p-4 border-slate-800 space-y-3.5 text-xs">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400">Phone Visibility Rule</label>
              <select
                value={phoneVisibility}
                onChange={(e) => {
                  setPhoneVisibility(e.target.value);
                  triggerToast(`Privacy updated: Number is now ${e.target.value}.`);
                }}
                className="w-full px-4 py-2.5 bg-brand-bg-card border border-slate-850 rounded-xl text-xs"
              >
                <option value="masked">🛡️ Mask Number (Reveal only on confirmed active match)</option>
                <option value="visible">🌐 Publicly Visible (Any verified user can see mobile)</option>
              </select>
            </div>
            <p className="text-[10px] text-brand-text-secondary leading-relaxed bg-slate-900/50 p-2.5 rounded-xl border border-slate-850/80">
              **Privacy Note**: To prevent spam, your contact phone number is masked with custom masking strings (e.g. `+91 ******3210`) across public lookups until a ride request is accepted by both parties.
            </p>
          </Card>
        </div>

        {/* 4. LINKED DEVICES & SESSIONS */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Linked Devices & Sessions</h3>
          <div className="space-y-2">
            {sessions.map((s) => (
              <Card key={s.id} className="p-4 border-slate-850 bg-slate-900/10 text-xs">
                <div className="flex justify-between items-start">
                  <div className="space-y-1 text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-200">{s.device}</span>
                      {s.current && <Badge variant="success" className="text-[8px] px-1 py-0.5">Active</Badge>}
                    </div>
                    <span className="text-[10px] text-brand-text-secondary block">📍 {s.location}</span>
                    <span className="text-[9px] text-brand-text-muted block font-mono">Status: {s.time}</span>
                  </div>
                  {!s.current && (
                    <button 
                      onClick={() => handleRevokeSession(s.id)}
                      className="text-[10px] font-bold uppercase text-rose-400 hover:text-rose-355 cursor-pointer"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* 5. ACCOUNT DEACTIVATION & LOGOUT */}
        <Card className="p-4 border-red-500/15 bg-red-950/5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="text-left">
              <span className="font-bold text-rose-400 block">Deactivate Account</span>
              <span className="text-[10px] text-brand-text-secondary block">
                Temporarily disable your profile details and listings.
              </span>
            </div>
            <Button 
              onClick={() => setShowDeactivateModal(true)} 
              variant="secondary" 
              className="text-[10px] py-1.5 min-h-[36px] bg-red-950/20 text-rose-400 hover:text-rose-350 hover:bg-red-950/30 border-red-900/30"
            >
              Deactivate Account
            </Button>
          </div>

          <div className="border-t border-slate-900 pt-3 flex justify-between items-center text-xs">
            <span className="text-slate-400 font-semibold">Exit Session</span>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-350 rounded-xl font-bold cursor-pointer transition active:scale-95"
            >
              Log out
            </button>
          </div>
        </Card>

      </main>

      {/* 6. ACCOUNT DEACTIVATION CONFIRMATION DIALOG MODAL */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-50 bg-brand-bg-base/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-sm w-full p-5 border-red-550/20 text-center space-y-4 shadow-2xl">
            <span className="text-3xl block">⚠️</span>
            <div className="space-y-1">
              <h3 className="font-extrabold text-sm text-rose-455 uppercase tracking-wider">Confirm Profile Deactivation?</h3>
              <p className="text-xs text-brand-text-secondary leading-relaxed">
                Are you sure you want to deactivate your Community Ride profile? Other users will not see your rides.
              </p>
            </div>

            {/* Audit Retention Explainer */}
            <div className="bg-slate-900 p-3 rounded-xl border border-red-950/50 text-left text-[10px] text-slate-400 leading-normal space-y-1">
              <span className="text-rose-400 font-bold uppercase tracking-wider block text-[9px]">Data Retention Disclaimer:</span>
              <p>
                In compliance with institutional safety policy, all active ride logs, co-traveler verification links, and emergency incident archives will be retained in security logs for audit purposes before permanent erasure.
              </p>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={handleDeactivateAccount}
                className="flex-1 py-2.5 rounded-lg bg-red-650 hover:bg-red-750 text-white font-extrabold text-xs uppercase tracking-wider cursor-pointer transition"
              >
                Deactivate
              </button>
              <button 
                onClick={() => setShowDeactivateModal(false)}
                className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition"
              >
                Cancel
              </button>
            </div>
          </Card>
        </div>
      )}

      <NavigationBar className="block md:hidden" />
    </div>
  );
}
