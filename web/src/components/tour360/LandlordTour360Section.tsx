import React, { useEffect, useState } from 'react';
import { Card } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Compass, Plus, SlidersHorizontal } from 'lucide-react';
import { Tour360EditorModal } from '@/components/tour360/Tour360EditorModal';
import { tour360Service } from '@/services/tour360.service';
import type { Tour360Response } from '@/types/tour360.types';

interface LandlordTour360SectionProps {
  roomId?: string;
  tourId: string | null;
  onTourIdChange: (tourId: string | null) => void;
}

export const LandlordTour360Section: React.FC<LandlordTour360SectionProps> = ({
  roomId,
  tourId,
  onTourIdChange,
}) => {
  const [editorOpen, setEditorOpen] = useState(false);

  const { data: existingRoomTour } = useQuery({
    queryKey: ['rooms', 'tour-360', roomId],
    queryFn: () => tour360Service.getRoomTour(roomId!),
    enabled: Boolean(roomId) && !tourId,
    retry: false,
  });

  useEffect(() => {
    if (!tourId && existingRoomTour?.maTour) {
      onTourIdChange(existingRoomTour.maTour);
    }
  }, [existingRoomTour?.maTour, onTourIdChange, tourId]);

  const { data: activeTour, refetch } = useQuery({
    queryKey: ['tour-360', 'detail', tourId],
    queryFn: () => tour360Service.getTourById(tourId!),
    enabled: Boolean(tourId),
  });

  const resolvedTour: Tour360Response | null = activeTour ?? existingRoomTour ?? null;

  return (
    <Card className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
      <Card.Header className="p-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <Card.Title className="text-base font-bold text-slate-900">
              Tour tham quan 360° đa điểm (Tùy chọn)
            </Card.Title>
            <Card.Description className="text-xs text-slate-500">
              Tải ảnh 360° hoặc ảnh Panorama điện thoại (Phòng chính, Gác lửng, Bếp/WC) và gắn mũi tên đi lại trực quan.
            </Card.Description>
          </div>
        </div>
      </Card.Header>

      <Card.Content className="p-0">
        {!resolvedTour ? (
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="w-full border-2 border-dashed border-slate-200 hover:border-teal-400 hover:bg-teal-50/30 rounded-2xl p-6 text-center transition-colors cursor-pointer flex flex-col items-center gap-2"
          >
            <div className="w-11 h-11 rounded-2xl bg-slate-100 text-teal-700 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-800">
              Tạo Tour tham quan 360° cho phòng trọ
            </p>
            <p className="text-[11px] text-slate-400">
              Xử lý tức thì (0đ GPU) — hỗ trợ tới 10 góc phòng kết nối bằng mũi tên 3D.
            </p>
          </button>
        ) : (
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {resolvedTour.nodes[0]?.imageUrl && (
                <img
                  src={resolvedTour.nodes[0].imageUrl}
                  alt={resolvedTour.nodes[0].name}
                  className="w-16 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    Tour #{resolvedTour.maTour}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    {resolvedTour.nodeCount} góc phòng
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {resolvedTour.nodes.map((n) => n.name).join(' · ')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setEditorOpen(true)}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Chỉnh sửa góc 360°</span>
            </button>
          </div>
        )}
      </Card.Content>

      <Tour360EditorModal
        key={resolvedTour?.maTour ?? 'new-tour'}
        isOpen={editorOpen}
        roomId={roomId}
        tour={resolvedTour}
        onClose={() => setEditorOpen(false)}
        onSaved={(saved) => {
          onTourIdChange(saved.maTour);
          void refetch();
        }}
      />
    </Card>
  );
};
