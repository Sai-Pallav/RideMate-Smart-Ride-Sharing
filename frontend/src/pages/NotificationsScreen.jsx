import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import ErrorBanner from '../components/ErrorBanner';
import NavigationBar from '../components/NavigationBar';
import { getNotifications, markNotificationRead, markAllRead } from '../api/notifications';

export default function NotificationsScreen() {
  const navigate = useNavigate();

  // Core States
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Dev Toolbar States
  const [forceLoading, setForceLoading] = useState(false);
  const [simulateEmpty, setSimulateEmpty] = useState(false);

  const loadNotifications = async () => {
    setIsLoading(true);
    setErrorText('');
    try {
      const res = await getNotifications();
      // Expecting { data: { notifications: [...] } } or direct array
      const list = res.data?.notifications || res.notifications || res || [];
      setNotifications(list);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setErrorText("Failed to retrieve notifications. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const fetchOnMount = async () => {
      try {
        const res = await getNotifications();
        if (active) {
          const list = res.data?.notifications || res.notifications || res || [];
          setNotifications(list);
        }
      } catch (err) {
        if (active) {
          console.error("Failed to load notifications on mount:", err);
          setErrorText("Failed to retrieve notifications. Please check your connection.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };
    fetchOnMount();
    return () => {
      active = false;
    };
  }, []);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Helper: Format ISO timestamp and return relative time string & group category
  const formatNotificationTime = (isoString) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return { text: 'N/A', category: 'Older Alerts' };

      const now = new Date();
      
      // Same day check
      const isToday = date.toDateString() === now.toDateString();
      
      // Yesterday check
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const isYesterday = date.toDateString() === yesterday.toDateString();

      const timeText = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

      if (isToday) {
        return { text: `Today at ${timeText}`, category: 'Today' };
      } else if (isYesterday) {
        return { text: `Yesterday at ${timeText}`, category: 'Yesterday' };
      } else {
        const dateText = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        return { text: `${dateText} at ${timeText}`, category: 'Older Alerts' };
      }
    } catch {
      return { text: 'N/A', category: 'Older Alerts' };
    }
  };

  const handleNotificationClick = async (id, backendType, metadata) => {
    // 1. Optimistic local state update
    setNotifications((prev) =>
      prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n))
    );

    // 2. Fire backend PUT request without blocking UI
    markNotificationRead(id).catch((err) => {
      console.error("Failed to mark notification as read on backend:", err);
    });

    // 3. Contextual redirects based on backend types
    // Backend types: 'booking_status', 'ride_reminder', 'safety_alert', 'system_alert', 'rating_prompt'
    if (backendType === 'safety_alert') {
      navigate('/safety-center');
    } else if (backendType === 'rating_prompt') {
      // Pass booking and ride metadata to rating screen
      navigate('/rating', {
        state: {
          ride: { ride_id: metadata?.rideId || 1 },
          booking: { booking_id: metadata?.bookingId || 1, role: metadata?.role || 'passenger' }
        }
      });
    } else if (backendType === 'booking_status') {
      if (metadata?.rideId) {
        // If passenger or driver clicks status changes, go to ride-details
        navigate(`/ride-details/${metadata.rideId}`);
      } else {
        navigate('/home');
      }
    } else if (backendType === 'ride_reminder') {
      navigate('/active-ride');
    } else {
      navigate('/home');
    }
  };

  const handleMarkAllRead = async () => {
    // 1. Optimistic local update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    triggerToast('All notifications marked as read.');

    // 2. Fire backend request
    try {
      await markAllRead();
    } catch (err) {
      console.error("Failed to mark all as read on backend:", err);
    }
  };

  // Grouping notifications by relative day based on parsed created_at
  const groupNotifications = (list) => {
    const today = [];
    const yesterday = [];
    const older = [];

    list.forEach((n) => {
      const { text, category } = formatNotificationTime(n.created_at);
      const itemWithTime = { ...n, formattedTime: text };

      if (category === 'Today') {
        today.push(itemWithTime);
      } else if (category === 'Yesterday') {
        yesterday.push(itemWithTime);
      } else {
        older.push(itemWithTime);
      }
    });

    return [
      { title: 'Today', items: today },
      { title: 'Yesterday', items: yesterday },
      { title: 'Older Alerts', items: older }
    ].filter((group) => group.items.length > 0);
  };

  const activeList = simulateEmpty ? [] : notifications;
  const grouped = groupNotifications(activeList);
  const showSkeletons = isLoading || forceLoading;

  const getNotificationIcon = (backendType) => {
    // Maps backend notification_type to mock categories
    // safety_alert -> safety
    // booking_status / ride_reminder -> booking
    // rating_prompt -> rating
    // system_alert -> system
    switch (backendType) {
      case 'safety_alert':
        return (
          <span className="p-2.5 rounded-full bg-brand-safety/15 border border-brand-safety/20 text-brand-safety block">
            🚨
          </span>
        );
      case 'booking_status':
      case 'ride_reminder':
        return (
          <span className="p-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 block">
            📅
          </span>
        );
      case 'rating_prompt':
        return (
          <span className="p-2.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 block">
            ⭐
          </span>
        );
      case 'system_alert':
      default:
        return (
          <span className="p-2.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 block">
            ℹ️
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg-base text-brand-text-primary font-sans flex flex-col pb-24 md:pb-6">
      
      {/* Dev Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap gap-2 items-center justify-between text-xs">
        <span className="font-bold text-indigo-400">🔧 DEV TOOLBAR:</span>
        <div className="flex gap-2">
          <button 
            onClick={() => setForceLoading(!forceLoading)} 
            className={`px-2 py-1 rounded font-semibold transition cursor-pointer ${forceLoading ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
          >
            {forceLoading ? 'Disable Skeletons' : 'Simulate Skeletons'}
          </button>
          <button 
            onClick={() => setSimulateEmpty(!simulateEmpty)} 
            className={`px-2 py-1 rounded font-semibold transition cursor-pointer ${simulateEmpty ? 'bg-rose-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
          >
            {simulateEmpty ? 'Disable Empty' : 'Force Empty State'}
          </button>
          <button 
            onClick={loadNotifications} 
            className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold transition cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>

      <NavigationBar className="relative z-10" />

      {toastMsg && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 border border-indigo-500/30 text-indigo-300 px-4 py-2.5 rounded-xl shadow-2xl text-xs md:text-sm font-semibold animate-bounce">
          {toastMsg}
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
            <h2 className="text-sm font-bold text-slate-200">Alert Center</h2>
          </div>
          {activeList.some(n => !n.is_read) && (
            <button 
              onClick={handleMarkAllRead}
              className="text-[10px] font-black uppercase text-indigo-400 hover:text-indigo-300 transition cursor-pointer select-none border-none bg-transparent"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-lg mx-auto w-full px-4 pt-6 flex-1 text-left">
        
        {errorText && (
          <ErrorBanner 
            message={errorText} 
            onRetry={loadNotifications} 
          />
        )}

        {showSkeletons ? (
          <div className="space-y-6">
            <div>
              <div className="h-3 w-16 bg-slate-800 rounded animate-pulse mb-3" />
              <SkeletonLoader variant="avatar-row" count={2} />
            </div>
            <div>
              <div className="h-3 w-20 bg-slate-800 rounded animate-pulse mb-3" />
              <SkeletonLoader variant="avatar-row" count={1} />
            </div>
          </div>
        ) : activeList.length === 0 ? (
          <EmptyState
            title="All Caught Up!"
            description="You don't have any notifications or alerts right now. We will keep you updated when commutes update."
            icon={<span>🔔</span>}
          />
        ) : (
          <div className="space-y-6">
            {grouped.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-3">
                
                {/* Section header */}
                <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-brand-text-muted select-none pl-1">
                  {group.title}
                </h3>

                {/* Notifications items in group */}
                <div className="space-y-2">
                  {group.items.map((n) => {
                    const isSafety = n.notification_type === 'safety_alert';
                    
                    return (
                      <div 
                        key={n.notification_id}
                        onClick={() => handleNotificationClick(n.notification_id, n.notification_type, n.metadata)}
                        className={`
                          w-full p-4 rounded-2xl border transition duration-200 cursor-pointer flex gap-3 text-left relative overflow-hidden active:scale-99
                          ${isSafety 
                            ? 'bg-red-500/10 border-red-500/20 hover:border-red-500/30 border-l-4 border-l-brand-safety' 
                            : 'bg-brand-bg-card border-slate-850 hover:border-slate-800 hover:bg-slate-900/40'
                          }
                        `}
                      >
                        {/* Left Icon */}
                        <div className="shrink-0">{getNotificationIcon(n.notification_type)}</div>

                        {/* Title & Message */}
                        <div className="flex-1 min-w-0 pr-4">
                          <h4 className={`text-xs font-bold ${isSafety ? 'text-rose-400' : 'text-slate-200'}`}>
                            {n.title}
                          </h4>
                          <p className="text-xs text-brand-text-secondary leading-relaxed mt-1">
                            {n.body}
                          </p>
                          <span className="text-[9px] text-brand-text-muted font-bold font-mono mt-1.5 block">
                            {n.formattedTime}
                          </span>
                        </div>

                        {/* Unread indicator dot */}
                        {!n.is_read && (
                          <span className="absolute top-4 right-4 h-2.5 w-2.5 rounded-full bg-indigo-500 shrink-0 shadow-lg"></span>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>
            ))}
          </div>
        )}

      </main>

      <NavigationBar className="block md:hidden" />
    </div>
  );
}
