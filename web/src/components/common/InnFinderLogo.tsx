import React from 'react';
import logoHorizontal from '@/assets/logo.png';
import logoIcon from '@/assets/logo-icon.png';
import logoBadge from '@/assets/logo-badge.png';

export type LogoVariant = 'horizontal' | 'icon' | 'badge' | 'pin';
export type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

export interface InnFinderLogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
}

const SIZE_CLASSES: Record<LogoVariant, Record<LogoSize, string>> = {
  horizontal: {
    sm: 'h-8 w-auto',
    md: 'h-10 w-auto',
    lg: 'h-12 w-auto',
    xl: 'h-16 w-auto',
  },
  icon: {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  },
  badge: {
    sm: 'w-9 h-9',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  },
  pin: {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  },
};

const PIN_PIXEL_SIZE: Record<LogoSize, number> = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

/**
 * Logo Pin Vector trong suốt chuẩn thương hiệu InnFinder (#118A7E).
 */
export const InnFinderPinIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 44,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M50 6C29.5 6 13 22.5 13 43C13 66.8 44.2 91.2 48.1 94.2C49.2 95.1 50.8 95.1 51.9 94.2C55.8 91.2 87 66.8 87 43C87 22.5 70.5 6 50 6Z"
      fill="#118A7E"
    />
    <path
      d="M50 22L23 44.5L28.2 49.8L50 31.6L71.8 49.8L77 44.5L68 37V25.5H60.5V30.8L50 22Z"
      fill="#FFFFFF"
    />
    <path
      d="M32.5 48.5V67.5H44V55.5C44 52.2 46.7 49.5 50 49.5C53.3 49.5 56 52.2 56 55.5V67.5H67.5V48.5L50 34L32.5 48.5Z"
      fill="#FFFFFF"
    />
  </svg>
);

export const InnFinderLogo: React.FC<InnFinderLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  className = '',
}) => {
  if (variant === 'pin') {
    return <InnFinderPinIcon size={PIN_PIXEL_SIZE[size]} className={className} />;
  }

  const src =
    variant === 'horizontal'
      ? logoHorizontal
      : variant === 'badge'
      ? logoBadge
      : logoIcon;

  return (
    <img
      src={src}
      alt="InnFinder"
      className={`object-contain select-none ${SIZE_CLASSES[variant][size]} ${className}`}
    />
  );
};
