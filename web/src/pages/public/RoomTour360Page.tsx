import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Loader2 } from 'lucide-react';
import { VirtualTour360Viewer } from '@/components/tour360/VirtualTour360Viewer';
import { tour360Service } from '@/services/tour360.service';

export const RoomTour360Page: React.FC = () => {
  const { tourId } = useParams<{ tourId: string }>();
  const [searchParams] = useSearchParams();
  const apiBase = searchParams.get('apiBase') || undefined;

  const {
    data: tour,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['tour-360', 'public', tourId, apiBase],
    queryFn: () => tour360Service.getTourById(tourId || '', apiBase),
    enabled: Boolean(tourId),
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        <p className="text-sm font-medium">Đang tải không gian 360°...</p>
      </div>
    );
  }

  if (isError || !tour || tour.nodes.length === 0) {
    const errText =
      error instanceof Error ? error.message : 'Không tìm thấy Tour 360° hợp lệ';
    return (
      <div className="h-screen w-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center gap-3">
        <AlertCircle className="w-10 h-10 text-amber-400" />
        <p className="text-sm font-semibold max-w-md">{errText}</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950">
      <VirtualTour360Viewer nodes={tour.nodes} startNodeId={tour.startNodeId} />
    </div>
  );
};
