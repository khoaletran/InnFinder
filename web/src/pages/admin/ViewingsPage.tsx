import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Chip, Spinner } from '@heroui/react';
import { Eye, Clock, MapPin, CalendarCheck, Search } from 'lucide-react';
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
  const [searchInput, setSearchInput] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');

  const hasSearchQuery = submittedKeyword.trim().length > 0;

  const {
    data: appointments = [],
    isLoading,
  } = useQuery({
    queryKey: ['admin', 'monitored-viewings', submittedKeyword],
    queryFn: () => adminService.getMonitoredViewings(submittedKeyword),
    enabled: hasSearchQuery,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedKeyword(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSubmittedKeyword('');
  };

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
      {/* Search & Filter */}
      <Card className="bg-surface rounded-xl border border-border overflow-hidden p-0">
        <Card.Header className="p-4 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 sm:flex-none sm:w-[420px] min-w-[240px]">
              <Search className="w-4 h-4 text-text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Nhập mã hẹn, mã phòng, mã người thuê, mã chủ trọ hoặc SĐT 2 bên..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface-subtle border border-border text-xs text-text placeholder:text-text-subtle focus:outline-none focus:bg-surface focus:border-accent"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Tìm kiếm
            </button>
            {(searchInput || hasSearchQuery) && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="px-3 py-2 rounded-lg border border-border bg-surface text-xs font-medium text-text-secondary hover:bg-surface-subtle transition-colors cursor-pointer"
              >
                Xóa
              </button>
            )}
          </form>

          {hasSearchQuery && (
            <div className="flex flex-wrap gap-1.5">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === tab.key
                      ? 'bg-accent text-white'
                      : 'bg-surface-subtle text-text-secondary hover:bg-surface-muted border border-border'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </Card.Header>

        <Card.Content className="p-0 overflow-x-auto">
          {!hasSearchQuery ? (
            <div className="py-16 px-4 text-center">
              <Search className="w-9 h-9 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-semibold text-slate-800">
                Nhập mã hoặc SĐT để tra cứu lịch xem phòng
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Hệ thống bảo mật thông tin lịch hẹn — chỉ hiển thị kết quả khi nhập đúng mã hẹn, mã phòng, mã người thuê, mã chủ trọ hoặc số điện thoại của 2 bên.
              </p>
            </div>
          ) : (
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
                      <div className="mt-2">Đang tra cứu lịch hẹn xem phòng...</div>
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((item) => (
                    <tr key={item.maDatLich} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">
                        {item.maDatLich}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-800 truncate">{item.tenPhongTro}</div>
                        {item.maPhongTro && (
                          <div className="text-[10px] font-mono text-slate-400">{item.maPhongTro}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{item.tenKhachHang}</div>
                        <div className="text-[10px] text-slate-400">
                          {item.maKhachHang ? `${item.maKhachHang} • ` : ''}
                          {item.sdtKhachHang}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{item.tenChuTro}</div>
                        <div className="text-[10px] text-slate-400">
                          {item.maChuTro ? `${item.maChuTro} • ` : ''}
                          {item.sdtChuTro}
                        </div>
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
                      Không tìm thấy phiếu đặt lịch nào khớp với "{submittedKeyword}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </Card.Content>
      </Card>

      {/* MODAL CHI TIẾT LỊCH XEM */}
      <Modal
        isOpen={!!selectedViewing}
        onClose={() => setSelectedViewing(null)}
        title={selectedViewing ? selectedViewing.tenPhongTro : 'Chi tiết lịch xem'}
        subtitle={
          selectedViewing
            ? `Phiếu lịch hẹn #${selectedViewing.maDatLich}${selectedViewing.maPhongTro ? ` • Phòng ${selectedViewing.maPhongTro}` : ''}`
            : undefined
        }
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
                {selectedViewing.maKhachHang && (
                  <div className="text-[11px] font-mono text-slate-500">{selectedViewing.maKhachHang}</div>
                )}
                <div className="text-slate-500">{selectedViewing.sdtKhachHang}</div>
              </div>

              <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                <span className="text-[10px] text-indigo-600 font-bold block mb-1">
                  Chủ trọ dẫn xem
                </span>
                <div className="font-bold text-slate-900">{selectedViewing.tenChuTro}</div>
                {selectedViewing.maChuTro && (
                  <div className="text-[11px] font-mono text-slate-500">{selectedViewing.maChuTro}</div>
                )}
                <div className="text-slate-500">{selectedViewing.sdtChuTro}</div>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1.5">
              <div className="flex justify-between font-bold text-emerald-950">
                <span>Tiền cọc giữ chân tạm giữ trên sàn:</span>
                <span>{formatVND(selectedViewing.tienCoc)}</span>
              </div>
              <div className="flex justify-between text-emerald-800 text-[11px]">
                <span>Phí hoa hồng trích thu khi thuê thành công:</span>
                <span>{formatVND(selectedViewing.phiThu)}</span>
              </div>
              <p className="text-[10px] text-emerald-700 pt-1.5 border-t border-emerald-200/60 leading-relaxed">
                Quy trình chuẩn: Chủ trọ trực tiếp trả 100% cọc cho khách tại buổi gặp. Sàn trích thu hoa hồng và hoàn phần còn lại vào ví Chủ trọ nếu cả 2 bên xác nhận thuê, hoặc hoàn đủ 100% cọc cho Chủ trọ nếu không thuê.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
