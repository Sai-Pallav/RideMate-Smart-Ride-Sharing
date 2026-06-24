import React, { useState } from 'react';
import Button from '../components/Button';
import InputField from '../components/InputField';
import OtpInput from '../components/OtpInput';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import RatingDisplay from '../components/RatingDisplay';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import ErrorBanner from '../components/ErrorBanner';
import NavigationBar from '../components/NavigationBar';
import FloatingSOS from '../components/FloatingSOS';

export default function StyleGuide() {
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [inputText, setInputText] = useState('');
  const [inputError, setInputError] = useState('');

  const handleInputValidation = (val) => {
    setInputText(val);
    if (val.length < 5) {
      setInputError('Must be at least 5 characters');
    } else {
      setInputError('');
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg-base text-brand-text-primary pb-32">
      {/* Persistently show Top Navigation Bar mockup */}
      <NavigationBar className="sticky top-0 z-40" />

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-12">
        {/* Header */}
        <header className="border-b border-slate-800 pb-6">
          <Badge variant="safety" className="mb-2">Dev Sandbox</Badge>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-brand-primary to-brand-primary-light bg-clip-text text-transparent">
            Design System Style Guide
          </h1>
          <p className="text-brand-text-secondary mt-2 text-sm md:text-base">
            Sanity-check page for the P2P community ride-sharing design tokens and core reusable components.
          </p>
        </header>

        {/* 1. Theme Color Palettes */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-200 border-l-4 border-brand-primary pl-3">1. Design System Tokens</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            <div className="bg-brand-bg-base border border-slate-800 p-4 rounded-xl flex flex-col justify-between h-24">
              <span className="text-[10px] uppercase font-bold text-brand-text-secondary">bg-base</span>
              <span className="text-xs font-mono">#090a0f</span>
            </div>
            <div className="bg-brand-bg-card border border-slate-800 p-4 rounded-xl flex flex-col justify-between h-24">
              <span className="text-[10px] uppercase font-bold text-brand-text-secondary">bg-card</span>
              <span className="text-xs font-mono">#12141c</span>
            </div>
            <div className="bg-brand-bg-overlay border border-slate-850 p-4 rounded-xl flex flex-col justify-between h-24">
              <span className="text-[10px] uppercase font-bold text-brand-text-secondary">bg-overlay</span>
              <span className="text-xs font-mono">#1a1c26</span>
            </div>
            <div className="bg-brand-primary p-4 rounded-xl flex flex-col justify-between h-24 text-white">
              <span className="text-[10px] uppercase font-bold text-white/70">primary</span>
              <span className="text-xs font-mono">#6366f1</span>
            </div>
            <div className="bg-brand-safety p-4 rounded-xl flex flex-col justify-between h-24 text-white">
              <span className="text-[10px] uppercase font-bold text-white/70">safety/sos</span>
              <span className="text-xs font-mono">#f43f5e</span>
            </div>
            <div className="bg-emerald-500 p-4 rounded-xl flex flex-col justify-between h-24 text-slate-950">
              <span className="text-[10px] uppercase font-bold text-slate-900/60">success</span>
              <span className="text-xs font-mono">#10b981</span>
            </div>
          </div>
        </section>

        {/* 2. Reusable Buttons */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-200 border-l-4 border-brand-primary pl-3">2. Buttons (variants & sizes)</h2>
          <Card className="p-6">
            <div className="flex flex-wrap gap-4 items-center">
              <Button variant="primary">Primary Button</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="danger">Danger Action</Button>
              <Button variant="sos">SOS Button</Button>
              <Button variant="primary" loading={true}>Processing</Button>
              <Button variant="secondary" disabled={true}>Disabled</Button>
            </div>
            <div className="flex flex-wrap gap-4 items-center mt-6 pt-6 border-t border-slate-850">
              <Button size="large" variant="primary">Large Action (52px)</Button>
              <Button size="default" variant="secondary">Default Touch (44px)</Button>
            </div>
          </Card>
        </section>

        {/* 3. Text Fields & OTP Fields */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-200 border-l-4 border-brand-primary pl-3">3. Input Controls</h2>
          <Card className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Standard Text Fields</h3>
              <InputField
                label="Full Name"
                placeholder="Enter your name"
                value={inputText}
                error={inputError}
                onChange={(e) => handleInputValidation(e.target.value)}
                helperText="Enter at least 5 characters to pass validation"
              />
              <InputField
                label="Disabled Field"
                value="Sample unmodifiable value"
                disabled={true}
              />
            </div>
            
            <div className="space-y-4 text-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 text-left">OTP Verification Input</h3>
              <div className="py-4 bg-slate-900/40 rounded-2xl border border-slate-800 p-4">
                <OtpInput
                  length={6}
                  error={otpError}
                  onChange={(val) => {
                    setOtpCode(val);
                    if (val.length === 6) {
                      if (val !== '123456') {
                        setOtpError(true);
                      } else {
                        setOtpError(false);
                        alert('Correct OTP! Verified.');
                      }
                    }
                  }}
                />
                <div className="mt-4 text-xs">
                  <p className="text-brand-text-secondary">Code entered: <span className="font-mono font-bold text-brand-primary">{otpCode || '------'}</span></p>
                  <p className="text-brand-text-muted mt-1">(Type "123456" to verify, any other code triggers error validation)</p>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* 4. Avatars, Ratings & Badges */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-200 border-l-4 border-brand-primary pl-3">4. Badges, Avatars & Ratings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Badges card */}
            <Card className="p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Badges</h3>
              <div className="flex flex-wrap gap-2">
                <Badge variant="info">Exact Route</Badge>
                <Badge variant="success">Verified Domain</Badge>
                <Badge variant="warning">Ongoing</Badge>
                <Badge variant="danger">Cancelled</Badge>
                <Badge variant="safety">SOS Active</Badge>
              </div>
            </Card>

            {/* Avatars card */}
            <Card className="p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Avatars</h3>
              <div className="flex items-center gap-4">
                <Avatar name="Sai Pallavi" size="lg" />
                <Avatar name="Kotas" size="md" />
                <Avatar name="Driver Demo" size="sm" />
              </div>
              <div className="text-xs text-brand-text-secondary">
                Fallbacks automatically render uppercase initials derived from username.
              </div>
            </Card>

            {/* Rating card */}
            <Card className="p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Rating Display</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-brand-text-secondary">Small size (Listings):</span>
                  <RatingDisplay rating={4.8} size="sm" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-brand-text-secondary">Medium size (Profiles):</span>
                  <RatingDisplay rating={3.5} size="md" />
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* 5. Skeleton Loaders */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-200 border-l-4 border-brand-primary pl-3">5. Skeleton Loaders</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">List Card Skeleton</h3>
              <SkeletonLoader variant="card" count={1} />
            </Card>
            <Card className="p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Profile Row & Line Skeletons</h3>
              <SkeletonLoader variant="avatar-row" count={1} />
              <div className="border-t border-slate-850 pt-4">
                <SkeletonLoader variant="line" count={2} />
              </div>
            </Card>
          </div>
        </section>

        {/* 6. Feedback Banners (Empty & Error States) */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-200 border-l-4 border-brand-primary pl-3">6. Cross-Cutting Empty/Error banners</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-5 flex flex-col justify-center min-h-[220px]">
              <EmptyState
                title="No active bookings found"
                description="You don't have any upcoming trips scheduled. Search for verified drivers heading your way."
                icon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
                actionText="Search Rides"
                onActionClick={() => alert('Search clicked!')}
              />
            </Card>

            <Card className="p-5 flex flex-col justify-center min-h-[220px]">
              <ErrorBanner
                message="Failed to load route match telemetry. Check network status."
                onRetry={() => alert('Retrying fetch operations...')}
              />
            </Card>
          </div>
        </section>
      </div>

      {/* Floating SOS buttons rendering */}
      <FloatingSOS />

      {/* Mock Bottom Navigation Bar for Mobile rendering */}
      <NavigationBar className="md:hidden" />
    </div>
  );
}
