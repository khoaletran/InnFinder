import React from 'react';

export type ContainerWidth = 'full' | 'wide' | 'narrow';

interface PageContainerProps {
  width?: ContainerWidth;
  className?: string;
  children: React.ReactNode;
}

const WIDTH_CLASSES: Record<ContainerWidth, string> = {
  full: 'w-full',
  wide: 'max-w-[1200px] w-full mx-auto px-4 sm:px-6',
  narrow: 'max-w-[800px] w-full mx-auto px-4 sm:px-6',
};

export const PageContainer: React.FC<PageContainerProps> = ({
  width = 'wide',
  className = '',
  children,
}) => {
  return <div className={`${WIDTH_CLASSES[width]} ${className}`.trim()}>{children}</div>;
};

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`.trim()}
    >
      <div className="min-w-0">
        <h1 className="text-[28px] leading-[1.25] font-extrabold text-slate-900 tracking-tight">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-slate-600 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  );
};
