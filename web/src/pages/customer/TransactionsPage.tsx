import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AppButton } from '@/components/common/AppButton';
import { EmptyState } from '@/components/common/EmptyState';
import { PageContainer, PageHeader } from '@/components/common/PageContainer';
import { SkeletonList } from '@/components/common/SkeletonList';
import { StatusBadge } from '@/components/common/StatusBadge';
import { transactionService } from '@/services/transaction.service';
import {
  formatDateTime,
  formatTransactionType,
  formatVND,
  resolveRoomInfo,
} from '@/utils/formatters';

function extractAppointmentRef(noiDung?: string): string | null {
  if (!noiDung) return null;
  const match = noiDung.match(/(DL\d{6,}|PT\d{6,})/i);
  return match ? match[1].toUpperCase() : null;
}

export const TransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const {
    data: transactions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['transactions', 'my-history'],
    queryFn: transactionService.getMyTransactions,
  });

  const { totalPaid, successCount, pendingCount, totalRefunded } = useMemo(() => {
    let paid = 0;
    let sCount = 0;
    let pCount = 0;
    let refunded = 0;

    transactions.forEach((tx) => {
      if (tx.trangThai === 'THANH_CONG') {
        paid += tx.soTien;
        sCount += 1;
      } else if (tx.trangThai === 'CHO_THANH_TOAN') {
        pCount += 1;
      } else if (tx.trangThai === 'HOAN_TIEN') {
        refunded += tx.soTien;
      }
    });

    return {
      totalPaid: paid,
      successCount: sCount,
      pendingCount: pCount,
      totalRefunded: refunded,
    };
  }, [transactions]);

  const filteredList = useMemo(() => {
    return transactions.filter((tx) => {
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchCode = tx.maGiaoDich.toLowerCase().includes(query);
        const matchContent = (tx.noiDung || '').toLowerCase().includes(query);
        if (!matchCode && !matchContent) return false;
      }
      if (selectedStatus !== 'ALL' && tx.trangThai !== selectedStatus) return false;
      if (selectedType !== 'ALL' && tx.loaiGiaoDich !== selectedType) return false;
      return true;
    });
  }, [transactions, searchTerm, selectedStatus, selectedType]);

  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage]);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedStatus('ALL');
    setSelectedType('ALL');
    setCurrentPage(1);
  };

  return (
    <PageContainer width="wide" className="space-y-6">
      <PageHeader
        title="Lịch sử giao dịch"
        subtitle="Theo dõi biến động dòng tiền cọc giữ chân, hoàn cọc và rút tiền của tài khoản"
        action={
          <AppButton
            variant="secondary"
            size="md"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-600' : ''}`} />
            <span>Làm mới</span>
          </AppButton>
        }
      />

      {/* 1 dải số liệu mỏng thay cho 4 thẻ KPI lớn */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs px-5 py-4 grid grid-cols-2 lg:grid-cols-4 gap-4 divide-y sm:divide-y-0 lg:divide-x divide-slate-100">
        <div className="lg:pr-4">
          <span className="text-xs font-semibold text-slate-600 block">
            Tổng tiền thành công
          </span>
          <span className="text-lg font-extrabold text-slate-900">{formatVND(totalPaid)}</span>
        </div>
        <div className="lg:px-4">
          <span className="text-xs font-semibold text-slate-600 block">Đã hoàn lại</span>
          <span className="text-lg font-extrabold text-emerald-700">
            {formatVND(totalRefunded)}
          </span>
        </div>
        <div className="lg:px-4">
          <span className="text-xs font-semibold text-slate-600 block">Số lệnh hoàn tất</span>
          <span className="text-lg font-extrabold text-slate-900">
            {successCount} giao dịch
          </span>
        </div>
        <div className="lg:pl-4">
          <span className="text-xs font-semibold text-slate-600 block">Chờ thanh toán</span>
          <span className="text-lg font-extrabold text-amber-700">{pendingCount} giao dịch</span>
        </div>
      </div>

      {/* Bộ lọc tìm kiếm */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm mã giao dịch, tên phòng hoặc nội dung..."
            className="w-full h-10 pl-10 pr-4 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-500"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 px-3 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="THANH_CONG">Thành công</option>
            <option value="CHO_THANH_TOAN">Chờ thanh toán</option>
            <option value="HOAN_TIEN">Hoàn tiền</option>
            <option value="THAT_BAI">Thất bại</option>
          </select>

          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 px-3 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 cursor-pointer"
          >
            <option value="ALL">Tất cả loại</option>
            <option value="COC_XEM_PHONG">Cọc xem phòng</option>
            <option value="HOAN_COC">Hoàn cọc</option>
            <option value="CONG_TIEN_COC">Cộng cọc chủ trọ</option>
            <option value="RUT_TIEN">Rút tiền</option>
          </select>
        </div>
      </div>

      {/* Error State */}
      {error instanceof Error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error.message}</span>
          </div>
          <AppButton variant="secondary" size="sm" onClick={() => refetch()}>
            Thử lại
          </AppButton>
        </div>
      )}

      {/* Content: Loading / Empty / Desktop Table + Mobile List */}
      {isLoading && transactions.length === 0 ? (
        <SkeletonList variant="rows" count={4} />
      ) : paginatedList.length === 0 ? (
        <EmptyState
          title="Chưa có giao dịch nào"
          description={
            searchTerm || selectedStatus !== 'ALL' || selectedType !== 'ALL'
              ? 'Không có giao dịch nào khớp với bộ lọc hiện tại.'
              : 'Lịch sử cọc giữ chân xem phòng và hoàn cọc của bạn sẽ hiển thị tại đây.'
          }
          icon={<CreditCard className="w-6 h-6" />}
          action={
            searchTerm || selectedStatus !== 'ALL' || selectedType !== 'ALL' ? (
              <AppButton variant="primary" size="md" onClick={resetFilters}>
                Xóa bộ lọc
              </AppButton>
            ) : (
              <AppButton variant="primary" size="md" onClick={() => navigate('/search')}>
                Tìm phòng ngay
              </AppButton>
            )
          }
        />
      ) : (
        <>
          {/* MOBILE LIST VIEW (< md) */}
          <div className="md:hidden space-y-3">
            {paginatedList.map((tx) => {
              const typeInfo = formatTransactionType(tx.loaiGiaoDich);
              const room = resolveRoomInfo(tx.noiDung);
              const refCode = extractAppointmentRef(tx.noiDung);

              return (
                <Link
                  key={tx.maGiaoDich}
                  to={`/transactions/${tx.maGiaoDich}`}
                  className="block bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-xs font-mono font-semibold text-teal-700 block">
                        #{tx.maGiaoDich}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-0.5 line-clamp-1">
                        {room ? room.title : tx.noiDung || typeInfo.label}
                      </h3>
                      {refCode && (
                        <span className="text-xs text-slate-600 block mt-0.5">
                          Liên quan: #{refCode}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-extrabold whitespace-nowrap text-slate-900">
                      {formatVND(tx.soTien)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-600">{formatDateTime(tx.ngayGiaoDich)}</span>
                    <StatusBadge status={tx.trangThai} type={tx.loaiGiaoDich} />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* DESKTOP TABLE VIEW (md+) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Mã giao dịch</th>
                    <th className="py-3.5 px-4">Phòng &amp; Lịch liên quan</th>
                    <th className="py-3.5 px-4">Số tiền</th>
                    <th className="py-3.5 px-4">Thời gian</th>
                    <th className="py-3.5 px-4">Trạng thái</th>
                    <th className="py-3.5 px-4 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {paginatedList.map((tx) => {
                    const typeInfo = formatTransactionType(tx.loaiGiaoDich);
                    const room = resolveRoomInfo(tx.noiDung);
                    const refCode = extractAppointmentRef(tx.noiDung);

                    return (
                      <tr key={tx.maGiaoDich} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-4 font-mono text-xs font-bold text-teal-700 whitespace-nowrap">
                          <Link to={`/transactions/${tx.maGiaoDich}`} className="hover:underline">
                            {tx.maGiaoDich}
                          </Link>
                        </td>

                        <td className="py-4 px-4 max-w-sm">
                          <div className="font-semibold text-slate-900 line-clamp-1">
                            {room ? room.title : tx.noiDung || typeInfo.label}
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5 flex flex-wrap items-center gap-2">
                            <span>{typeInfo.label}</span>
                            {refCode && (
                              <span className="font-mono font-semibold text-slate-700">
                                · #{refCode}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-4 font-extrabold whitespace-nowrap text-slate-900">
                          {formatVND(tx.soTien)}
                        </td>

                        <td className="py-4 px-4 text-xs text-slate-600 whitespace-nowrap">
                          {formatDateTime(tx.ngayGiaoDich)}
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          <StatusBadge status={tx.trangThai} type={tx.loaiGiaoDich} />
                        </td>

                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <Link
                            to={`/transactions/${tx.maGiaoDich}`}
                            className="text-sm font-semibold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1"
                          >
                            <span>Chi tiết</span>
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Phân trang */}
          <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center justify-between text-xs text-slate-700 shadow-xs">
            <span className="font-medium">
              Hiển thị {paginatedList.length} / {filteredList.length} giao dịch
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer flex items-center gap-1 font-semibold"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Trước</span>
              </button>
              <span className="font-semibold text-slate-900">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer flex items-center gap-1 font-semibold"
              >
                <span>Sau</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
};

export default TransactionsPage;
