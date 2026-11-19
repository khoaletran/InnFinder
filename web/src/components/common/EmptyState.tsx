import React from 'react';
import { Card } from '@heroui/react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
}) => {
  return (
    <Card className="p-8 text-center border border-slate-200 bg-white rounded-2xl shadow-xs">
      <Card.Header className="flex flex-col items-center gap-3 p-0">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center">
          {icon || <Inbox className="w-6 h-6" />}
        </div>
        <Card.Title className="text-base font-bold text-slate-900">{title}</Card.Title>
        {description && (
          <Card.Description className="text-sm text-slate-600 max-w-md mx-auto">
            {description}
          </Card.Description>
        )}
      </Card.Header>
      {action && (
        <Card.Footer className="pt-5 p-0 flex flex-wrap items-center justify-center gap-3">
          {action}
        </Card.Footer>
      )}
    </Card>
  );
};
