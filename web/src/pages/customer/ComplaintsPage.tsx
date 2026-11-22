import React, { useState } from 'react';
import { Card } from '@heroui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  HelpCircle,
  ImageIcon,
  Loader2,
  PhoneCall,
  Send,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { axiosClient } from '@/api/axiosClient';
import { AppButton } from '@/components/common/AppButton';
import { EmptyState } from '@/components/common/EmptyState';
import { PageContainer, PageHeader } from '@/components/common/PageContainer';
import { SkeletonList } from '@/components/common/SkeletonList';
import { StatusBadge } from '@/components/common/StatusBadge';
import { authUserService } from '@/services/authUser.service';
import { uploadService } from '@/services/upload.service';
import { formatDate } from '@/utils/formatters';
import { complaintSchema } from '@/utils/validators';

interface AppointmentTargetOption {
  maDatLich: string;
  maPhongTro?: string;
  tieuDePhong?: string;
  diaChiPhong?: string;
  maChuTro?: string;
  tenChuTro?: string;
}

const VIOLATION_LEVELS = [
  {
    step: '1',
    level: 'Mức độ Nhẹ',
    desc: 'Nhắc nhở và gửi cảnh cáo qua email/hệ thống đối với sai sót lần đầu.',
  },
  {
    step: '2',
    level: 'Mức độ Trung bình',
    desc: 'Trừ 10 điểm uy tín của chủ trọ và ghi nhận cảnh báo vi phạm.',
  },
  {
    step: '3',
    level: 'Mức độ Nặng',
    desc: 'Khóa tài khoản vĩnh viễn và gỡ toàn bộ bài đăng đang hiển thị.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Chủ trọ không trả lại cọc giữ chân khi xem phòng thì xử lý thế nào?',
    a: 'Bạn chụp lại biên lai chuyển khoản/xác nhận và gửi khiếu nại ngay tại đây. Quản trị viên sẽ đối soát trong 24h và bảo vệ quyền lợi cọc của bạn.',
  },
  {
    q: 'Thời gian Ban quản trị xác minh một khiếu nại là bao lâu?',
    a: 'Thông thường từ 12–24 giờ làm việc kể từ lúc nhận đủ mô tả sự việc và ảnh bằng chứng.',
  },
  {
    q: 'Tôi không nhớ mã ND của chủ trọ thì làm sao chọn?',
    a: 'Chọn trực tiếp phòng/lịch hẹn trong mục "Chọn nhanh từ lịch hẹn xem phòng", hệ thống sẽ tự điền đối tượng liên quan.',
  },
];

export const ComplaintsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [selectedAptId, setSelectedAptId] = useState('');
  const [targetAccount, setTargetAccount] = useState('');
  const [issueType, setIssueType] = useState('Phòng sai thực tế so với bài đăng');
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const {
    data: complaints = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['complaints', 'my-sent'],
    queryFn: () => authUserService.getMyComplaints('SENT'),
  });

  const { data: myAppointments = [] } = useQuery({
    queryKey: ['appointments', 'my-appointments', 'complaint-targets'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get<unknown, AppointmentTargetOption[]>(
          '/api/appointments/my-appointments',
        );
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: authUserService.createComplaint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints', 'my-sent'] });
      toast.success('Đã gửi phiếu khiếu nại thành công! Admin sẽ xác minh và xử lý.');
      setSelectedAptId('');
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

  // Tuân thủ Mục 5.3: KHÔNG gửi maNguoiGui trong Request Body (Backend tự lấy từ JWT)
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

  const getComplaintTone = (status: string) => {
    if (status === 'DA_XU_LI') return { label: 'Đã xử lý', tone: 'success' as const };
    if (status === 'DANG_XU_LY') return { label: 'Đang xác minh', tone: 'info' as const };
    return { label: 'Chờ duyệt', tone: 'warning' as const };
  };

  return (
    <PageContainer width="wide" className="space-y-6">
      <PageHeader
        title="Khiếu nại & Hỗ trợ"
        subtitle="Gửi minh chứng vi phạm, theo dõi kết quả xử lý và liên hệ đội ngũ bảo vệ người dùng"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CỘT TRÁI: FORM TẠO KHIẾU NẠI + LỊCH SỬ KHIẾU NẠI */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <Card.Header className="p-0">
              <Card.Title className="text-base font-bold text-slate-900">
                Gửi phiếu khiếu nại mới
              </Card.Title>
              <Card.Description className="text-xs text-slate-600 mt-0.5">
                Cung cấp đối tượng phản ánh, mô tả sự việc và ảnh chụp bằng chứng (nếu có)
              </Card.Description>
            </Card.Header>

            <Card.Content className="p-0">
              <form onSubmit={handleSubmitComplaint} className="space-y-4">
                {myAppointments.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Chọn nhanh từ lịch hẹn xem phòng (tùy chọn)
                    </label>
                    <select
                      value={selectedAptId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedAptId(val);
                        const apt = myAppointments.find((a) => a.maDatLich === val);
                        if (apt?.maChuTro) {
                          setTargetAccount(apt.maChuTro);
                        } else if (apt?.tenChuTro) {
                          setTargetAccount(apt.tenChuTro);
                        } else {
                          setTargetAccount('');
                        }
                      }}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-900 bg-slate-50"
                    >
                      <option value="">-- Chọn phòng / chủ trọ đã đặt lịch --</option>
                      {myAppointments.map((apt) => (
                        <option key={apt.maDatLich} value={apt.maDatLich}>
                          #{apt.maDatLich} • {apt.tenChuTro || 'Chủ trọ'} (
                          {apt.tieuDePhong || apt.diaChiPhong || apt.maPhongTro})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Tên đăng nhập hoặc Mã người dùng *
                    </label>
                    <input
                      type="text"
                      placeholder="VD: ND171120260001 hoặc chutro_khai"
                      value={targetAccount}
                      onChange={(e) => setTargetAccount(e.target.value)}
                      readOnly={Boolean(selectedAptId)}
                      required
                      className={`w-full h-10 px-3 rounded-xl border border-slate-200 text-sm transition-colors ${
                        selectedAptId
                          ? 'bg-slate-100 text-slate-700 cursor-not-allowed select-none'
                          : 'text-slate-900 bg-white focus:outline-none focus:border-teal-600'
                      }`}
                    />
                    {selectedAptId && (
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Đã tự động điền chủ trọ theo lịch hẹn đã chọn.
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Nhóm vấn đề vi phạm
                    </label>
                    <select
                      value={issueType}
                      onChange={(e) => setIssueType(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white"
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
                      <option value="Dấu hiệu lừa đảo chiếm đoạt tài sản">
                        Dấu hiệu lừa đảo chiếm đoạt tài sản
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mô tả chi tiết sự việc (tối thiểu 15 ký tự) *
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Ghi rõ thời gian, địa điểm xem phòng, nội dung trao đổi và yêu cầu hỗ trợ..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Ảnh bằng chứng đính kèm (nếu có)
                  </label>
                  <label className="flex items-center justify-center gap-2 p-3.5 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-teal-500 bg-slate-50 transition-colors">
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                    ) : (
                      <Upload className="w-4 h-4 text-slate-600" />
                    )}
                    <span className="text-xs font-semibold text-slate-700">
                      {evidenceUrl
                        ? 'Đã tải lên ảnh bằng chứng (Nhấn để thay đổi)'
                        : 'Chọn ảnh chụp màn hình hoặc ảnh thực tế'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadEvidence}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex justify-end pt-1">
                  <AppButton
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={createMutation.isPending || isUploading}
                  >
                    <Send className="w-4 h-4" />
                    <span>Gửi khiếu nại</span>
                  </AppButton>
                </div>
              </form>
            </Card.Content>
          </Card>

          {/* LỊCH SỬ KHIẾU NẠI ĐÃ GỬI */}
          <Card className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-0">
            <Card.Header className="px-6 py-4 border-b border-slate-100">
              <Card.Title className="text-base font-bold text-slate-900">
                Lịch sử khiếu nại đã gửi ({complaints.length})
              </Card.Title>
            </Card.Header>

            <Card.Content className="p-0">
              {error ? (
                <div className="p-6 text-center space-y-3">
                  <AlertCircle className="w-7 h-7 text-red-600 mx-auto" />
                  <p className="text-sm font-bold text-slate-900">
                    Không thể tải danh sách khiếu nại
                  </p>
                  <AppButton variant="secondary" size="sm" onClick={() => void refetch()}>
                    Thử lại
                  </AppButton>
                </div>
              ) : isLoading ? (
                <div className="p-4">
                  <SkeletonList variant="rows" count={3} />
                </div>
              ) : complaints.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {complaints.map((item, idx) => {
                    const conclusion = item.ketQua || item.ketLuan;
                    const badge = getComplaintTone(item.trangThai);
                    return (
                      <div key={item.maKhieuNai || idx} className="p-5 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                              #{item.maKhieuNai || `KN-${item.id}`}
                            </span>
                            <span className="text-xs text-slate-600">
                              Gửi ngày: {formatDate(item.ngayGui || item.createdAt || item.ngayTao)}
                            </span>
                          </div>
                          <StatusBadge label={badge.label} tone={badge.tone} />
                        </div>

                        <p className="text-sm text-slate-700">
                          Đối tượng bị phản ánh:{' '}
                          <strong className="text-slate-900">
                            {item.tenDoiTuongKhieuNai || item.tenDoiTuong || item.doiTuongKhieuNai}
                          </strong>
                        </p>

                        <p className="text-sm text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-100 leading-relaxed">
                          {item.vanDe}
                        </p>

                        {item.hinhAnh && (
                          <a
                            href={item.hinhAnh}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800"
                          >
                            <ImageIcon className="w-4 h-4" />
                            <span>Xem ảnh bằng chứng đính kèm</span>
                          </a>
                        )}

                        {conclusion && (
                          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm space-y-1">
                            <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                              <span>Kết luận xử lý từ Quản trị viên</span>
                            </div>
                            <p className="text-emerald-900 leading-relaxed">{conclusion}</p>
                            {item.mucDoViPham && (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900">
                                Mức độ:{' '}
                                {item.mucDoViPham === 'NHE'
                                  ? 'Nhẹ'
                                  : item.mucDoViPham === 'TRUNG_BINH'
                                    ? 'Trung bình'
                                    : item.mucDoViPham === 'NANG'
                                      ? 'Nặng'
                                      : item.mucDoViPham}
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
                    icon={<FileText className="w-6 h-6" />}
                  />
                </div>
              )}
            </Card.Content>
          </Card>
        </div>

        {/* CỘT PHẢI: QUY TRÌNH 3 CẤP ĐỘ DẠNG STEPPER + FAQ + HOTLINE */}
        <div className="lg:col-span-5 space-y-6">
          {/* Stepper 3 cấp độ */}
          <Card className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Quy trình xử lý 3 cấp độ
                </h2>
                <p className="text-xs text-slate-600">
                  Áp dụng chế tài theo mức độ vi phạm xác minh
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-1">
              {VIOLATION_LEVELS.map((item, idx) => (
                <div key={item.step} className="flex items-start gap-3 relative">
                  <div className="flex flex-col items-center">
                    <span className="w-7 h-7 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {item.step}
                    </span>
                    {idx < VIOLATION_LEVELS.length - 1 && (
                      <span className="w-px h-8 bg-slate-200 my-1" />
                    )}
                  </div>
                  <div className="pt-0.5">
                    <h3 className="text-sm font-bold text-slate-900">{item.level}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* FAQ */}
          <Card className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Câu hỏi thường gặp</h2>
            </div>

            <div className="space-y-4 divide-y divide-slate-100">
              {FAQ_ITEMS.map((faq, i) => (
                <div key={i} className={i > 0 ? 'pt-4' : ''}>
                  <h3 className="text-sm font-bold text-slate-900">{faq.q}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mt-1">{faq.a}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Hotline hỗ trợ */}
          <div className="bg-teal-50 rounded-2xl border border-teal-200 p-6 space-y-3">
            <div className="flex items-center gap-2.5 text-teal-900">
              <PhoneCall className="w-5 h-5 text-teal-700" />
              <h2 className="text-base font-bold">Tổng đài hỗ trợ khẩn cấp</h2>
            </div>
            <p className="text-sm text-slate-700">
              Gặp sự cố khi xem phòng trực tiếp hoặc tranh chấp cọc giữ chân? Liên hệ ngay với bộ phận đối soát InnFinder:
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-lg font-extrabold font-mono text-teal-800">1900 6868</span>
              <span className="text-xs font-semibold text-slate-700">
                Hỗ trợ 08:00 – 22:00 hàng ngày
              </span>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};
