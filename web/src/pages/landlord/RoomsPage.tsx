import React, { useEffect, useState } from 'react';
import { Card, Chip } from '@heroui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clock,
  Edit,
  Filter,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DeleteRoomModal } from '@/components/landlord/DeleteRoomModal';
import { landlordService } from '@/services/landlord.service';
import { useLandlordStore, type LandlordRoomFilter } from '@/store/useLandlordStore';
import type { LandlordRoomItem, TrangThaiPhongTro } from '@/types/landlord.types';
import { formatVND } from '@/utils/formatters';

const FILTER_TABS: { id: LandlordRoomFilter; label: string }[] = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'DA_DUYET', label: 'Đã duyệt' },
  { id: 'CHO_DUYET', label: 'Chờ duyệt' },
  { id: 'HOAN_THANH', label: 'Đã cho thuê' },
  { id: 'HUY', label: 'Đã hủy' },
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

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['landlord', 'rooms'],
    queryFn: landlordService.getMyRooms,
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
      void queryClient.invalidateQueries({ queryKey: ['landlord', 'rooms'] });
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

  const deleteRoomMutation = useMutation({
    mutationFn: (maPhongTro: string) => landlordService.deleteRoom(maPhongTro),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['landlord', 'rooms'] });
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

  return (
    <div className="space-y-6">
      <Card className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <Card.Header className="p-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <Card.Title className="text-lg font-bold text-slate-900">
              Danh Sách Phòng Trọ
            </Card.Title>
            <Card.Description className="text-xs text-slate-500">
              Quản lý các bài đăng cho thuê, theo dõi kiểm duyệt và tình trạng cho thuê
            </Card.Description>
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

      <Card className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <Card.Content className="p-0 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã PT, tên phòng, địa chỉ..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-800 placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400 hidden sm:block shrink-0" />
            <div className="flex items-center gap-1.5 overflow-x-auto w-full">
              {FILTER_TABS.map((tab) => {
                const count =
                  tab.id === 'ALL'
                    ? rooms.length
                    : rooms.filter((r) => r.trangThai === tab.id).length;
                return (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => setFilterStatus(tab.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      filterStatus === tab.id
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/60'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        filterStatus === tab.id
                          ? 'bg-white/20 text-white'
                          : 'bg-white text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
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
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                room.hinhAnhUrl ||
                                'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=200'
                              }
                              alt={room.tenPhong}
                              className="w-14 h-14 rounded-xl object-cover shrink-0 ring-1 ring-slate-100 bg-slate-100"
                            />
                            <div className="min-w-0">
                              <span className="text-[10px] font-mono font-bold text-slate-400 block">
                                #{room.maPhongTro}
                              </span>
                              <h4 className="font-bold text-slate-800 line-clamp-1">
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
    </div>
  );
};
