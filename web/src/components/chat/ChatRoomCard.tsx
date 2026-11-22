import { Card } from '@heroui/react';
import { ArrowUpRight, CalendarDays, MapPin, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { RoomSummaryResponse } from '@/types/room.types';
import { formatVNDShort } from '@/utils/formatters';

interface Props {
  room: RoomSummaryResponse;
  index: number;
  disabled: boolean;
  onAsk: (room: RoomSummaryResponse) => void;
  onBook: (room: RoomSummaryResponse) => void;
}

export function ChatRoomCard({ room, index, disabled, onAsk, onBook }: Props) {
  const title = `${room.tenLoaiPhong || 'Phòng trọ'} · ${room.dienTich} m²`;
  return (
    <Card className="gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-xs">
      <div className="flex gap-3 p-3">
        <Link to={`/room/${room.maPhongTro}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-teal-50" aria-label={`Xem ${title}`}>
          {room.anhDaiDien ? (
            <img src={room.anhDaiDien} alt={title} loading="lazy" className="h-full w-full object-cover" />
          ) : <MapPin className="m-7 h-6 w-6 text-teal-600" />}
          <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-md bg-white text-[10px] font-bold text-slate-800 shadow-sm">{index + 1}</span>
        </Link>
        <Card.Content className="min-w-0 flex-1 gap-1 p-0">
          <Link to={`/room/${room.maPhongTro}`} className="flex items-start gap-1 text-xs font-bold text-slate-900 hover:text-teal-700">
            <span className="line-clamp-1">{title}</span><ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
          </Link>
          <p className="text-sm font-extrabold text-teal-700">{formatVNDShort(room.giaThue)}</p>
          <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-500">{room.diaChi}</p>
        </Card.Content>
      </div>
      <Card.Footer className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50/60 px-3 py-2">
        <button type="button" disabled={disabled} onClick={() => onAsk(room)} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 cursor-pointer">
          <MessageCircle className="h-3.5 w-3.5" /> Hỏi phòng này
        </button>
        <button type="button" disabled={disabled} onClick={() => onBook(room)} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-teal-600 text-[11px] font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50 cursor-pointer">
          <CalendarDays className="h-3.5 w-3.5" /> Đặt lịch xem
        </button>
      </Card.Footer>
    </Card>
  );
}
