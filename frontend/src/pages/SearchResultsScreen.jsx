import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchRides, mapSearchResultToRide } from '../api/rides';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import RatingDisplay from '../components/RatingDisplay';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import ErrorBanner from '../components/ErrorBanner';
import NavigationBar from '../components/NavigationBar';

const locationCoords = {
  'academic block a': { latitude: 37.775, longitude: -122.418 },
  'metro station terminal 2': { latitude: 37.789, longitude: -122.401 },
  'main campus gate 1': { latitude: 37.7749, longitude: -122.4194 },
  'campus main gate': { latitude: 37.7749, longitude: -122.4194 },
  'downtown station': { latitude: 37.7891, longitude: -122.4014 },
  'tech park cluster b': { latitude: 37.785, longitude: -122.405 },
  'it park gate 3': { latitude: 37.783, longitude: -122.408 },
  'central library': { latitude: 37.779, longitude: -122.412 },
  'boys hostel block c': { latitude: 37.776, longitude: -122.415 },
  'girls hostel block a': { latitude: 37.777, longitude: -122.414 },
  'sports arena main entrance': { latitude: 37.781, longitude: -122.411 },
  'science complex': { latitude: 37.783, longitude: -122.408 }
};

const getCoordinatesForLabel = (label) => {
  const norm = (label || '').toLowerCase().trim();
  return locationCoords[norm] || { latitude: 37.7749, longitude: -122.4194 };
};

export default function SearchResultsScreen() {
  const location = useLocation();
  const navigate = useNavigate();

  // Parse query parameters as fallback
  const queryParams = new URLSearchParams(location.search);
  const pickupFallback = queryParams.get('pickup') || '';
  const dropFallback = queryParams.get('drop') || '';
  const dateFallback = queryParams.get('date') || '';
  const timeFallback = queryParams.get('time') || '';

  const [searchParams] = useState(() => {
    const saved = sessionStorage.getItem('lastSearch');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      pickup_location: getCoordinatesForLabel(pickupFallback),
      drop_location: getCoordinatesForLabel(dropFallback),
      pickup_label: pickupFallback,
      drop_label: dropFallback,
      ride_date: dateFallback,
      preferred_time: timeFallback.length === 5 ? `${timeFallback}:00` : timeFallback
    };
  });

  const pickup = searchParams.pickup_label;
  const drop = searchParams.drop_label;

  // Core Screen States
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [isNotificationSubscribed, setIsNotificationSubscribed] = useState(false);

  // Filter States
  const [vehicleFilter, setVehicleFilter] = useState('all'); // 'all', 'car', 'two_wheeler'
  const [ratingFilter, setRatingFilter] = useState('all'); // 'all', '4.5', '4.0'
  const [genderFilter, setGenderFilter] = useState('all'); // 'all', 'female_only'
  const [sortBy, setSortBy] = useState('earliest'); // 'earliest', 'lowest_price', 'distance'

  // Dev Toolbar States
  const [simulateEmpty, setSimulateEmpty] = useState(false);
  const [forceLoading, setForceLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Fetch results based on pickup / drop queries using react-query
  const { data: queryData, isLoading: isLoadingState, isError: isErrorState, refetch: refetchSearch } = useQuery({
    queryKey: ['rides', 'search', searchParams.pickup_label, searchParams.drop_label, searchParams.ride_date, searchParams.preferred_time],
    queryFn: () => searchRides({
      pickup_location: searchParams.pickup_location,
      drop_location: searchParams.drop_location,
      ride_date: searchParams.ride_date,
      preferred_time: searchParams.preferred_time,
      time_window_hours: 2.0
    }),
    enabled: !!searchParams.pickup_label && !!searchParams.drop_label
  });

  const rawResults = queryData?.data?.results || [];
  const results = rawResults.map(mapSearchResultToRide);

  // Apply filters and sorting inline (calculated during render)
  const filteredResults = (() => {
    if (simulateEmpty) {
      return [];
    }

    let temp = [...results];

    // 1. Vehicle Type Filter
    if (vehicleFilter !== 'all') {
      temp = temp.filter(r => r.vehicle_type === vehicleFilter);
    }

    // 2. Rating Filter
    if (ratingFilter !== 'all') {
      const minRating = parseFloat(ratingFilter);
      temp = temp.filter(r => r.driver_rating >= minRating);
    }

    // 3. Gender Preference Filter
    if (genderFilter === 'female_only') {
      temp = temp.filter(r => r.preferences?.gender === 'female_only');
    }

    // 4. Sort Ordering
    temp.sort((a, b) => {
      if (sortBy === 'earliest') {
        return a.departure_time.localeCompare(b.departure_time);
      }
      if (sortBy === 'lowest_price') {
        return a.cost_share - b.cost_share;
      }
      if (sortBy === 'distance') {
        return a.estimated_distance_km - b.estimated_distance_km;
      }
      return 0;
    });

    return temp;
  })();

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleSubscribeNotification = () => {
    setIsNotificationSubscribed(true);
    triggerToast('🔔 Subscription active! We will alert you when a driver matches.');
  };

  const handleCardClick = (rideId) => {
    const selectedRide = results.find(r => r.ride_id === rideId);
    if (selectedRide) {
      sessionStorage.setItem('selectedRide', JSON.stringify(selectedRide));
      navigate(`/ride-details?id=${rideId}&pickup=${encodeURIComponent(pickup)}&drop=${encodeURIComponent(drop)}`, {
        state: { ride: selectedRide }
      });
    }
  };

  const showLoading = isLoadingState || forceLoading;

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
            {forceLoading ? 'Disable Loading: ON' : 'Force Loading Skeletons'}
          </button>
          <button 
            onClick={() => setSimulateEmpty(!simulateEmpty)} 
            className={`px-2 py-1 rounded font-semibold transition ${simulateEmpty ? 'bg-rose-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
          >
            {simulateEmpty ? 'Disable Empty: ON' : 'Force Empty State'}
          </button>
        </div>
      </div>

      <NavigationBar className="relative z-10" />

      {/* Toast message banner */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 border border-indigo-500/30 text-indigo-300 px-4 py-2.5 rounded-xl shadow-2xl text-xs md:text-sm font-semibold animate-bounce">
          {toastMsg}
        </div>
      )}

      {/* Search Header Banner */}
      <div className="bg-slate-900/60 border-b border-slate-850 px-4 py-3.5">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-400">COMMUTE SEARCH PATH</span>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs md:text-sm text-slate-200 font-bold truncate">
              <span className="truncate">{pickup || 'Any pickup'}</span>
              <span className="text-slate-500">➔</span>
              <span className="truncate">{drop || 'Any drop-off'}</span>
            </div>
          </div>
          <Link 
            to={`/search?pickup=${encodeURIComponent(pickup)}&drop=${encodeURIComponent(drop)}`}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-indigo-400 hover:text-indigo-300 font-bold text-xs rounded-lg border border-slate-750 hover:border-slate-700 shrink-0 transition"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* Filters Sticky Bar */}
      <div className="sticky top-0 z-20 bg-brand-bg-base/95 backdrop-blur-md border-b border-slate-850 py-3 shadow-md px-4">
        <div className="max-w-lg mx-auto space-y-3">
          
          {/* Main Filter Chips & Sort Select */}
          <div className="flex gap-2 items-center justify-between">
            
            {/* Vehicle selection filter */}
            <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-0.5">
              <button
                onClick={() => setVehicleFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${vehicleFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                All
              </button>
              <button
                onClick={() => setVehicleFilter('car')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${vehicleFilter === 'car' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                🚗 Car
              </button>
              <button
                onClick={() => setVehicleFilter('two_wheeler')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${vehicleFilter === 'two_wheeler' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                🏍️ Bike
              </button>
            </div>

            {/* List / Map view mode switcher */}
            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 hover:border-slate-700 transition cursor-pointer"
            >
              {viewMode === 'list' ? '🗺️ Map View' : '🗂️ List View'}
            </button>
          </div>

          {/* Advanced filters dropdowns */}
          <div className="grid grid-cols-3 gap-2">
            
            {/* Rating filter dropdown */}
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-[10px] md:text-xs font-bold text-slate-300 outline-none hover:border-slate-700 transition cursor-pointer"
            >
              <option value="all">⭐ All Ratings</option>
              <option value="4.5">⭐ 4.5+ Stars</option>
              <option value="4.0">⭐ 4.0+ Stars</option>
            </select>

            {/* Gender filter dropdown */}
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-[10px] md:text-xs font-bold text-slate-300 outline-none hover:border-slate-700 transition cursor-pointer"
            >
              <option value="all">👥 Any Co-traveler</option>
              <option value="female_only">👩 Female Only</option>
            </select>

            {/* Sorting dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-[10px] md:text-xs font-bold text-slate-300 outline-none hover:border-slate-700 transition cursor-pointer"
            >
              <option value="earliest">🕒 Earliest</option>
              <option value="lowest_price">💰 Lowest Share</option>
              <option value="distance">🛣️ Distance</option>
            </select>
          </div>

        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-lg mx-auto w-full px-4 pt-4 flex-1">
        
        {isErrorState ? (
          <ErrorBanner
            message="Failed to load search matches. Please try again."
            onRetry={refetchSearch}
          />
        ) : showLoading ? (
          <SkeletonLoader variant="card" count={3} />
        ) : viewMode === 'map' ? (
          /* Map Visual Stand-in Overlay */
          <div className="space-y-4">
            <Card className="h-96 w-full bg-slate-900 border border-slate-800 relative overflow-hidden flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.08),rgba(255,255,255,0))]"></div>
              <div className="absolute inset-0 opacity-20" style={{ 
                backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', 
                backgroundSize: '16px 16px' 
              }}></div>
              
              {/* Mock map path markers and route overlays */}
              <div className="absolute inset-0 p-8 flex flex-col justify-between">
                
                {/* SVG Route Line */}
                <svg className="absolute inset-0 h-full w-full pointer-events-none p-8">
                  <path d="M 40,300 C 150,150 180,80 320,40" fill="none" stroke="#6366f1" strokeWidth="4" />
                  
                  {/* Driver pins on map */}
                  {filteredResults.map((ride, idx) => {
                    // Spread drivers along the path
                    const x = 80 + idx * 80;
                    const y = 240 - idx * 70;
                    return (
                      <g key={ride.ride_id} className="animate-pulse">
                        <circle cx={x} cy={y} r="8" fill="#f43f5e" stroke="white" strokeWidth="1.5" />
                        <text x={x + 12} y={y + 4} fill="#94a3b8" fontSize="10" fontWeight="bold">
                          {ride.driver_name.split(' ')[0]}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                <div className="z-10 bg-slate-950/80 border border-slate-850 px-3 py-2 rounded-xl text-center self-center text-xs font-bold text-slate-300">
                  🗺️ Map Search Matches overlaying {filteredResults.length} drivers
                </div>
                
                <div className="z-10 bg-brand-bg-card/90 border border-slate-800 p-3.5 rounded-xl shadow-2xl max-w-sm mt-auto">
                  <p className="text-[10px] text-brand-text-secondary leading-relaxed">
                    Showing route alignments. Tap on the pins or switch back to list view to inspect vehicle details and requests.
                  </p>
                </div>
              </div>
            </Card>

            {/* Small Quick-select bottom list for quick details */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Matched Listings Map Overlay</h3>
              {filteredResults.map(ride => (
                <div 
                  key={ride.ride_id}
                  onClick={() => handleCardClick(ride.ride_id)}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex justify-between items-center cursor-pointer hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar name={ride.driver_name} size="sm" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{ride.driver_name}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <RatingDisplay rating={ride.driver_rating} size="sm" />
                        <span className="text-[9px] text-slate-400 bg-slate-800 px-1 rounded uppercase">{ride.vehicle_type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-emerald-400 block">₹{ride.cost_share}</span>
                    <span className="text-[9px] text-slate-400 block font-semibold">{ride.departure_time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredResults.length === 0 ? (
          /* Empty Search Results State */
          <EmptyState
            title="No Matching Commutes Found"
            description={
              simulateEmpty 
                ? "Simulated empty state: no driver routes match this location/time combo." 
                : "No drivers are currently scheduled for this route. Try editing your departure time window or broadening location tags."
            }
            icon={<span>🔍</span>}
            actionText={isNotificationSubscribed ? "🔔 Subscribed" : "Notify me when a ride matches"}
            onActionClick={isNotificationSubscribed ? undefined : handleSubscribeNotification}
          />
        ) : (
          /* Result Cards Grid List */
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-brand-text-secondary uppercase">
                Showing {filteredResults.length} Matched Commutes
              </span>
              <span className="text-[10px] text-brand-text-muted">Ranked by route overlap</span>
            </div>

            {filteredResults.map((ride) => {
              const isExact = ride.match_scenario === 'exact';
              return (
                <Card 
                  key={ride.ride_id}
                  onClick={() => handleCardClick(ride.ride_id)}
                  className="hover:border-slate-700 hover:shadow-indigo-500/5 hover:-translate-y-0.5 transition duration-200 cursor-pointer text-left"
                >
                  {/* Card Header Info */}
                  <div className="bg-slate-900/60 border-b border-slate-850 px-4 py-2.5 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Badge variant={isExact ? 'success' : 'info'}>
                        {isExact ? 'Exact Route' : 'Joins Your Route'}
                      </Badge>
                      <span className="text-[10px] font-bold text-indigo-400">{ride.match_percentage}% Match</span>
                    </div>
                    <div className="text-xs text-indigo-300 font-bold">
                      Departs <span className="font-extrabold">{ride.departure_time}</span>
                    </div>
                  </div>

                  {/* Driver and Vehicle summary */}
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={ride.driver_name} size="md" className="border border-slate-800" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-extrabold text-sm text-slate-200 truncate">{ride.driver_name}</h3>
                            {ride.driver_verified && (
                              <Badge variant="success" className="px-1 py-0.5 text-[8px]">Verified</Badge>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <RatingDisplay rating={ride.driver_rating} size="sm" />
                            <span className="text-[9px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold uppercase shrink-0">
                              {ride.vehicle_type === 'car' ? '🚗 Car' : '🏍️ Bike'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Cost Share Display */}
                      <div className="text-right shrink-0">
                        <div className="text-base font-black text-emerald-400">₹{ride.cost_share}</div>
                        <div className="text-[9px] text-brand-text-muted font-bold uppercase tracking-wider">Per Seat</div>
                      </div>
                    </div>

                    {/* Route overlap snippet */}
                    <div className="bg-slate-900/40 border border-slate-850 p-2.5 rounded-xl text-xs flex flex-col gap-1.5">
                      <div className="text-[10px] text-brand-text-muted font-bold uppercase tracking-wider flex justify-between items-center">
                        <span>Route Segment</span>
                        <span>{ride.estimated_distance_km} km total</span>
                      </div>
                      <p className="text-slate-300 font-semibold truncate">
                        {ride.source_label} ➔ {ride.destination_label}
                      </p>
                      {ride.available_seats === 0 ? (
                        <span className="text-[10px] text-rose-400 font-bold block mt-1">⚠️ Fully Booked (0 seats left)</span>
                      ) : (
                        <span className="text-[10px] text-slate-400 block font-semibold mt-1">
                          👤 {ride.available_seats} out of {ride.total_seats} seat{ride.total_seats > 1 ? 's' : ''} available
                        </span>
                      )}
                    </div>

                    {/* Match explanation tag */}
                    <div className="text-[10px] text-brand-text-secondary italic flex items-center gap-1.5">
                      <span>💡</span>
                      <span>
                        {isExact 
                          ? 'Matches your start and destination points perfectly.' 
                          : `Matches your direction. Driver starts near you and goes ${ride.match_percentage}% of the way.`
                        }
                      </span>
                    </div>

                  </div>
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
