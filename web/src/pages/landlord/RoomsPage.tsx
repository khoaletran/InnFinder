import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { landlordService } from '../../services/landlord.service';
import type { LandlordRoomItem } from '../../types/landlord.types';
import { DeleteRoomModal } from '../../components/landlord/DeleteRoomModal';
import { toast } from 'sonner';

export const RoomsPage: React.FC = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<LandlordRoomItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<LandlordRoomItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const data = await landlordService.getMyRooms();
      setRooms(data);
    } catch {
      // fallback
    }
  };

  const handleToggleStatus = async (room: LandlordRoomItem) => {
    try {
      const updated = await landlordService.toggleRoomStatus(room.id);
      setRooms((prev) => prev.map((r) => (r.id === room.id ? updated : r)));
      toast.success(
        updated.isRented
          ? 'Đã chuyển phòng sang trạng thái ĐÃ THUÊ'
          : 'Đã mở phòng sang trạng thái ĐANG TRỐNG'
      );
    } catch {
      toast.error('Không thể đổi trạng thái phòng');
    }
  };

  const handleDeleteClick = (room: LandlordRoomItem) => {
    setSelectedRoom(room);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedRoom) return;
    setDeleteLoading(true);
    try {
      await landlordService.deleteRoom(selectedRoom.id);
      setRooms((prev) => prev.filter((r) => r.id !== selectedRoom.id));
      setDeleteModalOpen(false);
      setSelectedRoom(null);
      toast.success('Đã xóa phòng trọ thành công!');
    } catch {
      toast.error('Lỗi khi xóa phòng trọ');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredRooms = rooms.filter((r) => {
    const matchStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'DA_DUYET' && r.trangThai === 'DA_DUYET') ||
      (filterStatus === 'CHO_DUYET' && r.trangThai === 'CHO_DUYET') ||
      (filterStatus === 'HUY' && r.trangThai === 'HUY');

    const matchSearch =
      r.tenPhong.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.diaChi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.maPhongTro.toLowerCase().includes(searchTerm.toLowerCase());

    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Danh Sách Phòng Trọ</h2>
          <p className="text-xs text-slate-500">Quản lý các bài đăng cho thuê và tình trạng phòng</p>
        </div>
        <button
          onClick={() => navigate('/landlord/rooms/create')}
          className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm phòng mới</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên phòng, địa chỉ..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-800 placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
          <div className="flex items-center gap-1.5 overflow-x-auto w-full">
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'DA_DUYET', label: 'Đang hiển thị' },
              { id: 'CHO_DUYET', label: 'Chờ duyệt' },
              { id: 'HUY', label: 'Đã ẩn' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  filterStatus === tab.id
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table view */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Phòng Trọ</th>
                <th className="py-3 px-4">Loại Phòng</th>
                <th className="py-3 px-4">Giá Thuê / Tháng</th>
                <th className="py-3 px-4">Tiền Cọc HĐ</th>
                <th className="py-3 px-4">Trạng Thái Sàn</th>
                <th className="py-3 px-4">Tình Trạng</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Không tìm thấy phòng trọ nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredRooms.map((room) => (
                  <tr key={room.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Room Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={room.hinhAnhUrl}
                          alt={room.tenPhong}
                          className="w-14 h-14 rounded-xl object-cover shrink-0 ring-1 ring-slate-100"
                        />
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-slate-400 block">
                            #{room.maPhongTro}
                          </span>
                          <h4 className="font-bold text-slate-800 line-clamp-1">{room.tenPhong}</h4>
                          <p className="text-[11px] text-slate-400 line-clamp-1 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {room.diaChi}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Room Type */}
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {room.loaiPhong || 'Khép kín'}
                      <span className="block text-[10px] text-slate-400">{room.dienTich} m²</span>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-4 font-black text-cyan-700 text-sm">
                      {room.giaThue.toLocaleString('vi-VN')} đ
                    </td>

                    {/* Deposit */}
                    <td className="py-3 px-4 text-slate-600 font-semibold">
                      {(room.cocPhong || room.giaThue).toLocaleString('vi-VN')} đ
                    </td>

                    {/* Status Admin */}
                    <td className="py-3 px-4">
                      {room.trangThai === 'DA_DUYET' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" />
                          Đã duyệt
                        </span>
                      ) : room.trangThai === 'CHO_DUYET' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                          <Clock className="w-3 h-3" />
                          Chờ duyệt
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                          <XCircle className="w-3 h-3" />
                          Từ chối / Ẩn
                        </span>
                      )}
                    </td>

                    {/* Rented status */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStatus(room)}
                        className="flex items-center gap-1.5 cursor-pointer"
                        title="Bấm để đổi trạng thái phòng còn trống hay đã thuê"
                      >
                        {room.isRented ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded-md">
                            Đã cho thuê
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-100 text-cyan-700 rounded-md">
                            Còn trống
                          </span>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/landlord/rooms/edit/${room.id}`)}
                          className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors cursor-pointer"
                          title="Chỉnh sửa phòng"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(room)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Xóa phòng trọ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Modal */}
      <DeleteRoomModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        roomName={selectedRoom?.tenPhong || ''}
        loading={deleteLoading}
      />
    </div>
  );
};
