import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Plus,
  ShieldAlert,
  Clock,
  CheckCircle2,
  ImageIcon,
  Upload,
  Loader2,
  FileText,
} from 'lucide-react';
import { authUserService } from '../../services/authUser.service';
import { uploadService } from '../../services/upload.service';
import { useAuthStore } from '../../store/useAuthStore';
import type { ComplaintResponseDTO } from '../../types/auth-user.types';
import { formatDate } from '../../utils/formatters';
import { toast } from 'sonner';

export const ComplaintsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState<ComplaintResponseDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [targetAccount, setTargetAccount] = useState('');
  const [issueType, setIssueType] = useState('Phòng sai thực tế so với bài đăng');
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadComplaints();
  }, []);

  const loadComplaints = async () => {
    try {
      setIsLoading(true);
      const res = await authUserService.getMyComplaints();
      if (Array.isArray(res)) {
        setComplaints(res);
      }
    } catch {
      // Bỏ qua
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const url = await uploadService.uploadImage(file, 'complaints');
      setEvidenceUrl(url);
      toast.success('Tải ảnh bằng chứng vi phạm thành công!');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tải ảnh');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAccount.trim()) {
      toast.error('Vui lòng nhập tên tài khoản hoặc mã chủ trọ/phòng vi phạm');
      return;
    }
    if (!description.trim() || description.length < 10) {
      toast.error('Mô tả sự việc phải có ít nhất 10 ký tự');
      return;
    }

    try {
      setIsSubmitting(true);
      const fullIssue = `[${issueType}] - ${description.trim()}`;
      await authUserService.createComplaint({
        maNguoiGui: user?.maNguoiDung,
        doiTuongKhieuNai: targetAccount.trim(),
        vanDe: fullIssue,
        hinhAnh: evidenceUrl || undefined,
      });

      toast.success('Đã gửi khiếu nại thành công! Admin sẽ thụ lý trong 24h.');
      setShowModal(false);
      setTargetAccount('');
      setDescription('');
      setEvidenceUrl('');
      loadComplaints();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi gửi khiếu nại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: ComplaintResponseDTO['trangThai']) => {
    switch (status) {
      case 'CHO_DUYET':
      case 'CHO_XU_LY':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Chờ xử lý
          </span>
        );
      case 'DANG_XU_LY':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Đang điều tra
          </span>
        );
      case 'DA_XU_LI':
      case 'DA_XU_LY':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Đã kết luận
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
            Từ chối
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Khiếu nại & Tranh chấp</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gửi minh chứng vi phạm, theo dõi tiến độ xử lý và quyết định xử phạt từ Quản trị viên
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-red-500/20 flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tạo khiếu nại mới
        </button>
      </div>

      {/* Guide Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <strong>Quy trình bảo vệ quyền lợi người dùng:</strong> Mọi bằng chứng (ảnh chụp thực tế, lịch sử trao đổi, biên lai thanh toán) sẽ được Admin đối soát độc lập với Chủ trọ. Nếu phát hiện vi phạm, hệ thống sẽ hoàn cọc 100% và trừ điểm uy tín hoặc khóa tài khoản đối tượng vi phạm theo đúng quy chuẩn.
        </div>
      </div>

      {/* Complaints List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Lịch sử khiếu nại đã gửi ({complaints.length})</h3>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            Đang tải dữ liệu khiếu nại...
          </div>
        ) : complaints.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {complaints.map((item, idx) => (
              <div key={idx} className="p-6 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      #{item.maKhieuNai || `KN-${item.id}`}
                    </span>
                    <span className="text-xs text-slate-500">
                      Gửi ngày: {formatDate(item.createdAt || item.ngayTao)}
                    </span>
                  </div>
                  <div>{getStatusBadge(item.trangThai)}</div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-600">
                    Đối tượng bị phản ánh:{' '}
                    <strong className="text-slate-900 font-semibold">
                      {item.doiTuongKhieuNai}
                    </strong>
                  </p>
                  <p className="text-xs text-slate-800 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {item.vanDe}
                  </p>
                </div>

                {item.hinhAnh && (
                  <div className="mt-3">
                    <a
                      href={item.hinhAnh}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <ImageIcon className="w-4 h-4" /> Xem hình ảnh bằng chứng đính kèm
                    </a>
                  </div>
                )}

                {item.ketLuan && (
                  <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                    <div className="font-bold text-emerald-900 flex items-center gap-1.5 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Kết luận xử lý từ Ban quản trị:
                    </div>
                    <p className="text-emerald-800 leading-relaxed">{item.ketLuan}</p>
                    {item.mucDoViPham && (
                      <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-200/60 text-emerald-900">
                        Mức độ xử phạt: {item.mucDoViPham}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-slate-700">Chưa có khiếu nại nào</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Tất cả các giao dịch và lịch hẹn của bạn đang diễn ra an toàn.
            </p>
          </div>
        )}
      </div>

      {/* MODAL TẠO KHIẾU NẠI MỚI */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Gửi khiếu nại / Báo cáo vi phạm</h3>
                <p className="text-xs text-slate-500">Minh chứng sẽ được chuyển thẳng đến Quản trị viên</p>
              </div>
            </div>

            <form onSubmit={handleSubmitComplaint} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã phòng hoặc Tên tài khoản bị khiếu nại
                </label>
                <input
                  type="text"
                  placeholder="VD: PT240926120000 hoặc nguyenvana"
                  value={targetAccount}
                  onChange={(e) => setTargetAccount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Loại vi phạm
                </label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                >
                  <option value="Phòng sai thực tế so với bài đăng">Phòng sai thực tế so với bài đăng</option>
                  <option value="Chủ trọ không trả lại cọc giữ chân">Chủ trọ không trả lại cọc giữ chân</option>
                  <option value="Chủ trọ không đến điểm hẹn xem phòng">Chủ trọ không đến điểm hẹn xem phòng</option>
                  <option value="Thái độ cư xử lăng mạ hoặc đe dọa">Thái độ cư xử lăng mạ hoặc đe dọa</option>
                  <option value="Dấu hiệu lừa đảo chiếm đoạt tài sản">Dấu hiệu lừa đảo chiếm đoạt tài sản</option>
                  <option value="Vấn đề khác">Vấn đề khác</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả chi tiết sự việc
                </label>
                <textarea
                  rows={4}
                  placeholder="Mô tả cụ thể thời gian, địa điểm, thỏa thuận giữa hai bên và các vi phạm cụ thể..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ảnh bằng chứng (Hình ảnh chụp thực tế hoặc tin nhắn)
                </label>
                <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-200 hover:border-red-300 rounded-xl cursor-pointer bg-slate-50 text-center p-2 relative overflow-hidden">
                  {evidenceUrl ? (
                    <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Đã tải lên ảnh bằng chứng thành công!</span>
                    </div>
                  ) : isUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-red-600" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-xs text-slate-500">Tải ảnh chụp minh chứng vi phạm</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadEvidence}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="w-2/3 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gửi khiếu nại tới Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
