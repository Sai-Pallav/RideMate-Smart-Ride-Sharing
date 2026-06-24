import React, { useState } from 'react';

/**
 * Reusable Avatar Component
 * Displays user photo with dynamic initials fallback state.
 */
export default function Avatar({
  src,
  name = '',
  size = 'md',
  className = '',
  ...props
}) {
  const [hasError, setHasError] = useState(false);

  // Derive initials
  const getInitials = (userName) => {
    if (!userName) return '?';
    const parts = userName.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Size styling mapping
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-12 w-12 text-sm',
    lg: 'h-18 w-18 text-xl font-bold'
  };

  const showFallback = !src || hasError;

  return (
    <div
      className={`
        relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 select-none
        ${showFallback ? 'bg-slate-800 border border-slate-700 text-brand-text-secondary font-semibold' : 'bg-slate-900 border border-slate-800'}
        ${sizeClasses[size] || sizeClasses.md}
        ${className}
      `}
      {...props}
    >
      {showFallback ? (
        <span>{getInitials(name)}</span>
      ) : (
        <img
          src={src}
          alt={name}
          onError={() => setHasError(true)}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
