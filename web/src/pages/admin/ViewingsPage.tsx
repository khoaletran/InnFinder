import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Chip, Spinner } from '@heroui/react';
import { Eye, Clock, MapPin, RefreshCw, CalendarCheck } from 'lucide-react';
import { adminService } from '@/services/admin.service';
import { Modal } from '@/components/common/Modal';
import { formatVND, formatDateTime } from '@/utils/formatters';
import type { AdminAppointmentItem } from '@/types/admin.types';
import type { TrangThaiDatLich } from '@/types/booking.types';

const FILTER_TABS: Array<{ key: 'ALL' | TrangThaiDatLich; label: string }> = [
  { key: 'ALL', label: 'Tất cả lịch xem' },
  { key: 'CHO_XAC_NHAN', label: 'Chờ chủ xác nhận' },
  { key: 'XAC_NHAN', label: 'Đã xác nhận hẹn' },
  { key: 'HOAN_THANH', label: 'Đã hoàn tất thuê' },
  { key: 'HUY', label: 'Đã hủy' },
];

export const ViewingsPage: React.FC = () => {
  const [selectedViewing, setSelectedViewing] = useState<AdminAppointmentItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | TrangThaiDatLich>('ALL');

  const {
    data: appointments = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'monitored-viewings'],
    queryFn: () => adminService.getMonitoredViewings(),
  });

  const filtered = appointments.filter((a) => {
    if (statusFilter !== 'ALL' && a.trangThai !== statusFilter) return false;
    return true;
  });

  const renderStatusChip = (status: TrangThaiDatLich) => {
    switch (status) {
      case 'CHO_XAC_NHAN':
        return (
          <Chip size="sm" variant="soft" color="warning" className="font-bold">
            Chờ xác nhận
          </Chip>
        );
      case 'XAC_NHAN':
        return (
          <Chip size="sm" variant="soft" color="accent" className="font-bold">
            Đã xác nhận hẹn
          </Chip>
        );
      case 'HOAN_THANH':
        return (
          <Chip size="sm" variant="soft" color="success" className="font-bold">
            Hoàn tất xem & thuê
          </Chip>
        );
      case 'HUY':
        return (
          <Chip size="sm" variant="soft" color="danger" className="font-bold">
            Đã hủy
          </Chip>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Giám sát Lịch xem & Cọc giữ chân
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi tiến trình hẹn gặp (`PhieuDatLich`), thế chân cọc (`coc`) và thu phí hoa hồng sàn (`phiThu`)
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isFetching ? 'animate-spin' : ''}`} />
          Làm mới lịch xem
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === tab.key
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-0">
        <Card.Content className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Mã lịch hẹn</th>
                <th className="py-3 px-4">Phòng trọ</th>
                <th className="py-3 px-4">Khách thuê</th>
                <th className="py-3 px-4">Chủ trọ</th>
                <th className="py-3 px-4">Thời gian hẹn</th>
                <th className="py-3 px-4">Cọc giữ chân</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Spinner size="md" className="mx-auto mb-2" />
                    <div className="mt-2">Đang đối soát danh sách lịch hẹn xem phòng...</div>
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((item) => (
                  <tr key={item.maDatLich} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">
                      {item.maDatLich}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 max-w-xs truncate">
                      {item.tenPhongTro}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{item.tenKhachHang}</div>
                      <div className="text-[10px] text-slate-400">{item.sdtKhachHang}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{item.tenChuTro}</div>
                      <div className="text-[10px] text-slate-400">{item.sdtChuTro}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {formatDateTime(item.ngayHen)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900">{formatVND(item.tienCoc)}</span>
                      {item.phiThu !== undefined && (
                        <span className="block text-[10px] text-blue-600">
                          Hoa hồng: {formatVND(item.phiThu)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">{renderStatusChip(item.trangThai)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedViewing(item)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <CalendarCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Chưa có phiếu đặt lịch xem phòng nào khớp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card.Content>
      </Card>

      {/* MODAL CHI TIẾT LỊCH XEM */}
      <Modal
        isOpen={!!selectedViewing}
        onClose={() => setSelectedViewing(null)}
        title={selectedViewing ? selectedViewing.tenPhongTro : 'Chi tiết lịch xem'}
        subtitle={selectedViewing ? `Phiếu lịch hẹn #${selectedViewing.maDatLich}` : undefined}
        maxWidth="lg"
        footer={
          <button
            type="button"
            onClick={() => setSelectedViewing(null)}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Đóng
          </button>
        }
      >
        {selectedViewing && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center gap-2 text-slate-700">
                <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                <span>{selectedViewing.diaChiPhong}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-slate-600">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>
                    Thời gian xem: <strong>{formatDateTime(selectedViewing.ngayHen)}</strong>
                  </span>
                </div>
                {renderStatusChip(selectedViewing.trangThai)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                <span className="text-[10px] text-blue-600 font-bold block mb-1">
                  Khách thuê hẹn xem
                </span>
                <div className="font-bold text-slate-900">{selectedViewing.tenKhachHang}</div>
                <div className="text-slate-500">{selectedViewing.sdtKhachHang}</div>
              </div>

              <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                <span className="text-[10px] text-indigo-600 font-bold block mb-1">
                  Chủ trọ dẫn xem
                </span>
                <div className="font-bold text-slate-900">{selectedViewing.tenChuTro}</div>
                <div className="text-slate-500">{selectedViewing.sdtChuTro}</div>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1.5">
              <div className="flex justify-between font-bold text-emerald-950">
                <span>Tiền cọc giữ chân tạm giữ trên sàn (`coc`):</span>
                <span>{formatVND(selectedViewing.tienCoc)}</span>
              </div>
              <div className="flex justify-between text-emerald-800 text-[11px]">
                <span>Phí hoa hồng trích thu khi thuê thành công (`phiThu`):</span>
                <span>{formatVND(selectedViewing.phiThu)}</span>
              </div>
              <p className="text-[10px] text-emerald-700 pt-1.5 border-t border-emerald-200/60 leading-relaxed">
                Quy trình chuẩn: Chủ trọ trực tiếp trả 100% cọc cho khách tại buổi gặp. Sàn hoàn `(coc - phiThu)` vào ví Chủ trọ nếu cả 2 bên xác nhận thuê (`HOAN_THANH`), hoặc hoàn đủ 100% `coc` cho Chủ trọ (hoa hồng = 0 ₫) nếu không thuê (`HUY`).
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
