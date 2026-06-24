import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import Button from '../components/Button';
import NavigationBar from '../components/NavigationBar';
import ErrorBanner from '../components/ErrorBanner';
import { getRideById, submitRating, submitReview } from '../api/rides';

export default function RatingScreen() {
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize data from router state or sessionStorage
  const [rideData] = useState(() => {
    let ride = location.state?.ride;
    if (!ride) {
      const cached = sessionStorage.getItem('activeBooking') || sessionStorage.getItem('lastCompletedRide');
      if (cached) {
        ride = JSON.parse(cached);
      }
    }
    return ride || null;
  });

  const [bookingData] = useState(() => {
    let booking = location.state?.booking;
    if (!booking) {
      const cached = sessionStorage.getItem('activeBooking') || sessionStorage.getItem('lastCompletedRide');
      if (cached) {
        booking = JSON.parse(cached);
      }
    }
    return booking || null;
  });

  // Core States
  const [stars, setStars] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [toastText, setToastText] = useState('');
  const [resolvedDriverId, setResolvedDriverId] = useState(null);

  const role = bookingData?.role || 'passenger';
  const coTravelerName = role === 'driver' ? (bookingData?.passenger_name || 'Passenger') : (bookingData?.driver_name || 'Aditya Sharma');
  const photoUrl = role === 'driver' ? (bookingData?.passenger_photo || null) : null;

  useEffect(() => {
    if (!rideData || !bookingData) {
      navigate('/home', { replace: true });
      return;
    }
    // Save to sessionStorage to survive refresh
    sessionStorage.setItem('lastCompletedRide', JSON.stringify(bookingData));

    // Resolve driver ID if passenger
    async function resolveDriver() {
      if (role === 'passenger') {
        const dId = bookingData.driver_id || rideData.driver_id || rideData.driver?.user_id;
        if (dId) {
          setResolvedDriverId(dId);
        } else {
          try {
            const res = await getRideById(rideData.ride_id);
            if (res?.data?.driver?.user_id) {
              setResolvedDriverId(res.data.driver.user_id);
            }
          } catch (err) {
            console.error("Failed to resolve driver user ID for rating:", err);
          }
        }
      }
    }
    resolveDriver();
  }, [rideData, bookingData, role, navigate]);

  if (!rideData || !bookingData) {
    return null;
  }

  const triggerToast = (msg) => {
    setToastText(msg);
    setTimeout(() => setToastText(''), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (stars === 0) {
      setErrorText('Please select a star rating before submitting.');
      return;
    }

    setIsLoading(true);
    setErrorText('');

    const ratedUserId = role === 'driver'
      ? bookingData.passenger_id
      : (resolvedDriverId || bookingData.driver_id || rideData.driver_id);

    if (!ratedUserId) {
      setErrorText('Could not resolve co-traveler user ID. Please try again.');
      setIsLoading(false);
      return;
    }

    try {
      // 1. Submit rating (Primary Signal)
      await submitRating({
        booking_id: bookingData.booking_id,
        rated_user_id: ratedUserId,
        stars
      });

      // Store rating in local storage to prevent duplicate rating prompt on history
      try {
        const localStorageKey = `rated_booking_${bookingData.booking_id}`;
        window.localStorage.setItem(localStorageKey, String(stars));
      } catch (err) {
        console.error("Failed to save local rating state:", err);
      }

      // 2. Submit optional text review
      if (reviewText.trim()) {
        try {
          await submitReview({
            booking_id: bookingData.booking_id,
            reviewed_user_id: ratedUserId,
            review_text: reviewText
          });
        } catch (revError) {
          // Log review failure but do not show error screen (rating is primary)
          console.warn("Optional text review submission failed:", revError);
        }
      }

      // Clear completed session caches
      sessionStorage.removeItem('activeBooking');
      sessionStorage.removeItem('lastCompletedRide');

      triggerToast('🎉 Thank you for rating your tripmate!');
      setTimeout(() => {
        navigate('/home');
      }, 1500);

    } catch (err) {
      console.error("Rating submission failed:", err);
      setErrorText(err.response?.data?.message || "Failed to submit rating. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg-base text-brand-text-primary font-sans flex flex-col pb-24 md:pb-6 relative overflow-hidden">
      
      {/* Premium ambient design blobs */}
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 left-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <NavigationBar className="relative z-10" />

      {toastText && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 border border-indigo-500/30 text-indigo-300 px-4 py-2.5 rounded-xl shadow-2xl text-xs md:text-sm font-semibold animate-bounce">
          {toastText}
        </div>
      )}

      <main className="max-w-lg mx-auto w-full px-4 pt-6 flex-1 flex flex-col justify-center z-10">
        
        <Card elevated={true} className="border-indigo-550/20 bg-slate-900/50 p-6 space-y-6 text-center">
          
          <div className="space-y-2">
            <Badge variant="info" className="uppercase tracking-widest text-[9px] font-black">Feedback Loop</Badge>
            <h2 className="text-xl font-black tracking-tight text-slate-100">Rate Your Co-Traveler</h2>
            <p className="text-xs text-brand-text-secondary">
              Help maintain a safe and reliable campus ride-sharing community.
            </p>
          </div>

          {/* Co-Traveler Avatar and Bio details */}
          <div className="flex flex-col items-center space-y-2 pt-2">
            <Avatar name={coTravelerName} url={photoUrl} size="lg" className="border-2 border-indigo-500/30 shadow-lg" />
            <h3 className="font-extrabold text-sm text-slate-200">{coTravelerName}</h3>
            <span className="text-[10px] text-brand-text-muted font-bold uppercase tracking-wider">
              {role === 'driver' ? 'Passenger' : 'Commute Driver'}
            </span>
          </div>

          {errorText && (
            <ErrorBanner 
              message={errorText} 
              onDismiss={() => setErrorText('')} 
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Interactive Stars Selector */}
            <div className="space-y-2">
              <span className="text-[10px] text-brand-text-secondary font-extrabold uppercase tracking-wider block">
                Select Star Rating
              </span>
              <div className="flex justify-center gap-3">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isActive = (hoverStars || stars) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setStars(star)}
                      onMouseEnter={() => setHoverStars(star)}
                      onMouseLeave={() => setHoverStars(0)}
                      className="text-3xl md:text-4xl transition duration-150 transform hover:scale-125 focus:outline-none cursor-pointer select-none"
                    >
                      <span className={isActive ? 'text-amber-450 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'text-slate-700'}>
                        ★
                      </span>
                    </button>
                  );
                })}
              </div>
              {stars > 0 && (
                <p className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest animate-pulse">
                  {stars === 5 ? 'Excellent! 🌟' : stars === 4 ? 'Very Good! 👍' : stars === 3 ? 'Good! Ok' : stars === 2 ? 'Needs Improvement' : 'Unsatisfactory ⚠️'}
                </p>
              )}
            </div>

            {/* Optional Review Text */}
            <div className="space-y-1.5 text-left">
              <div className="flex justify-between items-center text-[10px] text-brand-text-secondary font-bold uppercase tracking-wider">
                <span>Write a Review (Optional)</span>
                <span className="font-mono text-brand-text-muted">{reviewText.length}/500</span>
              </div>
              <textarea
                placeholder="Share details about your commute experience. Was the ride on time? Friendly conversation?"
                maxLength={500}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="w-full h-24 p-3 bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-indigo-500 rounded-xl text-xs md:text-sm text-brand-text-primary outline-none transition resize-none leading-relaxed"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="submit"
                loading={isLoading}
                disabled={isLoading || stars === 0}
                className="w-full py-3 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-brand-glow rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Submit Feedback
              </Button>
              <Button
                type="button"
                onClick={() => {
                  sessionStorage.removeItem('activeBooking');
                  sessionStorage.removeItem('lastCompletedRide');
                  navigate('/home');
                }}
                variant="secondary"
                className="w-full py-3 text-xs font-bold text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white rounded-xl flex items-center justify-center gap-1.5 cursor-pointer bg-transparent"
              >
                Skip / Rate Later
              </Button>
            </div>

          </form>

        </Card>

      </main>

      <NavigationBar className="block md:hidden" />
    </div>
  );
}
