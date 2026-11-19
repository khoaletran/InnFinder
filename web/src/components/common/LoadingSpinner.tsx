import React from 'react';
import { Spinner } from '@heroui/react';

interface LoadingSpinnerProps {
  label?: string;
  fullHeight?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  label = 'Đang tải dữ liệu...',
  fullHeight = false,
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${
        fullHeight ? 'min-h-[360px]' : 'py-12'
      }`}
    >
      <Spinner size="lg" />
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
};
