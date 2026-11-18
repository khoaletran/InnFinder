import React, { useState } from 'react';
import { Card } from '@heroui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  ImageIcon,
  Loader2,
  Plus,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/common/EmptyState';
import { authUserService } from '@/services/authUser.service';
import { uploadService } from '@/services/upload.service';
import type { ComplaintResponseDTO } from '@/types/auth-user.types';
import { formatDate } from '@/utils/formatters';
import { complaintSchema } from '@/utils/validators';

export const ComplaintsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const [targetAccount, setTargetAccount] = useState('');
  const [issueType, setIssueType] = useState('Phòng sai thực tế so với bài đăng');
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ['complaints', 'my-sent'],
    queryFn: () => authUserService.getMyComplaints('SENT'),
  });

  const createMutation = useMutation({
    mutationFn: authUserService.createComplaint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints', 'my-sent'] });
      toast.success('Đã gửi phiếu khiếu nại thành công! Admin sẽ xác minh và xử lý.');
      setShowModal(false);
      setTargetAccount('');
      setDescription('');
      setEvidenceUrl('');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi gửi khiếu nại');
    },
  });

  const handleUploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const url = await uploadService.uploadImage(file, 'complaints');
      setEvidenceUrl(url);
      toast.success('Tải ảnh bằng chứng vi phạm thành công!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi tải ảnh');
    } finally {
      setIsUploading(false);
    }
  };

  // Tuân thủ nghiêm ngặt Mục 5.3: KHÔNG gửi maNguoiGui trong Request Body (Backend tự lấy từ JWT)
  const handleSubmitComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    const fullIssue = `[${issueType}] - ${description.trim()}`;
    const parsed = complaintSchema.safeParse({
      doiTuongKhieuNai: targetAccount.trim(),
      vanDe: fullIssue,
      hinhAnh: evidenceUrl || undefined,
      mucDoUuTien: 2,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Thông tin khiếu nại chưa hợp lệ');
      return;
    }
    createMutation.mutate(parsed.data);
  };

  const getStatusBadge = (status: ComplaintResponseDTO['trangThai']) => {
    switch (status) {
      case 'CHO_DUYET':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Chờ duyệt (`CHO_DUYET`)
          </span>
        );
      case 'DANG_XU_LY':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Đang xác minh (`DANG_XU_LY`)
          </span>
        );
      case 'DA_XU_LI':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Đã xử lý (`DA_XU_LI`)
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Khiếu nại & Tranh chấp (`PhieuKhieuNai`)</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gửi minh chứng vi phạm, theo dõi tiến độ xử lý và mức xử phạt `MucDoViPham` từ Quản trị viên
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-red-500/20 flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tạo khiếu nại mới
        </button>
      </div>

      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <strong>Quy trình xử lý vi phạm 3 cấp độ:</strong> `NHE` (Cảnh cáo nhắc nhở), `TRUNG_BINH`
          (Trừ điểm uy tín chủ trọ, hạn chế hiển thị tin), `NANG` (Khóa tài khoản vĩnh viễn và bảo
          vệ hoàn cọc cho người bị hại).
        </div>
      </div>

      <Card className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden p-0">
        <Card.Header className="px-6 py-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <Card.Title className="text-sm font-bold text-slate-800">
            Lịch sử khiếu nại đã gửi ({complaints.length})
          </Card.Title>
        </Card.Header>

        <Card.Content className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
              Đang tải dữ liệu khiếu nại...
            </div>
          ) : complaints.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {complaints.map((item, idx) => {
                const conclusion = item.ketQua || item.ketLuan;
                return (
                  <div key={item.maKhieuNai || idx} className="p-6 hover:bg-slate-50/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          #{item.maKhieuNai || `KN-${item.id}`}
                        </span>
                        <span className="text-xs text-slate-500">
                          Gửi ngày: {formatDate(item.ngayGui || item.createdAt || item.ngayTao)}
                        </span>
                      </div>
                      <div>{getStatusBadge(item.trangThai)}</div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-slate-600">
                        Đối tượng bị phản ánh:{' '}
                        <strong className="text-slate-900 font-semibold">
                          {item.tenDoiTuong || item.doiTuongKhieuNai}
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
                          <ImageIcon className="w-4 h-4" /> Xem ảnh bằng chứng đính kèm
                        </a>
                      </div>
                    )}

                    {conclusion && (
                      <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                        <div className="font-bold text-emerald-900 flex items-center gap-1.5 mb-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Kết luận xử lý từ Quản trị viên:
                        </div>
                        <p className="text-emerald-800 leading-relaxed">{conclusion}</p>
                        {item.mucDoViPham && (
                          <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-200/60 text-emerald-900">
                            Mức độ vi phạm: {item.mucDoViPham}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                title="Chưa có khiếu nại nào"
                description="Tất cả các giao dịch và lịch hẹn của bạn đang diễn ra an toàn."
                icon={<FileText className="w-7 h-7" />}
              />
            </div>
          )}
        </Card.Content>
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Gửi khiếu nại / Báo cáo vi phạm
                </h3>
                <p className="text-xs text-slate-500">
                  Minh chứng sẽ được chuyển trực tiếp đến Quản trị viên
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitComplaint} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên đăng nhập hoặc Mã người dùng bị khiếu nại *
                </label>
                <input
                  type="text"
                  placeholder="VD: ND171120260001 hoặc chutro_khai"
                  value={targetAccount}
                  onChange={(e) => setTargetAccount(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nhóm vấn đề vi phạm
                </label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                >
                  <option value="Phòng sai thực tế so với bài đăng">
                    Phòng sai thực tế so với bài đăng
                  </option>
                  <option value="Chủ trọ không trả lại cọc giữ chân">
                    Chủ trọ không trả lại cọc giữ chân
                  </option>
                  <option value="Chủ trọ không đến điểm hẹn xem phòng">
                    Chủ trọ không đến điểm hẹn xem phòng
                  </option>
                  <option value="Thái độ cư xử không chuẩn mực">
                    Thái độ cư xử không chuẩn mực
                  </option>
                  <option value="Dấu hiệu lừa đảo">Dấu hiệu lừa đảo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả chi tiết sự việc (`vanDe`) *
                </label>
                <textarea
                  rows={4}
                  placeholder="Mô tả cụ thể thời gian, địa điểm, thỏa thuận giữa hai bên (tối thiểu 15 ký tự)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ảnh bằng chứng (`hinhAnh`)
                </label>
                <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-200 hover:border-red-300 rounded-xl cursor-pointer bg-slate-50 text-center p-2">
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
                  className="w-1/3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || isUploading}
                  className="w-2/3 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Gửi khiếu nại tới Admin'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
