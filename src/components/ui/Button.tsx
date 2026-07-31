import React from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

const Button = React.forwardRef(
  ({ className, variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    
    const variants = {
      primary: 'bg-primary text-white hover:bg-secondary border border-transparent shadow-sm',
      secondary: 'bg-surface text-textPrimary hover:bg-borderLight border border-borderLight shadow-sm',
      outline: 'bg-transparent text-primary border border-primary hover:bg-blue-50',
      ghost: 'bg-transparent text-textSecondary hover:text-textPrimary hover:bg-surface',
      danger: 'bg-danger text-white hover:bg-red-600 border border-transparent shadow-sm',
    };
    
    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 py-2 text-sm',
      lg: 'h-12 px-6 text-base',
      icon: 'h-10 w-10 flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
