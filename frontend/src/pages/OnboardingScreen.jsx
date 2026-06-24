import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { mockAuth } from '../utils/mockAuthFlow';

export default function OnboardingScreen() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);

  const onboardingSteps = [
    {
      title: "This isn't a taxi app",
      subtitle: "It's sharing rides already happening.",
      description: "Drivers are regular community members already traveling along your route. We coordinate matching and cost-sharing, not commercial dispatch.",
      icon: (
        <svg className="h-16 w-16 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      )
    },
    {
      title: "Save money daily",
      subtitle: "Split fuel cost fairly.",
      description: "Platform calculates proportional cost-splitting automatically based on distance. No awkward negotiating, just clean math to recover commute costs.",
      icon: (
        <svg className="h-16 w-16 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: "Verified Community",
      subtitle: "Rated, safety-first environment.",
      description: "Strict institutional email or government verification and bidirectional ratings build deep trust anchors before you ever get in the vehicle.",
      icon: (
        <svg className="h-16 w-16 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    {
      title: "Built for commuters",
      subtitle: "Connecting campus & office hubs.",
      description: "Optimized for fixed and recurring daily commutes. Share empty seats with classmates and colleagues heading to the same campus or IT cluster.",
      icon: (
        <svg className="h-16 w-16 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    }
  ];

  const handleFinish = () => {
    mockAuth.setOnboarded();
    navigate('/login');
  };

  const handleNext = () => {
    if (activeStep < onboardingSteps.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const current = onboardingSteps[activeStep];
  const isLastStep = activeStep === onboardingSteps.length - 1;

  return (
    <div className="min-h-screen bg-brand-bg-base text-brand-text-primary flex flex-col justify-between p-6">
      
      {/* Header Bar */}
      <header className="flex items-center justify-between py-2">
        <span className="text-xs font-black tracking-widest text-slate-500 uppercase">
          Onboarding
        </span>
        
        {/* Skip button only shows before final card */}
        {!isLastStep ? (
          <button
            type="button"
            onClick={handleFinish}
            className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary hover:text-brand-text-primary cursor-pointer transition select-none active:scale-95 px-3 py-1.5 rounded-lg hover:bg-slate-800/40"
          >
            Skip
          </button>
        ) : (
          <div className="h-7 w-12" /> // spacer
        )}
      </header>

      {/* Main Carousel Area */}
      <main className="flex-1 flex items-center justify-center my-8">
        <Card className="w-full max-w-md p-8 flex flex-col items-center text-center space-y-6 border-slate-800/80 bg-brand-bg-card/90">
          
          <div className="p-4 bg-slate-900/60 rounded-3xl border border-slate-800">
            {current.icon}
          </div>

          <div className="space-y-2">
            {activeStep === 0 && (
              <Badge variant="safety" className="mb-2">Crucial Note</Badge>
            )}
            <h2 className="text-2xl font-black tracking-tight text-brand-text-primary">
              {current.title}
            </h2>
            <h3 className="text-sm font-semibold text-brand-primary">
              {current.subtitle}
            </h3>
            <p className="text-xs md:text-sm text-brand-text-secondary leading-relaxed pt-2">
              {current.description}
            </p>
          </div>

        </Card>
      </main>

      {/* Bottom controls */}
      <footer className="space-y-6 w-full max-w-md mx-auto">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2">
          {onboardingSteps.map((_, idx) => (
            <span
              key={idx}
              className={`
                h-2 rounded-full transition-all duration-300
                ${activeStep === idx ? 'w-6 bg-brand-primary' : 'w-2 bg-slate-800'}
              `}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between gap-4">
          {activeStep > 0 ? (
            <Button
              variant="secondary"
              onClick={handleBack}
              className="flex-1"
            >
              Back
            </Button>
          ) : (
            <div className="flex-1 hidden md:block" /> // Spacer to balance
          )}
          
          <Button
            variant={isLastStep ? 'primary' : 'secondary'}
            onClick={handleNext}
            className="flex-1"
          >
            {isLastStep ? 'Get Started' : 'Next'}
          </Button>
        </div>
      </footer>

    </div>
  );
}
