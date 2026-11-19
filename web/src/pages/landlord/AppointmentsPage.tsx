import React, { useMemo, useState } from 'react';
import { Card, Chip } from '@heroui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  Handshake,
  Loader2,
  Phone,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { DeclineReasonModal } from '@/components/booking/DeclineReasonModal';
import { Modal } from '@/components/common/Modal';
import { AppointmentDetailModal } from '@/components/landlord/AppointmentDetailModal';
import { ApproveAppointmentModal } from '@/components/landlord/ApproveAppointmentModal';
import { CancelAppointmentModal } from '@/components/landlord/CancelAppointmentModal';
import { landlordService } from '@/services/landlord.service';
import type { TrangThaiDatLich } from '@/types/booking.types';
import type { LandlordAppointmentItem } from '@/types/landlord.types';
import { formatPhoneNumber, formatVND } from '@/utils/formatters';

type StatusFilter = 'ALL' | TrangThaiDatLich;

const toLocalIsoDate = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const AppointmentsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [selectedApprove, setSelectedApprove] = useState<LandlordAppointmentItem | null>(null);
  const [selectedCancel, setSelectedCancel] = useState<LandlordAppointmentItem | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<LandlordAppointmentItem | null>(null);
  const [decisionAgreeTarget, setDecisionAgreeTarget] = useState<LandlordAppointmentItem | null>(
    null,
  );
  const [decisionDeclineTarget, setDecisionDeclineTarget] =
    useState<LandlordAppointmentItem | null>(null);

  const today = useMemo(() => toLocalIsoDate(0), []);
  const tomorrow = useMemo(() => toLocalIsoDate(1), []);
  const dayAfterTomorrow = useMemo(() => toLocalIsoDate(2), []);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['landlord', 'appointments'],
    queryFn: landlordService.getAppointments,
  });

  const invalidateRelated = () => {
    void queryClient.invalidateQueries({ queryKey: ['landlord', 'appointments'] });
    void queryClient.invalidateQueries({ queryKey: ['landlord', 'dashboard-stats'] });
    void queryClient.invalidateQueries({ queryKey: ['landlord', 'wallet'] });
    void queryClient.invalidateQueries({ queryKey: ['landlord', 'transactions'] });
    void queryClient.invalidateQueries({ queryKey: ['landlord', 'rooms'] });
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => landlordService.approveAppointment(id),
    onSuccess: () => {
      invalidateRelated();
      setSelectedApprove(null);
      toast.success('Xác nhận lịch hẹn xem phòng thành công!');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Không thể duyệt lịch hẹn');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      landlordService.cancelAppointment(id, reason),
    onSuccess: () => {
      invalidateRelated();
      setSelectedCancel(null);
      toast.success('Đã từ chối lịch hẹn xem phòng');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Không thể từ chối lịch hẹn');
    },
  });

  const decisionMutation = useMutation({
    mutationFn: ({
      id,
      agreed,
      reason,
    }: {
      id: string;
      agreed: boolean;
      reason?: string;
    }) => landlordService.submitDecision(id, agreed, reason),
    onSuccess: (updated, variables) => {
      invalidateRelated();
      setDecisionAgreeTarget(null);
      setDecisionDeclineTarget(null);
      const cocVal = updated.coc ?? 0;
      const phiVal = updated.phiThu ?? 0;
      const netVal = Math.max(0, cocVal - phiVal);

      if (updated.trangThai === 'HOAN_THANH') {
        toast.success(
          `Chốt thuê thành công! Hệ thống đã trích phí hoa hồng (${formatVND(phiVal)}) và chuyển ${formatVND(netVal)} vào ví của bạn.`,
        );
      } else if (updated.trangThai === 'HUY' || !variables.agreed) {
        toast.success(
          `Đã ghi nhận từ chối cho thuê. Hệ thống hoàn trả đủ 100% cọc thế chân (${formatVND(cocVal)}) vào ví của bạn.`,
        );
      } else {
        toast.success(
          'Đã ghi nhận quyết định đồng ý cho thuê của bạn. Đang chờ Khách hàng xác nhận độc lập.',
        );
      }
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Không thể cập nhật quyết định cho thuê',
      );
    },
  });

  const filtered = appointments.filter((a) => {
    const matchStatus = filter === 'ALL' || a.trangThai === filter;
    const matchDate = !selectedDate || a.ngayHen === selectedDate;
    const q = searchTerm.trim().toLowerCase();
    const matchSearch =
      !q ||
      a.khachHangTen.toLowerCase().includes(q) ||
      a.sdt.includes(q) ||
      a.phongTen.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q);
    return matchStatus && matchDate && matchSearch;
  });

  const agreeCoc = decisionAgreeTarget?.coc ?? 0;
  const agreePhi = decisionAgreeTarget?.phiThu ?? 0;
  const agreeNet = Math.max(0, agreeCoc - agreePhi);

  const declineCoc = decisionDeclineTarget?.coc ?? 0;

  return (
    <div className="space-y-6">
      {/* Header & Status Tabs */}
      <Card className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <Card.Header className="p-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <Card.Title className="text-lg font-bold text-slate-900">
              Quản Lý Lịch Hẹn Xem Phòng
            </Card.Title>
            <Card.Description className="text-xs text-slate-500">
              Duyệt lịch hẹn, hoàn cọc trực tiếp tại buổi xem và xác nhận quyết định cho thuê theo Swimlane
            </Card.Description>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {(
              [
                { id: 'ALL', label: 'Tất cả' },
                { id: 'CHO_XAC_NHAN', label: 'Chờ duyệt' },
                { id: 'XAC_NHAN', label: 'Đã xác nhận' },
                { id: 'HOAN_THANH', label: 'Hoàn thành' },
                { id: 'HUY', label: 'Đã hủy' },
              ] as const
            ).map((tab) => (
              <button
                type="button"
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
        </Card.Header>
      </Card>

      {/* Swimlane 2.3 Notice */}
      <div className="bg-cyan-50/70 border border-cyan-200/70 rounded-2xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-cyan-600 shrink-0 mt-0.5" />
        <div className="text-xs text-cyan-900 leading-relaxed">
          <strong className="block font-bold mb-0.5">
            Quy trình thế chân cọc giữ chân xem phòng (Swimlane 2.3):
          </strong>
          <span>
            Khách nộp cọc giữ chân theo loại phòng vào Hệ thống. Khi dẫn xem thực tế, Chủ trọ hoàn trả trực tiếp 100% tiền cọc cho khách. Sau khi khách bấm{' '}
            <strong>&ldquo;Đã nhận lại cọc từ Chủ trọ&rdquo;</strong>, hai bên độc lập bấm quyết định trên ứng dụng: cả 2 đồng ý ➔ Sàn trích phí hoa hồng (phiThu) và chuyển phần cọc thế chân còn lại về Ví Chủ trọ; có ít nhất 1 bên từ chối ➔ Sàn hoàn đủ 100% cọc thế chân về Ví Chủ trọ (phí hoa hồng = 0 ₫).
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <Card.Content className="p-0 space-y-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
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
                    type="button"
                    onClick={() => setSelectedDate('')}
                    className="p-0.5 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                    title="Xóa lọc ngày"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
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
                  type="button"
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
                  type="button"
                  onClick={() => setSelectedDate(dayAfterTomorrow)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    selectedDate === dayAfterTomorrow
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  Ngày kia
                </button>
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate('')}
                    className="px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer transition-colors"
                  >
                    Xóa lọc
                  </button>
                )}
              </div>
            </div>
          </div>

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
        </Card.Content>
      </Card>

      {/* Appointments Table */}
      <Card className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs p-0">
        <Card.Content className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-600 mb-2" />
              <span className="text-xs">Đang tải danh sách lịch hẹn xem phòng...</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Khách Hẹn Xem</th>
                  <th className="py-3.5 px-4">Phòng Trọ</th>
                  <th className="py-3.5 px-4">Thời Gian Hẹn</th>
                  <th className="py-3.5 px-4">Cọc & Phí Sàn</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-right">Hành Động Nghiệp Vụ</th>
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
                  filtered.map((item) => {
                    const canDecide =
                      item.trangThai === 'XAC_NHAN' &&
                      item.daNhanLaiCoc === true &&
                      (item.chuTroDongY === null || item.chuTroDongY === undefined);

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedDetail(item)}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4">
                          <div>
                            <span className="font-bold text-slate-800 text-xs block group-hover:text-cyan-700 transition-colors">
                              {item.khachHangTen}
                            </span>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                              <Phone className="w-3 h-3 text-cyan-600" />
                              {formatPhoneNumber(item.sdt)}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={
                                item.hinhAnh ||
                                'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=100'
                              }
                              alt={item.phongTen}
                              className="w-10 h-10 rounded-xl object-cover shrink-0 ring-1 ring-slate-100 bg-slate-100"
                            />
                            <div className="min-w-0 max-w-xs">
                              <span className="font-bold text-slate-800 block truncate">
                                {item.phongTen}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {item.diaChiPhong || `#${item.maPhongTro || ''}`}
                              </span>
                            </div>
                          </div>
                        </td>

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

                        <td className="py-3.5 px-4">
                          <span className="font-black text-cyan-700 text-sm block">
                            {formatVND(item.coc)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium block">
                            Phí hoa hồng: {formatVND(item.phiThu)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <Chip
                            size="sm"
                            variant="soft"
                            color={
                              item.trangThai === 'CHO_XAC_NHAN'
                                ? 'warning'
                                : item.trangThai === 'XAC_NHAN'
                                  ? 'accent'
                                  : item.trangThai === 'HOAN_THANH'
                                    ? 'success'
                                    : 'danger'
                            }
                          >
                            <Chip.Label>
                              {item.trangThai === 'CHO_XAC_NHAN'
                                ? 'Chờ duyệt lịch'
                                : item.trangThai === 'XAC_NHAN'
                                  ? 'Đã xác nhận'
                                  : item.trangThai === 'HOAN_THANH'
                                    ? 'Thuê thành công'
                                    : 'Đã hủy'}
                            </Chip.Label>
                          </Chip>
                        </td>

                        <td
                          className="py-3.5 px-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.trangThai === 'CHO_XAC_NHAN' && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedCancel(item)}
                                className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              >
                                Từ chối
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedApprove(item)}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                              >
                                Duyệt lịch
                              </button>
                            </div>
                          )}

                          {item.trangThai === 'XAC_NHAN' && !item.daNhanLaiCoc && (
                            <div className="flex flex-col items-end gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3 h-3 shrink-0" />
                                Chờ khách xác nhận đã nhận lại cọc trực tiếp
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled
                                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 bg-slate-100 rounded-lg cursor-not-allowed opacity-70"
                                >
                                  Từ chối cho thuê
                                </button>
                                <button
                                  type="button"
                                  disabled
                                  className="px-2.5 py-1 text-[11px] font-bold text-slate-400 bg-slate-100 rounded-lg cursor-not-allowed opacity-70 flex items-center gap-1"
                                >
                                  <Handshake className="w-3 h-3" />
                                  <span>Đồng ý cho thuê</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {item.trangThai === 'XAC_NHAN' &&
                            item.daNhanLaiCoc === true &&
                            canDecide && (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  disabled={decisionMutation.isPending}
                                  onClick={() => setDecisionDeclineTarget(item)}
                                  className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  Từ chối cho thuê
                                </button>
                                <button
                                  type="button"
                                  disabled={decisionMutation.isPending}
                                  onClick={() => setDecisionAgreeTarget(item)}
                                  className="px-3 py-1.5 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  <Handshake className="w-3.5 h-3.5" />
                                  <span>Đồng ý cho thuê</span>
                                </button>
                              </div>
                            )}

                          {item.trangThai === 'XAC_NHAN' &&
                            item.daNhanLaiCoc === true &&
                            !canDecide && (
                              <div className="flex items-center justify-end gap-2">
                                {item.chuTroDongY === true ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Đã đồng ý · Chờ khách xác nhận
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    <XCircle className="w-3 h-3" />
                                    Đã từ chối cho thuê
                                  </span>
                                )}
                              </div>
                            )}

                          {item.trangThai === 'HOAN_THANH' && (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-[11px] text-emerald-600 font-semibold">
                                Thực nhận: {formatVND(Math.max(0, (item.coc ?? 0) - (item.phiThu ?? 0)))}
                              </span>
                              <button
                                type="button"
                                onClick={() => setSelectedDetail(item)}
                                className="p-1 text-slate-400 hover:text-cyan-600 cursor-pointer"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          {item.trangThai === 'HUY' && (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-[11px] text-slate-400 truncate max-w-[160px]">
                                {item.lyDoHuy || 'Đã hủy'}
                              </span>
                              <button
                                type="button"
                                onClick={() => setSelectedDetail(item)}
                                className="p-1 text-slate-400 hover:text-cyan-600 cursor-pointer"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          )}
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

      {/* Detail Modal */}
      <AppointmentDetailModal
        isOpen={Boolean(selectedDetail)}
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
        isOpen={Boolean(selectedApprove)}
        onClose={() => setSelectedApprove(null)}
        onConfirm={() => {
          if (selectedApprove) approveMutation.mutate(selectedApprove.id);
        }}
        appointment={selectedApprove}
        loading={approveMutation.isPending}
      />

      {/* Cancel Modal */}
      <CancelAppointmentModal
        isOpen={Boolean(selectedCancel)}
        onClose={() => setSelectedCancel(null)}
        onConfirm={(reason) => {
          if (selectedCancel) {
            cancelMutation.mutate({ id: selectedCancel.id, reason });
          }
        }}
        appointment={selectedCancel}
        loading={cancelMutation.isPending}
      />

      {/* Confirm Agree Decision Modal */}
      <Modal
        isOpen={Boolean(decisionAgreeTarget)}
        onClose={() => setDecisionAgreeTarget(null)}
        title="Xác nhận đồng ý cho thuê phòng"
        subtitle="Đối soát tiền cọc thế chân & phí hoa hồng môi giới theo Swimlane 2.3"
        maxWidth="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setDecisionAgreeTarget(null)}
              disabled={decisionMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              Quay lại
            </button>
            <button
              type="button"
              disabled={decisionMutation.isPending}
              onClick={() => {
                if (decisionAgreeTarget) {
                  decisionMutation.mutate({ id: decisionAgreeTarget.id, agreed: true });
                }
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Handshake className="w-4 h-4" />
              <span>{decisionMutation.isPending ? 'Đang xử lý...' : 'Xác nhận cho thuê'}</span>
            </button>
          </>
        }
      >
        {decisionAgreeTarget && (
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Bạn đang xác nhận <strong className="text-slate-900">Đồng ý cho thuê</strong> phòng{' '}
              <strong>{decisionAgreeTarget.phongTen}</strong> cho khách hàng{' '}
              <strong>{decisionAgreeTarget.khachHangTen}</strong>.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Cọc giữ chân thế chân tại Sàn:</span>
                <span className="font-bold text-slate-800">{formatVND(agreeCoc)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phí hoa hồng môi giới (khi cả 2 bên đồng ý):</span>
                <span className="font-bold text-amber-700">-{formatVND(agreePhi)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="font-bold text-slate-700">Thực nhận về Ví Chủ trọ:</span>
                <span className="font-black text-emerald-700 text-sm">{formatVND(agreeNet)}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-cyan-50 border border-cyan-100 text-[11px] text-cyan-800">
              Lưu ý: Nếu Khách hàng chọn Không thuê, Sàn sẽ thu phí hoa hồng = 0 ₫ và hoàn trả đủ 100% ({formatVND(agreeCoc)}) vào ví của bạn.
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Decline Decision Modal */}
      <DeclineReasonModal
        isOpen={Boolean(decisionDeclineTarget)}
        isLoading={decisionMutation.isPending}
        title="Từ chối cho thuê phòng?"
        description={`Hệ thống sẽ ghi nhận quyết định không cho thuê, thu phí hoa hồng = 0 ₫ và hoàn trả đủ 100% tiền cọc thế chân (${formatVND(declineCoc)}) vào ví của bạn.`}
        confirmButtonText="Xác nhận từ chối cho thuê"
        onClose={() => setDecisionDeclineTarget(null)}
        onConfirm={(reason) => {
          if (decisionDeclineTarget) {
            decisionMutation.mutate({
              id: decisionDeclineTarget.id,
              agreed: false,
              reason,
            });
          }
        }}
      />
    </div>
  );
};
