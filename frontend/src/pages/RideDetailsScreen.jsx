import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { getRideById } from '../api/rides';
import { createBooking } from '../api/bookings';
import { getEmergencyContacts } from '../api/profile';
import Button from '../components/Button';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import RatingDisplay from '../components/RatingDisplay';
import ErrorBanner from '../components/ErrorBanner';
import NavigationBar from '../components/NavigationBar';

export default function RideDetailsScreen() {
  const location = useLocation();
  const navigate = useNavigate();

  // Parse ride ID and parameters
  const queryParams = new URLSearchParams(location.search);
  const rideId = queryParams.get('id') || '1';
  const pickupParam = queryParams.get('pickup') || '';
  const dropParam = queryParams.get('drop') || '';

  // Core States
  const currentUser = useAuthStore((s) => s.user);
  const [isMapLoading, setIsMapLoading] = useState(false);
  const [toastMsg] = useState('');

  // Dev Toolbar States
  const [forceFullyBooked, setForceFullyBooked] = useState(false);

  // Read mapped ride from router state or fall back to sessionStorage
  const [initialRide] = useState(() => {
    if (location.state?.ride) {
      sessionStorage.setItem('selectedRide', JSON.stringify(location.state.ride));
      return location.state.ride;
    }
    const saved = sessionStorage.getItem('selectedRide');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  // If no ride is found anywhere, redirect to search
  useEffect(() => {
    if (!initialRide) {
      navigate('/search', { replace: true });
    }
  }, [initialRide, navigate]);

  // Fetch Ride Details via TanStack Query
  const { data: rideResponse, isLoading: isRideLoading, error: rideError } = useQuery({
    queryKey: ['rides', rideId],
    queryFn: () => getRideById(rideId),
    initialData: initialRide ? { data: initialRide } : undefined,
    enabled: !!rideId && !!initialRide
  });

  // Fetch emergency contacts
  const { data: contactsData } = useQuery({
    queryKey: ['profile', 'emergency-contacts'],
    queryFn: getEmergencyContacts,
  });

  const contacts = Array.isArray(contactsData) ? contactsData : (contactsData?.data || []);

  const ride = rideResponse?.data || initialRide;

  // Booking Join Mutation
  const bookingMutation = useMutation({
    queryKey: ['bookings', 'create'],
    mutationFn: createBooking,
    onSuccess: (res) => {
      toast.success(res.message || 'Join request submitted! Awaiting driver approval.');
      navigate('/home');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to submit join request.');
    }
  });

  const handleRequestJoin = () => {
    if (!ride) return;

    // Resolve labels and coordinates from sessionStorage lastSearch
    const lastSearchStr = sessionStorage.getItem('lastSearch');
    let pickupLocation = ride.source_location;
    let dropLocation = ride.destination_location;
    let pickupLabel = pickupParam || ride.source_label;
    let dropLabel = dropParam || ride.destination_label;

    if (lastSearchStr) {
      try {
        const lastSearch = JSON.parse(lastSearchStr);
        pickupLocation = lastSearch.pickup_location || pickupLocation;
        dropLocation = lastSearch.drop_location || dropLocation;
        pickupLabel = lastSearch.pickup_label || pickupLabel;
        dropLabel = lastSearch.drop_label || dropLabel;
      } catch (e) {
        console.error('Failed to parse lastSearch from sessionStorage', e);
      }
    }

    bookingMutation.mutate({
      ride_id: parseInt(rideId, 10),
      pickup_label: pickupLabel,
      pickup_location: pickupLocation,
      pickup_lat: pickupLocation?.latitude,
      pickup_lng: pickupLocation?.longitude,
      drop_label: dropLabel,
      drop_location: dropLocation,
      drop_lat: dropLocation?.latitude,
      drop_lng: dropLocation?.longitude,
      preferred_time: ride.departure_time
    });
  };

  const showRideLoading = isRideLoading && !initialRide;

  if (showRideLoading) {
    return (
      <div className="min-h-screen bg-brand-bg-base text-brand-text-primary flex flex-col justify-center items-center pb-24 md:pb-6">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500"></div>
      </div>
    );
  }

  if ((rideError && !initialRide) || !ride) {
    return (
      <div className="min-h-screen bg-brand-bg-base text-brand-text-primary flex flex-col justify-between pb-24 md:pb-6">
        <NavigationBar />
        <main className="max-w-lg mx-auto w-full px-4 pt-12 text-center space-y-4">
          <ErrorBanner message="Requested ride details could not be found or has expired." />
          <Button onClick={() => navigate('/home')} variant="secondary">Back to Home</Button>
        </main>
      </div>
    );
  }

  // Determine fully booked status
  const isFullyBooked = ride.available_seats === 0 || forceFullyBooked;

  // Cost splits
  const baseCost = ride.estimated_total_cost / (ride.total_seats || 3);
  const platformFee = 3.00;
  const totalCost = baseCost + platformFee;

  const driverName = ride.driver?.full_name || ride.driver_name || 'Driver';
  const driverRating = ride.driver?.rating || ride.driver_rating || 4.8;
  const driverVerified = ride.driver_verified || true;
  const vehicleName = ride.vehicle ? `${ride.vehicle.color} ${ride.vehicle.make} ${ride.vehicle.model}` : (ride.vehicle_name || 'Vehicle');

  return (
    <div className="min-h-screen bg-brand-bg-base text-brand-text-primary font-sans flex flex-col pb-24 md:pb-6">
      
      {/* Dev Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap gap-2 items-center justify-between text-xs">
        <span className="font-bold text-indigo-400">🔧 DEV TOOLBAR:</span>
        <div className="flex gap-2">
          <button 
            onClick={() => setForceFullyBooked(!forceFullyBooked)} 
            className={`px-2 py-1 rounded font-semibold transition ${forceFullyBooked ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
          >
            {forceFullyBooked ? 'Force Fully Booked: ON' : 'Force Fully Booked'}
          </button>
          <button 
            onClick={() => {
              setIsMapLoading(true);
              setTimeout(() => setIsMapLoading(false), 1500);
            }} 
            className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold transition"
          >
            Simulate Map Loading
          </button>
        </div>
      </div>

      <NavigationBar className="relative z-10" />

      {/* Toast notifications */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 border border-indigo-500/30 text-indigo-300 px-4 py-2.5 rounded-xl shadow-2xl text-xs md:text-sm font-semibold animate-bounce">
          {toastMsg}
        </div>
      )}

      {/* Back Header */}
      <div className="bg-slate-900/60 border-b border-slate-850 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition"
          >
            <span>🡐</span> Back
          </button>
          <span className="text-slate-600">|</span>
          <span className="text-xs font-bold text-slate-300">Ride ID: {ride.ride_id}</span>
        </div>
      </div>

      <main className="max-w-lg mx-auto w-full px-4 pt-6 space-y-6 flex-1">
        
        {/* Fully Booked Banner Warning */}
        {isFullyBooked && (
          <ErrorBanner message="This ride has become fully booked. The driver has accepted other request slots." />
        )}
              {/* 1. Driver Profile Summary Card */}
        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-3.5">
            <Avatar name={driverName} size="lg" className="border border-slate-800" />
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-extrabold text-brand-text-primary truncate">{driverName}</h3>
                {driverVerified && (
                  <Badge variant="success" className="px-1.5 py-0.5 text-[8px]">Verified Member</Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                <RatingDisplay rating={driverRating} size="sm" />
                <span className="text-slate-500 text-xs">•</span>
                <span className="text-xs text-brand-text-secondary font-bold">124 completed rides</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-850 text-left text-xs">
            <div>
              <span className="text-brand-text-muted font-bold block uppercase tracking-wider text-[9px]">Vehicle Offered</span>
              <span className="font-bold text-slate-200 mt-0.5 block">
                {vehicleName}
              </span>
            </div>
            <div>
              <span className="text-brand-text-muted font-bold block uppercase tracking-wider text-[9px]">Verification Rating</span>
              <span className="font-bold text-indigo-400 mt-0.5 block">
                98% Safety Score
              </span>
            </div>
          </div>
        </Card>

        {/* 2. Route map canvas stand-in */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary text-left">Ride Route Waypoints</h3>
          
          <div className="h-48 w-full bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden flex items-center justify-center shadow-inner">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.06),rgba(255,255,255,0))]"></div>
            <div className="absolute inset-0 opacity-15" style={{ 
              backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', 
              backgroundSize: '16px 16px' 
            }}></div>

            {isMapLoading ? (
              <div className="text-center space-y-2 z-10">
                <svg className="animate-spin h-6 w-6 text-indigo-500 mx-auto" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fetching Map Tiles...</p>
              </div>
            ) : (
              <div className="absolute inset-0 p-5 flex flex-col justify-between text-left">
                
                {/* SVG Polyline route overlay */}
                <svg className="absolute inset-0 h-full w-full pointer-events-none p-5">
                  <path d="M 60,140 C 130,50 200,50 300,120" fill="none" stroke="#6366f1" strokeWidth="3.5" />
                  <circle cx="60" cy="140" r="6" fill="#10b981" />
                  <circle cx="300" cy="120" r="6" fill="#f43f5e" />
                </svg>

                <div className="flex justify-between items-start z-10 w-full">
                  <div className="bg-brand-bg-card/90 border border-slate-800 px-3 py-1.5 rounded-lg text-[10px] max-w-[45%]">
                    <span className="text-emerald-400 font-bold block">Pickup Point</span>
                    <span className="font-semibold text-slate-300 truncate block mt-0.5">{ride.source_label}</span>
                  </div>
                  <div className="bg-brand-bg-card/90 border border-slate-800 px-3 py-1.5 rounded-lg text-[10px] max-w-[45%] text-right">
                    <span className="text-rose-400 font-bold block">Drop Point</span>
                    <span className="font-semibold text-slate-300 truncate block mt-0.5">{ride.destination_label}</span>
                  </div>
                </div>

                <div className="z-10 bg-slate-950/80 px-3 py-1 border border-slate-800 rounded-full text-[9px] font-bold text-slate-400 self-center shadow-md">
                  🚘 Estimated Commute: {ride.estimated_distance_km} km ({ride.departure_time} departure)
                </div>

              </div>
            )}
          </div>
        </div>

        {/* 3. Cost Breakdown Display */}
        <div className="space-y-2 text-left">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Cost Share Breakdown</h3>
          <Card className="p-4 space-y-3 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Fuel & Vehicle Share</span>
              <span className="font-bold text-slate-200">₹{baseCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Community Platform Fee</span>
              <span className="font-bold text-slate-200">₹{platformFee.toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-850 pt-2.5 flex justify-between text-sm font-extrabold">
              <span className="text-brand-text-primary">Your Total Payment</span>
              <span className="text-emerald-400">₹{totalCost.toFixed(2)}</span>
            </div>
          </Card>
        </div>

        {/* 4. Ride Preferences Badges */}
        <div className="space-y-2 text-left">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Driver Commute Preferences</h3>
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">
              👥 Gender: {ride.preferences?.gender === 'female_only' ? 'Females Only' : 'Co-Ed / Open'}
            </Badge>
            <Badge variant={ride.preferences?.smoking ? 'danger' : 'success'}>
              🚭 Smoking: {ride.preferences?.smoking ? 'Allowed' : 'No Smoking'}
            </Badge>
            <Badge variant="info">
              💼 Luggage: {ride.preferences?.luggage || 'None'}
            </Badge>
            <Badge variant="success">
              ⚡ Instant Approval
            </Badge>
          </div>
        </div>

        {/* Sticky request button spacing */}
        <div className="h-10"></div>

      </main>

      {/* Sticky Bottom Actions Bar */}
      <div className="fixed bottom-0 md:bottom-auto md:relative left-0 right-0 z-40 bg-brand-bg-card/95 backdrop-blur border-t border-slate-850 px-4 py-3 md:py-4 flex justify-between items-center max-w-lg mx-auto shadow-2xl">
        <div className="text-left">
          <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Split Payment</span>
          <span className="text-lg font-black text-emerald-400">₹{totalCost.toFixed(2)}</span>
        </div>

        {ride.driver_id === (currentUser?.user_id || currentUser?.id) ? (
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider px-4 py-2.5 border border-indigo-500/20 bg-indigo-950/20 rounded-xl">
            You are the driver of this ride
          </span>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-end gap-1">
            <span className="text-[9px] text-rose-500 font-bold uppercase tracking-wider">
              ⚠️ Contact Required in Safety Center
            </span>
            <Button
              disabled={true}
              className="px-6 text-xs font-black bg-slate-800 text-slate-500 border border-slate-850 cursor-not-allowed min-h-[44px]"
            >
              Request Locked
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleRequestJoin}
            disabled={isFullyBooked}
            loading={bookingMutation.isPending}
            className={`px-8 font-black ${isFullyBooked ? 'bg-slate-800 text-slate-500 border border-slate-850 hover:bg-slate-800' : ''}`}
          >
            {isFullyBooked ? 'Fully Booked' : 'Request to Join'}
          </Button>
        )}
      </div>

      <NavigationBar className="block md:hidden" />
    </div>
  );
}
