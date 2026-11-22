import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerSolid';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-accent hover:bg-accent-hover text-white border border-transparent font-medium',
  secondary:
    'bg-surface hover:bg-bg text-text-secondary border border-border font-medium',
  ghost:
    'bg-transparent hover:bg-surface-muted text-text-secondary border border-transparent font-medium',
  danger:
    'bg-surface hover:bg-danger-bg text-danger-text border border-danger-border font-medium',
  dangerSolid:
    'bg-danger-text hover:opacity-90 text-white border border-transparent font-medium',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
};

export const AppButton: React.FC<AppButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}) => {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center rounded-[var(--radius-control)] transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${
        VARIANT_CLASSES[variant]
      } ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${className}`.trim()}
      {...rest}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
      {children}
    </button>
  );
};
