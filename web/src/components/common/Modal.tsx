import React, { useEffect } from 'react';
import { Card } from '@heroui/react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay-backdrop)] animate-in fade-in duration-150"
    >
      <Card
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidthClasses[maxWidth]} bg-surface rounded-[var(--radius-modal)] shadow-[var(--shadow-modal)] border border-border overflow-hidden p-0`}
      >
        <Card.Header className="px-6 py-4 border-b border-border flex flex-row items-center justify-between">
          <div>
            <Card.Title className="text-[18px] font-semibold tracking-[-0.01em] text-text">
              {title}
            </Card.Title>
            {subtitle && (
              <Card.Description className="text-xs text-text-muted mt-0.5">
                {subtitle}
              </Card.Description>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="w-8 h-8 rounded-[var(--radius-control)] flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-muted transition-colors duration-150 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </Card.Header>

        <Card.Content className="px-6 py-5 max-h-[78vh] overflow-y-auto">{children}</Card.Content>

        {footer && (
          <Card.Footer className="px-6 py-3.5 border-t border-border bg-surface-subtle flex items-center justify-end gap-3">
            {footer}
          </Card.Footer>
        )}
      </Card>
    </div>
  );
};
