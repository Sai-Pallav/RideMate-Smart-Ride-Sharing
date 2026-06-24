import React from 'react';

/**
 * Reusable Badge Component
 * Handles status labels, verification levels, and matching tags.
 */
export default function Badge({
  children,
  variant = 'info',
  className = '',
  ...props
}) {
  const baseClasses = 'inline-flex items-center px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold select-none border tracking-wide uppercase';
  
  const variantClasses = {
    info: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    safety: 'bg-brand-safety/10 text-brand-safety border-brand-safety/20 shadow-[0_0_8px_rgba(244,63,94,0.1)]'
  };

  return (
    <span
      className={`
        ${baseClasses} 
        ${variantClasses[variant] || variantClasses.info} 
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  );
}
