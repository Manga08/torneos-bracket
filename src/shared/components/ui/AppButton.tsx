import { Loader2 } from 'lucide-react';
import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  isLoading?: boolean;
  theme?: string; // Explicit theme prop
}

const BUTTON_STYLES = {
  default: {
    primary: 'btn-primary',
    secondary:
      'bg-surface-highlight border border-white/10 text-white hover:bg-surface-highlight/80', // Custom secondary for default
    ghost: 'btn-ghost',
    danger: 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20',
  },
  valorant: {
    primary: 'valorant-btn-primary',
    secondary: 'valorant-btn-secondary',
    ghost: 'valorant-btn-ghost',
    danger: 'valorant-btn-secondary border-red-500/50 text-red-400 hover:bg-red-500/10', // Map danger to secondary with red tint
  },
} as const;

const SIZES = {
  sm: 'text-xs py-1.5 px-3',
  md: 'text-sm py-2 px-4',
  lg: 'text-base py-3 px-6',
};

export const AppButton = React.forwardRef<HTMLButtonElement, AppButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      leftIcon,
      rightIcon,
      fullWidth = false,
      isLoading = false,
      theme = 'default',
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    // Determine effective theme (fallback to default if theme not found in styles)
    const effectiveTheme =
      theme && theme in BUTTON_STYLES ? (theme as keyof typeof BUTTON_STYLES) : 'default';

    // Get base class for variant
    const variantClass = BUTTON_STYLES[effectiveTheme][variant];

    // Get size class
    const sizeClass = SIZES[size];

    // Common classes
    const baseClasses =
      'inline-flex items-center justify-center gap-2 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed';
    const widthClass = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variantClass} ${sizeClass} ${widthClass} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="animate-spin" size={16} />}
        {!isLoading && leftIcon}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  },
);

AppButton.displayName = 'AppButton';
