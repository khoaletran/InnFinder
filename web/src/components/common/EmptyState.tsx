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
    <Card className="p-8 text-center border border-slate-200/80 bg-white rounded-2xl shadow-2xs">
      <Card.Header className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
          {icon || <Inbox className="w-7 h-7" />}
        </div>
        <Card.Title className="text-base font-bold text-slate-800">{title}</Card.Title>
        {description && (
          <Card.Description className="text-xs text-slate-500 max-w-md mx-auto">
            {description}
          </Card.Description>
        )}
      </Card.Header>
      {action && <Card.Footer className="pt-4 flex justify-center">{action}</Card.Footer>}
    </Card>
  );
};
