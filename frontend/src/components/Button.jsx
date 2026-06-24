import React from 'react';

/**
 * Reusable Button Component
 * Matches the 44x44px minimum touch target requirement.
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'default',
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  ...props
}) {
  const isSos = variant === 'sos';
  
  // Base classes for cinematic premium feel
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-xl transition duration-250 cursor-pointer active:scale-98 select-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-bg-base';
  
  // Variant styling mapping
  const variantClasses = {
    primary: 'bg-brand-primary hover:bg-brand-primary-hover text-white shadow-brand-glow focus:ring-brand-primary/50',
    secondary: 'bg-brand-bg-card border border-slate-800 hover:border-slate-700 hover:bg-brand-bg-overlay text-brand-text-secondary hover:text-brand-text-primary focus:ring-slate-700/50',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500/50',
    sos: 'bg-brand-safety hover:bg-brand-safety-hover text-white uppercase tracking-wider text-sm font-extrabold shadow-brand-sos border border-red-500 focus:ring-brand-safety/50 animate-pulse'
  };

  // Size styling mapping (ensures touch targets are met)
  const sizeClasses = {
    default: 'px-5 py-2.5 text-sm min-h-[44px]',
    large: 'px-7 py-3.5 text-base min-h-[52px]'
  };

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`
        ${baseClasses} 
        ${variantClasses[variant] || variantClasses.primary} 
        ${sizeClasses[size] || sizeClasses.default} 
        ${isDisabled ? 'opacity-50 cursor-not-allowed active:scale-100' : ''} 
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          {/* Custom micro-loading spinner */}
          <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
