import React, { useState } from 'react';
import { Card, Spinner } from '@heroui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  HelpCircle,
  Home,
  Phone,
  ShieldCheck,
  Clock,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';
import { VIETNAM_BANKS } from '@/constants/banks';
import { transactionService } from '@/services/transaction.service';
import {
  formatDateTime,
  formatTransactionType,
  formatVND,
  getTransactionStatusBadge,
  resolveRoomInfo,
} from '@/utils/formatters';

function extractBankFromContent(content?: string): string | null {
  if (!content) return null;
  const match = content.match(/về TK\s+([^[\]]+)/i);
  return match ? match[1].trim() : null;
}

function extractRefCodeFromContent(content?: string): string | null {
  if (!content) return null;
  const match = content.match(/(?:Mã tham chiếu|Mã SePay|Mã FT):\s*([a-zA-Z0-9_-]+)/i);
  return match ? match[1].trim() : null;
}

function extractRejectReason(content?: string): string | null {
  if (!content) return null;
  const match = content.match(/Lý do:\s*([^\]]+)/i);
  return match ? match[1].trim() : null;
}

export const TransactionDetailPage: React.FC = () => {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showRetryModal, setShowRetryModal] = useState(false);

  // Form cập nhật lại STK nhận tiền hoàn
  const [retryBankName, setRetryBankName] = useState('MBBank');
  const [retryAccountNo, setRetryAccountNo] = useState('');
  const [retryAccountHolder, setRetryAccountHolder] = useState('');

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', 'my-history'],
    queryFn: transactionService.getMyTransactions,
  });

  const tx = transactions.find((t) => t.maGiaoDich === transactionId);

  const retryRefundMutation = useMutation({
    mutationFn: (data: { tenNganHang: string; soTaiKhoan: string; tenChuTaiKhoan?: string }) => {
      if (!tx) throw new Error('Không tìm thấy giao dịch');
      return transactionService.retryRefund(tx.maGiaoDich, data);
    },
    onSuccess: () => {
      toast.success('Đã cập nhật lại thông tin tài khoản nhận tiền thành công!');
      setShowRetryModal(false);
      void queryClient.invalidateQueries({ queryKey: ['transactions', 'my-history'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi cập nhật tài khoản');
    },
  });

  if (isLoading && !tx) {
    return <LoadingSpinner fullHeight label="Đang tải biên nhận giao dịch..." />;
  }

  if (!tx) {
    return (
      <EmptyState
        title="Không tìm thấy giao dịch"
        description="Mã giao dịch không tồn tại hoặc không thuộc tài khoản hiện tại."
        action={
          <Link
            to="/transactions"
            className="px-5 py-2.5 bg-teal-600 text-white rounded-full text-xs font-bold"
          >
            Quay lại lịch sử giao dịch
          </Link>
        }
      />
    );
  }

  const badge = getTransactionStatusBadge(tx.trangThai);
  const typeInfo = formatTransactionType(tx.loaiGiaoDich);
  const roomInfo = resolveRoomInfo(tx.noiDung);
  const bankInfo = extractBankFromContent(tx.noiDung);
  const refCode = extractRefCodeFromContent(tx.noiDung);
  const rejectReason = extractRejectReason(tx.noiDung);

  const handleRetrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!retryAccountNo.trim() || retryAccountNo.trim().length < 6) {
      toast.error('Vui lòng nhập số tài khoản hợp lệ');
      return;
    }
    retryRefundMutation.mutate({
      tenNganHang: retryBankName,
      soTaiKhoan: retryAccountNo.trim(),
      tenChuTaiKhoan: retryAccountHolder.trim().toUpperCase() || undefined,
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/transactions')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại sổ cái giao dịch</span>
          </button>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Chi tiết biên nhận giao dịch
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Mã: <span className="font-semibold text-slate-700">{tx.maGiaoDich}</span> ·{' '}
            <span>{typeInfo.label}</span>
          </p>
        </div>

        <Link
          to="/transactions"
          className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors self-start sm:self-auto"
        >
          Danh sách giao dịch
        </Link>
      </div>

      {/* ĐỀ XUẤT 2: Thẻ thông báo trực quan theo từng trạng thái */}
      {tx.loaiGiaoDich === 'HOAN_COC' && tx.trangThai === 'CHO_THANH_TOAN' && (
        <div className="p-4 bg-sky-50/90 border border-sky-200 rounded-2xl flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div className="text-xs">
            <h4 className="font-bold text-sky-900 text-sm">
              Đang chờ hoàn cọc về tài khoản ngân hàng (Pending)
            </h4>
            <p className="text-sky-700 mt-0.5 leading-relaxed text-[11px]">
              Hệ thống đã tiếp nhận yêu cầu hoàn tiền cọc của bạn. Ban quản trị InnFinder sẽ đối soát và thực hiện chuyển tiền về tài khoản{' '}
              {bankInfo ? <strong className="font-semibold text-sky-950">{bankInfo}</strong> : 'của bạn'}{' '}
              trong vòng <strong>24h làm việc</strong> (không tính cuối tuần).
            </p>
          </div>
        </div>
      )}

      {tx.loaiGiaoDich === 'HOAN_COC' && tx.trangThai === 'THANH_CONG' && (
        <div className="p-4 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <h4 className="font-bold text-emerald-900 text-sm">
              Đã hoàn tất chuyển tiền hoàn cọc thành công!
            </h4>
            <p className="text-emerald-700 mt-0.5 leading-relaxed text-[11px]">
              Khoản tiền <strong>{formatVND(tx.soTien)}</strong> đã được chuyển khoản tới tài khoản của bạn.
              {refCode && (
                <span className="block mt-1 font-mono text-emerald-800">
                  Mã tham chiếu ngân hàng: <strong>{refCode}</strong>
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* ĐỀ XUẤT 4: Trường hợp từ chối / sai thông tin STK */}
      {tx.loaiGiaoDich === 'HOAN_COC' && tx.trangThai === 'THAT_BAI' && (
        <div className="p-4 bg-rose-50/90 border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <h4 className="font-bold text-rose-900 text-sm">
                Yêu cầu hoàn cọc chưa thành công
              </h4>
              <p className="text-rose-700 mt-0.5 text-[11px] leading-relaxed">
                {rejectReason ? `Lý do: ${rejectReason}. ` : 'Thông tin tài khoản nhận tiền chưa chính xác. '}
                Vui lòng kiểm tra và cập nhật lại số tài khoản để tiếp tục nhận hoàn tiền.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowRetryModal(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs shrink-0 cursor-pointer transition-colors"
          >
            Cập nhật lại STK
          </button>
        </div>
      )}

      {tx.loaiGiaoDich !== 'HOAN_COC' && (
        <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-emerald-900">Trạng thái: {badge.label}</h4>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              Khoản biến động dòng tiền được ghi nhận vào sổ cái lúc {formatDateTime(tx.ngayGiaoDich)}.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-6">
            <div className="flex items-start justify-between pb-5 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                    IF
                  </div>
                  <span className="text-base font-extrabold text-slate-900 tracking-tight">
                    InnFinder
                  </span>
                </div>
                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-1">
                  Biên nhận đối soát sổ cái
                </p>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badge.bgClass} ${badge.textClass} ${badge.borderClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
                {badge.label}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-5 border-b border-slate-100 text-xs">
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Mã giao dịch
                </span>
                <span className="font-mono font-bold text-slate-800 text-sm mt-1 block">
                  {tx.maGiaoDich}
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Thời gian
                </span>
                <span className="font-semibold text-slate-700 mt-1 block">
                  {formatDateTime(tx.ngayGiaoDich)}
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Kênh xử lý
                </span>
                <span className="font-semibold text-slate-700 mt-1 block">{typeInfo.method}</span>
              </div>
            </div>

            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <Home className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-900 truncate">
                  {roomInfo ? roomInfo.title : typeInfo.label}
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">{tx.noiDung}</p>
                {roomInfo && (
                  <Link
                    to={`/room/${roomInfo.code}`}
                    className="text-[11px] text-teal-600 font-semibold hover:underline mt-1 inline-block"
                  >
                    Xem thông tin phòng #{roomInfo.code}
                  </Link>
                )}
              </div>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Số tiền ghi nhận:</span>
                <span className="font-semibold text-slate-800">{formatVND(tx.soTien)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Phí dịch vụ sàn:</span>
                <span className="font-semibold text-emerald-600">0 ₫</span>
              </div>
              {bankInfo && (
                <div className="flex justify-between items-center text-slate-600">
                  <span>Tài khoản nhận hoàn tiền:</span>
                  <span className="font-mono font-semibold text-slate-800">{bankInfo}</span>
                </div>
              )}
              {refCode && (
                <div className="flex justify-between items-center text-slate-600">
                  <span>Mã tham chiếu ngân hàng:</span>
                  <span className="font-mono font-bold text-emerald-700">{refCode}</span>
                </div>
              )}
              <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-900">Tổng giá trị:</span>
                <span className="text-xl font-extrabold text-teal-600">
                  {formatVND(tx.soTien)}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Bảo chứng bởi InnFinder Escrow Engine</span>
              </span>
              <span>Sổ cái dòng tiền GiaoDich</span>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {/* ĐỀ XUẤT 2: Thanh tiến trình 3 bước hoàn cọc */}
          {tx.loaiGiaoDich === 'HOAN_COC' ? (
            <Card className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
                Tiến trình hoàn tiền (SLA 24h)
              </h3>

              <div className="space-y-4">
                {/* Bước 1 */}
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      1. Tiếp nhận hủy lịch &amp; Yêu cầu hoàn cọc
                    </span>
                    <span className="text-[11px] text-slate-500">Đã xác thực điều kiện hoàn tiền 100%</span>
                  </div>
                </div>

                {/* Bước 2 */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      tx.trangThai === 'THANH_CONG'
                        ? 'bg-emerald-500 text-white'
                        : tx.trangThai === 'THAT_BAI'
                          ? 'bg-rose-500 text-white'
                          : 'bg-sky-500 text-white animate-pulse'
                    }`}
                  >
                    {tx.trangThai === 'THANH_CONG' ? (
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : tx.trangThai === 'THAT_BAI' ? (
                      <XCircle className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      2. Admin đối soát &amp; Chuyển khoản ngân hàng
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {tx.trangThai === 'THANH_CONG'
                        ? 'Đã chuyển tiền thành công qua ngân hàng'
                        : tx.trangThai === 'THAT_BAI'
                          ? 'Bị từ chối do sai thông tin STK'
                          : 'Đang xử lý (Cam kết trong 24h làm việc)'}
                    </span>
                  </div>
                </div>

                {/* Bước 3 */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      tx.trangThai === 'THANH_CONG'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <div>
                    <span
                      className={`text-xs font-bold block ${
                        tx.trangThai === 'THANH_CONG' ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      3. Tiền về tài khoản ngân hàng
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {tx.trangThai === 'THANH_CONG' ? 'Hoàn tất giao dịch' : 'Chờ ngân hàng ghi có'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
                Tiến trình đối soát
              </h3>

              <div className="space-y-4">
                {['Khởi tạo lệnh giao dịch', 'Hệ thống xác thực bảo mật', `Trạng thái: ${badge.label}`].map(
                  (step, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                      <span className="text-xs font-semibold text-slate-800">{step}</span>
                    </div>
                  ),
                )}
              </div>
            </Card>
          )}

          <Card className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Cần hỗ trợ đối soát?</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Cung cấp mã <strong className="text-slate-800">{tx.maGiaoDich}</strong> khi liên hệ
              CSKH qua hotline để được xử lý nhanh nhất.
            </p>
            <button
              type="button"
              onClick={() => setShowSupportModal(true)}
              className="w-full py-2.5 px-4 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Thông tin liên hệ hỗ trợ
            </button>
          </Card>
        </div>
      </div>

      {/* MODAL CẬP NHẬT LẠI STK KHI TỪ CHỐI (ĐỀ XUẤT 4) */}
      <Modal
        isOpen={showRetryModal}
        onClose={() => setShowRetryModal(false)}
        title="Cập nhật lại tài khoản nhận tiền"
        subtitle="Vui lòng kiểm tra kỹ số tài khoản để hệ thống thực hiện chuyển lại tiền hoàn cọc."
        maxWidth="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowRetryModal(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={retryRefundMutation.isPending}
              onClick={handleRetrySubmit}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {retryRefundMutation.isPending && <Spinner size="sm" color="current" />}
              <span>Gửi lại yêu cầu hoàn tiền</span>
            </button>
          </>
        }
      >
        <form onSubmit={handleRetrySubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Ngân hàng:</label>
            <select
              value={retryBankName}
              onChange={(e) => setRetryBankName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              {VIETNAM_BANKS.map((b) => (
                <option key={b.code} value={b.shortName}>
                  {b.shortName} - {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Số tài khoản:</label>
            <input
              type="text"
              value={retryAccountNo}
              onChange={(e) => setRetryAccountNo(e.target.value.replace(/\s+/g, ''))}
              placeholder="VD: 0987654321"
              required
              className="w-full px-3 py-2 font-mono border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Tên chủ tài khoản (In hoa không dấu):
            </label>
            <input
              type="text"
              value={retryAccountHolder}
              onChange={(e) => setRetryAccountHolder(e.target.value.toUpperCase())}
              placeholder="VD: NGUYEN VAN A"
              className="w-full px-3 py-2 uppercase font-medium border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
        </form>
      </Modal>

      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-center">
            <div className="w-14 h-14 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto mb-3 text-teal-600">
              <Phone className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Hotline CSKH InnFinder</h3>
            <p className="text-xs text-slate-500 mb-4">
              Hỗ trợ giải quyết thắc mắc đối soát giao dịch và hoàn tiền 24/7.
            </p>
            <div className="p-3 bg-slate-50 rounded-2xl mb-5">
              <span className="text-lg font-black text-teal-700 font-mono tracking-wider">
                1900 6868
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                (Cước phí 1.000 ₫/phút)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowSupportModal(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionDetailPage;
