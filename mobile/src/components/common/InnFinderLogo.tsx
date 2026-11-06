import React from 'react';
import { View, Image, ImageStyle } from 'react-native';

export type LogoVariant = 'horizontal' | 'icon' | 'badge';
export type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

export interface InnFinderLogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  style?: ImageStyle;
  className?: string;
}

const DIMENSIONS: Record<LogoVariant, Record<LogoSize, { width: number; height: number }>> = {
  horizontal: {
    sm: { width: 110, height: 36 }, // Khớp hoàn hảo với chiều cao 36px của chuông thông báo & avatar
    md: { width: 145, height: 48 },
    lg: { width: 195, height: 64 },
    xl: { width: 255, height: 84 },
  },
  icon: {
    sm: { width: 32, height: 32 },
    md: { width: 44, height: 44 },
    lg: { width: 64, height: 64 },
    xl: { width: 96, height: 96 },
  },
  badge: {
    sm: { width: 36, height: 36 },
    md: { width: 52, height: 52 },
    lg: { width: 80, height: 80 },
    xl: { width: 120, height: 120 },
  },
};

export const InnFinderLogo: React.FC<InnFinderLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  style,
  className,
}) => {
  const dims = DIMENSIONS[variant][size];

  const source =
    variant === 'horizontal'
      ? require('../../../assets/logo-horizontal.png')
      : variant === 'badge'
      ? require('../../../assets/logo-badge.png')
      : require('../../../assets/icon.png');

  return (
    <View className={`justify-center items-start ${className || ''}`}>
      <Image
        source={source}
        style={[{ width: dims.width, height: dims.height, resizeMode: 'contain' }, style]}
      />
    </View>
  );
};
