import React from 'react';

/**
 * Reusable SkeletonLoader Component
 * Mirrors eventual layouts (lines, cards, profile rows) to improve perceived performance.
 */
export default function SkeletonLoader({
  variant = 'line',
  count = 1,
  className = '',
  ...props
}) {
  const renderSkeleton = (key) => {
    switch (variant) {
      case 'card':
        return (
          <div 
            key={key} 
            className="w-full bg-brand-bg-card/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-slate-800 rounded-full shrink-0" />
              <div className="space-y-2 w-full">
                <div className="h-4 w-1/3 bg-slate-800 rounded" />
                <div className="h-3 w-1/4 bg-slate-800 rounded" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full bg-slate-800 rounded" />
              <div className="h-3 w-5/6 bg-slate-800 rounded" />
            </div>
            <div className="h-9 w-full bg-slate-800 rounded-xl" />
          </div>
        );
      
      case 'avatar-row':
        return (
          <div key={key} className="flex items-center gap-3 p-3 animate-pulse">
            <div className="h-12 w-12 bg-slate-800 rounded-full shrink-0" />
            <div className="space-y-2 w-full">
              <div className="h-4.5 w-1/4 bg-slate-800 rounded" />
              <div className="h-3 w-1/2 bg-slate-800 rounded" />
            </div>
          </div>
        );

      case 'line':
      default:
        return (
          <div key={key} className="space-y-2 w-full animate-pulse py-2">
            <div className="h-4 bg-slate-800 rounded w-full" />
          </div>
        );
    }
  };

  return (
    <div className={`space-y-3 w-full ${className}`} {...props}>
      {[...Array(count)].map((_, i) => renderSkeleton(i))}
    </div>
  );
}
