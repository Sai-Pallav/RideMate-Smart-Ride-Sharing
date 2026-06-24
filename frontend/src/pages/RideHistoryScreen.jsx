import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { mockRides } from '../utils/mockRides';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import ErrorBanner from '../components/ErrorBanner';
import NavigationBar from '../components/NavigationBar';
import { getRideHistory, mapBookingToHistoryItem } from '../api/rides';

export default function RideHistoryScreen() {
  const navigate = useNavigate();

  // Core States
  const [history, setHistory] = useState([]);
  const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'driver', 'passenger'
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'week', 'month'
  const [expandedId, setExpandedId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Dev Toolbar States
  const [forceLoading, setForceLoading] = useState(false);
  const [simulateEmpty, setSimulateEmpty] = useState(false);

  const loadHistory = async () => {
    setIsLoading(true);
    setErrorText('');
    try {
      const res = await getRideHistory({ status: 'completed' });
      const bookingsList = res?.data || res || [];
      const mapped = bookingsList.map(mapBookingToHistoryItem);
      setHistory(mapped);
    } catch (err) {
      console.error("Failed to load history:", err);
      setErrorText("Failed to retrieve ride history. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const fetchOnMount = async () => {
      try {
        const res = await getRideHistory({ status: 'completed' });
        if (active) {
          const bookingsList = res?.data || res || [];
          const mapped = bookingsList.map(mapBookingToHistoryItem);
          setHistory(mapped);
        }
      } catch (err) {
        if (active) {
          console.error("Failed to load history on mount:", err);
          setErrorText("Failed to retrieve ride history. Please check your connection.");
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

  // Filter history based on role and dates using useMemo to avoid setState in effect
  const filteredHistory = useMemo(() => {
    if (simulateEmpty) {
      return [];
    }

    let temp = [...history];

    // Role filter
    if (roleFilter !== 'all') {
      temp = temp.filter(item => item.role === roleFilter);
    }

    // Date range filter (using raw_date timestamps)
    if (dateFilter === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      temp = temp.filter(item => {
        if (!item.raw_date) return false;
        const d = new Date(item.raw_date);
        return !isNaN(d.getTime()) && d >= oneWeekAgo;
      });
    } else if (dateFilter === 'month') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      temp = temp.filter(item => {
        if (!item.raw_date) return false;
        const d = new Date(item.raw_date);
        return !isNaN(d.getTime()) && d >= oneMonthAgo;
      });
    }

    return temp;
  }, [history, roleFilter, dateFilter, simulateEmpty]);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleResetDb = () => {
    mockRides.resetHistory();
    loadHistory();
    triggerToast('🔄 History log reset to default.');
  };

  const handleClearAll = () => {
    mockRides.clearAllHistory();
    setHistory([]);
    triggerToast('🗑️ History log cleared.');
  };

  const handleRateRedirect = (entry) => {
    // Navigate to Rating screen with context
    navigate('/rating', {
      state: {
        ride: { ride_id: entry.ride_id, driver_id: entry.role === 'passenger' ? entry.driver_id : null },
        booking: {
          booking_id: entry.history_id,
          role: entry.role,
          passenger_id: entry.role === 'driver' ? entry.passenger_id : null,
          passenger_name: entry.role === 'driver' ? entry.co_traveler_name : null,
          driver_id: entry.role === 'passenger' ? entry.driver_id : null,
          driver_name: entry.role === 'passenger' ? entry.co_traveler_name : null
        }
      }
    });
  };

  const showLoading = isLoading || forceLoading;

  return (
    <div className="min-h-screen bg-brand-bg-base text-brand-text-primary font-sans flex flex-col pb-24 md:pb-6">
      
      {/* Dev Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap gap-2 items-center justify-between text-xs">
        <span className="font-bold text-indigo-400">🔧 DEV TOOLBAR:</span>
        <div className="flex gap-2">
          <button 
            onClick={() => setForceLoading(!forceLoading)} 
            className={`px-2 py-1 rounded font-semibold transition ${forceLoading ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
          >
            {forceLoading ? 'Disable Skeletons' : 'Simulate Skeletons'}
          </button>
          <button 
            onClick={() => setSimulateEmpty(!simulateEmpty)} 
            className={`px-2 py-1 rounded font-semibold transition ${simulateEmpty ? 'bg-rose-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
          >
            {simulateEmpty ? 'Disable Empty' : 'Force Empty State'}
          </button>
          <button 
            onClick={handleResetDb} 
            className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold transition"
          >
            Reset DB
          </button>
          <button 
            onClick={handleClearAll} 
            className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold transition"
          >
            Clear All
          </button>
        </div>
      </div>

      <NavigationBar className="relative z-10" />

      {toastMsg && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 border border-indigo-500/30 text-indigo-300 px-4 py-2.5 rounded-xl shadow-2xl text-xs md:text-sm font-semibold animate-bounce">
          {toastMsg}
        </div>
      )}

      {/* Header Banner */}
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
            <h2 className="text-sm font-bold text-slate-200">Commute Logs</h2>
          </div>
          <Badge variant="success">{filteredHistory.length} Trips</Badge>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="sticky top-0 z-20 bg-brand-bg-base border-b border-slate-850 py-3 shadow-md px-4">
        <div className="max-w-lg mx-auto flex gap-3 items-center justify-between">
          
          {/* Driver / Passenger Role Tabs */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-0.5 shrink-0">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${roleFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              All
            </button>
            <button
              onClick={() => setRoleFilter('driver')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${roleFilter === 'driver' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Driver
            </button>
            <button
              onClick={() => setRoleFilter('passenger')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${roleFilter === 'passenger' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Passenger
            </button>
          </div>

          {/* Date range filter dropdown */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-300 outline-none hover:border-slate-700 transition cursor-pointer"
          >
            <option value="all">📅 All Time</option>
            <option value="week">📅 This Week</option>
            <option value="month">📅 This Month</option>
          </select>

        </div>
      </div>

      <main className="max-w-lg mx-auto w-full px-4 pt-4 flex-1 text-left">
        
        {errorText && (
          <ErrorBanner 
            message={errorText} 
            onRetry={loadHistory} 
          />
        )}

        {showLoading ? (
          <SkeletonLoader variant="card" count={3} />
        ) : filteredHistory.length === 0 ? (
          <EmptyState
            title="No Commutes Found"
            description="You don't have any completed ride history matching these filter rules. Book or share a ride today!"
            icon={<span>🚗</span>}
            actionText="Find a Ride Now"
            onActionClick={() => navigate('/search')}
          />
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((item) => {
              const isPassenger = item.role === 'passenger';
              
              return (
                <Card 
                  key={item.history_id} 
                  className="p-4 space-y-4 hover:border-indigo-500/35 hover:bg-slate-900/10 transition duration-150 cursor-pointer text-left"
                  onClick={() => setExpandedId(expandedId === item.history_id ? null : item.history_id)}
                >
                  
                  {/* Card Header */}
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant={isPassenger ? 'info' : 'success'}>
                        {isPassenger ? 'Passenger' : 'Driver'}
                      </Badge>
                      <span className="text-brand-text-muted font-bold font-mono">ID: #{item.history_id}</span>
                    </div>
                    <span className="font-extrabold text-indigo-400 font-mono">{item.ride_date}</span>
                  </div>

                  {/* Route information */}
                  <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-850 text-xs space-y-1.5">
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5 text-[10px]">🟢</span>
                      <span className="font-semibold text-slate-300 truncate">{item.source_label}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-rose-500 mt-0.5 text-[10px]">🔴</span>
                      <span className="font-semibold text-slate-300 truncate">{item.destination_label}</span>
                    </div>
                  </div>

                  {/* Co-Traveler & Price Recovery row */}
                  <div className="flex items-center justify-between border-t border-slate-850 pt-3">
                    
                    {/* Co-traveler details */}
                    <div className="flex items-center gap-2.5">
                      <Avatar name={item.co_traveler_name} size="sm" />
                      <div>
                        <span className="text-[9px] text-brand-text-muted font-bold uppercase tracking-wider block">
                          {isPassenger ? 'Driver' : 'Passenger(s)'}
                        </span>
                        <span className="font-bold text-xs text-slate-200 block truncate max-w-[120px]">
                          {item.co_traveler_name}
                        </span>
                      </div>
                    </div>

                    {/* Cost recovery spent/earned info */}
                    <div className="text-right">
                      <span className="text-[9px] text-brand-text-muted font-bold uppercase tracking-wider block">
                        {isPassenger ? 'Fuel Share Paid' : 'Fuel Cost Recovered'}
                      </span>
                      <span className={`font-black text-sm block ${isPassenger ? 'text-slate-200' : 'text-emerald-400'}`}>
                        ₹{item.cost.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Rating widget */}
                  <div className="border-t border-slate-850 pt-3 flex justify-between items-center text-xs">
                    <span className="text-brand-text-secondary font-semibold">Tripmate Rating:</span>
                    
                    {item.rating_given !== null ? (
                      <div className="flex items-center gap-1.5 font-bold text-slate-300">
                        <span>⭐</span>
                        <span>{item.rating_given}/5 rated</span>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRateRedirect(item); }}
                        className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 rounded-lg border border-indigo-500/20 font-black tracking-wide text-[10px] uppercase transition cursor-pointer"
                      >
                        Rate Co-Traveler
                      </button>
                    )}
                  </div>

                  {/* 4. EXPANDED DETAIL VIEW ASPECT */}
                  {expandedId === item.history_id && (
                    <div className="border-t border-slate-850 pt-3.5 space-y-3.5 text-xs animate-[fadeIn_0.25s_ease-out]" onClick={(e) => e.stopPropagation()}>
                      
                      {/* Cost Breakdown */}
                      <div className="space-y-1.5 text-left">
                        <span className="text-[10px] text-brand-text-muted font-bold block uppercase tracking-wider">Cost Breakdown</span>
                        <div className="flex justify-between text-slate-400">
                          <span>Base Ride Share Split</span>
                          <span className="font-bold">₹{item.cost.toFixed(2)}</span>
                        </div>
                        {isPassenger && (
                          <>
                            <div className="flex justify-between text-slate-400">
                              <span>Platform Service Fee</span>
                              <span className="font-bold">₹3.00</span>
                            </div>
                            <div className="flex justify-between font-bold text-slate-200 border-t border-slate-900 pt-1.5">
                              <span>Total Spent</span>
                              <span className="text-indigo-400">₹{(item.cost + 3.00).toFixed(2)}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Mutual Ratings */}
                      <div className="grid grid-cols-2 gap-3 text-left pt-3 border-t border-slate-900">
                        <div>
                          <span className="text-[9px] text-brand-text-muted font-bold block uppercase tracking-wider">Rating Given</span>
                          <span className="font-bold text-slate-350 mt-0.5 block">
                            {item.rating_given !== null ? `⭐ ${item.rating_given}/5` : "Unrated ⚠️"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-brand-text-muted font-bold block uppercase tracking-wider">Rating Received</span>
                          <span className="font-bold text-slate-350 mt-0.5 block">
                            ⭐ {(item.co_traveler_rating - 0.1).toFixed(1)}/5
                          </span>
                        </div>
                      </div>

                      {/* Co-Traveler Profile Link */}
                      <div className="pt-2 border-t border-slate-900 flex justify-end">
                        <Link 
                          to={`/public-profile/${item.role === 'passenger' ? item.driver_id : item.passenger_id}`}
                          className="text-[10px] uppercase font-black text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1 select-none"
                        >
                          View {item.co_traveler_name}'s Profile ➔
                        </Link>
                      </div>

                    </div>
                  )}

                </Card>
              );
            })}
          </div>
        )}

      </main>

      <NavigationBar className="block md:hidden" />
    </div>
  );
}
