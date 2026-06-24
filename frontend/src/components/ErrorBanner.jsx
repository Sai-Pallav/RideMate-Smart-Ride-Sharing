import React from 'react';

/**
 * Reusable ErrorBanner / Inline Retry Component
 * Implements user-friendly error messages paired with retry triggers.
 */
export default function ErrorBanner({
  message = 'Something went wrong. Please check your connection.',
  onRetry,
  className = '',
  ...props
}) {
  return (
    <div
      className={`
        flex items-center justify-between p-4 rounded-xl gap-4 border
        bg-red-500/10 border-red-500/20 text-rose-400 text-sm max-w-lg mx-auto
        ${className}
      `}
      {...props}
    >
      <div className="flex items-center gap-2">
        {/* Warning Icon */}
        <svg className="h-5 w-5 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="font-medium text-xs md:text-sm text-left">
          {message}
        </span>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-xs font-bold uppercase tracking-wider text-rose-400 hover:text-rose-300 transition duration-150 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 cursor-pointer select-none active:scale-95 shrink-0"
        >
          Retry
        </button>
      )}
    </div>
  );
}
