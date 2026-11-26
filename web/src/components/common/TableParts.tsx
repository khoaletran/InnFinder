import type { ComponentProps, ReactNode } from 'react';
import { useId } from 'react';

export function TableCell({ label, children, ...props }: ComponentProps<'td'> & { label: string }) {
  return (
    <td {...props} role="cell">
      <span className="data-cell-label" aria-hidden="true">{label}</span>
      <div className="data-cell-value">{children}</div>
    </td>
  );
}

export function StatusBadge({ children, className = '', dotClass }: {
  children: ReactNode;
  className?: string;
  dotClass?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ${className}`}>
      {dotClass && <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${dotClass}`} />}
      {children}
    </span>
  );
}

export function RowActions({ children, label = 'Xử lý', actions }: {
  children: ReactNode;
  label?: string;
  actions?: { label: string; run: () => void; danger?: boolean; disabled?: boolean }[];
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-end gap-1 whitespace-nowrap">
      {children}
      {actions?.length ? (
        <>
          <button
            type="button"
            popoverTarget={id}
            className="h-8 w-[50px] rounded-md px-0.5 text-xs font-semibold text-text-secondary hover:bg-surface-muted"
            onClick={(event) => {
              const menu = document.getElementById(id);
              if (!menu) return;
              const rect = event.currentTarget.getBoundingClientRect();
              menu.style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
              menu.style.top = rect.bottom + 112 < window.innerHeight ? `${rect.bottom + 4}px` : 'auto';
              menu.style.bottom = rect.bottom + 112 < window.innerHeight ? 'auto' : `${window.innerHeight - rect.top + 4}px`;
            }}
          >
            {label} <span aria-hidden="true">⋯</span>
          </button>
          <div id={id} popover="auto" role="group" aria-label={label} className="fixed inset-auto m-0 min-w-32 rounded-lg border border-border bg-surface p-1 shadow-[var(--shadow-card-hover)]">
            {actions.map((action, index) => (
              <button
                key={action.label}
                type="button"
                autoFocus={index === 0}
                disabled={action.disabled}
                className={`block w-full rounded px-3 py-2 text-left text-[13px] hover:bg-surface-muted disabled:opacity-50 ${action.danger ? 'text-danger-text' : 'text-text'}`}
                onClick={(event) => {
                  document.getElementById(id)?.hidePopover();
                  (event.currentTarget.closest('[popover]')?.previousElementSibling as HTMLElement | null)?.focus();
                  action.run();
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </>
      ) : <span aria-hidden="true" className="w-[50px]" />}
    </div>
  );
}
