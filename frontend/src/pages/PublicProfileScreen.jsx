import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { getPublicProfile, getUserReviews } from '../api/profile';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import RatingDisplay from '../components/RatingDisplay';
import SkeletonLoader from '../components/SkeletonLoader';
import ErrorBanner from '../components/ErrorBanner';
import Button from '../components/Button';
import NavigationBar from '../components/NavigationBar';

const MOCK_PUBLIC_USERS = {
  "Aditya Sharma": {
    id: 1,
    name: "Aditya Sharma",
    avatar: "",
    rating: 4.9,
    ridesCount: 48,
    mobileVerified: true,
    emailVerified: true,
    idVerified: true,
    isDriver: true,
    vehicle: { name: "Honda Activa 6G (Black)", plate: "MH 12 AB 1011", type: "two_wheeler" },
    reviews: [
      { id: 101, author: "Rahul Gupta", rating: 5, comment: "Aditya was extremely punctual and drove very safely. Highly recommended co-traveler!" },
      { id: 102, author: "Sneha Kapur", rating: 4.5, comment: "Punctual, great music taste, and polite conversation." }
    ]
  },
  "Karan Malhotra": {
    id: 2,
    name: "Karan Malhotra",
    avatar: "",
    rating: 4.6,
    ridesCount: 32,
    mobileVerified: true,
    emailVerified: true,
    idVerified: true,
    isDriver: true,
    vehicle: { name: "Maruti Swift (Red)", plate: "DL 3C AN 5566", type: "car" },
    reviews: [
      { id: 201, author: "Kunal Shah", rating: 4, comment: "Comfortable car ride. He was on time." }
    ]
  },
  "Vikram Singh": {
    id: 3,
    name: "Vikram Singh",
    avatar: "",
    rating: 4.2,
    ridesCount: 18,
    mobileVerified: true,
    emailVerified: false,
    idVerified: false,
    isDriver: true,
    vehicle: { name: "Honda City (White)", plate: "HR 26 AB 9988", type: "car" },
    reviews: [
      { id: 301, author: "Aman Sen", rating: 4, comment: "Overall smooth commute, though departure was slightly delayed." }
    ]
  },
  "Rohan Verma": {
    id: 4,
    name: "Rohan Verma",
    avatar: "",
    rating: 0,
    ridesCount: 0,
    mobileVerified: true,
    emailVerified: true,
    idVerified: true,
    isDriver: false,
    reviews: []
  }
};

export default function PublicProfileScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useParams();

  // Core States
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  // Dev Toolbar States
  const [forceNewMember, setForceNewMember] = useState(false);
  const [forceLoading, setForceLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    setNotFound(false);

    if (userId) {
      try {
        const res = await getPublicProfile(userId);
        if (res && res.data) {
          const u = res.data;
          setProfile({
            id: u.user_id,
            name: u.full_name || 'User',
            avatar: u.photo_url || '',
            rating: u.aggregates?.rating || 0,
            ridesCount: u.aggregates?.completedRidesCount || 0,
            mobileVerified: !!u.badges?.mobile_verified,
            emailVerified: !!u.badges?.email_verified,
            idVerified: !!u.badges?.gov_id_verified,
            isDriver: !!u.active_vehicle,
            vehicle: u.active_vehicle ? {
              name: `${u.active_vehicle.make} ${u.active_vehicle.model}`,
              plate: u.active_vehicle.registration_number,
              type: 'car'
            } : null,
            bio: u.bio || '',
            gender: u.gender || ''
          });

          // Fetch reviews
          try {
            const revRes = await getUserReviews(userId);
            if (revRes && revRes.data) {
              setReviews(revRes.data.map(r => ({
                id: r.review_id,
                author: r.reviewer?.full_name || 'Anonymous User',
                rating: 5,
                comment: r.review_text
              })));
            }
          } catch (revErr) {
            console.error('Error fetching reviews:', revErr);
          }
        }
      } catch (err) {
        console.error('Error loading public profile:', err);
        if (err.response?.status === 404) {
          setNotFound(true);
        } else {
          setError('Failed to load profile details.');
        }
      } finally {
        setLoading(false);
      }
    } else {
      // Fallback/Mock behavior for name-based lookup (dev catalog utility)
      const queryParams = new URLSearchParams(location.search);
      const queryName = queryParams.get('name') || 'Aditya Sharma';
      const mockData = MOCK_PUBLIC_USERS[queryName] || MOCK_PUBLIC_USERS["Aditya Sharma"];
      
      setProfile(mockData);
      setReviews(mockData.reviews || []);
      setLoading(false);
    }
  }, [userId, location.search]);

  useEffect(() => {
    const init = async () => {
      await Promise.resolve();
      loadProfile();
    };
    init();
  }, [loadProfile]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-brand-bg-base text-brand-text-primary font-sans flex flex-col pb-24 md:pb-6 items-center justify-center text-center">
        <NavigationBar className="relative z-10 w-full" />
        <div className="max-w-md mx-auto p-8 space-y-4">
          <span className="text-4xl block">🔍</span>
          <h2 className="text-xl font-bold text-slate-200">User Not Found</h2>
          <p className="text-xs text-brand-text-secondary leading-relaxed">
            The profile you are trying to view does not exist or may have been deactivated.
          </p>
          <Button onClick={() => navigate(-1)} className="px-6 py-2 text-xs">Go Back</Button>
        </div>
      </div>
    );
  }

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-brand-bg-base text-brand-text-primary font-sans flex flex-col pb-24 md:pb-6 text-left">
        <NavigationBar className="relative z-10" />
        <main className="max-w-lg mx-auto w-full px-4 pt-6 flex-1 space-y-6">
          <SkeletonLoader variant="avatar-row" count={1} />
          <SkeletonLoader variant="card" count={2} />
        </main>
      </div>
    );
  }

  if (!profile) return null;

  const isNewMember = profile.ridesCount === 0 || forceNewMember;
  const isScreenLoading = loading || forceLoading;

  return (
    <div className="min-h-screen bg-brand-bg-base text-brand-text-primary font-sans flex flex-col pb-24 md:pb-6 text-left">
      
      {/* Dev Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap gap-2 items-center justify-between text-xs font-semibold z-30">
        <span className="font-bold text-indigo-400">🔧 DEV TOOLBAR:</span>
        <div className="flex gap-2">
          <button 
            onClick={() => setForceLoading(!forceLoading)} 
            className={`px-2 py-1 rounded transition cursor-pointer ${forceLoading ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-650 text-slate-200'}`}
          >
            {forceLoading ? 'Disable Skeletons' : 'Simulate Skeletons'}
          </button>
          <button 
            onClick={() => setForceNewMember(!forceNewMember)} 
            className={`px-2 py-1 rounded transition cursor-pointer ${forceNewMember ? 'bg-amber-600 text-white animate-pulse' : 'bg-slate-700 hover:bg-slate-650 text-slate-200'}`}
          >
            {forceNewMember ? 'Force New Member: ON' : 'Force New Member'}
          </button>
          <select 
            onChange={(e) => navigate(`/public-profile?name=${encodeURIComponent(e.target.value)}`)}
            value={profile.name}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-slate-350"
          >
            <option value="Aditya Sharma">Aditya Sharma</option>
            <option value="Karan Malhotra">Karan Malhotra</option>
            <option value="Vikram Singh">Vikram Singh</option>
            <option value="Rohan Verma">Rohan Verma (New Member)</option>
          </select>
        </div>
      </div>

      <NavigationBar className="relative z-10" />



      {/* Header Banner */}
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
            <h2 className="text-sm font-bold text-slate-200">{profile.name}'s Profile</h2>
          </div>
          <Badge variant={isNewMember ? 'info' : 'success'}>
            {isNewMember ? 'New Member' : 'Top Contributor'}
          </Badge>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-lg mx-auto w-full px-4 pt-6 flex-1 space-y-6">
        
        {error && <ErrorBanner message={error} />}

        {isScreenLoading ? (
          <div className="space-y-6">
            <SkeletonLoader variant="avatar-row" count={1} />
            <SkeletonLoader variant="card" count={2} />
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* 1. HEADER CARD (Avatar, Name, Rating/New Member tag) */}
            <Card className="p-5 border-slate-800 bg-gradient-to-br from-slate-900/60 to-indigo-950/5">
              <div className="flex items-center gap-4">
                <Avatar 
                  name={profile.name} 
                  src={profile.avatar} 
                  size="lg" 
                  className="border-2 border-indigo-500/20"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-extrabold text-slate-200 truncate">{profile.name}</h3>
                  
                  {isNewMember ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="info" className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-indigo-500/10 border-indigo-500/25 text-indigo-400">
                        🌱 New Member (0 rides completed)
                      </Badge>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1.5">
                      <RatingDisplay rating={profile.rating} size="sm" />
                      <span className="text-slate-500 text-xs">•</span>
                      <span className="text-[10px] text-brand-text-secondary font-bold uppercase tracking-wide">
                        {profile.ridesCount} commutes shared
                      </span>
                    </div>
                  )}

                  <p className="text-xs text-brand-text-muted mt-2 font-mono flex items-center gap-1">
                    <span>🛡️</span> Verified Institutional User
                  </p>
                </div>
              </div>
            </Card>

            {/* 2. VERIFICATION BADGES */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Verification Badge Status</h3>
              <div className="flex flex-wrap gap-2">
                <Badge variant={profile.mobileVerified ? 'success' : 'danger'}>
                  {profile.mobileVerified ? '✔️ Mobile Verified' : '❌ Mobile Unverified'}
                </Badge>
                <Badge variant={profile.emailVerified ? 'success' : 'danger'}>
                  {profile.emailVerified ? '✔️ Email Verified' : '❌ Email Unverified'}
                </Badge>
                <Badge variant={profile.idVerified ? 'success' : 'danger'}>
                  {profile.idVerified ? '✔️ College ID Verified' : '❌ College ID Missing'}
                </Badge>
              </div>
            </div>

            {/* 3. VEHICLE DETAILS (Only if Driver and has vehicle) */}
            {profile.isDriver && profile.vehicle && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Driver's Vehicle Details</h3>
                <Card className="p-4 border-slate-800 bg-slate-900/20">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{profile.vehicle.type === 'car' ? '🚗' : '🏍️'}</span>
                      <div className="text-left">
                        <span className="font-bold text-slate-200">{profile.vehicle.name}</span>
                        <span className="text-[10px] text-brand-text-muted block mt-0.5 uppercase font-bold font-mono">
                          Plate: {profile.vehicle.plate}
                        </span>
                      </div>
                    </div>
                    <Badge variant="success">Standard Insured</Badge>
                  </div>
                </Card>
              </div>
            )}

            {/* 4. REVIEWS TIMELINE (Non-anonymous reviews) */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Co-Traveler Reviews</h3>
              
              {isNewMember || !reviews || reviews.length === 0 ? (
                <div className="p-6 border border-dashed border-slate-800 rounded-2xl text-center text-xs text-brand-text-muted bg-slate-900/10">
                  No text reviews posted yet for this member.
                </div>
              ) : (
                <div className="space-y-2">
                  {reviews.map((rev) => (
                    <Card key={rev.id} className="p-4 border-slate-850">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <div className="flex items-center gap-2">
                          <Avatar name={rev.author} size="xs" />
                          <span className="text-slate-200">{rev.author}</span>
                        </div>
                        <div className="flex items-center gap-1 text-amber-400 font-mono text-[10px]">
                          <span>⭐</span>
                          <span>{rev.rating}/5</span>
                        </div>
                      </div>
                      <p className="text-xs text-brand-text-secondary leading-relaxed mt-2.5 pl-1.5 italic">
                        "{rev.comment}"
                      </p>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* 5. SUBTLE REPORT USER LINK */}
            <div className="pt-4 text-center border-t border-slate-900">
              <button 
                onClick={() => {
                  navigate('/report-center', { 
                    state: { 
                      reported_user_id: profile.id || userId,
                      reported_user_name: profile.name
                    } 
                  });
                }}
                className="inline-block text-xs font-semibold text-rose-400 hover:text-rose-350 hover:underline cursor-pointer select-none bg-transparent border-none p-0"
              >
                ⚠️ Report this member for safety/conduct policy violation
              </button>
            </div>

          </div>
        )}

      </main>

      <NavigationBar className="block md:hidden" />
    </div>
  );
}
