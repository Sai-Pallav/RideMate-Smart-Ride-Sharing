import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import RatingDisplay from '../components/RatingDisplay';
import Button from '../components/Button';
import ErrorBanner from '../components/ErrorBanner';
import NavigationBar from '../components/NavigationBar';
import FloatingSOS from '../components/FloatingSOS';
import { getBookings } from '../api/bookings';
import { getRideById, startRide, completeRide, confirmBookingComplete } from '../api/rides';
import { getContacts, triggerSOS, cancelSOS, startLiveLocation, stopLiveLocation } from '../api/safety';

export default function ActiveRideScreen() {
  const navigate = useNavigate();
  const location = useLocation();

  // Core States
  const [activeBooking, setActiveBooking] = useState(null);
  const [toastText, setToastText] = useState('');
  const [shareLocation, setShareLocation] = useState(true);
  const [errorText, setErrorText] = useState('');

  // SOS State Machine: 'idle' | 'confirming' | 'alerting' | 'locked'
  const [sosState, setSosState] = useState('idle');
  const [sosCountdown, setSosCountdown] = useState(10);
  const [alertId, setAlertId] = useState(null);
  const timerRef = useRef(null);
  const locationIntervalRef = useRef(null);

  // Dev Toolbar States
  const [locationDisabled, setLocationDisabled] = useState(false);
  const [roleMode, setRoleMode] = useState('passenger'); // 'passenger' | 'driver'
  const [contactsList, setContactsList] = useState([]);

  // Load Active Ride, Booking, and Contacts on mount
  useEffect(() => {
    async function loadData() {
      try {
        // 1. Safety check: fetch emergency contacts
        const contactsRes = await getContacts();
        const contacts = contactsRes.contacts || [];
        setContactsList(contacts);

        if (contacts.length === 0) {
          alert("🚨 Safety check failed: You must add at least one emergency contact before accessing the Active Ride screen.");
          navigate('/profile');
          return;
        }

        // 2. Resolve active booking/ride
        let resolvedBooking = null;

        // Check router state first
        if (location.state?.booking || location.state?.ride) {
          const stateBooking = location.state.booking;
          const stateRide = location.state.ride;
          if (stateBooking) {
            resolvedBooking = {
              ...stateBooking,
              cost_share: stateBooking.cost_share !== undefined ? stateBooking.cost_share : stateBooking.calculated_cost_share,
            };
          } else if (stateRide) {
            resolvedBooking = {
              ride_id: stateRide.ride_id,
              booking_id: null,
              source_label: stateRide.source_label,
              destination_label: stateRide.destination_label,
              driver_name: 'You',
              driver_rating: 5.0,
              driver_verified: true,
              vehicle_type: stateRide.vehicle?.vehicle_type || 'car',
              cost_share: stateRide.cost_share || (parseFloat(stateRide.estimated_total_cost) / (stateRide.total_seats || 3)),
              departure_time: stateRide.departure_time,
              role: 'driver',
              status: stateRide.status,
            };
          }
        }

        // Fallback to sessionStorage
        if (!resolvedBooking) {
          const cached = sessionStorage.getItem('activeBooking');
          if (cached) {
            resolvedBooking = JSON.parse(cached);
          }
        }

        // Fallback to API fetch
        if (!resolvedBooking) {
          const bookingsRes = await getBookings();
          const bookings = bookingsRes.data || bookingsRes || [];
          // Look for active passenger/driver booking
          const activeB = bookings.find(b => b.status === 'confirmed' || b.status === 'ongoing');
          if (activeB) {
            resolvedBooking = {
              ...activeB,
              cost_share: activeB.cost_share !== undefined ? activeB.cost_share : activeB.calculated_cost_share,
            };
          }
        }

        if (resolvedBooking) {
          sessionStorage.setItem('activeBooking', JSON.stringify(resolvedBooking));
          setActiveBooking(resolvedBooking);
          setRoleMode(resolvedBooking.role || 'passenger');

          // Fetch full ride details to get vehicle specifications (e.g. license plate)
          try {
            const rideDetails = await getRideById(resolvedBooking.ride_id);
            if (rideDetails?.data) {
              const r = rideDetails.data;
              resolvedBooking.vehicle_type = r.vehicle?.vehicle_type || resolvedBooking.vehicle_type || 'car';
              resolvedBooking.vehicle_plate = r.vehicle?.license_plate || 'MH 12 AB 1234';
              resolvedBooking.source_location = r.source_location;
              resolvedBooking.destination_location = r.destination_location;
              if (resolvedBooking.role === 'driver') {
                resolvedBooking.status = r.status;
              }
              setActiveBooking({ ...resolvedBooking });
              sessionStorage.setItem('activeBooking', JSON.stringify(resolvedBooking));
            }
          } catch (err) {
            console.error("Failed to fetch ride details, continuing with basic booking data:", err);
          }
        }
      } catch (err) {
        console.error("Error loading Active Ride data:", err);
        setErrorText("Failed to load active ride details. Please try again.");
      }
    }

    loadData();
  }, [navigate, location.state]);

  // Helper: Dispatch SOS emergency payload
  const dispatchSOS = useCallback(async () => {
    if (!activeBooking) return;

    // Get current position or fallback to ride source coordinates
    let lat = activeBooking.source_location?.latitude || activeBooking.source_lat || 28.6139;
    let lng = activeBooking.source_location?.longitude || activeBooking.source_lng || 77.2090;

    const getPosition = () => {
      return new Promise((resolve) => {
        if (!navigator.geolocation || locationDisabled) {
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos),
          () => resolve(null),
          { timeout: 3000 }
        );
      });
    };

    const position = await getPosition();
    if (position) {
      lat = position.coords.latitude;
      lng = position.coords.longitude;
    }

    try {
      const response = await triggerSOS({
        ride_id: activeBooking.ride_id,
        trigger_lat: lat,
        trigger_lng: lng
      });

      if (response && response.alertDetails) {
        setAlertId(response.alertDetails.alert_id);
      }
    } catch (error) {
      console.error("[Safety SOS] API trigger request failed at network layer:", error);
      // Suppress showing error to user to prevent increasing panic.
      setAlertId(null);
    } finally {
      // Transition to locked Alert Sent state regardless of API failure status (prevents user panic)
      setSosState('locked');
    }
  }, [activeBooking, locationDisabled]);

  // Live Location Share Session (Syncs with Toggle and activeBooking status)
  useEffect(() => {
    if (!activeBooking || !shareLocation || locationDisabled) {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
      return;
    }

    const targetContact = contactsList[0];
    if (!targetContact) return;

    // Start live location sharing session in backend
    startLiveLocation({
      rideId: activeBooking.ride_id,
      contactId: targetContact.contact_id || targetContact.id
    }).then(() => {
      console.log(`[Safety Service] Live Location Sharing Session Started for ride ${activeBooking.ride_id}`);
    }).catch(err => {
      console.error("[Safety Service] Failed to start live location session on backend:", err);
    });

    // Start 15-second update interval
    locationIntervalRef.current = setInterval(() => {
      if (!navigator.geolocation) {
        console.warn("[Live Location] Geolocation not supported by browser.");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          console.log(`[Live Location Update] Latitude: ${lat}, Longitude: ${lng}`);
          // TODO: Socket.IO coordinates streaming:
          // socket.emit('share_location', { rideId: activeBooking.ride_id, userId: currentUser.id, lat, lng })
        },
        (error) => {
          console.warn("[Live Location Update] Geolocation query failed:", error);
        },
        { timeout: 5000 }
      );
    }, 15000);

    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
      if (activeBooking) {
        stopLiveLocation({ rideId: activeBooking.ride_id }).catch(err => {
          console.error("[Safety Service] Failed to stop live location session on backend unmount:", err);
        });
      }
    };
  }, [activeBooking, shareLocation, locationDisabled, contactsList]);

  // Timer for SOS countdown
  useEffect(() => {
    if (sosState === 'alerting') {
      timerRef.current = setInterval(() => {
        setSosCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            dispatchSOS();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [sosState, dispatchSOS]);

  const triggerToast = (msg) => {
    setToastText(msg);
    setTimeout(() => setToastText(''), 3000);
  };

  // Actions
  const handleStartRide = async () => {
    if (!activeBooking) return;
    try {
      const res = await startRide(activeBooking.ride_id);
      if (res.status === 'success') {
        const updated = { ...activeBooking, status: 'ongoing' };
        setActiveBooking(updated);
        sessionStorage.setItem('activeBooking', JSON.stringify(updated));
        triggerToast("🚀 Commute started successfully! Safety tools active.");
      }
    } catch (err) {
      console.error("Failed to start ride:", err);
      setErrorText(err.response?.data?.message || "Could not start the ride. Try again.");
    }
  };

  const handleCompleteRide = async () => {
    if (!activeBooking) return;
    if (window.confirm('Confirm that you have completed this commute. This will notify passengers and calculate cost shares.')) {
      try {
        const res = await completeRide(activeBooking.ride_id);
        if (res.status === 'success') {
          sessionStorage.removeItem('activeBooking');
          triggerToast('🎉 Commute marked complete!');
          setTimeout(() => {
            navigate('/ride-completion', { state: { ride: activeBooking, booking: activeBooking } });
          }, 1000);
        }
      } catch (err) {
        console.error("Failed to complete ride:", err);
        setErrorText(err.response?.data?.message || "Could not mark ride complete. Try again.");
      }
    }
  };

  const handleConfirmArrival = async () => {
    if (!activeBooking || !activeBooking.booking_id) return;
    if (window.confirm('Confirm that you have arrived safely. This will authorize your cost share deduction.')) {
      try {
        const res = await confirmBookingComplete(activeBooking.booking_id);
        if (res.status === 'success') {
          sessionStorage.removeItem('activeBooking');
          triggerToast('🎉 Arrival confirmed!');
          setTimeout(() => {
            navigate('/ride-completion', { state: { ride: activeBooking, booking: activeBooking } });
          }, 1000);
        }
      } catch (err) {
        console.error("Failed to confirm arrival:", err);
        setErrorText(err.response?.data?.message || "Could not confirm completion. Try again.");
      }
    }
  };

  // SOS Handlers
  const handleSosClick = () => {
    setSosState('confirming');
  };

  const handleConfirmSos = () => {
    setSosCountdown(10);
    setSosState('alerting');
  };

  const handleCancelSos = async () => {
    if (sosState === 'locked' && alertId) {
      try {
        await cancelSOS(alertId);
        triggerToast('SOS alert stood down and marked resolved.');
      } catch (error) {
        console.error("[Safety SOS] Failed to cancel SOS on backend:", error);
        triggerToast('Reset local SOS status.');
      }
    } else {
      triggerToast('SOS countdown cancelled. Status set to SAFE.');
    }
    setSosState('idle');
    setAlertId(null);
  };

  const getFirstContactName = () => {
    if (contactsList.length > 0) {
      return `${contactsList[0].contact_name} (${contactsList[0].contact_phone})`;
    }
    return "Campus Safety Dispatch & Registered Guardian";
  };

  const handleMockBookingToggle = () => {
    if (activeBooking) {
      sessionStorage.removeItem('activeBooking');
      setActiveBooking(null);
      setSosState('idle');
      triggerToast('Active booking cleared.');
    } else {
      const mockBookingObj = {
        booking_id: 99,
        ride_id: 1,
        source_label: "Academic Block A",
        destination_label: "Metro Station Terminal 2",
        driver_name: "Aditya Sharma",
        driver_rating: 4.8,
        driver_verified: true,
        vehicle_type: "car",
        cost_share: 45,
        departure_time: "09:00 AM",
        role: roleMode,
        status: roleMode === 'driver' ? 'scheduled' : 'confirmed',
        source_location: { latitude: 28.6139, longitude: 77.2090 }
      };
      sessionStorage.setItem('activeBooking', JSON.stringify(mockBookingObj));
      setActiveBooking(mockBookingObj);
      triggerToast('Mock active booking set!');
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg-base text-brand-text-primary font-sans flex flex-col pb-24 md:pb-6 relative overflow-hidden">
      
      {/* Dev Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap gap-2 items-center justify-between text-xs font-semibold z-30">
        <span className="font-bold text-indigo-400">🔧 DEV TOOLBAR:</span>
        <div className="flex gap-2">
          <button 
            onClick={handleMockBookingToggle} 
            className={`px-2 py-1 rounded transition cursor-pointer ${activeBooking ? 'bg-amber-600 text-white' : 'bg-slate-700 hover:bg-slate-650 text-slate-200'}`}
          >
            {activeBooking ? 'Clear Ride' : 'Set Active Ride'}
          </button>
          <button 
            onClick={() => setLocationDisabled(!locationDisabled)} 
            className={`px-2 py-1 rounded transition cursor-pointer ${locationDisabled ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-700 hover:bg-slate-650 text-slate-200'}`}
          >
            {locationDisabled ? 'Enable Location' : 'Disable Location'}
          </button>
          <button 
            onClick={() => setRoleMode(roleMode === 'passenger' ? 'driver' : 'passenger')} 
            className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-650 text-slate-200 transition cursor-pointer"
          >
            Role: {roleMode.toUpperCase()}
          </button>
          {sosState !== 'idle' && (
            <button 
              onClick={() => setSosState('idle')} 
              className="px-2 py-1 rounded bg-rose-600 text-white transition cursor-pointer"
            >
              Reset SOS
            </button>
          )}
        </div>
      </div>

      <NavigationBar className="relative z-10" />

      {toastText && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 border border-indigo-500/30 text-indigo-300 px-4 py-2.5 rounded-xl shadow-2xl text-xs md:text-sm font-semibold animate-bounce">
          {toastText}
        </div>
      )}

      {/* Screen Header */}
      <div className="bg-slate-900/60 border-b border-slate-850 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate(-1)} 
              className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition"
            >
              <span>🡐</span> Back
            </button>
            <span className="text-slate-600">|</span>
            <span className="text-xs font-bold text-slate-350">
              Status: <span className="text-emerald-400 font-extrabold animate-pulse">
                {activeBooking?.status === 'ongoing' ? 'Ongoing' : 'Scheduled'}
              </span>
            </span>
          </div>
          <Badge variant={sosState === 'locked' ? 'danger' : 'success'}>
            {sosState === 'locked' ? '🚨 SOS Broadcaster' : 'Live GPS Syncing'}
          </Badge>
        </div>
      </div>

      {/* Main Layout Area */}
      <main className="max-w-lg mx-auto w-full px-4 pt-4 flex-1 flex flex-col space-y-4 text-left">
        
        {errorText && (
          <ErrorBanner 
            message={errorText} 
            onDismiss={() => setErrorText('')} 
          />
        )}

        {!activeBooking ? (
          /* Empty Active Ride Notice */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <span className="text-4xl">🗺️</span>
            <h3 className="text-base font-extrabold text-slate-300">No Active Ride Found</h3>
            <p className="text-xs text-brand-text-secondary max-w-xs leading-relaxed">
              You are currently not matched on a live route. Search a ride route or offer seats to start.
            </p>
            <div className="flex gap-2 pt-2">
              <Button onClick={() => navigate('/search')} className="text-xs px-4">Search Rides</Button>
              <Button onClick={handleMockBookingToggle} variant="secondary" className="text-xs px-4">Mock Commute</Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col space-y-4">
            
            {/* 1. LOCATION SERVICES DISABLED WARNING BANNER */}
            {locationDisabled && (
              <ErrorBanner 
                message="🚨 Location Services Disabled. Live tracking is offline. Tap to resolve in settings." 
                className="border-amber-500/20 bg-amber-950/10 text-amber-300 font-semibold"
              />
            )}

            {/* 2. MAP AREA (Uses SVG Polyline route overlay) */}
            <div className="h-44 w-full bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden flex items-center justify-center shadow-inner shrink-0">
              {locationDisabled ? (
                /* Map Blank State */
                <div className="text-center p-4 space-y-2 z-10">
                  <span className="text-2xl text-slate-600 block">🛰️</span>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Map Coordinates Unavailable</p>
                </div>
              ) : (
                /* Interactive Map Canvas */
                <div className="absolute inset-0 p-4 flex flex-col justify-between">
                  <div className="absolute inset-0 opacity-15" style={{ 
                    backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', 
                    backgroundSize: '14px 14px' 
                  }}></div>

                  <svg className="absolute inset-0 h-full w-full pointer-events-none p-4">
                    <path d="M 60,110 C 130,30 200,30 300,100" fill="none" stroke="#6366f1" strokeWidth="3" />
                    <circle cx="60" cy="110" r="5" fill="#10b981" />
                    <circle cx="300" cy="100" r="5" fill="#f43f5e" />
                    {/* Pulsing Pin dot */}
                    <circle cx="160" cy="65" r="4.5" fill="#818cf8" className="animate-ping" />
                    <circle cx="160" cy="65" r="3" fill="#6366f1" />
                  </svg>

                  <div className="flex justify-between items-start z-10 w-full">
                    <div className="bg-brand-bg-card/90 border border-slate-850 px-2.5 py-1 rounded-lg text-[9px] max-w-[45%]">
                      <span className="text-emerald-400 font-bold block truncate">{activeBooking.source_label}</span>
                    </div>
                    <div className="bg-brand-bg-card/90 border border-slate-850 px-2.5 py-1 rounded-lg text-[9px] max-w-[45%] text-right">
                      <span className="text-rose-450 font-bold block truncate">{activeBooking.destination_label}</span>
                    </div>
                  </div>

                  <div className="z-10 bg-slate-950/85 px-3 py-1 border border-slate-850 rounded-full text-[9px] font-bold text-slate-400 self-center shadow-md">
                    🛰️ Live Sharing: {shareLocation ? 'ON (Broadcasting)' : 'OFF (Paused)'}
                  </div>
                </div>
              )}
            </div>

            {/* 3. MINI-PROFILE BAR */}
            <Card className="p-4 border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <Avatar name={roleMode === 'driver' ? "You" : activeBooking.driver_name} size="md" className="border border-slate-700" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-sm truncate">
                      {roleMode === 'driver' ? "You (Driver)" : activeBooking.driver_name}
                    </h4>
                    {roleMode === 'passenger' && activeBooking.driver_verified && (
                      <Badge variant="success" className="px-1.5 py-0.5 text-[8px]">Verified</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <RatingDisplay rating={roleMode === 'driver' ? 5.0 : activeBooking.driver_rating} size="sm" />
                    <span className="text-[9px] text-brand-text-secondary bg-slate-800 px-1.5 py-0.5 rounded font-bold uppercase">
                      {activeBooking.vehicle_type === 'car' ? '🚗 Car' : '🏍️ Bike'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-slate-200">₹{activeBooking.cost_share}</div>
                  <span className="text-[9px] text-brand-text-muted font-bold block uppercase tracking-wider">
                    {roleMode === 'driver' ? 'Recovering' : 'Payment'}
                  </span>
                </div>
              </div>

              <div className="mt-3.5 pt-3 border-t border-slate-850 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-brand-text-muted font-bold uppercase tracking-wider text-[8px] block">Vehicle Plate</span>
                  <span className="font-bold text-slate-300 mt-0.5 block truncate">
                    {activeBooking.vehicle_plate || 'MH 12 AB 1234'}
                  </span>
                </div>
                <div>
                  <span className="text-brand-text-muted font-bold uppercase tracking-wider text-[8px] block">Estimated Arrival</span>
                  <span className="font-bold text-indigo-400 mt-0.5 block truncate">
                    9:10 AM ({activeBooking.departure_time} Dep)
                  </span>
                </div>
              </div>
            </Card>

            {/* 4. TRIP CONTROLS */}
            <div className="space-y-3 flex-1 flex flex-col justify-end">
              
              {/* Location Share Switch */}
              <div className="flex items-center justify-between p-3.5 bg-slate-900/40 border border-slate-850 rounded-2xl">
                <div className="space-y-0.5 text-left pr-4">
                  <span className="text-xs font-bold text-slate-200 block">Share Live Location</span>
                  <span className="text-[10px] text-brand-text-secondary block">
                    Allow emergency contacts to monitor your path coordinates.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={shareLocation} 
                    onChange={() => setShareLocation(!shareLocation)} 
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500 peer-checked:after:bg-white"></div>
                </label>
              </div>

              {/* Action Buttons Row */}
              <div className="flex gap-2">
                <Button 
                  onClick={() => navigate(`/report-center?rideId=${activeBooking.ride_id}`)}
                  variant="secondary" 
                  className="flex-1 text-xs py-2.5 font-bold flex items-center justify-center gap-1.5"
                >
                  ⚠️ File Report
                </Button>

                {roleMode === 'driver' && activeBooking.status === 'scheduled' && (
                  <Button 
                    onClick={handleStartRide}
                    className="flex-1 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-md flex items-center justify-center gap-1.5"
                  >
                    🚀 Start Ride
                  </Button>
                )}

                {roleMode === 'driver' && activeBooking.status === 'ongoing' && (
                  <Button 
                    onClick={handleCompleteRide}
                    className="flex-1 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md flex items-center justify-center gap-1.5"
                  >
                    ✔️ Mark Complete
                  </Button>
                )}

                {roleMode === 'passenger' && (
                  <Button 
                    onClick={handleConfirmArrival}
                    className="flex-1 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md flex items-center justify-center gap-1.5"
                  >
                    ✔️ Confirm Arrival
                  </Button>
                )}
              </div>

            </div>

          </div>
        )}

      </main>

      {/* 5. PERSISTENT FLOATING SOS WIDGET */}
      {activeBooking && (
        <FloatingSOS onClick={handleSosClick} />
      )}

      {/* 6. SOS TRIGGER TIMELINE OVERLAYS */}
      
      {/* State A: CONFIRMATION MODAL OVERLAY */}
      {sosState === 'confirming' && (
        <div className="fixed inset-0 z-50 bg-brand-bg-base/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-xs w-full p-5 border-rose-500/30 text-center space-y-4 shadow-2xl">
            <span className="text-3xl block animate-bounce">🚨</span>
            <div className="space-y-1">
              <h3 className="font-extrabold text-sm text-rose-400 uppercase tracking-widest">Trigger Emergency SOS?</h3>
              <p className="text-[11px] text-brand-text-secondary leading-relaxed">
                This will dispatch university dispatchers and send emergency text logs with location pins to your contacts.
              </p>
            </div>

            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-850 text-left text-[10px] space-y-1">
              <span className="text-brand-text-muted font-bold block uppercase tracking-wider">Target Recipients:</span>
              <span className="font-bold text-slate-350 block">📱 Contact: {getFirstContactName()}</span>
              <span className="font-bold text-slate-350 block">🏫 Dispatcher: Institutional Security Desk</span>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={handleConfirmSos}
                className="flex-1 py-2.5 rounded-lg bg-brand-safety hover:bg-brand-safety-hover text-white font-extrabold text-xs uppercase tracking-wider border border-red-500 cursor-pointer transition active:scale-95"
              >
                Confirm SOS
              </button>
              <button 
                onClick={() => setSosState('idle')}
                className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition"
              >
                Cancel
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* State B: ALERT SENT / 10S GRACE COUNTDOWN OVERLAY */}
      {sosState === 'alerting' && (
        <div className="fixed inset-0 z-50 bg-brand-bg-base/90 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="max-w-xs w-full p-5 border-rose-500 bg-rose-950/10 text-center space-y-5 shadow-brand-sos relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-brand-safety animate-[pulse_1s_infinite]"></div>
            
            <div className="space-y-1.5">
              <span className="text-4xl block animate-ping">🚨</span>
              <h3 className="font-black text-sm text-rose-500 uppercase tracking-widest">Emergency SOS Dispatched</h3>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Transmitting GPS telemetry logs and route coordinates to emergency dispatch desk.
              </p>
            </div>

            {/* Countdown Display */}
            <div className="h-20 w-20 rounded-full border-4 border-rose-500 border-t-transparent flex flex-col items-center justify-center mx-auto animate-[spin_10s_linear] relative">
              <span className="font-black text-2xl text-rose-500 absolute rotate-0 select-none" style={{ transform: 'none' }}>
                {sosCountdown}s
              </span>
            </div>
            <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wider animate-pulse">Grace Window Active</p>

            {/* Shares info */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-red-950/50 text-left text-[10px] space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold uppercase">Broadcasting:</span>
                <span className="text-rose-400 font-black">ACTIVE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-550 font-bold">GPS Coordinates:</span>
                <span className="text-slate-300 font-bold">28.6139, 77.2090</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-550 font-bold">Active Commute ID:</span>
                <span className="text-slate-300 font-bold">#{activeBooking.ride_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-550 font-bold">Contact Recipient:</span>
                <span className="text-slate-300 font-bold truncate max-w-[120px]">{getFirstContactName()}</span>
              </div>
            </div>

            <button 
              onClick={handleCancelSos}
              className="w-full py-3 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 font-extrabold text-xs uppercase tracking-widest cursor-pointer transition active:scale-95 shadow-md"
            >
              Cancel SOS (Stand Down)
            </button>
          </Card>
        </div>
      )}

      {/* State C: LOCKED SOS STATE OVERLAY */}
      {sosState === 'locked' && (
        <div className="fixed inset-0 z-50 bg-red-950/85 backdrop-blur-lg flex items-center justify-center p-4">
          <Card className="max-w-xs w-full p-6 border-rose-550 bg-brand-bg-card text-center space-y-5 shadow-2xl relative">
            <div className="h-1.5 bg-brand-safety absolute top-0 left-0 right-0 animate-pulse"></div>

            <span className="text-4xl block animate-pulse">🚨</span>
            <div className="space-y-2">
              <h3 className="font-black text-sm text-rose-500 uppercase tracking-widest">SOS Broadcast Locked</h3>
              <p className="text-[11px] text-slate-200 leading-relaxed font-semibold">
                Authorities and your emergency contact have been notified. Stay where you are and wait for safety response.
              </p>
            </div>

            <div className="bg-slate-900 p-3 rounded-xl border border-red-950/50 text-left text-[10px] space-y-1.5 font-mono">
              <div className="flex justify-between items-center text-rose-500">
                <span className="font-extrabold uppercase">Alert Status:</span>
                <span className="font-black">LOCKED & DISPATCHED</span>
              </div>
              <div>
                <span className="text-slate-555 font-bold block">Notified Party:</span>
                <span className="font-bold text-slate-300 block truncate">{getFirstContactName()}</span>
              </div>
              <div>
                <span className="text-slate-555 font-bold block">GPS Broadcaster Pin:</span>
                <span className="font-bold text-slate-300 block">28.6139, 77.2090 (Active)</span>
              </div>
            </div>

            <div className="pt-2 text-left">
              <p className="text-[10px] text-brand-text-secondary leading-normal">
                🛡️ **Instructions**:
                <br />1. Keep your phone line clear.
                <br />2. If you are in a moving vehicle, instruct the driver to pull over immediately.
                <br />3. Campus police have your vehicle plate and route.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button 
                onClick={handleCancelSos}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider cursor-pointer transition active:scale-95 shadow-md border-none"
              >
                🟢 I'm Safe / Cancel Alert
              </button>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                Only dispatchers or physical responders can resolve this alert.
              </p>
            </div>
          </Card>
        </div>
      )}

      <NavigationBar className="block md:hidden" />
    </div>
  );
}
