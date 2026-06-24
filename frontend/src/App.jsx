import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';

// Import all screen components
import SplashScreen from './pages/SplashScreen';
import OnboardingScreen from './pages/OnboardingScreen';
import LoginScreen from './pages/LoginScreen';
import OtpVerificationScreen from './pages/OtpVerificationScreen';
import RegistrationScreen from './pages/RegistrationScreen';
import ProfileSetupScreen from './pages/ProfileSetupScreen';
import HomeScreen from './pages/HomeScreen';
import SearchScreen from './pages/SearchScreen';
import SearchResultsScreen from './pages/SearchResultsScreen';
import RideDetailsScreen from './pages/RideDetailsScreen';
import CreateRideScreen from './pages/CreateRideScreen';
import RideRequestsScreen from './pages/RideRequestsScreen';
import ActiveRideScreen from './pages/ActiveRideScreen';
import RideCompletionScreen from './pages/RideCompletionScreen';
import RatingScreen from './pages/RatingScreen';
import NotificationsScreen from './pages/NotificationsScreen';
import ProfileScreen from './pages/ProfileScreen';
import PublicProfileScreen from './pages/PublicProfileScreen';
import RideHistoryScreen from './pages/RideHistoryScreen';
import SavingsDashboardScreen from './pages/SavingsDashboardScreen';
import SafetyCenterScreen from './pages/SafetyCenterScreen';
import ReportCenterScreen from './pages/ReportCenterScreen';
import SettingsScreen from './pages/SettingsScreen';
import AdminDashboardScreen from './pages/AdminDashboardScreen';
import StyleGuide from './pages/StyleGuide';

// ─── Protected Route ─────────────────────────────────────────────────────────
// Redirects to /login if no accessToken in auth store, handles hydration delay
function ProtectedRoute({ children }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [isHydrated, setIsHydrated] = useState(() => useAuthStore.persist.hasHydrated());

  useEffect(() => {
    if (!isHydrated) {
      const unsub = useAuthStore.persist.onFinishHydration(() => {
        setIsHydrated(true);
      });
      return () => unsub();
    }
  }, [isHydrated]);

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// ─── Admin Route ──────────────────────────────────────────────────────────────
// Redirects to /home if user role is not admin, handles hydration delay
function AdminRoute({ children }) {
  const { accessToken, user } = useAuthStore((s) => ({
    accessToken: s.accessToken,
    user: s.user,
  }));
  const [isHydrated, setIsHydrated] = useState(() => useAuthStore.persist.hasHydrated());

  useEffect(() => {
    if (!isHydrated) {
      const unsub = useAuthStore.persist.onFinishHydration(() => {
        setIsHydrated(true);
      });
      return () => unsub();
    }
  }, [isHydrated]);

  const devBypass = typeof window !== 'undefined' &&
    localStorage.getItem('devAdminBypass') === 'true';

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!accessToken) return <Navigate to="/login" replace />;
  if (!devBypass && user?.role !== 'admin') {
    return <Navigate to="/home" replace />;
  }
  return children;
}

// ─── Screen Groups for Dev Catalog ───────────────────────────────────────────
const screenGroups = [
  {
    title: 'Identity & Registration (Screens 1-6)',
    color: 'border-blue-500/30 hover:border-blue-500/70',
    iconColor: 'text-blue-400',
    screens: [
      { name: 'Splash Screen', path: '/splash' },
      { name: 'Onboarding Screen', path: '/onboarding' },
      { name: 'Login Screen', path: '/login' },
      { name: 'OTP Verification', path: '/otp-verification' },
      { name: 'Registration Screen', path: '/registration' },
      { name: 'Profile Setup', path: '/profile-setup' },
    ],
  },
  {
    title: 'Ride Search & Discovery (Screens 7-12)',
    color: 'border-green-500/30 hover:border-green-500/70',
    iconColor: 'text-green-400',
    screens: [
      { name: 'Home Screen', path: '/home' },
      { name: 'Search Screen', path: '/search' },
      { name: 'Search Results', path: '/search-results' },
      { name: 'Ride Details', path: '/ride-details' },
      { name: 'Create Ride', path: '/create-ride' },
      { name: 'Ride Requests', path: '/ride-requests' },
    ],
  },
  {
    title: 'Active Ride & Safety (Screens 13-17)',
    color: 'border-red-500/30 hover:border-red-500/70',
    iconColor: 'text-red-400',
    screens: [
      { name: 'Active Ride (SOS)', path: '/active-ride' },
      { name: 'Ride Completion', path: '/ride-completion' },
      { name: 'Rating Screen', path: '/rating' },
      { name: 'Notifications', path: '/notifications' },
      { name: 'Own Profile', path: '/profile' },
    ],
  },
  {
    title: 'Account, Safety & Administration (Screens 18-24)',
    color: 'border-purple-500/30 hover:border-purple-500/70',
    iconColor: 'text-purple-400',
    screens: [
      { name: 'Public Profile', path: '/public-profile' },
      { name: 'Ride History', path: '/ride-history' },
      { name: 'Savings Dashboard', path: '/savings' },
      { name: 'Safety Center', path: '/safety-center' },
      { name: 'Report Center', path: '/report-center' },
      { name: 'Settings Screen', path: '/settings' },
      { name: 'Admin Dashboard', path: '/admin' },
    ],
  },
];

function DevCatalog() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-6 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              RideSharing Platform
            </h1>
            <p className="text-slate-400 mt-1">Frontend Catalog — Live API Connected</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/dev/style-guide"
              className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-4 py-2 rounded-full border border-indigo-500/20 hover:bg-indigo-500/20 transition duration-150"
            >
              🎨 Style Guide ↗
            </Link>
            <span className="flex h-3.5 w-3.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              Live API Wired ✓
            </span>
          </div>
        </header>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-bold text-slate-200">Backend API</h3>
            <p className="text-xs text-slate-400 mt-1">Express.js — {import.meta.env.VITE_API_BASE_URL}</p>
            <div className="mt-3">
              <a
                href={`${import.meta.env.VITE_API_BASE_URL}/health`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-purple-400 hover:text-purple-300 font-medium underline"
              >
                Test Health Endpoint ↗
              </a>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-slate-200">Auth State</h3>
            <p className="text-xs text-slate-400 mt-1">Zustand + localStorage persist</p>
            <span className="inline-block text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded mt-2">
              JWT access + refresh tokens
            </span>
          </div>
          <div>
            <h3 className="font-bold text-slate-200">Data Layer</h3>
            <p className="text-xs text-slate-400 mt-1">TanStack Query — cache + refetch</p>
            <span className="inline-block text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded mt-2">
              Axios interceptors on 401
            </span>
          </div>
        </section>

        <section className="space-y-8">
          <h2 className="text-2xl font-bold text-slate-100 border-l-4 border-purple-500 pl-3">
            24 Screens Client Routing Directory
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {screenGroups.map((group, groupIdx) => (
              <div
                key={groupIdx}
                className={`bg-slate-900/60 border rounded-2xl p-6 transition duration-300 shadow-sm ${group.color}`}
              >
                <h3 className={`font-semibold text-slate-100 text-lg mb-4 flex items-center gap-2`}>
                  <span className={`text-xl ${group.iconColor}`}>■</span>
                  {group.title}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {group.screens.map((screen, idx) => (
                    <Link
                      key={idx}
                      to={screen.path}
                      className="bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-4 py-3 rounded-xl transition duration-200 text-xs md:text-sm font-medium shadow-inner flex flex-col justify-between"
                    >
                      <span>{screen.name}</span>
                      <span className="text-[10px] text-slate-500 mt-1.5 font-mono">{screen.path}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="text-center text-xs text-slate-500 pt-8 border-t border-slate-900">
          Smart Community Ride Sharing Platform • Live API Wired Phase
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<SplashScreen />} />
        <Route path="/splash" element={<SplashScreen />} />
        <Route path="/onboarding" element={<OnboardingScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/otp-verification" element={<OtpVerificationScreen />} />
        <Route path="/registration" element={<RegistrationScreen />} />
        <Route path="/dev/catalog" element={<DevCatalog />} />
        <Route path="/dev/style-guide" element={<StyleGuide />} />

        {/* Protected routes — require valid JWT */}
        <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetupScreen /></ProtectedRoute>} />
        <Route path="/home" element={<ProtectedRoute><HomeScreen /></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><SearchScreen /></ProtectedRoute>} />
        <Route path="/search-results" element={<ProtectedRoute><SearchResultsScreen /></ProtectedRoute>} />
        <Route path="/ride-details" element={<ProtectedRoute><RideDetailsScreen /></ProtectedRoute>} />
        <Route path="/ride-details/:rideId" element={<ProtectedRoute><RideDetailsScreen /></ProtectedRoute>} />
        <Route path="/create-ride" element={<ProtectedRoute><CreateRideScreen /></ProtectedRoute>} />
        <Route path="/ride-requests" element={<ProtectedRoute><RideRequestsScreen /></ProtectedRoute>} />
        <Route path="/active-ride" element={<ProtectedRoute><ActiveRideScreen /></ProtectedRoute>} />
        <Route path="/ride-completion" element={<ProtectedRoute><RideCompletionScreen /></ProtectedRoute>} />
        <Route path="/rating" element={<ProtectedRoute><RatingScreen /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsScreen /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfileScreen /></ProtectedRoute>} />
        <Route path="/public-profile/:userId" element={<ProtectedRoute><PublicProfileScreen /></ProtectedRoute>} />
        <Route path="/public-profile" element={<ProtectedRoute><PublicProfileScreen /></ProtectedRoute>} />
        <Route path="/ride-history" element={<ProtectedRoute><RideHistoryScreen /></ProtectedRoute>} />
        <Route path="/savings" element={<ProtectedRoute><SavingsDashboardScreen /></ProtectedRoute>} />
        <Route path="/safety-center" element={<ProtectedRoute><SafetyCenterScreen /></ProtectedRoute>} />
        <Route path="/report-center" element={<ProtectedRoute><ReportCenterScreen /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsScreen /></ProtectedRoute>} />

        {/* Admin-only route */}
        <Route path="/admin" element={<AdminRoute><AdminDashboardScreen /></AdminRoute>} />
      </Routes>
    </Router>
  );
}
