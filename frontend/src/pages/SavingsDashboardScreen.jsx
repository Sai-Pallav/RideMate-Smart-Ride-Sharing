import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import NavigationBar from '../components/NavigationBar';
import SkeletonLoader from '../components/SkeletonLoader';
import ErrorBanner from '../components/ErrorBanner';
import { getMyAnalytics } from '../api/analytics';

export default function SavingsDashboardScreen() {
  const navigate = useNavigate();

  // Core States
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState('');

  // Dev Toolbar States
  const [simulateEmpty, setSimulateEmpty] = useState(false);

  const loadAnalytics = async () => {
    setIsLoading(true);
    setErrorText('');
    try {
      const res = await getMyAnalytics();
      const data = res?.data || res || null;
      setAnalyticsData(data);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
      setErrorText("Failed to retrieve impact data. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const fetchAnalytics = async () => {
      try {
        const res = await getMyAnalytics();
        if (active) {
          setAnalyticsData(res?.data || res || null);
        }
      } catch (err) {
        if (active) {
          console.error("Failed to fetch analytics on mount:", err);
          setErrorText("Failed to retrieve impact data. Please check your connection.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };
    fetchAnalytics();
    return () => {
      active = false;
    };
  }, []);

  const activeData = simulateEmpty
    ? {
        total_rides: 0,
        total_fuel_saved_liters: 0,
        total_co2_avoided_kg: 0,
        total_cost_saved: 0,
        total_distance_shared_km: 0
      }
    : (analyticsData || {
        total_rides: 0,
        total_fuel_saved_liters: 0,
        total_co2_avoided_kg: 0,
        total_cost_saved: 0,
        total_distance_shared_km: 0
      });

  const totalRides = activeData.total_rides;
  const totalCostSaved = activeData.total_cost_saved;
  const totalFuelSavedLiters = activeData.total_fuel_saved_liters;
  const totalCo2SavedKg = activeData.total_co2_avoided_kg;

  // Tree sapling equivalence (approx 1 young sapling offsets 5 kg of CO2 per year)
  const treesEquivalent = Math.round(totalCo2SavedKg / 5) || (totalRides > 0 ? 1 : 0);

  return (
    <div className="min-h-screen bg-brand-bg-base text-brand-text-primary font-sans flex flex-col pb-24 md:pb-6">
      
      {/* Dev Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap gap-2 items-center justify-between text-xs">
        <span className="font-bold text-indigo-400">🔧 DEV TOOLBAR:</span>
        <div className="flex gap-2">
          <button 
            onClick={() => setSimulateEmpty(!simulateEmpty)} 
            className={`px-2 py-1 rounded font-semibold transition cursor-pointer ${simulateEmpty ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
          >
            {simulateEmpty ? 'Disable Empty' : 'Force Empty State'}
          </button>
          <button 
            onClick={loadAnalytics} 
            className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold transition cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>

      <NavigationBar className="relative z-10" />



      {/* Screen Header */}
      <div className="bg-slate-900/60 border-b border-slate-850 px-4 py-3.5">
        <div className="max-w-lg mx-auto flex items-center gap-3 text-left">
          <button 
            onClick={() => navigate(-1)} 
            className="text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1 cursor-pointer transition"
          >
            <span>🡐</span> Back
          </button>
          <span className="text-slate-600">|</span>
          <h2 className="text-sm font-bold text-slate-200">Impact Dashboard</h2>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-lg mx-auto w-full px-4 pt-6 flex-1 space-y-6">
        
        {errorText && (
          <ErrorBanner 
            message={errorText} 
            onRetry={loadAnalytics} 
          />
        )}

        {isLoading ? (
          <SkeletonLoader variant="card" count={2} />
        ) : totalRides === 0 ? (
          /* Encouraging Zero State Dashboard */
          <div className="space-y-6 text-center">
            
            {/* Zero State Stats display */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3 text-center">
                <span className="text-brand-text-muted text-[9px] font-bold block uppercase tracking-wider">Cash Saved</span>
                <span className="text-slate-400 font-extrabold text-sm block mt-1">₹0.00</span>
              </Card>
              <Card className="p-3 text-center">
                <span className="text-brand-text-muted text-[9px] font-bold block uppercase tracking-wider">Fuel Saved</span>
                <span className="text-slate-400 font-extrabold text-sm block mt-1">0.0 L</span>
              </Card>
              <Card className="p-3 text-center">
                <span className="text-brand-text-muted text-[9px] font-bold block uppercase tracking-wider">CO₂ Saved</span>
                <span className="text-slate-400 font-extrabold text-sm block mt-1">0.0 kg</span>
              </Card>
            </div>

            {/* Zero state encouragement card */}
            <Card className="p-6 border-indigo-500/20 bg-gradient-to-b from-slate-900 to-indigo-950/10 space-y-4">
              <span className="text-4xl block">🌱</span>
              <h3 className="text-base font-extrabold text-brand-text-primary">Your Savings Journey Starts Here</h3>
              <p className="text-xs text-brand-text-secondary leading-relaxed max-w-xs mx-auto">
                Every commute you share saves money on fuel, reduces campus traffic congestion, and avoids carbon emissions. Complete your first ride to begin tracking your impact!
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <Button onClick={() => navigate('/search')} className="text-xs font-bold py-2.5 rounded-xl cursor-pointer">
                  Book a Shared Ride
                </Button>
                <Button onClick={() => navigate('/create-ride')} variant="secondary" className="text-xs font-bold py-2.5 rounded-xl border-slate-800 text-slate-400 cursor-pointer">
                  Offer a Commute Seat
                </Button>
              </div>
            </Card>

            {/* Zero state monthly graph visualizer */}
            <Card className="p-4 border-slate-850">
              <h4 className="text-[10px] text-brand-text-secondary font-bold uppercase tracking-wider text-left mb-3">
                Monthly Savings Progression
              </h4>
              <div className="h-28 w-full bg-slate-900/40 border border-slate-850 rounded-xl flex items-center justify-center">
                <p className="text-[10px] text-brand-text-muted italic max-w-xs">
                  Your monthly savings trend line will populate here once you complete a commute.
                </p>
              </div>
            </Card>

          </div>
        ) : (
          /* Populated Impact Dashboard */
          <div className="space-y-6 text-left">
            
            {/* Headline Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-4 border-slate-800 shadow-md">
                <span className="text-brand-text-secondary text-[10px] font-bold block uppercase tracking-wider">Cash Saved</span>
                <span className="text-emerald-400 font-black text-lg block mt-1.5">₹{totalCostSaved.toFixed(0)}</span>
                <span className="text-[9px] text-brand-text-muted mt-1.5 block">vs. taxi fare</span>
              </Card>

              <Card className="p-4 border-slate-800 shadow-md">
                <span className="text-brand-text-secondary text-[10px] font-bold block uppercase tracking-wider">Fuel Saved</span>
                <span className="text-indigo-400 font-black text-lg block mt-1.5">{totalFuelSavedLiters.toFixed(1)} L</span>
                <span className="text-[9px] text-brand-text-muted mt-1.5 block">via ride sharing</span>
              </Card>

              <Card className="p-4 border-slate-800 shadow-md">
                <span className="text-brand-text-secondary text-[10px] font-bold block uppercase tracking-wider">CO₂ Saved</span>
                <span className="text-indigo-400 font-black text-lg block mt-1.5">{totalCo2SavedKg.toFixed(1)} kg</span>
                <span className="text-[9px] text-brand-text-muted mt-1.5 block">offset weight</span>
              </Card>
            </div>

            {/* Total rides count summary */}
            <div className="bg-slate-900/40 border border-slate-850 px-4 py-3 rounded-2xl flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span>🛣️</span>
                <span className="font-semibold text-slate-300">Total Commutes Completed:</span>
              </div>
              <Badge variant="success">{totalRides} Rides</Badge>
            </div>

            {/* Comparison framing card */}
            <Card className="relative p-5 overflow-hidden border-emerald-500/20 bg-gradient-to-br from-slate-900 to-emerald-950/15">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl"></div>
              <div className="flex items-start gap-4">
                <span className="text-3xl p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl block">
                  🌲
                </span>
                <div className="space-y-1.5">
                  <h4 className="text-sm font-extrabold text-emerald-400 uppercase tracking-wide">Green Community Equivalence</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Your shared commutes saved <span className="font-bold text-emerald-400">{totalFuelSavedLiters.toFixed(1)} liters</span> of fuel, which is equivalent to planting <span className="font-bold text-emerald-400">{treesEquivalent} young tree sapling(s)</span> and supporting campus green spaces.
                  </p>
                </div>
              </div>
            </Card>

            {/* Savings Trend Chart Placeholder */}
            <Card className="p-4 border-slate-850">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold text-brand-text-secondary uppercase tracking-wider">
                  Commute Savings Trend (Last 6 Months)
                </h4>
                <span className="text-[9px] text-brand-text-muted font-bold uppercase tracking-wider">
                  Trend data coming soon
                </span>
              </div>
              <div className="h-28 w-full bg-slate-900/40 border border-slate-850 rounded-xl flex items-center justify-center">
                <p className="text-[10px] text-brand-text-muted italic">
                  Monthly trend visualization will populate here in a future update.
                </p>
              </div>
            </Card>

          </div>
        )}

      </main>

      <NavigationBar className="block md:hidden" />
    </div>
  );
}
