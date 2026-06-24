import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getBookings, acceptBooking, declineBooking } from '../api/bookings';
import { getPublicProfile } from '../api/profile';
import { mapBookingToRequestCard } from '../api/rides';
import Button from '../components/Button';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import RatingDisplay from '../components/RatingDisplay';
import ErrorBanner from '../components/ErrorBanner';
import NavigationBar from '../components/NavigationBar';

export default function RideRequestsScreen() {
  const navigate = useNavigate();

  // Core States
  const [loadingCardId, setLoadingCardId] = useState(null);
  const [failedCardIds, setFailedCardIds] = useState({});

  // Dev Toolbar States
  const [forceFail, setForceFail] = useState(false);

  // Fetch pending booking requests for this driver with passenger profiles
  const { data: bookingsData, refetch } = useQuery({
    queryKey: ['bookings', 'driver', 'pending'],
    queryFn: async () => {
      const response = await getBookings({ role: 'driver', status: 'pending' });
      const bookings = response?.data || [];
      const uniquePassengerIds = [...new Set(bookings.map(b => b.passenger_id).filter(Boolean))];
      
      const profilesMap = {};
      await Promise.all(
        uniquePassengerIds.map(async (id) => {
          try {
            const profileRes = await getPublicProfile(id);
            if (profileRes?.data) {
              profilesMap[id] = profileRes.data;
            }
          } catch (e) {
            console.error(`[RideRequestsScreen] Failed to fetch profile for passenger ${id}:`, e);
          }
        })
      );
      
      const bookingsWithProfiles = bookings.map(b => ({
        ...b,
        passengerProfile: profilesMap[b.passenger_id] || null
      }));
      
      return {
        ...response,
        data: bookingsWithProfiles
      };
    }
  });

  const rawBookings = bookingsData?.data || [];

  // Map backend format to component layout interface to prevent editing JSX
  const requests = rawBookings.map(mapBookingToRequestCard);

  const acceptMutation = useMutation({
    mutationFn: acceptBooking,
    onMutate: (bookingId) => {
      setLoadingCardId(bookingId);
    },
    onSuccess: () => {
      toast.success('Request accepted successfully!');
      refetch();
    },
    onError: (err, bookingId) => {
      toast.error(err.response?.data?.message || 'Failed to accept request.');
      setFailedCardIds(prev => ({
        ...prev,
        [bookingId]: { status: 'accepted', msg: err.response?.data?.message || 'Database update failed.' }
      }));
    },
    onSettled: () => {
      setLoadingCardId(null);
    }
  });

  const declineMutation = useMutation({
    mutationFn: declineBooking,
    onMutate: (bookingId) => {
      setLoadingCardId(bookingId);
    },
    onSuccess: () => {
      toast.success('Request declined.');
      refetch();
    },
    onError: (err, bookingId) => {
      toast.error(err.response?.data?.message || 'Failed to decline request.');
      setFailedCardIds(prev => ({
        ...prev,
        [bookingId]: { status: 'declined', msg: err.response?.data?.message || 'Database update failed.' }
      }));
    },
    onSettled: () => {
      setLoadingCardId(null);
    }
  });

  const handleAction = (requestId, status) => {
    if (forceFail) {
      setFailedCardIds(prev => ({
        ...prev,
        [requestId]: { status, msg: 'Simulated Write failure.' }
      }));
      toast.error('Simulated failure occurred.');
      return;
    }

    // Clear previous error for this card
    if (failedCardIds[requestId]) {
      setFailedCardIds(prev => {
        const copy = { ...prev };
        delete copy[requestId];
        return copy;
      });
    }

    if (status === 'accepted') {
      acceptMutation.mutate(requestId);
    } else {
      declineMutation.mutate(requestId);
    }
  };

  const handleResetDb = () => {
    refetch();
    setFailedCardIds({});
    toast.success('Requests list refreshed.');
  };

  const handleClearAll = () => {
    toast.error('Clear all requests is not supported on live database.');
  };

  // Group requests by ride_id / ride_route
  const groupedRequests = requests.reduce((acc, req) => {
    const key = `${req.ride_id}-${req.ride_route}-${req.ride_time}`;
    if (!acc[key]) {
      acc[key] = {
        rideId: req.ride_id,
        route: req.ride_route,
        time: req.ride_time,
        items: []
      };
    }
    acc[key].items.push(req);
    return acc;
  }, {});

  const groupKeys = Object.keys(groupedRequests);

  return (
    <div className="min-h-screen bg-brand-bg-base text-brand-text-primary font-sans flex flex-col pb-24 md:pb-6">
      
      {/* Dev Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap gap-2 items-center justify-between text-xs">
        <span className="font-bold text-indigo-400">🔧 DEV TOOLBAR:</span>
        <div className="flex gap-2">
          <button 
            onClick={() => setForceFail(!forceFail)} 
            className={`px-2 py-1 rounded font-semibold transition ${forceFail ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
          >
            {forceFail ? 'Simulate Action Failures: ON' : 'Force Action Failures'}
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
            <h2 className="text-sm font-bold text-slate-200">Join Requests</h2>
          </div>
          <Badge variant="info">{requests.length} Pending</Badge>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-lg mx-auto w-full px-4 pt-6 flex-1 space-y-6">
        
        {groupKeys.length === 0 ? (
          /* Empty Requests State */
          <div className="bg-slate-900/30 border border-slate-800/80 border-dashed rounded-2xl p-8 text-center space-y-4 max-w-md mx-auto mt-8">
            <span className="text-4xl block">📬</span>
            <h3 className="text-base font-bold text-brand-text-primary">No Pending Requests</h3>
            <p className="text-xs text-brand-text-secondary leading-relaxed">
              All co-traveler requests have been processed. Share another ride route to collect new commuter bookings.
            </p>
            <Button 
              onClick={() => navigate('/home')} 
              variant="secondary" 
              className="text-xs min-h-[38px] px-4 rounded-xl"
            >
              Back to Home Commute
            </Button>
          </div>
        ) : (
          /* Grouped list of ride requests */
          <div className="space-y-6 text-left">
            {groupKeys.map((groupKey) => {
              const group = groupedRequests[groupKey];
              return (
                <div key={groupKey} className="space-y-3">
                  {/* Group Header (Ride Info) */}
                  <div className="flex justify-between items-center border-l-2 border-indigo-500 pl-2.5">
                    <div>
                      <span className="text-[9px] text-brand-text-muted font-bold block uppercase tracking-wider">YOUR ROUTE</span>
                      <h4 className="text-xs font-bold text-slate-200 truncate max-w-[260px] md:max-w-xs">{group.route}</h4>
                    </div>
                    <span className="text-xs font-semibold text-indigo-400 bg-slate-900 border border-slate-850 px-2 py-1 rounded-lg">
                      ⏰ {group.time}
                    </span>
                  </div>

                  {/* List of passenger cards for this route */}
                  <div className="space-y-3">
                    {group.items.map((req) => {
                      const isProcessing = loadingCardId === req.request_id;
                      const hasFailed = failedCardIds[req.request_id];
                      
                      return (
                        <Card key={req.request_id} className="p-4 space-y-4 relative overflow-hidden">
                          {/* Processing loading mask */}
                          {isProcessing && (
                            <div className="absolute inset-0 bg-brand-bg-card/70 backdrop-blur-xs flex items-center justify-center z-10">
                              <svg className="animate-spin h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            </div>
                          )}

                          {/* Profile row */}
                          <div className="flex items-center gap-3">
                            <Avatar src={req.passenger_photo} name={req.passenger_name} size="md" className="border border-slate-850" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h5 className="font-bold text-sm text-slate-200 truncate">{req.passenger_name}</h5>
                                {req.passenger_verified && (
                                  <Badge variant="success" className="px-1.5 py-0.5 text-[8px]">Verified</Badge>
                                )}
                              </div>
                              <RatingDisplay rating={req.passenger_rating} size="sm" className="mt-0.5" />
                            </div>
                          </div>

                          {/* Pickup / drop segment details */}
                          <div className="bg-slate-900/40 border border-slate-850 p-2.5 rounded-xl text-xs space-y-2">
                            <div className="flex items-start gap-2">
                              <span className="text-emerald-500 text-[10px] mt-0.5">🟢</span>
                              <p className="text-slate-300 font-semibold truncate">
                                Pickup: <span className="text-slate-400 font-normal">{req.pickup_point}</span>
                              </p>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-rose-500 text-[10px] mt-0.5">🔴</span>
                              <p className="text-slate-300 font-semibold truncate">
                                Drop-off: <span className="text-slate-400 font-normal">{req.drop_point}</span>
                              </p>
                            </div>
                          </div>

                          {/* Inline retry failure alert */}
                          {hasFailed && (
                            <ErrorBanner 
                              message={hasFailed.msg}
                              onRetry={() => handleAction(req.request_id, hasFailed.status)}
                              className="py-2.5 px-3 border-none bg-red-950/20 text-rose-300 text-xs"
                            />
                          )}

                          {/* Accept / Decline actions */}
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleAction(req.request_id, 'accepted')}
                              disabled={isProcessing}
                              className="flex-1 text-xs py-2 min-h-[38px] rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700"
                            >
                              Accept Request
                            </Button>
                            <Button
                              onClick={() => handleAction(req.request_id, 'declined')}
                              disabled={isProcessing}
                              variant="secondary"
                              className="px-4 text-xs py-2 min-h-[38px] rounded-xl font-bold border-slate-850 hover:bg-slate-800 text-slate-400"
                            >
                              Decline
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

      <NavigationBar className="block md:hidden" />
    </div>
  );
}
