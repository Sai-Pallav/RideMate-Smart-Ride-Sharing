import React from 'react';

/**
 * Reusable Card Component
 * Premium container utilizing base dark and elevated layers with nice inner borders.
 */
export default function Card({
  children,
  elevated = false,
  className = '',
  ...props
}) {
  return (
    <div
      className={`
        rounded-2xl border transition duration-300 overflow-hidden
        ${elevated 
          ? 'bg-brand-bg-overlay border-slate-700/60 shadow-lg' 
          : 'bg-brand-bg-card border-slate-800/80 shadow-md'
        }
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
