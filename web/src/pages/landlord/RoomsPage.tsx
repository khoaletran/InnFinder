import { LandlordQueryError } from '@/components/landlord/LandlordQueryError';
import React, { useMemo, useState } from 'react';
import { Card, Chip } from '@heroui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle2,
  Clock,
  Edit,
  Eye,
  EyeOff,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Modal } from '@/components/common/Modal';
import { DeleteRoomModal } from '@/components/landlord/DeleteRoomModal';
import { RoomDetailModal } from '@/components/landlord/RoomDetailModal';
import { landlordService } from '@/services/landlord.service';
import { useLandlordStore, type LandlordRoomFilter } from '@/store/useLandlordStore';
import type { LandlordRoomItem, TrangThaiPhongTro } from '@/types/landlord.types';
import { formatVND } from '@/utils/formatters';

interface RoomStatusTabConfig {
  id: LandlordRoomFilter;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ROOM_STATUS_TABS: RoomStatusTabConfig[] = [
  { id: 'ALL', label: 'Tất cả', icon: Building2 },
  { id: 'DA_DUYET', label: 'Đã duyệt', icon: CheckCircle2 },
  { id: 'CHO_DUYET', label: 'Chờ duyệt', icon: Clock },
  { id: 'HOAN_THANH', label: 'Đã cho thuê', icon: ShieldCheck },
  { id: 'HUY', label: 'Đã hủy', icon: XCircle },
];

const renderApprovalBadge = (status: TrangThaiPhongTro) => {
  switch (status) {
    case 'DA_DUYET':
      return (
        <Chip size="sm" color="success" variant="soft">
          <Chip.Label className="inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Đã duyệt
          </Chip.Label>
        </Chip>
      );
    case 'CHO_DUYET':
      return (
        <Chip size="sm" color="warning" variant="soft">
          <Chip.Label className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Chờ duyệt
          </Chip.Label>
        </Chip>
      );
    case 'HOAN_THANH':
      return (
        <Chip size="sm" color="accent" variant="soft">
          <Chip.Label className="inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Đã cho thuê
          </Chip.Label>
        </Chip>
      );
    case 'HUY':
    default:
      return (
        <Chip size="sm" color="danger" variant="soft">
          <Chip.Label className="inline-flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Đã hủy
          </Chip.Label>
        </Chip>
      );
  }
};

export const RoomsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const filterStatus = useLandlordStore((s) => s.filterStatus);
  const setFilterStatus = useLandlordStore((s) => s.setFilterStatus);
  const searchQuery = useLandlordStore((s) => s.searchQuery);
  const setSearchQuery = useLandlordStore((s) => s.setSearchQuery);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<LandlordRoomItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetailRoom, setSelectedDetailRoom] = useState<LandlordRoomItem | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: 'RENT_STATUS' | 'VISIBILITY';
    room: LandlordRoomItem;
  } | null>(null);

  const { data: rooms = [], isLoading, error: loadError, refetch } = useQuery({
    queryKey: ['landlord', 'rooms'],
    queryFn: landlordService.getMyRooms,
    refetchInterval: 15000,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({
      maPhongTro,
      trangThai,
    }: {
      maPhongTro: string;
      trangThai: TrangThaiPhongTro;
    }) => landlordService.toggleRoomStatus(maPhongTro, trangThai),
    onSuccess: (nextStatus) => {
      void queryClient.invalidateQueries({ queryKey: ['landlord'] });
      void queryClient.invalidateQueries({ queryKey: ['landlord', 'dashboard-stats'] });
      setPendingAction(null);
      toast.success(
        nextStatus === 'HOAN_THANH'
          ? 'Đã chuyển phòng sang trạng thái Đã cho thuê'
          : 'Đã mở lại phòng sang trạng thái Đang hiển thị',
      );
    },
    onError: () => {
      toast.error('Không thể đổi trạng thái phòng trọ');
    },
  });

  const visibilityMutation = useMutation({
    mutationFn: (room: LandlordRoomItem) => landlordService.setRoomVisibility(room.maPhongTro, !room.tamAn),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['landlord'] });
      setPendingAction(null);
      toast.success('Đã cập nhật ẩn/hiện tin phòng');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Không đổi được hiển thị'),
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (maPhongTro: string) => landlordService.deleteRoom(maPhongTro),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['landlord'] });
      void queryClient.invalidateQueries({ queryKey: ['landlord', 'dashboard-stats'] });
      setDeleteModalOpen(false);
      setSelectedRoom(null);
      toast.success('Đã gỡ bài đăng phòng trọ thành công');
    },
    onError: () => {
      toast.error('Lỗi khi gỡ bài đăng phòng trọ');
    },
  });

  const handleToggleStatus = (room: LandlordRoomItem) => {
    if (room.trangThai !== 'DA_DUYET' && room.trangThai !== 'HOAN_THANH') {
      toast.warning('Chỉ có thể chuyển trạng thái cho thuê khi phòng đã được Admin duyệt');
      return;
    }
    setPendingAction({ type: 'RENT_STATUS', room });
  };

  const handleToggleVisibility = (room: LandlordRoomItem) => {
    setPendingAction({ type: 'VISIBILITY', room });
  };

  const handleConfirmPendingAction = () => {
    if (!pendingAction) return;
    if (pendingAction.type === 'RENT_STATUS') {
      toggleStatusMutation.mutate({
        maPhongTro: pendingAction.room.maPhongTro,
        trangThai: pendingAction.room.trangThai,
      });
    } else {
      visibilityMutation.mutate(pendingAction.room);
    }
  };

  const handleDeleteClick = (room: LandlordRoomItem) => {
    setSelectedRoom(room);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!selectedRoom) return;
    deleteRoomMutation.mutate(selectedRoom.maPhongTro);
  };

  const handleViewDetail = (room: LandlordRoomItem) => {
    setSelectedDetailRoom(room);
    setDetailModalOpen(true);
  };

  // Đếm số lượng phòng theo từng trạng thái cho thanh tab Shopee
  const statusCounts = useMemo(() => {
    const counts: Record<LandlordRoomFilter, number> = {
      ALL: rooms.length,
      DA_DUYET: 0,
      CHO_DUYET: 0,
      HOAN_THANH: 0,
      HUY: 0,
    };
    for (const r of rooms) {
      if (r.trangThai && r.trangThai in counts) {
        counts[r.trangThai as LandlordRoomFilter]++;
      }
    }
    return counts;
  }, [rooms]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredRooms = rooms.filter((r) => {
    const matchStatus = filterStatus === 'ALL' || r.trangThai === filterStatus;
    const matchSearch =
      !normalizedQuery ||
      r.tenPhong.toLowerCase().includes(normalizedQuery) ||
      r.diaChi.toLowerCase().includes(normalizedQuery) ||
      r.maPhongTro.toLowerCase().includes(normalizedQuery);
    return matchStatus && matchSearch;
  });

  if (loadError) return <LandlordQueryError error={loadError} onRetry={() => void refetch()} />;

  return (
    <div className="space-y-6">
      <Card className="bg-surface rounded-xl border border-border overflow-x-clip p-0">
        <Card.Header className="p-0 border-b border-border sticky top-16 z-30 bg-white/95 backdrop-blur-md rounded-t-xl">
          {/* Hàng 1: Ô tìm kiếm + Nút đặt lại + Thêm phòng mới */}
          <div className="p-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo mã PT, tên phòng, địa chỉ..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-surface-subtle border border-border focus:outline-none focus:bg-surface focus:border-accent text-slate-800 placeholder-slate-400"
                />
              </div>

              {(searchQuery || filterStatus !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterStatus('ALL');
                  }}
                  className="px-3 py-2 rounded-lg border border-border bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 cursor-pointer whitespace-nowrap"
                >
                  Đặt lại
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigate('/landlord/rooms/create')}
              className="px-3.5 py-2 bg-accent hover:bg-accent-hover text-white font-semibold text-xs rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm phòng mới</span>
            </button>
          </div>

          {/* Hàng 2: Thanh trạng thái gạch chân chia đều */}
          <div className="flex items-center border-t border-slate-100 overflow-x-auto bg-white">
            {ROOM_STATUS_TABS.map((tab) => {
              const isActive = filterStatus === tab.id;
              const count = statusCounts[tab.id] ?? 0;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterStatus(tab.id)}
                  className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'border-teal-700 text-teal-800'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50/70'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-teal-700' : 'text-slate-400'
                    }`}
                  />
                  <span>{tab.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold leading-none ${
                      isActive
                        ? 'bg-teal-50 text-teal-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </Card.Header>

        <Card.Content className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600 mb-2" />
              <span className="text-xs">Đang tải danh sách phòng trọ...</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Phòng Trọ</th>
                  <th className="py-3 px-4">Loại Phòng</th>
                  <th className="py-3 px-4">Giá Thuê / Tháng</th>
                  <th className="py-3 px-4">Tiền Cọc HĐ</th>
                  <th className="py-3 px-4">Trạng Thái Sàn</th>
                  <th className="py-3 px-4">Tình Trạng Khai Thác</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRooms.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      Không tìm thấy phòng trọ nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredRooms.map((room) => {
                    const canToggleRent =
                      room.trangThai === 'DA_DUYET' || room.trangThai === 'HOAN_THANH';
                    const isRented = room.trangThai === 'HOAN_THANH';

                    return (
                      <tr key={room.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div
                            onClick={() => handleViewDetail(room)}
                            className="flex items-center gap-3 cursor-pointer group"
                            title="Bấm để xem chi tiết phòng trọ"
                          >
                            <img
                              src={
                                room.hinhAnhUrl ||
                                'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=200'
                              }
                              alt={room.tenPhong}
                              className="w-14 h-14 rounded-xl object-cover shrink-0 ring-1 ring-slate-100 bg-slate-100 group-hover:ring-teal-500/40 transition-all"
                            />
                            <div className="min-w-0">
                              <span className="text-[10px] font-mono font-bold text-slate-400 block">
                                #{room.maPhongTro}
                              </span>
                              <h4 className="font-bold text-slate-800 line-clamp-1 group-hover:text-teal-700 transition-colors">
                                {room.tenPhong}
                              </h4>
                              <p className="text-[11px] text-slate-400 line-clamp-1 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 shrink-0" />
                                {room.diaChi}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {room.loaiPhong || 'Phòng trọ'}
                          <span className="block text-[10px] text-slate-400">
                            {room.dienTich} m²
                            {room.soNguoi ? ` · Tối đa ${room.soNguoi} người` : ''}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-black text-teal-700 text-sm whitespace-nowrap">
                          {formatVND(room.giaThue)}
                        </td>

                        <td className="py-3 px-4 text-slate-600 font-semibold whitespace-nowrap">
                          {formatVND(room.cocPhong ?? room.giaThue)}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">{renderApprovalBadge(room.trangThai)}</td>

                        <td className="py-3 px-4">
                          <div className="flex flex-wrap items-center gap-2">
                            {canToggleRent ? (
                              <button
                                type="button"
                                disabled={toggleStatusMutation.isPending}
                                onClick={() => handleToggleStatus(room)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-colors whitespace-nowrap shadow-2xs disabled:opacity-60 ${
                                  isRented
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100 cursor-pointer'
                                    : 'bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100 cursor-pointer'
                                }`}
                                title="Bấm để chuyển đổi giữa Còn trống và Đã cho thuê"
                              >
                                <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                                <span>{isRented ? 'Đã cho thuê' : 'Còn trống'}</span>
                              </button>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-500 text-[11px] font-semibold whitespace-nowrap"
                                title="Cần được Admin duyệt trước khi mở cho thuê"
                              >
                                Không khả dụng
                              </span>
                            )}

                            {room.trangThai === 'DA_DUYET' && (
                              <button
                                type="button"
                                disabled={visibilityMutation.isPending}
                                onClick={() => handleToggleVisibility(room)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors whitespace-nowrap shadow-2xs cursor-pointer disabled:opacity-60 ${
                                  room.tamAn
                                    ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                                }`}
                                title={
                                  room.tamAn
                                    ? 'Tin đang tạm ẩn khỏi tìm kiếm — bấm để hiện lại'
                                    : 'Bấm để tạm ẩn tin khỏi tìm kiếm'
                                }
                              >
                                {room.tamAn ? (
                                  <Eye className="w-3.5 h-3.5 shrink-0" />
                                ) : (
                                  <EyeOff className="w-3.5 h-3.5 shrink-0" />
                                )}
                                <span>{room.tamAn ? 'Hiện lại tin' : 'Tạm ẩn tin'}</span>
                              </button>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleViewDetail(room)}
                              aria-label="Xem chi tiết phòng"
                              className="inline-flex items-center justify-center size-8 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-colors cursor-pointer"
                              title="Xem chi tiết phòng"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/landlord/rooms/edit/${room.maPhongTro}`)}
                              aria-label="Chỉnh sửa phòng"
                              className="inline-flex items-center justify-center size-8 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 transition-colors cursor-pointer"
                              title="Chỉnh sửa phòng"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {room.trangThai !== 'HUY' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteClick(room)}
                                aria-label="Gỡ bài đăng phòng trọ"
                                className="inline-flex items-center justify-center size-8 rounded-lg border border-rose-200 bg-rose-50/70 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors cursor-pointer"
                                title="Gỡ bài đăng phòng trọ"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </Card.Content>
      </Card>

      <DeleteRoomModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        roomName={selectedRoom?.tenPhong || ''}
        loading={deleteRoomMutation.isPending}
      />

      <RoomDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        room={selectedDetailRoom}
        onEdit={(maPhongTro) => navigate(`/landlord/rooms/edit/${maPhongTro}`)}
      />

      {(() => {
        const isPendingMutating = toggleStatusMutation.isPending || visibilityMutation.isPending;
        const isRentStatus = pendingAction?.type === 'RENT_STATUS';
        const isMarkingRented = isRentStatus && pendingAction?.room.trangThai === 'DA_DUYET';
        const isHidingRoom = !isRentStatus && !pendingAction?.room.tamAn;

        const modalTitle = isRentStatus
          ? isMarkingRented
            ? 'Xác nhận đánh dấu Đã cho thuê'
            : 'Xác nhận mở lại phòng Còn trống'
          : isHidingRoom
            ? 'Xác nhận tạm ẩn tin phòng'
            : 'Xác nhận hiện lại tin phòng';

        const modalDescription = isRentStatus
          ? isMarkingRented
            ? 'Phòng sẽ chuyển sang trạng thái Đã cho thuê và tạm ẩn khỏi kết quả tìm kiếm công khai.'
            : 'Phòng sẽ chuyển về trạng thái Còn trống (Đã duyệt) và hiển thị lại trên tìm kiếm công khai.'
          : isHidingRoom
            ? 'Tin phòng sẽ tạm thời ẩn khỏi kết quả tìm kiếm của khách thuê. Bạn có thể bật lại bất cứ lúc nào.'
            : 'Tin phòng sẽ hiển thị công khai trở lại trên trang tìm kiếm.';

        const confirmLabel = isPendingMutating
          ? 'Đang xử lý...'
          : isRentStatus
            ? isMarkingRented
              ? 'Xác nhận đã cho thuê'
              : 'Xác nhận mở lại'
            : isHidingRoom
              ? 'Xác nhận tạm ẩn'
              : 'Xác nhận hiện lại';

        const confirmClass = isRentStatus
          ? isMarkingRented
            ? 'bg-indigo-600 hover:bg-indigo-700'
            : 'bg-teal-600 hover:bg-teal-700'
          : isHidingRoom
            ? 'bg-amber-600 hover:bg-amber-700'
            : 'bg-teal-600 hover:bg-teal-700';

        return (
          <Modal
            isOpen={!!pendingAction}
            onClose={() => {
              if (!isPendingMutating) setPendingAction(null);
            }}
            title={modalTitle}
            maxWidth="sm"
            footer={
              <>
                <button
                  type="button"
                  onClick={() => setPendingAction(null)}
                  disabled={isPendingMutating}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPendingAction}
                  disabled={isPendingMutating}
                  className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${confirmClass}`}
                >
                  {isPendingMutating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{confirmLabel}</span>
                </button>
              </>
            }
          >
            <div className="space-y-2 text-xs text-slate-600">
              <p className="text-sm font-semibold text-slate-800">
                Phòng: <span className="text-teal-700">&ldquo;{pendingAction?.room.tenPhong}&rdquo;</span>
              </p>
              <p className="leading-relaxed">{modalDescription}</p>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};
