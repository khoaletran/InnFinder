import React from 'react';

interface SkeletonListProps {
  variant?: 'cards' | 'rows' | 'horizontal';
  count?: number;
  columnsClassName?: string;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  variant = 'cards',
  count = 4,
  columnsClassName = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
}) => {
  const items = Array.from({ length: count });

  if (variant === 'horizontal') {
    return (
      <div className="space-y-4">
        {items.map((_, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-4 animate-pulse shadow-xs"
          >
            <div className="w-full sm:w-48 h-36 bg-slate-200 rounded-xl shrink-0" />
            <div className="flex-1 space-y-3 py-1">
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-5 bg-slate-200 rounded w-1/3" />
              <div className="h-3.5 bg-slate-100 rounded w-5/6" />
              <div className="h-3.5 bg-slate-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'rows') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-xs overflow-hidden">
        {items.map((_, idx) => (
          <div key={idx} className="p-4 flex items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0" />
              <div className="space-y-2 flex-1 max-w-md">
                <div className="h-4 bg-slate-200 rounded w-2/3" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
            <div className="h-7 w-24 bg-slate-200 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid gap-6 ${columnsClassName}`}>
      {items.map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 animate-pulse shadow-xs"
        >
          <div className="w-full aspect-4/3 bg-slate-200 rounded-xl" />
          <div className="h-4 bg-slate-200 rounded w-3/4" />
          <div className="h-4 bg-slate-200 rounded w-1/2" />
          <div className="h-3.5 bg-slate-100 rounded w-full" />
        </div>
      ))}
    </div>
  );
};
