import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockAuth } from '../utils/mockAuthFlow';

export default function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      // Simulate splash display/session check duration
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (!mockAuth.isOnboarded()) {
        navigate('/onboarding');
      } else if (!mockAuth.isLoggedIn()) {
        navigate('/login');
      } else if (!mockAuth.isProfileSetup()) {
        navigate('/profile-setup');
      } else {
        navigate('/home');
      }
    };

    checkSession();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-brand-bg-base text-brand-text-primary flex flex-col items-center justify-center p-6 select-none">
      <div className="max-w-md w-full text-center space-y-6">
        
        {/* Animated Brand Logo Symbol */}
        <div className="relative flex items-center justify-center mx-auto h-24 w-24">
          <span className="animate-ping absolute inline-flex h-20 w-20 rounded-full bg-brand-primary/20 opacity-75"></span>
          <div className="relative h-20 w-20 rounded-full bg-slate-900 border-2 border-brand-primary flex items-center justify-center shadow-brand-glow">
            <svg className="h-10 w-10 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
        </div>

        {/* Brand Text */}
        <div className="space-y-2">
          <h1 className="text-3xl font-black bg-gradient-to-r from-brand-primary to-brand-primary-light bg-clip-text text-transparent tracking-tight">
            COMMUNITY RIDE
          </h1>
          <p className="text-brand-text-secondary text-xs uppercase tracking-widest font-bold">
            P2P Campus Pooling
          </p>
        </div>

        {/* Branded Tagline */}
        <p className="text-brand-text-muted text-sm italic font-medium px-4">
          "Share the ride. Split the cost. Travel safer."
        </p>

        {/* Loading Spinner */}
        <div className="pt-8 flex justify-center">
          <svg className="animate-spin h-6 w-6 text-brand-primary/60" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>

      </div>
    </div>
  );
}
