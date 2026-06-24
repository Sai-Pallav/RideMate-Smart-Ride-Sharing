import React from 'react';

/**
 * Reusable RatingDisplay Component
 * Displays a 5-star rating using pure SVG stars.
 */
export default function RatingDisplay({
  rating = 5,
  size = 'sm',
  className = '',
  ...props
}) {
  const starsTotal = 5;
  const numericRating = Math.max(0, Math.min(starsTotal, parseFloat(rating) || 0));

  const sizeClasses = {
    sm: 'h-3.5 w-3.5 gap-0.5 text-xs',
    md: 'h-5 w-5 gap-1 text-sm'
  };

  const starSize = size === 'md' ? 20 : 14;

  return (
    <div 
      className={`inline-flex items-center gap-1 text-brand-text-secondary ${className}`}
      {...props}
    >
      <div className="flex gap-0.5">
        {[...Array(starsTotal)].map((_, i) => {
          const starNumber = i + 1;
          const isFilled = starNumber <= Math.round(numericRating);
          
          return (
            <svg
              key={i}
              width={starSize}
              height={starSize}
              viewBox="0 0 24 24"
              fill={isFilled ? '#f59e0b' : 'none'}
              stroke={isFilled ? '#f59e0b' : '#475569'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition duration-150"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          );
        })}
      </div>
      
      {/* Show numeric rating text */}
      <span className={`font-bold text-slate-300 ml-1 ${size === 'md' ? 'text-sm' : 'text-xs'}`}>
        {numericRating.toFixed(1)}
      </span>
    </div>
  );
}
