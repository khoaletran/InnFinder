import React, { useState, useEffect } from 'react';
import {
  Gavel,
  Loader2,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import type { AdminComplaintItem } from '../../types/admin.types';
import { toast } from 'sonner';

export const ComplaintsAdminPage: React.FC = () => {
  const [complaints, setComplaints] = useState<AdminComplaintItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<AdminComplaintItem | null>(null);

  // Form giải quyết
  const [conclusion, setConclusion] = useState('');
  const [violationLevel, setViolationLevel] = useState<'NHE' | 'TRUNG_BINH' | 'NANG'>('TRUNG_BINH');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadComplaints();
  }, []);

  const loadComplaints = async () => {
    try {
      setIsLoading(true);
      const res = await adminService.getAllComplaints();
      setComplaints(res);
    } catch {
      toast.error('Lỗi tải danh sách khiếu nại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenResolve = (item: AdminComplaintItem) => {
    setSelectedComplaint(item);
    setConclusion(item.ghiChuXuLy || '');
    setViolationLevel(item.mucDoViPham || 'TRUNG_BINH');
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    if (!conclusion.trim()) {
      toast.error('Vui lòng nhập kết luận và biện pháp xử lý');
      return;
    }

    try {
      setIsSubmitting(true);
      await adminService.resolveComplaint(selectedComplaint.maKhieuNai, {
        trangThai: 'DA_XU_LI',
        mucDoViPham: violationLevel,
        ketLuan: conclusion.trim(),
      });
      toast.success('Đã cập nhật phán quyết xử lý khiếu nại thành công!');
      setSelectedComplaint(null);
      loadComplaints();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Xử lý Khiếu nại & Vi phạm</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Tiếp nhận minh chứng tranh chấp, điều tra và thi hành chế tài theo 3 mức độ (Nhẹ, Trung bình, Nặng)
        </p>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
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
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Đang tải danh sách khiếu nại...
                  </td>
                </tr>
              ) : complaints.length > 0 ? (
                complaints.map((item) => (
                  <tr key={item.maKhieuNai} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">
                      #{item.maKhieuNai}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {item.nguoiKhieuNai}
                    </td>
                    <td className="py-3 px-4 font-bold text-red-600">
                      {item.doiTuongBiKhieuNai}
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                      {item.vanDe}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {item.thoiGian}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.trangThai === 'DA_XU_LI' || item.trangThai === 'DA_XU_LY'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.trangThai === 'DANG_XU_LY'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {item.trangThai === 'DA_XU_LI' || item.trangThai === 'DA_XU_LY'
                          ? 'Đã xử lý'
                          : item.trangThai === 'DANG_XU_LY'
                          ? 'Đang thụ lý'
                          : 'Chờ duyệt'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
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
                    Hiện không có khiếu nại nào cần giải quyết.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PHÁN QUYẾT XỬ LÝ KHIẾU NẠI */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Gavel className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Hội đồng thẩm định khiếu nại #{selectedComplaint.maKhieuNai}
                </h3>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

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
                <span className="font-semibold block mb-0.5">Nội dung phản ánh:</span>
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
                <div className="flex gap-2">
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

            <form onSubmit={handleResolveSubmit} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mức độ vi phạm (Theo quy chuẩn AGENTS.md)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'NHE', label: 'Nhẹ (Cảnh cáo)' },
                    { val: 'TRUNG_BINH', label: 'TB (Trừ uy tín)' },
                    { val: 'NANG', label: 'Nặng (Khóa vĩnh viễn)' },
                  ].map((m) => (
                    <button
                      key={m.val}
                      type="button"
                      onClick={() => setViolationLevel(m.val as any)}
                      className={`p-2 rounded-xl text-xs font-semibold text-center border transition-all cursor-pointer ${
                        violationLevel === m.val
                          ? 'bg-red-50 border-red-500 text-red-700 font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kết luận xử lý & Biện pháp khắc phục
                </label>
                <textarea
                  rows={3}
                  placeholder="Ghi rõ phương án hoàn cọc, chế tài áp dụng hoặc cảnh cáo đối với tài khoản vi phạm..."
                  value={conclusion}
                  onChange={(e) => setConclusion(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="w-1/2 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Ban hành phán quyết'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
