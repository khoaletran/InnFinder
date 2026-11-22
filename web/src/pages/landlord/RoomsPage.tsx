import { LandlordQueryError } from '@/components/landlord/LandlordQueryError';
import React, { useEffect, useMemo, useState } from 'react';
import { Card, Chip } from '@heroui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle2,
  Clock,
  Edit,
  Eye,
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

  const {
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    setRooms,
  } = useLandlordStore();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<LandlordRoomItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetailRoom, setSelectedDetailRoom] = useState<LandlordRoomItem | null>(null);

  const { data: rooms = [], isLoading, error: loadError, refetch } = useQuery({
    queryKey: ['landlord', 'rooms'],
    queryFn: landlordService.getMyRooms,
    refetchInterval: 15000,
  });

  useEffect(() => {
    setRooms(rooms);
  }, [rooms, setRooms]);

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
      toast.success(
        nextStatus === 'HOAN_THANH'
          ? 'Đã chuyển phòng sang trạng thái Đã cho thuê (HOAN_THANH)'
          : 'Đã mở lại phòng sang trạng thái Đang hiển thị (DA_DUYET)',
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
    toggleStatusMutation.mutate({
      maPhongTro: room.maPhongTro,
      trangThai: room.trangThai,
    });
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
      <Card className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <Card.Header className="p-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <Card.Title className="text-lg font-bold text-slate-900">
              Danh Sách Phòng Trọ
            </Card.Title>
          </div>
          <button
            type="button"
            onClick={() => navigate('/landlord/rooms/create')}
            className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm phòng mới</span>
          </button>
        </Card.Header>
      </Card>

      {/* THANH TRẠNG THÁI TIẾN TRÌNH THEO PHONG CÁCH SHOPEE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="flex items-center overflow-x-auto no-scrollbar divide-x sm:divide-x-0 divide-slate-100">
          {ROOM_STATUS_TABS.map((tab) => {
            const isActive = filterStatus === tab.id;
            const count = statusCounts[tab.id] ?? 0;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id)}
                className={`flex-1 min-w-[130px] sm:min-w-0 py-3.5 px-3 sm:px-4 text-sm font-semibold transition-all relative flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'text-teal-700 font-bold bg-teal-50/40'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-teal-600' : 'text-slate-400'
                  }`}
                />
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold transition-colors ${
                    isActive
                      ? 'bg-teal-600 text-white'
                      : count > 0
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-slate-50 text-slate-400'
                  }`}
                >
                  {count}
                </span>
                {/* Active indicator bar like Shopee */}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 shadow-xs" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Card className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <Card.Content className="p-0 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã PT, tên phòng, địa chỉ..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-800 placeholder-slate-400"
            />
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Hiển thị <span className="font-bold text-slate-800">{filteredRooms.length}</span> / {rooms.length} phòng trọ
          </div>
        </Card.Content>
      </Card>

      <Card className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs p-0">
        <Card.Content className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-600 mb-2" />
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
                              className="w-14 h-14 rounded-xl object-cover shrink-0 ring-1 ring-slate-100 bg-slate-100 group-hover:ring-cyan-500/40 transition-all"
                            />
                            <div className="min-w-0">
                              <span className="text-[10px] font-mono font-bold text-slate-400 block">
                                #{room.maPhongTro}
                              </span>
                              <h4 className="font-bold text-slate-800 line-clamp-1 group-hover:text-cyan-700 transition-colors">
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

                        <td className="py-3 px-4 font-black text-cyan-700 text-sm">
                          {formatVND(room.giaThue)}
                        </td>

                        <td className="py-3 px-4 text-slate-600 font-semibold">
                          {formatVND(room.cocPhong ?? room.giaThue)}
                        </td>

                        <td className="py-3 px-4">{renderApprovalBadge(room.trangThai)}</td>

                        <td className="py-3 px-4">
                          {room.trangThai === 'DA_DUYET' && <button type="button" disabled={visibilityMutation.isPending}
                            onClick={() => visibilityMutation.mutate(room)} className="mr-2 px-2 py-1 text-xs rounded-lg border border-slate-200">
                            {room.tamAn ? 'Hiện lại tin (đang tạm ẩn)' : 'Tạm ẩn tin'}
                          </button>}
                          <button
                            type="button"
                            disabled={!canToggleRent || toggleStatusMutation.isPending}
                            onClick={() => handleToggleStatus(room)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                              !canToggleRent
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : isRented
                                  ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer'
                                  : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100 cursor-pointer'
                            }`}
                            title={
                              canToggleRent
                                ? 'Bấm để chuyển đổi giữa Còn trống (DA_DUYET) và Đã cho thuê (HOAN_THANH)'
                                : 'Cần được Admin duyệt trước khi mở cho thuê'
                            }
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>
                              {isRented
                                ? 'Đã cho thuê'
                                : room.trangThai === 'DA_DUYET'
                                  ? 'Còn trống'
                                  : 'Không khả dụng'}
                            </span>
                          </button>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleViewDetail(room)}
                              className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors cursor-pointer"
                              title="Xem chi tiết phòng"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/landlord/rooms/edit/${room.maPhongTro}`)}
                              className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors cursor-pointer"
                              title="Chỉnh sửa phòng"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {room.trangThai !== 'HUY' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteClick(room)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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
    </div>
  );
};
