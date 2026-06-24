import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getBookings, cancelBooking, confirmCompleteBooking } from '../api/bookings';
import { triggerSOS } from '../api/safety';
import useAuthStore from '../store/authStore';
import Button from '../components/Button';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import SkeletonLoader from '../components/SkeletonLoader';
import ErrorBanner from '../components/ErrorBanner';
import NavigationBar from '../components/NavigationBar';

export default function HomeScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, clearAuth } = useAuthStore((s) => ({ user: s.user, clearAuth: s.clearAuth }));

  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [devAdminBypass, setDevAdminBypass] = useState(
    () => localStorage.getItem('devAdminBypass') === 'true'
  );

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Listen for redirect error state
  useEffect(() => {
    if (location.state?.error) {
      const errMsg = location.state.error;
      setTimeout(() => {
        triggerToast(errMsg);
        window.history.replaceState({}, document.title);
      }, 0);
    }
  }, [location]);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: allBookings, isLoading: bookingsLoading, isError: bookingsError, refetch: refetchBookings } = useQuery({
    queryKey: ['bookings', 'all'],
    queryFn: () => getBookings(),
    select: (data) => data?.data || data || [],
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeBooking = allBookings
    ? allBookings.find(b => {
        const isConfirmedOrScheduled = b.status === 'confirmed' || b.status === 'scheduled';
        const rideDate = new Date(b.ride_date);
        return isConfirmedOrScheduled && rideDate >= today;
      })
    : null;

  const recentActivities = allBookings
    ? allBookings
        .filter(b => b.status === 'completed')
        .sort((a, b) => new Date(b.ride_date) - new Date(a.ride_date))
        .slice(0, 3)
    : [];


  // ── Mutations ─────────────────────────────────────────────────────────────
  const cancelMutation = useMutation({
    mutationFn: cancelBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Booking cancelled.');
    },
    onError: () => toast.error('Failed to cancel booking.'),
  });

  const completeMutation = useMutation({
    mutationFn: confirmCompleteBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['rides', 'history'] });
      toast.success('🎉 Commute marked complete!');
      setTimeout(() => navigate('/ride-history'), 1000);
    },
    onError: () => toast.error('Could not mark complete. Try again.'),
  });

  const sosMutation = useMutation({
    mutationFn: triggerSOS,
    onSuccess: () => toast.error('🚨 SOS Triggered! Emergency services notified.', { duration: 6000 }),
    onError: () => toast.error('SOS failed. Call emergency services directly.'),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleQuickSearch = (e) => {
    e.preventDefault();
    if (!pickup.trim() && !drop.trim()) {
      triggerToast('Please enter pickup or drop location');
      return;
    }
    navigate(`/search-results?pickup=${encodeURIComponent(pickup)}&drop=${encodeURIComponent(drop)}`);
  };

  const handleSavedRouteClick = (route) => {
    navigate(`/search-results?pickup=${encodeURIComponent(route.source)}&drop=${encodeURIComponent(route.destination)}`);
  };

  const handleCancelBooking = () => {
    if (!activeBooking) return;
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      cancelMutation.mutate(activeBooking.booking_id);
    }
  };

  const handleCompleteRide = () => {
    if (!activeBooking) return;
    if (window.confirm('Confirm that you have completed this commute?')) {
      completeMutation.mutate(activeBooking.booking_id);
    }
  };

  const handleSOS = () => {
    if (!activeBooking) return;
    sosMutation.mutate({
      booking_id: activeBooking.booking_id,
      ride_id: activeBooking.ride_id,
    });
  };

  const toggleAdminBypass = () => {
    const next = !devAdminBypass;
    setDevAdminBypass(next);
    localStorage.setItem('devAdminBypass', String(next));
    triggerToast(next ? '🔑 Admin Bypass Enabled' : '🔒 Admin Bypass Disabled');
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  // TODO: wire to saved routes endpoint (not yet implemented in backend)
  const savedRoutes = [
    { source: 'Academic Block A', destination: 'Metro Station Terminal 2', label: 'Campus ➔ Metro' },
    { source: 'Main Campus Gate 1', destination: 'Tech Park Cluster B', label: 'Gate 1 ➔ Tech Park' },
    { source: 'IT Park Gate 3', destination: 'Downtown Residential Hub', label: 'IT Park ➔ Downtown' },
  ];

  const displayName = user?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-brand-bg-base text-brand-text-primary font-sans flex flex-col pb-24 md:pb-6">

      {/* Dev Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap gap-2 items-center justify-between text-xs">
        <span className="font-bold text-indigo-400">🔧 DEV:</span>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={toggleAdminBypass}
            className={`px-2 py-1 rounded font-semibold transition ${devAdminBypass ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
          >
            {devAdminBypass ? 'Admin Bypass: ON' : 'Admin Bypass: OFF'}
          </button>
          <Link to="/admin" className="px-2 py-1 rounded font-semibold bg-purple-700 hover:bg-purple-600 text-white transition text-center">
            🛡️ Admin Panel
          </Link>
          <button onClick={handleLogout} className="px-2 py-1 rounded font-semibold bg-rose-900/50 hover:bg-rose-800/50 text-rose-300 transition">
            Logout
          </button>
        </div>
      </div>

      <NavigationBar className="relative z-10" />

      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 border border-indigo-500/30 text-indigo-300 px-4 py-2.5 rounded-xl shadow-2xl text-xs md:text-sm font-semibold animate-bounce">
          {toastMsg}
        </div>
      )}

      <main className="max-w-lg mx-auto w-full px-4 pt-6 space-y-6 flex-1">

        {/* Welcome Header */}
        <div className="flex justify-between items-center bg-slate-900/40 p-4 rounded-2xl border border-slate-800/50">
          <div className="space-y-1 text-left">
            <h2 className="text-xl font-bold tracking-tight">Hi, {displayName} 👋</h2>
            <div className="flex items-center gap-3 pt-1">
              <Link to="/notifications" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold transition">
                <span>🔔</span> Alerts
              </Link>
              <span className="text-slate-800">|</span>
              <Link to="/savings" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold transition">
                <span>🌱</span> Impact
              </Link>
            </div>
          </div>
          <Link to="/profile">
            <Avatar name={displayName} size="md" className="border-2 border-indigo-500/20 hover:border-indigo-500 transition duration-150" />
          </Link>
        </div>

        {/* Active Booking Card */}
        {bookingsLoading ? (
          <SkeletonLoader variant="card" count={1} />
        ) : bookingsError ? (
          <ErrorBanner
            message="Failed to load active booking details."
            onRetry={refetchBookings}
          />
        ) : activeBooking ? (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1.5 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-rose-500"></span>
              Active Commute Booking
            </h3>
            <Card elevated={true} className="border-rose-500/30 shadow-2xl relative overflow-visible">
              <div className="bg-slate-900/80 px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="success">{activeBooking.status === 'ongoing' ? 'Ongoing' : 'Confirmed'}</Badge>
                  <span className="text-[10px] text-brand-text-muted font-bold font-mono">ID: {activeBooking.booking_id}</span>
                </div>
                <div className="text-xs font-semibold text-brand-text-secondary">
                  Ride #{activeBooking.ride_id}
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/80 text-xs space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-indigo-500 mt-0.5">🟢</span>
                    <span className="font-medium">{activeBooking.pickup_label || activeBooking.source_label || 'Pickup'}</span>
                  </div>
                  <div className="pl-1 border-l-2 border-dashed border-slate-800 h-2 ml-1"></div>
                  <div className="flex items-start gap-2">
                    <span className="text-rose-500 mt-0.5">🔴</span>
                    <span className="font-medium">{activeBooking.dropoff_label || activeBooking.destination_label || 'Drop-off'}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <Button
                    onClick={handleCompleteRide}
                    disabled={completeMutation.isPending}
                    loading={completeMutation.isPending}
                    className="w-full py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md flex items-center justify-center gap-1.5"
                  >
                    ✔️ Confirm Completion
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSOS}
                      disabled={sosMutation.isPending}
                      variant="sos"
                      className="flex-1 py-2 text-xs"
                    >
                      🚨 Emergency SOS
                    </Button>
                    <Button
                      onClick={handleCancelBooking}
                      disabled={cancelMutation.isPending}
                      variant="secondary"
                      className="px-4 text-xs font-bold text-slate-400 border-slate-800 hover:border-rose-900/30 hover:text-rose-400 hover:bg-rose-950/10"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ) : null}

        {/* Quick Search */}
        <Card className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-wider text-brand-text-secondary">Quick Find a Ride</h3>
            <Link to="/search" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
              Advanced Search <span>➔</span>
            </Link>
          </div>
          <form onSubmit={handleQuickSearch} className="space-y-3">
            <div className="space-y-2">
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-xs">🟢</span>
                <input
                  type="text"
                  placeholder="Where from? (Pickup location)"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-xl text-xs md:text-sm text-brand-text-primary outline-none transition"
                />
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-xs">🔴</span>
                <input
                  type="text"
                  placeholder="Where to? (Drop-off location)"
                  value={drop}
                  onChange={(e) => setDrop(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-xl text-xs md:text-sm text-brand-text-primary outline-none transition"
                />
              </div>
            </div>
            <Button type="submit" className="w-full font-bold">Find Commute Matches</Button>
          </form>
        </Card>

        {/* Saved Routes */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Saved Routes</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {savedRoutes.map((route, i) => (
              <button
                key={i}
                onClick={() => handleSavedRouteClick(route)}
                className="shrink-0 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition duration-200 active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>📍</span>{route.label}
              </button>
            ))}
          </div>
        </div>

        {/* Offer a Ride CTA */}
        <Card className="relative p-5 overflow-hidden border-indigo-500/20 bg-gradient-to-br from-slate-900 to-indigo-950/20 shadow-md">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
          <div className="relative z-10 space-y-3.5 text-left">
            <Badge variant="info">Driver Flow</Badge>
            <h3 className="text-base font-extrabold text-brand-text-primary">Offering a ride today?</h3>
            <p className="text-xs text-brand-text-secondary leading-relaxed max-w-sm">
              Publish your commute route, pick up verified co-travelers, and split fuel costs easily.
            </p>
            <Button
              onClick={() => navigate('/create-ride')}
              className="font-bold text-xs bg-indigo-600 hover:bg-indigo-700 border-none shadow-brand-glow min-h-[38px] px-4 rounded-lg"
            >
              Publish a Ride Route
            </Button>
          </div>
        </Card>

        {/* Recent Activity Feed */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Recent Commute Feed</h3>
          {bookingsLoading ? (
            <SkeletonLoader variant="card" count={2} />
          ) : bookingsError ? (
            <ErrorBanner
              message="Failed to load recent activity feed."
              onRetry={refetchBookings}
            />
          ) : recentActivities.length === 0 ? (
            <div className="bg-slate-900/30 border border-slate-800/80 border-dashed rounded-2xl p-6 text-center space-y-3">
              <span className="text-3xl block">👋</span>
              <h4 className="font-bold text-sm">Welcome to the Community!</h4>
              <p className="text-xs text-brand-text-secondary max-w-xs mx-auto leading-relaxed">
                You haven't completed any rides yet. Search for a route or offer a seat.
              </p>
              <div className="flex justify-center gap-2 pt-1.5">
                <Button onClick={() => navigate('/search')} variant="secondary" className="text-xs min-h-[36px] px-3.5 rounded-lg">Search Rides</Button>
                <Button onClick={() => navigate('/create-ride')} variant="secondary" className="text-xs min-h-[36px] px-3.5 rounded-lg">Offer Ride</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {recentActivities.map((act, i) => (
                <Card key={act.ride_id || act.booking_id || i} className="p-3.5 hover:border-slate-700 transition duration-200">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-slate-500"></span>
                      <span className="font-bold text-slate-300">
                        {act.source_label || act.pickup_label} ➔ {act.destination_label || act.dropoff_label}
                      </span>
                    </div>
                    <span className="text-brand-text-muted font-bold font-mono">
                      {act.ride_date ? new Date(act.ride_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-slate-850 text-xs">
                    <span className="text-brand-text-secondary">
                      {act.status === 'completed' ? '✅ Completed' : act.status}
                    </span>
                    {act.cost_share && (
                      <div className="font-bold text-indigo-400">₹{act.cost_share} split</div>
                    )}
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
