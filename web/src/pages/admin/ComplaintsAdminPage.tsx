import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Chip, Spinner } from '@heroui/react';
import { Gavel, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/services/admin.service';
import { Modal } from '@/components/common/Modal';
import { formatDateTime } from '@/utils/formatters';
import type { AdminComplaintItem } from '@/types/admin.types';
import type { MucDoViPham, TrangThaiKhieuNai } from '@/types/auth-user.types';

const STATUS_TABS: Array<{ key: 'ALL' | TrangThaiKhieuNai; label: string }> = [
  { key: 'ALL', label: 'Tất cả khiếu nại' },
  { key: 'CHO_DUYET', label: 'Chờ duyệt' },
  { key: 'DANG_XU_LY', label: 'Đang xác minh' },
  { key: 'DA_XU_LI', label: 'Đã xử lý' },
];

const VIOLATION_OPTIONS: Array<{ val: MucDoViPham; label: string; desc: string }> = [
  { val: 'NHE', label: 'Nhẹ (NHE)', desc: 'Nhắc nhở cảnh cáo qua email/hệ thống' },
  { val: 'TRUNG_BINH', label: 'Trung bình (TRUNG_BINH)', desc: 'Trừ điểm uy tín, tạm ẩn bài 7 ngày' },
  { val: 'NANG', label: 'Nặng (NANG)', desc: 'Khóa tài khoản vĩnh viễn & thu hồi cọc' },
];

export const ComplaintsAdminPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'ALL' | TrangThaiKhieuNai>('ALL');
  const [selectedComplaint, setSelectedComplaint] = useState<AdminComplaintItem | null>(null);

  // Form giải quyết chuẩn Enum TrangThaiKhieuNai & MucDoViPham
  const [nextStatus, setNextStatus] = useState<TrangThaiKhieuNai>('DA_XU_LI');
  const [violationLevel, setViolationLevel] = useState<MucDoViPham>('TRUNG_BINH');
  const [conclusion, setConclusion] = useState('');

  const {
    data: complaints = [],
    isLoading,
    isFetching,
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
    }: {
      id: string;
      trangThai: TrangThaiKhieuNai;
      mucDoViPham: MucDoViPham;
      ketQua: string;
    }) =>
      adminService.resolveComplaint(id, {
        trangThai,
        mucDoViPham,
        ketQua,
      }),
    onSuccess: () => {
      toast.success('Đã cập nhật phán quyết xử lý khiếu nại thành công!');
      setSelectedComplaint(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'complaints'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-stats'] });
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
  };

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    if (!conclusion.trim()) {
      toast.error('Vui lòng nhập kết luận hoặc phương án xử lý');
      return;
    }

    resolveMutation.mutate({
      id: selectedComplaint.maKhieuNai,
      trangThai: nextStatus,
      mucDoViPham: violationLevel,
      ketQua: conclusion.trim(),
    });
  };

  const renderComplaintStatusChip = (status: TrangThaiKhieuNai) => {
    switch (status) {
      case 'CHO_DUYET':
        return (
          <Chip size="sm" variant="soft" color="warning" className="font-bold">
            Chờ duyệt
          </Chip>
        );
      case 'DANG_XU_LY':
        return (
          <Chip size="sm" variant="soft" color="accent" className="font-bold">
            Đang xác minh
          </Chip>
        );
      case 'DA_XU_LI':
        return (
          <Chip size="sm" variant="soft" color="success" className="font-bold">
            Đã xử lý
          </Chip>
        );
    }
  };

  const filtered = complaints.filter((c) =>
    statusFilter === 'ALL' ? true : c.trangThai === statusFilter,
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Xử lý Khiếu nại & Vi phạm
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tiếp nhận minh chứng (`PhieuKhieuNai`), thụ lý (`CHO_DUYET` → `DANG_XU_LY` → `DA_XU_LI`) và áp dụng chế tài (`NHE`, `TRUNG_BINH`, `NANG`)
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isFetching ? 'animate-spin' : ''}`} />
          Làm mới danh sách
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {STATUS_TABS.map((tab) => (
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

      {/* Main Table */}
      <Card className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-0">
        <Card.Content className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
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
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Spinner size="md" className="mx-auto mb-2" />
                    <div className="mt-2">Đang tải danh sách khiếu nại...</div>
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((item) => (
                  <tr key={item.maKhieuNai} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">
                      #{item.maKhieuNai}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {item.nguoiKhieuNai}
                    </td>
                    <td className="py-3 px-4 font-bold text-red-600">{item.doiTuongBiKhieuNai}</td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs truncate">{item.vanDe}</td>
                    <td className="py-3 px-4 text-slate-500">{formatDateTime(item.thoiGian)}</td>
                    <td className="py-3 px-4">{renderComplaintStatusChip(item.trangThai)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenResolve(item)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 ml-auto cursor-pointer"
                      >
                        <Gavel className="w-3.5 h-3.5" />
                        Xử lý
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Hiện không có khiếu nại nào khớp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card.Content>
      </Card>

      {/* MODAL PHÁN QUYẾT XỬ LÝ KHIẾU NẠI */}
      <Modal
        isOpen={!!selectedComplaint}
        onClose={() => setSelectedComplaint(null)}
        title={
          selectedComplaint
            ? `Thẩm định khiếu nại #${selectedComplaint.maKhieuNai}`
            : 'Thẩm định khiếu nại'
        }
        subtitle="Cập nhật tiến trình xử lý và mức độ vi phạm theo quy chuẩn AGENTS.md"
        maxWidth="lg"
      >
        {selectedComplaint && (
          <form onSubmit={handleResolveSubmit} className="space-y-4">
            <div className="p-3.5 bg-slate-50 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Người gửi khiếu nại:</span>
                <strong className="text-slate-800">{selectedComplaint.nguoiKhieuNai}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Đối tượng bị phản ánh:</span>
                <strong className="text-red-600">{selectedComplaint.doiTuongBiKhieuNai}</strong>
              </div>
              <div className="pt-1 text-slate-700">
                <span className="font-semibold block mb-1">Nội dung phản ánh:</span>
                <p className="bg-white p-2.5 rounded-lg border border-slate-200">
                  {selectedComplaint.vanDe}
                </p>
              </div>
            </div>

            {selectedComplaint.hinhAnh && selectedComplaint.hinhAnh.length > 0 && (
              <div>
                <span className="block text-xs font-bold text-slate-700 mb-1.5">
                  Hình ảnh bằng chứng vi phạm:
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedComplaint.hinhAnh.map((img, i) => (
                    <a
                      key={i}
                      href={img}
                      target="_blank"
                      rel="noreferrer"
                      className="w-20 h-20 rounded-xl border border-slate-200 overflow-hidden block"
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Trạng thái xử lý */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Trạng thái xử lý (`TrangThaiKhieuNai`)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { val: 'DANG_XU_LY', label: 'Đang xác minh (DANG_XU_LY)' },
                    { val: 'DA_XU_LI', label: 'Đã xử lý dứt điểm (DA_XU_LI)' },
                  ] as const
                ).map((st) => (
                  <button
                    key={st.val}
                    type="button"
                    onClick={() => setNextStatus(st.val)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      nextStatus === st.val
                        ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mức độ vi phạm */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mức độ vi phạm (`MucDoViPham`)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {VIOLATION_OPTIONS.map((m) => (
                  <button
                    key={m.val}
                    type="button"
                    onClick={() => setViolationLevel(m.val)}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                      violationLevel === m.val
                        ? 'bg-red-50 border-red-500 text-red-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-xs font-bold">{m.label}</span>
                    <span className="block text-[10px] opacity-80 mt-0.5">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kết luận xử lý & Biện pháp khắc phục (`ketQua`)
              </label>
              <textarea
                rows={3}
                placeholder="Ghi rõ phương án hoàn cọc, chế tài áp dụng hoặc cảnh cáo đối với tài khoản vi phạm..."
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={resolveMutation.isPending}
                className="w-1/2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {resolveMutation.isPending && <Spinner size="sm" color="current" />}
                Ban hành phán quyết
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
