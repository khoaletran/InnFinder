import React, { useMemo, useState } from 'react';
import { Card } from '@heroui/react';
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
import { Link } from 'react-router-dom';
import { transactionService } from '@/services/transaction.service';
import {
  formatDateTime,
  formatTransactionType,
  formatVND,
  getTransactionStatusBadge,
  resolveRoomInfo,
} from '@/utils/formatters';

export const TransactionsPage: React.FC = () => {
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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Sổ cái giao dịch
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi biến động dòng tiền cọc giữ chân, hoàn cọc và rút tiền của tài khoản
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          <span>Làm mới sổ cái</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Tổng dòng tiền thành công
          </span>
          <p className="text-xl font-extrabold text-slate-900 mt-1">{formatVND(totalPaid)}</p>
        </Card>

        <Card className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Giao dịch thành công
          </span>
          <p className="text-xl font-extrabold text-emerald-600 mt-1">
            {String(successCount).padStart(2, '0')}
          </p>
        </Card>

        <Card className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Chờ thanh toán
          </span>
          <p className="text-xl font-extrabold text-amber-600 mt-1">
            {String(pendingCount).padStart(2, '0')}
          </p>
        </Card>

        <Card className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Đã hoàn tiền
          </span>
          <p className="text-xl font-extrabold text-blue-600 mt-1">{formatVND(totalRefunded)}</p>
        </Card>
      </div>

      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm mã giao dịch hoặc nội dung..."
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>

        <div className="w-full md:w-auto flex items-center gap-2">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full md:w-auto px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái (TrangThaiGD)</option>
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
            className="w-full md:w-auto px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 cursor-pointer"
          >
            <option value="ALL">Tất cả loại giao dịch</option>
            <option value="COC_XEM_PHONG">Cọc xem phòng</option>
            <option value="HOAN_COC">Hoàn cọc</option>
            <option value="CONG_TIEN_COC">Cộng cọc chủ trọ</option>
            <option value="RUT_TIEN">Rút tiền</option>
          </select>
        </div>
      </div>

      {error instanceof Error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error.message}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Mã giao dịch</th>
                <th className="py-3 px-4">Nội dung</th>
                <th className="py-3 px-4">Số tiền</th>
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4">Kênh đối soát</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading && transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Đang tải lịch sử giao dịch...</span>
                  </td>
                </tr>
              ) : paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700">Chưa có giao dịch nào</p>
                  </td>
                </tr>
              ) : (
                paginatedList.map((tx) => {
                  const badge = getTransactionStatusBadge(tx.trangThai);
                  const typeInfo = formatTransactionType(tx.loaiGiaoDich);
                  const room = resolveRoomInfo(tx.noiDung);

                  return (
                    <tr key={tx.maGiaoDich} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                        <Link to={`/transactions/${tx.maGiaoDich}`} className="hover:underline">
                          {tx.maGiaoDich}
                        </Link>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        {room ? (
                          <div>
                            <span className="font-bold text-slate-900 block truncate">
                              {room.title}
                            </span>
                            <span className="text-[11px] text-slate-400 truncate block">
                              {tx.noiDung}
                            </span>
                          </div>
                        ) : (
                          <span className="font-semibold text-slate-800 line-clamp-1">
                            {tx.noiDung || typeInfo.label}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-extrabold text-slate-900 whitespace-nowrap">
                        {formatVND(tx.soTien)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatDateTime(tx.ngayGiaoDich)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {typeInfo.method}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bgClass} ${badge.textClass} ${badge.borderClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link
                          to={`/transactions/${tx.maGiaoDich}`}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-0.5 transition-colors"
                        >
                          <span>Chi tiết</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Hiển thị {paginatedList.length} / {filteredList.length} giao dịch
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Trước</span>
            </button>
            <span className="font-semibold text-slate-700">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <span>Sau</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionsPage;
