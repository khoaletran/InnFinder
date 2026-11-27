import React from 'react';
import { Compass, X } from 'lucide-react';
import { VirtualTour360Viewer } from '@/components/tour360/VirtualTour360Viewer';
import type { Tour360Response } from '@/types/tour360.types';

interface Tour360ViewerModalProps {
  isOpen: boolean;
  tour: Tour360Response | null;
  title?: string;
  subtitle?: string;
  onClose: () => void;
}

export const Tour360ViewerModal: React.FC<Tour360ViewerModalProps> = ({
  isOpen,
  tour,
  title = 'Tham quan phòng 360°',
  subtitle,
  onClose,
}) => {
  if (!isOpen || !tour || tour.nodes.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex flex-col">
      <div className="px-4 sm:px-6 py-3 bg-slate-950/90 border-b border-white/10 flex items-center justify-between text-white">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-teal-600/20 border border-teal-500/40 flex items-center justify-center text-teal-300 shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold truncate">{title}</h3>
            {subtitle && <p className="text-[11px] text-slate-400 truncate">{subtitle}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <VirtualTour360Viewer nodes={tour.nodes} startNodeId={tour.startNodeId} />
      </div>
    </div>
  );
};
