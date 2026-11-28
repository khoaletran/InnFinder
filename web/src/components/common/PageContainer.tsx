import React from 'react';

export type ContainerWidth = 'full' | 'wide' | 'narrow';

interface PageContainerProps {
  width?: ContainerWidth;
  className?: string;
  children: React.ReactNode;
}

const WIDTH_CLASSES: Record<ContainerWidth, string> = {
  full: 'w-full',
  wide: 'max-w-7xl w-full mx-auto px-4 sm:px-6',
  narrow: 'max-w-[800px] w-full mx-auto px-4 sm:px-6',
};

export const PageContainer: React.FC<PageContainerProps> = ({
  width = 'wide',
  className = '',
  children,
}) => {
  return <div className={`${WIDTH_CLASSES[width]} ${className}`.trim()}>{children}</div>;
};
