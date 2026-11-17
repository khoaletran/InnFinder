import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Eye,
  MapPin,
  Loader2,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import type { AdminPostItem } from '../../types/admin.types';
import { formatVND } from '../../utils/formatters';
import { toast } from 'sonner';

export const PostsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'ALL'>('PENDING');
  const [pendingRooms, setPendingRooms] = useState<AdminPostItem[]>([]);
  const [allRooms, setAllRooms] = useState<AdminPostItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewRoom, setPreviewRoom] = useState<AdminPostItem | null>(null);

  // Modal Từ chối bài đăng (Frame 2)
  const [rejectingRoomId, setRejectingRoomId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadRooms();
  }, [activeTab]);

  const loadRooms = async () => {
    try {
      setIsLoading(true);
      if (activeTab === 'PENDING') {
        const res = await adminService.getPendingRooms();
        setPendingRooms(res);
      } else {
        const res = await adminService.getAllRooms();
        setAllRooms(res);
      }
    } catch {
      toast.error('Lỗi tải danh sách bài đăng phòng trọ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await adminService.approveRoom(id);
      toast.success('Phê duyệt bài đăng thành công! Phòng đã hiển thị trên ứng dụng.');
      setPreviewRoom(null);
      loadRooms();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi phê duyệt');
    }
  };

  const handleReject = async () => {
    if (!rejectingRoomId) return;
    try {
      await adminService.rejectRoom(rejectingRoomId, rejectReason || 'Thông tin phòng hoặc hình ảnh không đáp ứng tiêu chuẩn kiểm duyệt');
      toast.success('Đã từ chối bài đăng và gửi thông báo tới Chủ trọ');
      setRejectingRoomId(null);
      setRejectReason('');
      setPreviewRoom(null);
      loadRooms();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi từ chối');
    }
  };

  const currentList = activeTab === 'PENDING' ? pendingRooms : allRooms;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Kiểm duyệt Bài đăng Phòng trọ</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Xác minh độ chính xác của hình ảnh, mức giá thuê, tiền cọc và vị trí tọa độ bản đồ
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-slate-200/80 p-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'PENDING' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Chờ duyệt ({pendingRooms.length})
          </button>
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'ALL' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất cả tin đăng
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Mã & Phòng trọ</th>
                <th className="py-3 px-4">Giá thuê / Tháng</th>
                <th className="py-3 px-4">Địa chỉ</th>
                <th className="py-3 px-4">Chủ trọ</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Đang tải danh sách bài đăng...
                  </td>
                </tr>
              ) : currentList.length > 0 ? (
                currentList.map((room) => {
                  const coverImg = room.hinhAnh?.[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500';
                  return (
                    <tr key={room.maPhongTro} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={coverImg}
                            alt=""
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-slate-900 max-w-xs truncate">{room.tieuDe}</div>
                            <code className="text-[10px] text-blue-600 font-mono">{room.maPhongTro}</code>
                            <div className="text-[10px] text-slate-400">{room.dienTich} m² • {room.soNguoi} người</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-blue-600">{formatVND(room.giaThue)}</div>
                        <div className="text-[10px] text-slate-400">Cọc HĐ: {formatVND(room.cocPhong)}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {room.diaChi}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{room.tenChuTro || 'Chủ trọ'}</div>
                        <div className="text-[10px] text-slate-400">{room.sdtChuTro}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            room.trangThai === 'CHO_DUYET'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : room.trangThai === 'DA_DUYET'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : room.trangThai === 'HOAN_THANH'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {room.trangThai === 'CHO_DUYET'
                            ? 'Chờ duyệt'
                            : room.trangThai === 'DA_DUYET'
                            ? 'Đã hiển thị'
                            : room.trangThai === 'HOAN_THANH'
                            ? 'Đã thuê'
                            : 'Từ chối'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setPreviewRoom(room)}
                            title="Xem chi tiết kiểm duyệt (Frame 1)"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {room.trangThai === 'CHO_DUYET' && (
                            <>
                              <button
                                onClick={() => handleApprove(room.maPhongTro)}
                                title="Phê duyệt bài đăng"
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setRejectingRoomId(room.maPhongTro)}
                                title="Từ chối duyệt (Frame 2)"
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Không có bài đăng nào cần duyệt.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CHI TIẾT DUYỆT BÀI ĐĂNG (FRAME 1) */}
      {previewRoom && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  Chi tiết bài đăng: {previewRoom.maPhongTro}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{previewRoom.tieuDe}</h3>
              </div>
              <button
                onClick={() => setPreviewRoom(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Photo Gallery */}
            <div>
              <span className="block text-xs font-bold text-slate-700 mb-2">Hình ảnh chụp thực tế ({previewRoom.hinhAnh?.length || 0} ảnh)</span>
              <div className="grid grid-cols-3 gap-2">
                {previewRoom.hinhAnh?.map((img, i) => (
                  <div key={i} className="h-24 rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>

            {/* Meta Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Giá thuê</span>
                <span className="font-bold text-blue-600">{formatVND(previewRoom.giaThue)} / tháng</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Cọc hợp đồng</span>
                <span className="font-bold text-slate-800">{formatVND(previewRoom.cocPhong)}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Diện tích</span>
                <span className="font-bold text-slate-800">{previewRoom.dienTich} m²</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Số người ở</span>
                <span className="font-bold text-slate-800">{previewRoom.soNguoi} người</span>
              </div>
            </div>

            {/* Address & GPS */}
            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-2 text-slate-700">
                <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                <span>{previewRoom.diaChi}</span>
              </div>
              {previewRoom.kinhDo && previewRoom.viDo && (
                <div className="text-[11px] text-slate-400 font-mono">
                  Tọa độ GPS: ({previewRoom.kinhDo}, {previewRoom.viDo})
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <span className="block text-xs font-bold text-slate-700 mb-1">Mô tả chi tiết phòng trọ</span>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl">
                {previewRoom.moTa || 'Chưa có mô tả chi tiết'}
              </p>
            </div>

            {/* Landlord Info */}
            <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                  CT
                </div>
                <div>
                  <span className="font-bold text-slate-900">{previewRoom.tenChuTro}</span>
                  <div className="text-slate-500 text-[11px]">{previewRoom.sdtChuTro}</div>
                </div>
              </div>
            </div>

            {/* Bottom Decision Actions */}
            {previewRoom.trangThai === 'CHO_DUYET' && (
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setRejectingRoomId(previewRoom.maPhongTro)}
                  className="w-1/2 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold"
                >
                  Từ chối duyệt bài
                </button>
                <button
                  onClick={() => handleApprove(previewRoom.maPhongTro)}
                  className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                >
                  Phê duyệt hiển thị
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL TỪ CHỐI BÀI ĐĂNG KÈM LÝ DO (FRAME 2) */}
      {rejectingRoomId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Từ chối bài đăng phòng trọ</h3>
            <p className="text-xs text-slate-500 mb-3">
              Bài đăng sẽ không được hiển thị. Lý do sẽ được gửi trực tiếp đến Chủ trọ.
            </p>

            <textarea
              rows={3}
              placeholder="VD: Giá thuê không nhất quán, hình ảnh chụp bị mờ, địa chỉ không rõ ràng..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-100 focus:border-red-500 mb-3"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setRejectingRoomId(null)}
                className="w-1/2 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
              >
                Hủy
              </button>
              <button
                onClick={handleReject}
                className="w-1/2 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
