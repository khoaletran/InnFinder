import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface AdminErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export const AdminErrorState: React.FC<AdminErrorStateProps> = ({
  title = 'Không thể tải dữ liệu',
  message = 'Đã xảy ra lỗi khi kết nối máy chủ. Vui lòng thử lại sau.',
  onRetry,
  compact = false,
}) => {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-danger-border bg-danger-bg text-center flex flex-col items-center justify-center ${
        compact ? 'p-6' : 'p-10'
      }`}
    >
      <div className="w-10 h-10 rounded-[var(--radius-control)] bg-surface border border-danger-border text-danger-text flex items-center justify-center mb-3">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-semibold text-danger-text">{title}</h4>
      <p className="text-xs text-text-secondary mt-1 max-w-md leading-relaxed">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 px-4 py-2 rounded-[var(--radius-control)] bg-surface hover:bg-bg border border-danger-border text-danger-text text-xs font-medium inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Thử lại
        </button>
      )}
    </div>
  );
};

interface AdminTableSkeletonProps {
  rows?: number;
  cols: number;
}

export const AdminTableSkeleton: React.FC<AdminTableSkeletonProps> = ({ rows = 5, cols }) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx} className="animate-pulse">
          {Array.from({ length: cols }).map((__, colIdx) => (
            <td key={colIdx} className="py-3.5 px-4">
              <div
                className={`h-3.5 bg-slate-200/80 rounded-md ${
                  colIdx === 0 ? 'w-36' : colIdx === cols - 1 ? 'w-14 ml-auto' : 'w-24'
                }`}
              />
              {colIdx === 0 && <div className="h-2.5 bg-slate-100 rounded-md w-20 mt-1.5" />}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

interface AdminRefreshButtonProps {
  onClick: () => void;
  isRefreshing?: boolean;
  label?: string;
}

export const AdminRefreshButton: React.FC<AdminRefreshButtonProps> = ({
  onClick,
  isRefreshing = false,
  label = 'Làm mới',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isRefreshing}
      className="px-3.5 py-2 rounded-[var(--radius-control)] bg-surface border border-border hover:bg-bg text-xs font-medium text-text-secondary inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors duration-150 cursor-pointer self-start sm:self-auto shrink-0"
    >
      <RefreshCw className={`w-3.5 h-3.5 text-tone-teal-base ${isRefreshing ? 'animate-spin' : ''}`} />
      <span>{label}</span>
    </button>
  );
};
