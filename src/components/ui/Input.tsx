import React from 'react';
import { cn } from '../../utils/cn';

const Input = React.forwardRef(({ className, type, error, label, id, ...props }, ref) => {
  const generatedId = id || (label ? `input-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : undefined);
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={generatedId} className="block text-sm font-medium text-textPrimary mb-1.5">
          {label}
        </label>
      )}
      <input
        id={generatedId}
        type={type}
        aria-label={label}
        className={cn(
          "flex h-10 w-full rounded-lg border border-borderLight bg-white px-3 py-2 text-sm text-textPrimary shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-textSecondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-danger focus-visible:ring-danger",
          className
        )}
        ref={ref}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-danger font-medium">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export { Input };
