import React from 'react';
import Button from './Button';

/**
 * Reusable EmptyState Component
 * Ensures users never face a dead-end by always pairing messages with an action.
 */
export default function EmptyState({
  title,
  description,
  icon,
  actionText,
  onActionClick,
  className = '',
  ...props
}) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center p-8 rounded-2xl
        bg-brand-bg-card/40 border border-slate-800/80 border-dashed max-w-md mx-auto space-y-5
        ${className}
      `}
      {...props}
    >
      {icon && (
        <div className="text-slate-600 bg-slate-900/50 p-4 rounded-full border border-slate-800">
          {icon}
        </div>
      )}
      
      <div className="space-y-1.5">
        <h3 className="text-base font-bold text-brand-text-primary">
          {title}
        </h3>
        <p className="text-xs md:text-sm text-brand-text-secondary">
          {description}
        </p>
      </div>

      {actionText && onActionClick && (
        <Button onClick={onActionClick} variant="secondary" size="default">
          {actionText}
        </Button>
      )}
    </div>
  );
}
