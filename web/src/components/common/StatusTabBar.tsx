import type React from 'react';

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
    <div className="bg-surface rounded-[var(--radius-card)] border border-border overflow-hidden">
      <div
        role="group"
        aria-label={ariaLabel}
        className="flex items-center overflow-x-auto"
      >
        {tabs.map((tab) => {
          const isActive = activeKey === tab.key;
          const Icon = tab.icon;
          const count = tab.count;
          return (
            <button
              key={tab.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(tab.key)}
              className={`flex-1 min-w-max focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent py-3 px-3 sm:px-4 text-[13px] transition-colors duration-150 relative flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'text-accent font-semibold bg-surface'
                  : 'text-text-muted font-medium hover:text-text hover:bg-surface-subtle'
              }`}
            >
              {Icon && (
                <Icon
                  className={`w-4 h-4 shrink-0 ${isActive ? 'text-accent' : 'text-text-muted'}`}
                />
              )}
              <span>{tab.label}</span>
              {count !== undefined && (
                <span
                  className={`px-2 py-0.5 rounded-[var(--radius-badge)] text-xs font-medium transition-colors leading-none tabular-nums ${
                    isActive
                      ? 'bg-accent-soft text-accent'
                      : count > 0
                        ? 'bg-surface-muted text-text-secondary'
                        : 'bg-surface-subtle text-text-muted'
                  }`}
                >
                  {count}
                </span>
              )}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
