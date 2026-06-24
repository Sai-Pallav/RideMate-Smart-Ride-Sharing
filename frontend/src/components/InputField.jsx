import React from 'react';

/**
 * Reusable Input Field Component
 * Premium cinematic dark styling with validation error support.
 */
export default function InputField({
  label,
  error,
  helperText,
  id,
  className = '',
  disabled = false,
  type = 'text',
  ...props
}) {
  const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;
  const hasError = Boolean(error);

  return (
    <div className={`flex flex-col w-full text-left gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary select-none"
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        <input
          id={inputId}
          type={type}
          disabled={disabled}
          className={`
            w-full px-4 py-3 rounded-xl bg-brand-bg-card text-brand-text-primary text-sm 
            border transition duration-200 select-all outline-none min-h-[44px]
            ${hasError 
              ? 'border-brand-safety focus:border-brand-safety focus:ring-1 focus:ring-brand-safety' 
              : 'border-slate-800 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/50'
            }
            ${disabled 
              ? 'opacity-40 cursor-not-allowed select-none bg-slate-900' 
              : 'hover:border-slate-700'
            }
          `}
          {...props}
        />
      </div>

      {hasError && (
        <span className="text-xs text-brand-safety font-medium flex items-center gap-1 mt-0.5">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </span>
      )}

      {!hasError && helperText && (
        <span className="text-xs text-brand-text-muted mt-0.5">
          {helperText}
        </span>
      )}
    </div>
  );
}
