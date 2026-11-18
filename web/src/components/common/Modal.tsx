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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <Card
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidthClasses[maxWidth]} bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden p-0`}
      >
        <Card.Header className="px-6 py-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <Card.Title className="text-base font-bold text-slate-900">{title}</Card.Title>
            {subtitle && (
              <Card.Description className="text-xs text-slate-500 mt-0.5">
                {subtitle}
              </Card.Description>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </Card.Header>

        <Card.Content className="px-6 py-5 max-h-[78vh] overflow-y-auto">{children}</Card.Content>

        {footer && (
          <Card.Footer className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
            {footer}
          </Card.Footer>
        )}
      </Card>
    </div>
  );
};
