import React from 'react';

/**
 * Reusable FloatingSOS Component
 * Responsive placement: bottom-right on mobile (above tab bar), top-right on desktop.
 * Uses the safety rose theme and pulse effects to stay visually distinct.
 */
export default function FloatingSOS({
  onClick = () => alert('🚨 SOS Triggered! Emergency contacts notified.'),
  className = '',
  ...props
}) {
  return (
    <div className={`fixed z-50 pointer-events-none select-none ${className}`} {...props}>
      {/* 1. Mobile SOS Floating Button (Hidden on Desktop) */}
      <div className="md:hidden fixed bottom-24 right-6 pointer-events-auto">
        <button
          type="button"
          onClick={onClick}
          className="
            h-14 w-14 rounded-full bg-brand-safety hover:bg-brand-safety-hover text-white 
            flex flex-col items-center justify-center font-black text-[10px] tracking-wider uppercase
            shadow-brand-sos border border-red-500/30 cursor-pointer active:scale-90
            animate-[pulse_1.8s_infinite] focus:outline-none focus:ring-2 focus:ring-red-400
          "
        >
          <svg className="h-5 w-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          SOS
        </button>
      </div>

      {/* 2. Desktop SOS Sticky Button (Hidden on Mobile) */}
      <div className="hidden md:block fixed top-6 right-6 pointer-events-auto">
        <button
          type="button"
          onClick={onClick}
          className="
            px-4 py-2.5 rounded-xl bg-brand-safety hover:bg-brand-safety-hover text-white
            flex items-center gap-2 font-black text-xs tracking-wider uppercase
            shadow-brand-sos border border-red-500/20 cursor-pointer active:scale-95
            animate-[pulse_2s_infinite] focus:outline-none focus:ring-2 focus:ring-red-400
          "
        >
          <svg className="h-4.5 w-4.5 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          Emergency SOS
        </button>
      </div>
    </div>
  );
}
