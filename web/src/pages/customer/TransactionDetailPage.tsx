import React, { useState } from 'react';
import { Card } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  HelpCircle,
  Home,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { transactionService } from '@/services/transaction.service';
import {
  formatDateTime,
  formatTransactionType,
  formatVND,
  getTransactionStatusBadge,
  resolveRoomInfo,
} from '@/utils/formatters';

export const TransactionDetailPage: React.FC = () => {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();
  const [showSupportModal, setShowSupportModal] = useState(false);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', 'my-history'],
    queryFn: transactionService.getMyTransactions,
  });

  const tx = transactions.find((t) => t.maGiaoDich === transactionId);

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
                <span>Phí xử lý khách hàng:</span>
                <span className="font-semibold text-emerald-600">0 ₫</span>
              </div>
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

          <Card className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Cần hỗ trợ đối soát?</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Cung cấp mã <strong className="text-slate-800">{tx.maGiaoDich}</strong> khi liên hệ
              CSKH hoặc gửi khiếu nại trực tuyến.
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

      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-center">
            <div className="w-14 h-14 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto mb-3 text-teal-600">
              <Phone className="w-7 h-7 stroke-[2.2]" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Tổng đài CSKH InnFinder</h3>
            <p className="text-xs text-slate-500 mb-4">Mã giao dịch: #{tx.maGiaoDich}</p>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 mb-5 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Hotline:</span>
                <span className="font-bold text-teal-600">1900 6868</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="font-semibold text-slate-700">hotro@innfinder.vn</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSupportModal(false)}
              className="w-full py-2.5 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
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
