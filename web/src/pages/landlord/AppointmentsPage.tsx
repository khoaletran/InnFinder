import React, { useEffect, useState } from 'react';
import {
  Clock,
  Phone,
  AlertCircle,
  Handshake,
  Calendar as CalendarIcon,
  Search,
  X,
  Eye,
  Filter,
} from 'lucide-react';
import { landlordService } from '../../services/landlord.service';
import type { LandlordAppointmentItem } from '../../types/landlord.types';
import { ApproveAppointmentModal } from '../../components/landlord/ApproveAppointmentModal';
import { CancelAppointmentModal } from '../../components/landlord/CancelAppointmentModal';
import { AppointmentDetailModal } from '../../components/landlord/AppointmentDetailModal';
import { toast } from 'sonner';

export const AppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<LandlordAppointmentItem[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals state
  const [selectedApprove, setSelectedApprove] = useState<LandlordAppointmentItem | null>(null);
  const [selectedCancel, setSelectedCancel] = useState<LandlordAppointmentItem | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<LandlordAppointmentItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const data = await landlordService.getAppointments();
      setAppointments(data);
    } catch {
      // fallback
    }
  };

  const handleApproveConfirm = async () => {
    if (!selectedApprove) return;
    setActionLoading(true);
    try {
      await landlordService.approveAppointment(selectedApprove.id);
      setAppointments((prev) =>
        prev.map((a) => (a.id === selectedApprove.id ? { ...a, trangThai: 'XAC_NHAN' } : a))
      );
      setSelectedApprove(null);
      toast.success('Xác nhận lịch hẹn xem phòng thành công!');
    } catch {
      toast.error('Không thể duyệt lịch hẹn');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelConfirm = async (reason: string) => {
    if (!selectedCancel) return;
    setActionLoading(true);
    try {
      await landlordService.cancelAppointment(selectedCancel.id, reason);
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === selectedCancel.id ? { ...a, trangThai: 'HUY', lyDoHuy: reason } : a
        )
      );
      setSelectedCancel(null);
      toast.success('Đã từ chối lịch hẹn xem phòng');
    } catch {
      toast.error('Không thể hủy lịch hẹn');
    } finally {
      setActionLoading(false);
    }
  };

  // Kịch bản sau khi dẫn xem xong: Xác nhận chốt thuê hoặc không thuê
  const handleDealAction = async (item: LandlordAppointmentItem, agreed: boolean) => {
    const confirmMsg = agreed
      ? 'Xác nhận cả 2 bên ĐỒNG Ý THUÊ? Hệ thống sẽ thu phí hoa hồng (20.000đ) và cộng 180.000đ cọc thế chân vào ví của bạn.'
      : 'Xác nhận KHÔNG THUÊ? Hệ thống sẽ hoàn trả đủ 100% cọc (200.000đ) vào ví của bạn (bù khoản bạn đã trả lại cho khách).';

    if (!confirm(confirmMsg)) return;

    try {
      await landlordService.completeDeal(item.id, agreed);
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === item.id
            ? { ...a, trangThai: agreed ? 'HOAN_THANH' : 'HUY', chuTroDongY: agreed }
            : a
        )
      );
      toast.success(
        agreed
          ? 'Chốt thuê thành công! Đã cộng 180.000đ cọc thế chân vào ví.'
          : 'Đã hoàn tất xác nhận không thuê. Đã hoàn 200.000đ cọc vào ví.'
      );
    } catch {
      toast.error('Lỗi cập nhật kết quả giao dịch');
    }
  };

  // Date presets
  const today = '2026-11-17';
  const tomorrow = '2026-11-18';
  const dayAfterTomorrow = '2026-11-19';

  const filtered = appointments.filter((a) => {
    const matchStatus = filter === 'ALL' || a.trangThai === filter;
    const matchDate = !selectedDate || a.ngayHen === selectedDate;
    const matchSearch =
      !searchTerm.trim() ||
      a.khachHangTen.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.sdt.includes(searchTerm) ||
      a.phongTen.toLowerCase().includes(searchTerm.toLowerCase());

    return matchStatus && matchDate && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Quản Lý Lịch Hẹn Xem Phòng</h2>
          <p className="text-xs text-slate-500">
            Theo dõi, lọc theo ngày hẹn và xác nhận hoàn cọc trực tiếp tại buổi gặp
          </p>
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'CHO_XAC_NHAN', label: 'Chờ duyệt' },
            { id: 'XAC_NHAN', label: 'Đã xác nhận' },
            { id: 'HOAN_THANH', label: 'Hoàn thành' },
            { id: 'HUY', label: 'Đã hủy' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Swimlane Notice Banner */}
      <div className="bg-cyan-50/70 border border-cyan-200/70 rounded-2xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-cyan-600 shrink-0 mt-0.5" />
        <div className="text-xs text-cyan-900">
          <strong className="block font-bold mb-0.5">Quy trình thế chân cọc giữ chân xem phòng:</strong>
          <span>
            Khách nộp cọc cho Hệ thống để giữ chân. Khi dẫn xem thực tế, Chủ trọ trả lại 100% tiền cọc (200k) trực tiếp cho khách. Sau đó 2 bên xác nhận trên ứng dụng để Hệ thống chuyển tiền cọc thế chân từ Sàn về Ví chủ trọ.
          </span>
        </div>
      </div>

      {/* Filter Toolbar: Search + Calendar Date Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên khách, SĐT, phòng..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Date Picker & Quick Presets */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <CalendarIcon className="w-4 h-4 text-cyan-600" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs text-slate-700 font-semibold bg-transparent focus:outline-none cursor-pointer"
                title="Chọn ngày lọc lịch hẹn"
              />
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate('')}
                  className="p-0.5 text-slate-400 hover:text-slate-600 rounded-md"
                  title="Xóa lọc ngày"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick date chips */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSelectedDate(today)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  selectedDate === today
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                Hôm nay
              </button>
              <button
                onClick={() => setSelectedDate(tomorrow)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  selectedDate === tomorrow
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                Ngày mai
              </button>
              <button
                onClick={() => setSelectedDate(dayAfterTomorrow)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  selectedDate === dayAfterTomorrow
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                19/11
              </button>
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate('')}
                  className="px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer transition-colors"
                >
                  Xóa lọc
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter status indicator */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2.5">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Đang hiển thị <strong>{filtered.length}</strong> / {appointments.length} lịch hẹn
            </span>
            {selectedDate && (
              <span className="text-cyan-700 font-bold ml-1">
                (Lọc theo ngày: {selectedDate})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Table of appointments */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Khách Hẹn Xem</th>
                <th className="py-3.5 px-4">Phòng Trọ</th>
                <th className="py-3.5 px-4">Thời Gian Hẹn</th>
                <th className="py-3.5 px-4">Tiền Cọc Giữ Chân</th>
                <th className="py-3.5 px-4">Trạng Thái</th>
                <th className="py-3.5 px-4 text-right">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Không tìm thấy lịch hẹn nào theo tiêu chí lọc.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedDetail(item)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    {/* Guest info */}
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-slate-800 text-xs block group-hover:text-cyan-700 transition-colors">
                          {item.khachHangTen}
                        </span>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-cyan-600" />
                          {item.sdt}
                        </span>
                      </div>
                    </td>

                    {/* Room */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={item.hinhAnh || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=100'}
                          alt={item.phongTen}
                          className="w-10 h-10 rounded-xl object-cover shrink-0 ring-1 ring-slate-100"
                        />
                        <div className="min-w-0 max-w-xs">
                          <span className="font-bold text-slate-800 block truncate">{item.phongTen}</span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {item.diaChiPhong || 'Bình Thạnh, TP.HCM'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Schedule */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-cyan-600" />
                          {item.thoiGian}
                        </span>
                        <span className="text-[11px] text-slate-500 block font-medium">
                          {item.ngayHen}
                        </span>
                      </div>
                    </td>

                    {/* Deposit */}
                    <td className="py-3.5 px-4">
                      <span className="font-black text-cyan-700 text-sm block">
                        {(item.coc || 200000).toLocaleString('vi-VN')} đ
                      </span>
                      <span className="text-[10px] text-emerald-600 font-medium">Đã tạm giữ</span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          item.trangThai === 'CHO_XAC_NHAN'
                            ? 'bg-amber-100 text-amber-700'
                            : item.trangThai === 'XAC_NHAN'
                            ? 'bg-cyan-100 text-cyan-700'
                            : item.trangThai === 'HOAN_THANH'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {item.trangThai === 'CHO_XAC_NHAN'
                          ? 'Chờ duyệt lịch'
                          : item.trangThai === 'XAC_NHAN'
                          ? 'Đã duyệt xem'
                          : item.trangThai === 'HOAN_THANH'
                          ? 'Thuê thành công'
                          : 'Đã hủy'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td
                      className="py-3.5 px-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.trangThai === 'CHO_XAC_NHAN' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedCancel(item)}
                            className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            Từ chối
                          </button>
                          <button
                            onClick={() => setSelectedApprove(item)}
                            className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                          >
                            Duyệt lịch
                          </button>
                        </div>
                      )}

                      {item.trangThai === 'XAC_NHAN' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDealAction(item, false)}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Khách không thuê: Hoàn trả 100% cọc vào ví chủ trọ"
                          >
                            Không thuê
                          </button>
                          <button
                            onClick={() => handleDealAction(item, true)}
                            className="px-3 py-1 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                            title="Cả hai đồng ý thuê: Thu phí hoa hồng và chuyển cọc thế chân"
                          >
                            <Handshake className="w-3.5 h-3.5" />
                            <span>Chốt thuê</span>
                          </button>
                        </div>
                      )}

                      {item.trangThai === 'HOAN_THANH' && (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[11px] text-emerald-600 font-semibold">
                            Đã nhận cọc thế chân
                          </span>
                          <button
                            onClick={() => setSelectedDetail(item)}
                            className="p-1 text-slate-400 hover:text-cyan-600"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {item.trangThai === 'HUY' && (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[11px] text-slate-400">
                            {item.lyDoHuy || 'Đã hủy'}
                          </span>
                          <button
                            onClick={() => setSelectedDetail(item)}
                            className="p-1 text-slate-400 hover:text-cyan-600"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <AppointmentDetailModal
        isOpen={!!selectedDetail}
        onClose={() => setSelectedDetail(null)}
        appointment={selectedDetail}
        onApprove={(id) => {
          const app = appointments.find((a) => a.id === id);
          if (app) setSelectedApprove(app);
        }}
        onCancel={(id) => {
          const app = appointments.find((a) => a.id === id);
          if (app) setSelectedCancel(app);
        }}
      />

      {/* Approve Modal */}
      <ApproveAppointmentModal
        isOpen={!!selectedApprove}
        onClose={() => setSelectedApprove(null)}
        onConfirm={handleApproveConfirm}
        appointment={selectedApprove}
        loading={actionLoading}
      />

      {/* Cancel Modal */}
      <CancelAppointmentModal
        isOpen={!!selectedCancel}
        onClose={() => setSelectedCancel(null)}
        onConfirm={handleCancelConfirm}
        appointment={selectedCancel}
        loading={actionLoading}
      />
    </div>
  );
};
