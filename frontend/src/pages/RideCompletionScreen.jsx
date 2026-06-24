import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import NavigationBar from '../components/NavigationBar';

export default function RideCompletionScreen() {
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize state directly from location state or sessionStorage to avoid synchronous setState inside useEffect
  const [rideData] = useState(() => {
    let ride = location.state?.ride;
    if (!ride) {
      const cached = sessionStorage.getItem('activeBooking');
      if (cached) {
        ride = JSON.parse(cached);
      }
    }
    return ride || null;
  });

  const [bookingData] = useState(() => {
    let booking = location.state?.booking;
    if (!booking) {
      const cached = sessionStorage.getItem('activeBooking');
      if (cached) {
        booking = JSON.parse(cached);
      }
    }
    return booking || null;
  });

  useEffect(() => {
    if (!rideData && !bookingData) {
      navigate('/home', { replace: true });
    }
  }, [rideData, bookingData, navigate]);

  if (!rideData || !bookingData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const role = bookingData.role || 'passenger';
  const coTravelerName = role === 'driver' ? (bookingData.passenger_name || 'Passenger') : (bookingData.driver_name || 'Aditya Sharma');
  const coTravelerRating = role === 'driver' ? 4.9 : (bookingData.driver_rating || 4.8);
  const totalCost = bookingData.cost_share || bookingData.calculated_cost_share || 45;
  const distance = rideData.estimated_distance_km || rideData.distance_traveled_km || 10;
  
  // Calculate carbon savings (approx 0.12 kg CO2 per km saved by carpooling)
  const co2Saved = (parseFloat(distance) * 0.12).toFixed(2);

  return (
    <div className="min-h-screen bg-brand-bg-base text-brand-text-primary font-sans flex flex-col pb-24 md:pb-6 relative overflow-hidden">
      
      {/* Decorative premium gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <NavigationBar className="relative z-10" />

      <main className="max-w-lg mx-auto w-full px-4 pt-8 flex-1 flex flex-col justify-center space-y-6 z-10 text-left">
        
        {/* Success Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-3xl animate-bounce">
            🎉
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent">
              Commute Completed!
            </h2>
            <p className="text-xs text-brand-text-secondary">
              Thank you for sharing your ride and reducing your campus carbon footprint.
            </p>
          </div>
        </div>

        {/* Premium Ride Summary Card */}
        <Card elevated={true} className="border-indigo-550/20 bg-slate-900/50 p-6 space-y-5">
          <div className="flex justify-between items-center pb-3 border-b border-slate-800">
            <div>
              <span className="text-[10px] text-brand-text-muted font-black uppercase tracking-wider block">Completed Commute</span>
              <span className="text-xs font-bold text-slate-350 font-mono mt-0.5 block">Ride ID: #{rideData.ride_id}</span>
            </div>
            <Badge variant="success">MUTUALLY CONFIRMED</Badge>
          </div>

          {/* Route Grid */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/80 text-xs space-y-3">
            <div className="flex items-start gap-2.5">
              <span className="text-emerald-500 text-[10px] mt-0.5">🟢</span>
              <div>
                <span className="text-[9px] text-brand-text-muted font-bold uppercase block tracking-wider">Pickup Point</span>
                <span className="font-semibold text-slate-200 mt-0.5 block">{bookingData.pickup_label || rideData.source_label}</span>
              </div>
            </div>
            <div className="pl-1.5 border-l border-dashed border-slate-800 h-3 ml-1"></div>
            <div className="flex items-start gap-2.5">
              <span className="text-rose-500 text-[10px] mt-0.5">🔴</span>
              <div>
                <span className="text-[9px] text-brand-text-muted font-bold uppercase block tracking-wider">Dropoff Point</span>
                <span className="font-semibold text-slate-200 mt-0.5 block">{bookingData.drop_label || rideData.destination_label}</span>
              </div>
            </div>
          </div>

          {/* Savings & Distance Row */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-850">
              <span className="text-[8px] text-brand-text-muted font-bold uppercase block tracking-wider">Cost Share</span>
              <span className="text-base font-black text-indigo-400 mt-1 block">₹{totalCost}</span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-850">
              <span className="text-[8px] text-brand-text-muted font-bold uppercase block tracking-wider">Distance</span>
              <span className="text-base font-black text-slate-200 mt-1 block">{distance} km</span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-850">
              <span className="text-[8px] text-brand-text-muted font-bold uppercase block tracking-wider">CO₂ Saved</span>
              <span className="text-base font-black text-emerald-400 mt-1 block">{co2Saved} kg</span>
            </div>
          </div>

          {/* Co-Traveler Details */}
          <div className="flex items-center justify-between p-3.5 bg-slate-900/30 border border-slate-850 rounded-xl">
            <div className="flex items-center gap-3">
              <Avatar name={coTravelerName} size="sm" className="border border-slate-700" />
              <div className="text-left">
                <span className="text-[9px] text-brand-text-muted font-bold uppercase block tracking-wider">
                  {role === 'driver' ? 'Passenger' : 'Commute Driver'}
                </span>
                <span className="font-bold text-sm text-slate-250 block mt-0.5">{coTravelerName}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-850">
              <span className="text-amber-500 text-xs">⭐</span>
              <span className="text-xs font-black text-slate-200">{coTravelerRating}</span>
            </div>
          </div>
        </Card>

        {/* Actions Section */}
        <div className="space-y-3 pt-2">
          <div className="text-center">
            <p className="text-xs text-brand-text-secondary">
              Rate your co-traveler to maintain trustworthy community scores.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              id="btn-rate-now"
              onClick={() => navigate('/rating', { state: { ride: rideData, booking: bookingData } })}
              className="w-full py-3 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-brand-glow rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
            >
              ⭐ Rate Co-Traveler Now
            </Button>
            <Button
              id="btn-rate-later"
              onClick={() => navigate('/home')}
              variant="secondary"
              className="w-full py-3 text-xs font-bold text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white rounded-xl flex items-center justify-center gap-1.5 cursor-pointer bg-transparent"
            >
              Rate Later / Skip
            </Button>
          </div>

          <div className="text-center pt-2">
            <button
              onClick={() => navigate(`/report-center?rideId=${rideData.ride_id}`)}
              className="text-[10px] text-slate-500 hover:text-rose-400 underline font-bold uppercase tracking-wider transition cursor-pointer"
            >
              ⚠️ Dispute Costs or Report an Issue
            </button>
          </div>
        </div>

      </main>

      <NavigationBar className="block md:hidden" />
    </div>
  );
}
