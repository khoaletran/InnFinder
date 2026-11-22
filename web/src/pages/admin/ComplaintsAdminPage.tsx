import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Spinner } from '@heroui/react';
import { CalendarCheck, CheckCircle2, Clock, Gavel, RotateCcw, SearchCode } from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/services/admin.service';
import { Modal } from '@/components/common/Modal';
import { StatusTabBar } from '@/components/common/StatusTabBar';
import {
  AdminErrorState,
  AdminRefreshButton,
  AdminTableSkeleton,
} from '@/components/common/AdminStates';
import { formatDateTime, formatVND } from '@/utils/formatters';
import type { AdminComplaintItem } from '@/types/admin.types';
import type { TrangThaiDatLich } from '@/types/booking.types';
import type { MucDoViPham, TrangThaiKhieuNai } from '@/types/auth-user.types';

const VIOLATION_OPTIONS: Array<{ val: MucDoViPham; label: string; desc: string }> = [
  { val: 'NHE', label: 'Nhẹ', desc: 'Nhắc nhở cảnh cáo qua email/hệ thống' },
  { val: 'TRUNG_BINH', label: 'Trung bình', desc: 'Trừ 10 điểm uy tín chủ trọ (áp dụng khi chốt Đã xử lý)' },
  { val: 'NANG', label: 'Nặng', desc: 'Khóa tài khoản vĩnh viễn & gỡ toàn bộ tin đang hiển thị' },
];

export const ComplaintsAdminPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<TrangThaiKhieuNai>('CHO_DUYET');
  const [selectedComplaint, setSelectedComplaint] = useState<AdminComplaintItem | null>(null);

  // Form giải quyết chuẩn Enum TrangThaiKhieuNai & MucDoViPham
  const [nextStatus, setNextStatus] = useState<TrangThaiKhieuNai>('DA_XU_LI');
  const [violationLevel, setViolationLevel] = useState<MucDoViPham>('TRUNG_BINH');
  const [conclusion, setConclusion] = useState('');
  const [refundDeposit, setRefundDeposit] = useState(false);
  const [selectedRefundBookingId, setSelectedRefundBookingId] = useState('');

  const {
    data: complaints = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'complaints'],
    queryFn: () => adminService.getAllComplaints(),
  });

  const resolveMutation = useMutation({
    mutationFn: ({
      id,
      trangThai,
      mucDoViPham,
      ketQua,
      hoanCoc,
      maDatLichHoanCoc,
    }: {
      id: string;
      trangThai: TrangThaiKhieuNai;
      mucDoViPham: MucDoViPham;
      ketQua: string;
      hoanCoc?: boolean;
      maDatLichHoanCoc?: string;
    }) =>
      adminService.resolveComplaint(id, {
        trangThai,
        mucDoViPham,
        ketQua,
        hoanCoc,
        maDatLichHoanCoc,
      }),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.hoanCoc
          ? 'Đã cập nhật phán quyết và hoàn cọc giữ chân cho khách hàng!'
          : 'Đã cập nhật phán quyết xử lý khiếu nại thành công!',
      );
      setSelectedComplaint(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'complaints'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'treasury-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'viewings'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi cập nhật phán quyết');
    },
  });

  const handleOpenResolve = (item: AdminComplaintItem) => {
    setSelectedComplaint(item);
    setNextStatus(item.trangThai === 'CHO_DUYET' ? 'DA_XU_LI' : item.trangThai);
    setViolationLevel(item.mucDoViPham || 'TRUNG_BINH');
    setConclusion(item.ghiChuXuLy || '');
    const firstEligible = item.lichHenLienQuan?.find((b) => b.duDieuKienHoanCoc);
    setRefundDeposit(false);
    setSelectedRefundBookingId(firstEligible?.maDatLich || '');
  };

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    if (!conclusion.trim()) {
      toast.error('Vui lòng nhập kết luận hoặc phương án xử lý');
      return;
    }
    const shouldRefund = nextStatus === 'DA_XU_LI' && refundDeposit;
    if (shouldRefund && !selectedRefundBookingId) {
      toast.error('Vui lòng chọn lịch hẹn cần hoàn cọc');
      return;
    }

    resolveMutation.mutate({
      id: selectedComplaint.maKhieuNai,
      trangThai: nextStatus,
      mucDoViPham: violationLevel,
      ketQua: conclusion.trim(),
      hoanCoc: shouldRefund,
      maDatLichHoanCoc: shouldRefund ? selectedRefundBookingId : undefined,
    });
  };

  const formatBookingStatusLabel = (status: TrangThaiDatLich): string => {
    switch (status) {
      case 'CHO_XAC_NHAN':
        return 'Chờ xác nhận';
      case 'XAC_NHAN':
        return 'Đã xác nhận';
      case 'HOAN_THANH':
        return 'Hoàn tất thuê';
      case 'HUY':
        return 'Đã hủy / Hoàn';
    }
  };

  const renderComplaintStatusChip = (status: TrangThaiKhieuNai) => {
    switch (status) {
      case 'CHO_DUYET':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-warning-bg text-warning-text">
            Chờ duyệt
          </span>
        );
      case 'DANG_XU_LY':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-accent-soft text-accent">
            Đang xác minh
          </span>
        );
      case 'DA_XU_LI':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-success-bg text-success-text">
            Đã xử lý
          </span>
        );
    }
  };

  const statusCounts = useMemo(() => {
    const counts: Record<TrangThaiKhieuNai, number> = {
      CHO_DUYET: 0,
      DANG_XU_LY: 0,
      DA_XU_LI: 0,
    };
    for (const c of complaints) {
      if (c.trangThai && c.trangThai in counts) {
        counts[c.trangThai]++;
      }
    }
    return counts;
  }, [complaints]);

  const filtered = complaints.filter((c) => c.trangThai === statusFilter);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-text tracking-[-0.01em]">
          Xử lý Khiếu nại & Vi phạm
        </h1>

        <AdminRefreshButton
          onClick={() => void refetch()}
          isRefreshing={isFetching}
          label="Làm mới danh sách"
        />
      </div>

      {/* Filter Tabs */}
      <StatusTabBar
        ariaLabel="Lọc khiếu nại theo trạng thái"
        activeKey={statusFilter}
        onChange={setStatusFilter}
        tabs={[
          { key: 'CHO_DUYET', label: 'Chờ duyệt', count: statusCounts.CHO_DUYET, icon: Clock },
          {
            key: 'DANG_XU_LY',
            label: 'Đang xác minh',
            count: statusCounts.DANG_XU_LY,
            icon: SearchCode,
          },
          {
            key: 'DA_XU_LI',
            label: 'Đã xử lý',
            count: statusCounts.DA_XU_LI,
            icon: CheckCircle2,
          },
        ]}
      />

      {/* Main Table */}
      {isError ? (
        <AdminErrorState
          title="Không thể tải danh sách khiếu nại"
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => void refetch()}
        />
      ) : (
        <Card className="bg-surface rounded-xl border border-border overflow-hidden p-0">
          <Card.Content className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-subtle border-b border-border text-[11px] font-medium text-text-muted uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Mã khiếu nại</th>
                  <th className="py-3 px-4">Người tố cáo</th>
                  <th className="py-3 px-4">Đối tượng bị phản ánh</th>
                  <th className="py-3 px-4">Vấn đề vi phạm</th>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Phán quyết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {isLoading ? (
                  <AdminTableSkeleton rows={5} cols={7} />
                ) : filtered.length > 0 ? (
                  filtered.map((item) => (
                    <tr key={item.maKhieuNai} className="hover:bg-surface-subtle transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-text-secondary">
                        #{item.maKhieuNai}
                      </td>
                      <td className="py-3 px-4 font-medium text-text">
                        {item.nguoiKhieuNai}
                      </td>
                      <td className="py-3 px-4 font-semibold text-danger-text">{item.doiTuongBiKhieuNai}</td>
                      <td className="py-3 px-4 text-text-secondary max-w-xs truncate">{item.vanDe}</td>
                      <td className="py-3 px-4 text-text-muted tabular-nums">{formatDateTime(item.thoiGian)}</td>
                      <td className="py-3 px-4">{renderComplaintStatusChip(item.trangThai)}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenResolve(item)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 ml-auto cursor-pointer transition-colors ${
                            item.trangThai === 'DA_XU_LI'
                              ? 'border border-border bg-surface hover:bg-surface-subtle text-text-secondary'
                              : 'bg-accent hover:bg-accent-hover text-white'
                          }`}
                        >
                          <Gavel className="w-3.5 h-3.5" />
                          {item.trangThai === 'DA_XU_LI' ? 'Xem kết quả' : 'Xử lý'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-text-muted">
                      Hiện không có khiếu nại nào khớp với bộ lọc.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card.Content>
        </Card>
      )}

      {/* MODAL PHÁN QUYẾT XỬ LÝ KHIẾU NẠI */}
      <Modal
        isOpen={!!selectedComplaint}
        onClose={() => setSelectedComplaint(null)}
        title={
          selectedComplaint
            ? `Thẩm định khiếu nại #${selectedComplaint.maKhieuNai}`
            : 'Thẩm định khiếu nại'
        }
        subtitle={
          selectedComplaint?.trangThai === 'DA_XU_LI'
            ? 'Khiếu nại đã được giải quyết dứt điểm'
            : 'Cập nhật tiến trình xử lý và mức độ vi phạm'
        }
        maxWidth="lg"
      >
        {selectedComplaint && (() => {
          const isResolved = selectedComplaint.trangThai === 'DA_XU_LI';
          const relatedBookings = selectedComplaint.lichHenLienQuan ?? [];
          const eligibleBookings = relatedBookings.filter((b) => b.duDieuKienHoanCoc);
          return (
          <form onSubmit={handleResolveSubmit} className="space-y-4">
            <div className="p-3.5 bg-surface-subtle border border-border rounded-lg space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-text-muted">Người gửi khiếu nại:</span>
                <strong className="font-medium text-text">{selectedComplaint.nguoiKhieuNai}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Đối tượng bị phản ánh:</span>
                <strong className="font-semibold text-danger-text">{selectedComplaint.doiTuongBiKhieuNai}</strong>
              </div>
              <div className="pt-1 text-text-secondary">
                <span className="font-medium block mb-1">Nội dung phản ánh:</span>
                <p className="bg-surface p-2.5 rounded-lg border border-border">
                  {selectedComplaint.vanDe}
                </p>
              </div>
            </div>

            {/* Thông tin lịch hẹn & cọc giữ chân liên quan */}
            <div className="p-3.5 rounded-lg border border-border bg-surface space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-text flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-accent" />
                  Lịch hẹn & cọc giữ chân liên quan ({relatedBookings.length})
                </span>
              </div>
              {relatedBookings.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {relatedBookings.map((b) => (
                    <div
                      key={b.maDatLich}
                      className="p-2.5 rounded-lg bg-surface-subtle border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="font-mono font-medium text-accent">{b.maDatLich}</code>
                          <span className="text-[11px] text-text-muted">
                            • {formatBookingStatusLabel(b.trangThai)}
                          </span>
                        </div>
                        <p className="text-text font-medium truncate">{b.tenPhongTro}</p>
                        <p className="text-[11px] text-text-muted">
                          Hẹn: {formatDateTime(b.ngayHen)} •{' '}
                          {b.daNhanLaiCoc
                            ? 'Khách đã xác nhận nhận lại cọc ngoài đời'
                            : b.daNopCoc
                              ? 'Tiền cọc đang giữ trên sàn'
                              : 'Chưa nộp cọc'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-semibold text-text tabular-nums">
                          {formatVND(b.tienCoc)}
                        </div>
                        {b.duDieuKienHoanCoc ? (
                          <span className="text-[11px] font-medium text-success-text">
                            Đủ điều kiện hoàn
                          </span>
                        ) : (
                          <span className="text-[11px] text-text-muted">Không thể hoàn tự động</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-text-muted">
                  Không ghi nhận lịch hẹn có cọc giữ chân giữa hai tài khoản này.
                </p>
              )}
            </div>

            {Array.isArray(selectedComplaint.hinhAnh) && selectedComplaint.hinhAnh.length > 0 && (
              <div>
                <span className="block text-xs font-medium text-text-secondary mb-1.5">
                  Hình ảnh bằng chứng vi phạm:
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedComplaint.hinhAnh.map((img, i) => (
                    <a
                      key={i}
                      href={img}
                      target="_blank"
                      rel="noreferrer"
                      className="w-20 h-20 rounded-lg border border-border overflow-hidden block"
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Trạng thái xử lý */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Trạng thái xử lý
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { val: 'DANG_XU_LY', label: 'Đang xác minh' },
                    { val: 'DA_XU_LI', label: 'Đã xử lý dứt điểm' },
                  ] as const
                ).map((st) => (
                  <button
                    key={st.val}
                    type="button"
                    disabled={isResolved}
                    onClick={() => setNextStatus(st.val)}
                    className={`py-2 px-3 rounded-lg text-xs border transition-colors ${
                      isResolved ? 'cursor-default opacity-80' : 'cursor-pointer'
                    } ${
                      nextStatus === st.val
                        ? 'bg-accent-soft border-accent-border text-accent font-semibold'
                        : 'border-border text-text-secondary hover:bg-surface-subtle font-medium'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mức độ vi phạm */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Mức độ vi phạm
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {VIOLATION_OPTIONS.map((m) => (
                  <button
                    key={m.val}
                    type="button"
                    disabled={isResolved}
                    onClick={() => setViolationLevel(m.val)}
                    className={`p-2.5 rounded-lg text-left border transition-colors ${
                      isResolved ? 'cursor-default opacity-80' : 'cursor-pointer'
                    } ${
                      violationLevel === m.val
                        ? 'bg-danger-bg border-danger-border text-danger-text'
                        : 'border-border text-text-secondary hover:bg-surface-subtle'
                    }`}
                  >
                    <span className="block text-xs font-semibold">{m.label}</span>
                    <span className="block text-[11px] opacity-80 mt-0.5">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Hoàn cọc cho khách hàng nếu chốt Đã xử lý và có lịch hẹn đủ điều kiện */}
            {!isResolved && nextStatus === 'DA_XU_LI' && eligibleBookings.length > 0 && (
              <div className="p-3.5 rounded-lg border border-accent-border bg-accent-soft space-y-2.5 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={refundDeposit}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setRefundDeposit(checked);
                      if (checked && !selectedRefundBookingId) {
                        setSelectedRefundBookingId(eligibleBookings[0].maDatLich);
                      }
                    }}
                    className="mt-0.5 rounded border-border-strong text-accent focus:ring-accent cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-text flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-accent" />
                      Hoàn cọc giữ chân về cho khách hàng
                    </span>
                    <span className="block text-[11px] text-text-secondary mt-0.5">
                      Hủy lịch hẹn và ghi nhận giao dịch hoàn 100% tiền cọc đang tạm giữ trên sàn.
                    </span>
                  </div>
                </label>

                {refundDeposit && (
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary mb-1">
                      Chọn lịch hẹn hoàn cọc
                    </label>
                    <select
                      value={selectedRefundBookingId}
                      onChange={(e) => setSelectedRefundBookingId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-xs font-medium text-text focus:outline-none focus:border-accent"
                    >
                      {eligibleBookings.map((b) => (
                        <option key={b.maDatLich} value={b.maDatLich}>
                          {b.maDatLich} — {formatVND(b.tienCoc)} ({b.tenPhongTro})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Kết luận xử lý & Biện pháp khắc phục
              </label>
              <textarea
                rows={3}
                readOnly={isResolved}
                placeholder="Ghi rõ phương án hoàn cọc, chế tài áp dụng hoặc cảnh cáo đối với tài khoản vi phạm..."
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value)}
                className={`w-full p-2.5 rounded-lg border border-border text-xs text-text placeholder:text-text-subtle focus:outline-none ${
                  isResolved
                    ? 'bg-surface-subtle text-text-secondary'
                    : 'bg-surface focus:border-accent'
                }`}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className={`${isResolved ? 'w-full' : 'w-1/2'} border border-border bg-surface text-text-secondary hover:bg-surface-subtle py-2.5 rounded-lg text-xs font-medium cursor-pointer transition-colors`}
              >
                Đóng
              </button>
              {!isResolved && (
                <button
                  type="submit"
                  disabled={resolveMutation.isPending}
                  className="w-1/2 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {resolveMutation.isPending && <Spinner size="sm" color="current" />}
                  Ban hành phán quyết
                </button>
              )}
            </div>
          </form>
          );
        })()}
      </Modal>
    </div>
  );
};
