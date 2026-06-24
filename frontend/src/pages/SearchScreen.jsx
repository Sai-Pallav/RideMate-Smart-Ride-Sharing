import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getEmergencyContacts } from '../api/profile';
import Button from '../components/Button';
import Card from '../components/Card';
import InputField from '../components/InputField';
import ErrorBanner from '../components/ErrorBanner';
import NavigationBar from '../components/NavigationBar';
import { resolveLocation } from '../utils/geoLookup';

// TODO: replace with real geocoding when Maps API is integrated
const getCoordinatesForLabel = (label) => {
  const resolved = resolveLocation(label);
  return resolved 
    ? { latitude: resolved.latitude, longitude: resolved.longitude } 
    : { latitude: 37.7749, longitude: -122.4194 };
};


export default function SearchScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: contacts, isLoading: contactsLoading } = useQuery({
    queryKey: ['profile', 'emergency-contacts'],
    queryFn: getEmergencyContacts,
    retry: false
  });

  useEffect(() => {
    if (!contactsLoading && contacts) {
      const contactList = Array.isArray(contacts) ? contacts : (contacts.data || []);
      if (contactList.length === 0) {
        alert('⚠️ Safety Rule: You must configure at least one emergency contact before searching or participating in commutes.');
        navigate('/safety-center');
      }
    }
  }, [contacts, contactsLoading, navigate]);

  // Parse query params to initial state if any
  const queryParams = new URLSearchParams(location.search);
  const initialPickup = queryParams.get('pickup') || '';
  const initialDrop = queryParams.get('drop') || '';

  // Core Form States
  const [pickup, setPickup] = useState(initialPickup);
  const [drop, setDrop] = useState(initialDrop);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('08:30');

  // Autocomplete Suggestions State
  const [activeInput, setActiveInput] = useState(null); // 'pickup' or 'drop'

  // Loading & Error States
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isErrorSimulated, setIsErrorSimulated] = useState(false);

  // List of mock campus/city locations
  const locationsDb = [
    'Academic Block A',
    'Metro Station Terminal 2',
    'Main Campus Gate 1',
    'Tech Park Cluster B',
    'IT Park Gate 3',
    'Downtown Residential Hub',
    'South Suburban Complex',
    'Central Library',
    'Boys Hostel Block C',
    'Girls Hostel Block A',
    'Sports Arena Main Entrance'
  ];

  // Filter locations list based on typing (calculated during render to prevent state warning)
  const pickupSuggestions = pickup.trim().length > 1
    ? locationsDb.filter(loc => 
        loc.toLowerCase().includes(pickup.toLowerCase()) && loc.toLowerCase() !== pickup.toLowerCase()
      )
    : [];

  const dropSuggestions = drop.trim().length > 1
    ? locationsDb.filter(loc => 
        loc.toLowerCase().includes(drop.toLowerCase()) && loc.toLowerCase() !== drop.toLowerCase()
      )
    : [];

  // Saved routes quick-select data
  const savedRoutes = [
    { label: 'Campus ➔ Metro', source: 'Academic Block A', destination: 'Metro Station Terminal 2' },
    { label: 'Gate 1 ➔ Tech Park', source: 'Main Campus Gate 1', destination: 'Tech Park Cluster B' },
    { label: 'Library ➔ IT Park', source: 'Central Library', destination: 'IT Park Gate 3' }
  ];

  const handleSelectSuggestion = (type, value) => {
    if (type === 'pickup') {
      setPickup(value);
    } else {
      setDrop(value);
    }
    setActiveInput(null);
  };

  const handleSavedRoute = (route) => {
    setIsGeocoding(true);
    setErrorMsg('');
    setTimeout(() => {
      setPickup(route.source);
      setDrop(route.destination);
      setIsGeocoding(false);
    }, 600);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!pickup.trim()) {
      setErrorMsg('Please specify a pickup location.');
      return;
    }
    if (!drop.trim()) {
      setErrorMsg('Please specify a drop-off destination.');
      return;
    }
    if (pickup.trim().toLowerCase() === drop.trim().toLowerCase()) {
      setErrorMsg('Pickup and drop-off locations cannot be the same.');
      return;
    }

    if (isErrorSimulated) {
      setErrorMsg('Location resolution failed. Unable to map routing waypoints. Please check input text.');
      return;
    }

    // Geocoding simulation
    setIsGeocoding(true);
    setTimeout(() => {
      setIsGeocoding(false);

      // TODO: replace with real geocoding when Maps API is integrated
      const pickupCoords = getCoordinatesForLabel(pickup);
      const dropCoords = getCoordinatesForLabel(drop);

      const searchParams = {
        pickup_location: pickupCoords,
        drop_location: dropCoords,
        pickup_label: pickup,
        drop_label: drop,
        ride_date: date,
        preferred_time: time.length === 5 ? `${time}:00` : time
      };

      sessionStorage.setItem('lastSearch', JSON.stringify(searchParams));

      navigate(`/search-results?pickup=${encodeURIComponent(pickup)}&drop=${encodeURIComponent(drop)}&date=${date}&time=${time}`);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-brand-bg-base text-brand-text-primary font-sans flex flex-col pb-24 md:pb-6">
      
      {/* Dev Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap gap-2 items-center justify-between text-xs">
        <span className="font-bold text-indigo-400">🔧 DEV TOOLBAR:</span>
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={() => setIsErrorSimulated(!isErrorSimulated)} 
            className={`px-2 py-1 rounded font-semibold transition ${isErrorSimulated ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
          >
            {isErrorSimulated ? 'Simulate Geocode Error: ON' : 'Simulate Geocode Error: OFF'}
          </button>
        </div>
      </div>

      <NavigationBar className="relative z-10" />

      <main className="max-w-lg mx-auto w-full px-4 pt-6 space-y-6 flex-1 flex flex-col justify-between">
        
        <div className="space-y-5">
          <header className="space-y-1">
            <h2 className="text-xl font-extrabold tracking-tight text-brand-text-primary">Plan Your Commute</h2>
            <p className="text-xs text-brand-text-secondary">Specify locations and time to match with community drivers.</p>
          </header>

          {errorMsg && (
            <ErrorBanner 
              message={errorMsg} 
              onRetry={isErrorSimulated ? () => setIsErrorSimulated(false) : undefined}
            />
          )}

          {/* Search Form Card */}
          <Card className="p-4 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Pickup field with autocomplete */}
              <div className="relative">
                <InputField
                  label="🟢 Pickup Location"
                  placeholder="e.g. Academic Block A"
                  value={pickup}
                  onChange={(e) => { setPickup(e.target.value); setActiveInput('pickup'); }}
                  onFocus={() => setActiveInput('pickup')}
                  required
                />
                {activeInput === 'pickup' && pickupSuggestions.length > 0 && (
                  <ul className="absolute z-30 w-full mt-1.5 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
                    {pickupSuggestions.map((s, idx) => (
                      <li 
                        key={idx}
                        onClick={() => handleSelectSuggestion('pickup', s)}
                        className="px-4 py-2.5 hover:bg-indigo-950/40 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer transition"
                      >
                        📍 {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Drop-off field with autocomplete */}
              <div className="relative">
                <InputField
                  label="🔴 Drop-Off Destination"
                  placeholder="e.g. Metro Station Terminal 2"
                  value={drop}
                  onChange={(e) => { setDrop(e.target.value); setActiveInput('drop'); }}
                  onFocus={() => setActiveInput('drop')}
                  required
                />
                {activeInput === 'drop' && dropSuggestions.length > 0 && (
                  <ul className="absolute z-30 w-full mt-1.5 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
                    {dropSuggestions.map((s, idx) => (
                      <li 
                        key={idx}
                        onClick={() => handleSelectSuggestion('drop', s)}
                        className="px-4 py-2.5 hover:bg-indigo-950/40 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer transition"
                      >
                        📍 {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Date & Time Picker Group */}
              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="📅 Departure Date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
                <InputField
                  label="🕒 Departs Around"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>

              {/* Saved routes quick-select */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary select-none block">
                  Quick Select Saved Routes
                </span>
                <div className="flex flex-wrap gap-2">
                  {savedRoutes.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSavedRoute(r)}
                      className="px-2.5 py-1.5 bg-slate-900 border border-slate-850 hover:border-indigo-500/40 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-200 transition cursor-pointer"
                    >
                      ★ {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary Submit Button */}
              <Button type="submit" loading={isGeocoding} className="w-full font-bold">
                Calculate Match Matches
              </Button>
            </form>
          </Card>
        </div>

        {/* 2. Interactive Route Map Preview (CSS Graphic) */}
        <div className="space-y-2 mt-4">
          <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-brand-text-secondary">
            <span>Route Map Visualizer</span>
            <span className="text-[10px] text-brand-text-muted font-normal lowercase italic">(Static Stand-in Preview)</span>
          </div>

          <div className="h-44 w-full bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden flex items-center justify-center shadow-inner">
            {/* Grid Pattern Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.05),rgba(255,255,255,0))]"></div>
            <div className="absolute inset-0 opacity-15" style={{ 
              backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', 
              backgroundSize: '16px 16px' 
            }}></div>

            {/* When pickup and drop are filled, show polyline preview */}
            {pickup && drop ? (
              <div className="absolute inset-0 flex flex-col justify-between p-6">
                
                {/* SVG Route Visualization */}
                <svg className="absolute inset-0 h-full w-full pointer-events-none p-6">
                  {/* Dotted Route Line */}
                  <path 
                    d="M 50,90 Q 150,20 280,90" 
                    fill="none" 
                    stroke="#6366f1" 
                    strokeWidth="3" 
                    strokeDasharray="6,4" 
                    className="animate-[dash_5s_linear_infinite]"
                  />
                  {/* Animated Dot representing Car */}
                  <circle r="5" fill="#f43f5e">
                    <animateMotion 
                      dur="4s" 
                      repeatCount="indefinite" 
                      path="M 50,90 Q 150,20 280,90" 
                    />
                  </circle>
                </svg>

                <div className="flex justify-between items-center w-full z-10">
                  <div className="bg-brand-bg-card/90 border border-emerald-500/20 backdrop-blur px-3 py-1.5 rounded-lg text-[10px] shadow-lg max-w-[45%]">
                    <span className="block font-bold text-emerald-400 truncate">Start</span>
                    <span className="block text-brand-text-secondary truncate font-semibold">{pickup}</span>
                  </div>
                  
                  <div className="bg-brand-bg-card/90 border border-rose-500/20 backdrop-blur px-3 py-1.5 rounded-lg text-[10px] shadow-lg max-w-[45%] text-right">
                    <span className="block font-bold text-rose-400 truncate">Destination</span>
                    <span className="block text-brand-text-secondary truncate font-semibold">{drop}</span>
                  </div>
                </div>

                {/* Micro distance display */}
                <div className="self-center bg-slate-950/80 px-3 py-1 border border-slate-800 rounded-full text-[10px] font-bold text-indigo-300 shadow-md">
                  🛣️ Route overlay computed: ~10.5 km
                </div>

              </div>
            ) : (
              <div className="text-center p-6 space-y-2 z-10">
                <span className="text-2xl">🗺️</span>
                <p className="text-xs text-brand-text-secondary font-medium max-w-[200px]">
                  Fill in the route details above to display the path mapping preview.
                </p>
              </div>
            )}
          </div>
        </div>

      </main>

      <NavigationBar className="block md:hidden" />
    </div>
  );
}
