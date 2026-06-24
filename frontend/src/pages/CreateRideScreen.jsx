import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getEmergencyContacts } from '../api/profile';
import { createRide, getMyVehicles, activateVehicle } from '../api/rides';
import { resolveLocation } from '../utils/geoLookup';
import Button from '../components/Button';
import Card from '../components/Card';
import InputField from '../components/InputField';
import ErrorBanner from '../components/ErrorBanner';
import NavigationBar from '../components/NavigationBar';

export default function CreateRideScreen() {
  const navigate = useNavigate();

  // Safety Rule: emergency contacts check
  const { data: contactsData, isLoading: contactsLoading } = useQuery({
    queryKey: ['profile', 'emergency-contacts'],
    queryFn: getEmergencyContacts,
    retry: false
  });

  useEffect(() => {
    if (!contactsLoading && contactsData) {
      const contactList = Array.isArray(contactsData) ? contactsData : (contactsData.data || []);
      if (contactList.length === 0) {
        alert('⚠️ Safety Rule: You must configure at least one emergency contact before publishing or participating in commutes.');
        navigate('/safety-center');
      }
    }
  }, [contactsData, contactsLoading, navigate]);

  // Fetch driver's vehicles
  const { data: vehiclesData, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles', 'me'],
    queryFn: getMyVehicles,
  });

  const vehiclesList = useMemo(() => vehiclesData?.data || [], [vehiclesData]);

  // Core Form States
  const [sourceLabel, setSourceLabel] = useState('');
  const [destinationLabel, setDestinationLabel] = useState('');
  const [rideDate, setRideDate] = useState(new Date().toISOString().split('T')[0]);
  const [departureTime, setDepartureTime] = useState('08:30');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [totalSeats, setTotalSeats] = useState(3);

  // Preferences
  const [genderPref, setGenderPref] = useState('any'); // 'any', 'female_only'
  const [smokingAllowed, setSmokingAllowed] = useState(false);
  const [luggageSize, setLuggageSize] = useState('small'); // 'none', 'small', 'medium', 'large'

  // Distance calculations
  const [distanceKm, setDistanceKm] = useState(12.5);

  // Autocomplete suggestions active input
  const [activeInput, setActiveInput] = useState(null);

  // Loading/Error states
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Dev Toolbar / Simulation states
  const [hasVehicleRegistered, setHasVehicleRegistered] = useState(true);
  const [forcePublishError, setForcePublishError] = useState(false);

  // Mock database locations
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

  // Derive active vehicle & current vehicle details during render
  const activeVeh = useMemo(() => {
    return vehiclesList.find(v => v.is_active) || vehiclesList[0];
  }, [vehiclesList]);

  const currentVehicleId = selectedVehicleId || (activeVeh ? activeVeh.vehicle_id.toString() : '');

  const selectedVeh = useMemo(() => {
    const id = Number(currentVehicleId);
    return vehiclesList.find(v => v.vehicle_id === id) || activeVeh;
  }, [currentVehicleId, vehiclesList, activeVeh]);

  const vehicleType = selectedVeh ? selectedVeh.vehicle_type : 'two_wheeler';
  const totalSeatsValue = vehicleType === 'two_wheeler' ? 1 : totalSeats;

  // Recalculate cost estimate dynamically based on distance & vehicle type
  const estimatedCost = useMemo(() => {
    const multiplier = vehicleType === 'car' ? 8 : 2.5;
    return Math.round(distanceKm * multiplier);
  }, [distanceKm, vehicleType]);

  // Filter autocomplete suggestions during render to prevent set-state-in-effect warning
  const sourceSuggestions = sourceLabel.trim().length > 1
    ? locationsDb.filter(loc => 
        loc.toLowerCase().includes(sourceLabel.toLowerCase()) && loc.toLowerCase() !== sourceLabel.toLowerCase()
      )
    : [];

  const destSuggestions = destinationLabel.trim().length > 1
    ? locationsDb.filter(loc => 
        loc.toLowerCase().includes(destinationLabel.toLowerCase()) && loc.toLowerCase() !== destinationLabel.toLowerCase()
      )
    : [];

  const handleSelectLocation = (type, value) => {
    if (type === 'source') {
      setSourceLabel(value);
    } else {
      setDestinationLabel(value);
    }
    setActiveInput(null);
    // Deterministic distance mock based on character hash of label (between 5 and 29 km) to avoid Math.random purity error
    const charSum = value.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    setDistanceKm((charSum % 25) + 5);
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (vehiclesList.length === 0 || !hasVehicleRegistered) {
      setErrorMsg('Publication blocked: No vehicle registered in your profile setup.');
      return;
    }

    if (!sourceLabel.trim()) {
      setErrorMsg('Please specify a source starting location.');
      return;
    }
    if (!destinationLabel.trim()) {
      setErrorMsg('Please specify a destination.');
      return;
    }
    if (sourceLabel.trim().toLowerCase() === destinationLabel.trim().toLowerCase()) {
      setErrorMsg('Source and destination locations cannot be the same.');
      return;
    }

    // TODO: replace with real geocoding when Maps API is integrated
    const sourceCoords = resolveLocation(sourceLabel);
    const destinationCoords = resolveLocation(destinationLabel);

    if (!sourceCoords) {
      setErrorMsg(`Could not resolve coordinates for source location: "${sourceLabel}". Please select a campus hotspot from suggestions.`);
      return;
    }
    if (!destinationCoords) {
      setErrorMsg(`Could not resolve coordinates for destination location: "${destinationLabel}". Please select a campus hotspot from suggestions.`);
      return;
    }

    if (forcePublishError) {
      setErrorMsg('Backend Network Timeout. Failed to publish ride. Please retry.');
      return;
    }

    setIsPublishing(true);

    try {
      // If the chosen vehicle is not currently active, set it as active on backend
      if (selectedVeh && !selectedVeh.is_active) {
        await activateVehicle(selectedVeh.vehicle_id);
      }

      const payload = {
        source_label: sourceLabel,
        source_location: {
          latitude: sourceCoords.latitude,
          longitude: sourceCoords.longitude
        },
        destination_label: destinationLabel,
        destination_location: {
          latitude: destinationCoords.latitude,
          longitude: destinationCoords.longitude
        },
        ride_date: rideDate,
        departure_time: departureTime.length === 5 ? `${departureTime}:00` : departureTime,
        total_seats: parseInt(totalSeatsValue, 10),
        estimated_distance_km: parseFloat(distanceKm),
        estimated_total_cost: parseFloat(estimatedCost * totalSeatsValue),
        preferences: {
          gender: genderPref,
          smoking: smokingAllowed,
          luggage: luggageSize
        }
      };

      await createRide(payload);

      setToastMsg('🎉 Ride published successfully! Redirecting home...');
      setTimeout(() => {
        navigate('/home');
      }, 1500);

    } catch (err) {
      console.error('[CreateRideScreen] Publication error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to publish ride. Please check connection and details.');
    } finally {
      setIsPublishing(false);
    }
  };

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleRegisterMockVehicle = () => {
    setHasVehicleRegistered(true);
    triggerToast('🚗 Mock vehicle unblocked locally!');
  };

  const showNoVehicleState = (!vehiclesLoading && vehiclesList.length === 0) || !hasVehicleRegistered;

  return (
    <div className="min-h-screen bg-brand-bg-base text-brand-text-primary font-sans flex flex-col pb-24 md:pb-6">
      
      {/* Dev Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap gap-2 items-center justify-between text-xs">
        <span className="font-bold text-indigo-400">🔧 DEV TOOLBAR:</span>
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={() => setHasVehicleRegistered(!hasVehicleRegistered)} 
            className={`px-2 py-1 rounded font-semibold transition ${!hasVehicleRegistered ? 'bg-rose-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
          >
            {hasVehicleRegistered ? 'Force "No Vehicle" State' : 'Unforce: Vehicle Added'}
          </button>
          <button 
            type="button"
            onClick={() => setForcePublishError(!forcePublishError)} 
            className={`px-2 py-1 rounded font-semibold transition ${forcePublishError ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
          >
            {forcePublishError ? 'Force Publish Error: ON' : 'Force Publish Error'}
          </button>
        </div>
      </div>

      <NavigationBar className="relative z-10" />

      {toastMsg && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 border border-indigo-500/30 text-indigo-300 px-4 py-2.5 rounded-xl shadow-2xl text-xs md:text-sm font-semibold animate-bounce">
          {toastMsg}
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-lg mx-auto w-full px-4 pt-6 space-y-6 flex-1 relative">
        
        {/* 1. "No Vehicle added yet" Blocking State */}
        {showNoVehicleState ? (
          <Card elevated={true} className="p-6 border-brand-safety/40 shadow-2xl text-center space-y-5 bg-slate-900/90 backdrop-blur-md z-30 relative">
            <span className="text-4xl block">🚫</span>
            <h3 className="text-lg font-black text-brand-text-primary uppercase tracking-tight">Vehicle Required</h3>
            <p className="text-xs text-brand-text-secondary leading-relaxed max-w-sm mx-auto">
              You need to add a vehicle before creating a ride. Per platform safety standards, you cannot publish a commute listing without a registered vehicle.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button 
                onClick={handleRegisterMockVehicle}
                className="font-bold text-xs"
              >
                Register Mock Vehicle (1-Tap Unblock)
              </Button>
              <Button 
                onClick={() => navigate('/profile')} 
                variant="secondary"
                className="text-xs text-slate-400"
              >
                Go to Profile (Add Vehicle)
              </Button>
            </div>
          </Card>
        ) : (
          /* Normal publishing form */
          <div className="space-y-5 text-left">
            
            <header className="space-y-1">
              <h2 className="text-xl font-extrabold tracking-tight">Publish a Ride</h2>
              <p className="text-xs text-brand-text-secondary">Provide route details to share fuel cost splits with campus riders.</p>
            </header>

            {errorMsg && (
              <ErrorBanner 
                message={errorMsg} 
                onRetry={forcePublishError ? () => setForcePublishError(false) : undefined}
              />
            )}

            <Card className="p-4 space-y-4">
              <form onSubmit={handlePublish} className="space-y-4">
                
                {/* Source Input */}
                <div className="relative">
                  <InputField
                    label="🟢 From (Commute Start)"
                    placeholder="e.g. Academic Block A"
                    value={sourceLabel}
                    onChange={(e) => { setSourceLabel(e.target.value); setActiveInput('source'); }}
                    onFocus={() => setActiveInput('source')}
                    required
                  />
                  {activeInput === 'source' && sourceSuggestions.length > 0 && (
                    <ul className="absolute z-30 w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl max-h-48 overflow-y-auto">
                      {sourceSuggestions.map((s, idx) => (
                        <li 
                          key={idx}
                          onClick={() => handleSelectLocation('source', s)}
                          className="px-4 py-2 hover:bg-indigo-950/40 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer transition"
                        >
                          📍 {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Destination Input */}
                <div className="relative">
                  <InputField
                    label="🔴 To (Commute End)"
                    placeholder="e.g. Tech Park Cluster B"
                    value={destinationLabel}
                    onChange={(e) => { setDestinationLabel(e.target.value); setActiveInput('dest'); }}
                    onFocus={() => setActiveInput('dest')}
                    required
                  />
                  {activeInput === 'dest' && destSuggestions.length > 0 && (
                    <ul className="absolute z-30 w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl max-h-48 overflow-y-auto">
                      {destSuggestions.map((s, idx) => (
                        <li 
                          key={idx}
                          onClick={() => handleSelectLocation('dest', s)}
                          className="px-4 py-2 hover:bg-indigo-950/40 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer transition"
                        >
                          📍 {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Date & Time Group */}
                <div className="grid grid-cols-2 gap-3">
                  <InputField
                    label="📅 Date"
                    type="date"
                    value={rideDate}
                    onChange={(e) => setRideDate(e.target.value)}
                    required
                  />
                  <InputField
                    label="🕒 Time"
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    required
                  />
                </div>

                {/* Vehicle Selection & Seat Stepper */}
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-850">
                  
                  {/* Vehicle Selector */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary select-none block mb-1.5">
                      Select Vehicle
                    </label>
                    {vehiclesLoading ? (
                      <div className="h-[40px] bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
                    ) : (
                      <select
                        value={currentVehicleId}
                        onChange={(e) => setSelectedVehicleId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 outline-none hover:border-slate-700 transition cursor-pointer h-[40px]"
                        required
                      >
                        <option value="" disabled>Choose vehicle</option>
                        {vehiclesList.map((veh) => (
                          <option key={veh.vehicle_id} value={veh.vehicle_id}>
                            {veh.vehicle_type === 'car' ? '🚗' : '🏍️'} {veh.color} {veh.make} {veh.model}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Seat count stepper */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary select-none block mb-1.5">
                      Available Seats
                    </label>
                    <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-1 w-full min-h-[40px]">
                      <button
                        type="button"
                        disabled={vehicleType === 'two_wheeler' || totalSeatsValue <= 1}
                        onClick={() => setTotalSeats(totalSeatsValue - 1)}
                        className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-750 flex items-center justify-center font-bold text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs font-extrabold text-slate-200 px-2">{totalSeatsValue}</span>
                      <button
                        type="button"
                        disabled={vehicleType === 'two_wheeler' || totalSeatsValue >= 4}
                        onClick={() => setTotalSeats(totalSeatsValue + 1)}
                        className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-750 flex items-center justify-center font-bold text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                </div>

                {/* Preference Options */}
                <div className="pt-2 border-t border-slate-850 space-y-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-text-muted select-none block">
                    Driver Ride Preferences
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Gender pref */}
                    <div>
                      <label className="text-[10px] font-bold text-brand-text-secondary block mb-1 select-none">
                        Gender Rules
                      </label>
                      <select 
                        value={genderPref} 
                        onChange={(e) => setGenderPref(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 outline-none hover:border-slate-700 transition cursor-pointer"
                      >
                        <option value="any">👥 Open to All</option>
                        <option value="female_only">👩 Female Only</option>
                      </select>
                    </div>

                    {/* Luggage size */}
                    <div>
                      <label className="text-[10px] font-bold text-brand-text-secondary block mb-1 select-none">
                        Luggage Allowed
                      </label>
                      <select 
                        value={luggageSize} 
                        onChange={(e) => setLuggageSize(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 outline-none hover:border-slate-700 transition cursor-pointer"
                      >
                        <option value="none">💼 No Luggage</option>
                        <option value="small">💼 Small bag</option>
                        <option value="medium">💼 Medium bag</option>
                        <option value="large">💼 Large suitcase</option>
                      </select>
                    </div>
                  </div>

                  {/* Smoking allowed toggle */}
                  <label className="flex items-center gap-2 px-1 py-1.5 cursor-pointer text-xs font-semibold text-slate-300 select-none">
                    <input 
                      type="checkbox"
                      checked={smokingAllowed}
                      onChange={(e) => setSmokingAllowed(e.target.checked)}
                      className="h-4 w-4 bg-slate-900 border border-slate-800 rounded focus:ring-indigo-500 accent-indigo-600"
                    />
                    🚬 Allow smoking in vehicle
                  </label>
                </div>

                {/* Recurring Commute toggle */}
                <div className="pt-2 border-t border-slate-850 space-y-3">
                  <label className="flex items-center justify-between cursor-not-allowed opacity-50 py-1 text-xs font-bold text-slate-200 select-none">
                    <span>🔁 Recurring Commute Pattern (Upcoming)</span>
                    <input 
                      type="checkbox" 
                      checked={false}
                      disabled
                      className="h-4.5 w-8 rounded-full bg-slate-800 border border-slate-700 accent-indigo-600 cursor-not-allowed"
                    />
                  </label>
                  {/* TODO: Wire to POST /api/rides/templates when recurring rides are enabled in driver creation flow */}
                </div>

                {/* COST ESTIMATE PREVIEW */}
                <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-brand-text-secondary uppercase tracking-wider text-[10px]">Estimated Route Cost</span>
                  </div>
                  <span className="text-xs font-semibold text-indigo-400 block">
                    Cost will be calculated on publish
                  </span>
                  <span className="text-[9px] text-brand-text-muted italic block leading-relaxed pt-1.5 border-t border-slate-850/50">
                    * The Cost Calculation Service will compute the optimized fuel/wear share rates once the ride is created.
                  </span>
                </div>

                <Button type="submit" loading={isPublishing} className="w-full font-bold">
                  Publish Ride Commute
                </Button>

              </form>
            </Card>
          </div>
        )}

      </main>

      <NavigationBar className="block md:hidden" />
    </div>
  );
}
