import React from 'react';

export interface StatusTabItem<T extends string> {
  key: T;
  label: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
}

interface StatusTabBarProps<T extends string> {
  tabs: Array<StatusTabItem<NoInfer<T>>>;
  activeKey: T;
  onChange: (key: NoInfer<T>) => void;
  ariaLabel?: string;
}

export function StatusTabBar<T extends string>({
  tabs,
  activeKey,
  onChange,
  ariaLabel = 'Lọc theo trạng thái',
}: StatusTabBarProps<T>): React.ReactElement {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex items-center overflow-x-auto no-scrollbar divide-x sm:divide-x-0 divide-slate-100"
      >
        {tabs.map((tab) => {
          const isActive = activeKey === tab.key;
          const Icon = tab.icon;
          const count = tab.count;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.key)}
              className={`flex-1 min-w-[130px] sm:min-w-0 py-3.5 px-3 sm:px-4 text-sm font-semibold transition-all relative flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'text-teal-700 font-bold bg-teal-50/40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {Icon && (
                <Icon
                  className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-600' : 'text-slate-400'}`}
                />
              )}
              <span>{tab.label}</span>
              {count !== undefined && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold transition-colors leading-none ${
                    isActive
                      ? 'bg-teal-600 text-white'
                      : count > 0
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-slate-50 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              )}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 shadow-xs"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
