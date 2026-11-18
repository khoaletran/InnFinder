import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  RefreshCw,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { useTransactionStore } from "../../store/useTransactionStore";
import { formatVND } from "../../utils/formatVND";
import {
  resolveRoomInfo,
  formatTransactionType,
  getTransactionStatusBadge,
} from "../../utils/transactionUtils";

export const TransactionsPage: React.FC = () => {
  const { transactions, isLoading, error, fetchTransactions } =
    useTransactionStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // 1. Tính toán 4 chỉ số KPI thực tế từ cơ sở dữ liệu
  const { totalPaid, successCount, pendingCount, totalRefunded } =
    useMemo(() => {
      let paid = 0;
      let sCount = 0;
      let pCount = 0;
      let refunded = 0;

      transactions.forEach((tx) => {
        if (tx.trangThai === "THANH_CONG") {
          paid += tx.soTien;
          sCount += 1;
        } else if (tx.trangThai === "CHO_THANH_TOAN") {
          pCount += 1;
        } else if (tx.trangThai === "HOAN_TIEN") {
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

  // 2. Lọc danh sách giao dịch
  const filteredList = useMemo(() => {
    return transactions.filter((tx) => {
      // Tìm kiếm theo mã hoặc nội dung
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchCode = tx.maGiaoDich.toLowerCase().includes(query);
        const matchContent = (tx.noiDung || "").toLowerCase().includes(query);
        if (!matchCode && !matchContent) return false;
      }

      // Lọc theo trạng thái
      if (selectedStatus !== "ALL" && tx.trangThai !== selectedStatus) {
        return false;
      }

      // Lọc theo loại giao dịch
      if (selectedType !== "ALL" && tx.loaiGiaoDich !== selectedType) {
        return false;
      }

      return true;
    });
  }, [transactions, searchTerm, selectedStatus, selectedType]);

  // Phân trang
  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage]);

  // Format ngày giờ
  const formatDateTime = (isoDate?: string) => {
    if (!isoDate) return "--/--";
    try {
      const d = new Date(isoDate);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${day}/${month}/${year} · ${hours}:${minutes}`;
    } catch {
      return isoDate;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header (LƯU Ý QUAN TRỌNG: ĐÃ XÓA NÚT TẢI BIÊN NHẬN THEO YÊU CẦU CỦA USER) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Lịch sử giao dịch
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi thanh toán, tiền cọc và hoàn tiền an toàn từ cơ sở dữ liệu
          </p>
        </div>

        {/* Nút đồng bộ dữ liệu */}
        <button
          type="button"
          onClick={() => fetchTransactions()}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-600" : ""}`}
          />
          <span>Đồng bộ DB</span>
        </button>
      </div>

      {/* 2. Cụm 4 Thẻ KPI Tóm Tắt (Tính toán từ dữ liệu thật MariaDB) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Tổng đã thanh toán */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Tổng đã thanh toán
          </span>
          <p className="text-xl font-extrabold text-slate-900 mt-1">
            {formatVND(totalPaid)}
          </p>
        </div>

        {/* KPI 2: Giao dịch thành công */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Giao dịch thành công
          </span>
          <p className="text-xl font-extrabold text-slate-900 mt-1">
            {String(successCount).padStart(2, "0")}
          </p>
        </div>

        {/* KPI 3: Đang xử lý */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Đang xử lý
          </span>
          <p className="text-xl font-extrabold text-slate-900 mt-1">
            {String(pendingCount).padStart(2, "0")}
          </p>
        </div>

        {/* KPI 4: Hoàn tiền */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Hoàn tiền
          </span>
          <p className="text-xl font-extrabold text-[#0088ff] mt-1">
            {formatVND(totalRefunded)}
          </p>
        </div>
      </div>

      {/* 3. Thanh Tìm Kiếm & Bộ Lọc Giao Dịch */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-3">
        {/* Ô tìm kiếm */}
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
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0088ff] focus:border-transparent bg-slate-50/50"
          />
        </div>

        {/* Lọc Trạng thái */}
        <div className="w-full md:w-auto flex items-center gap-2">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full md:w-auto px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0088ff] bg-white text-slate-700 cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="THANH_CONG">Thành công</option>
            <option value="CHO_THANH_TOAN">Đang xử lý</option>
            <option value="HOAN_TIEN">Hoàn tiền</option>
            <option value="THAT_BAI">Thất bại</option>
          </select>

          {/* Lọc Loại giao dịch */}
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full md:w-auto px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0088ff] bg-white text-slate-700 cursor-pointer"
          >
            <option value="ALL">Tất cả phương thức</option>
            <option value="COC_XEM_PHONG">Cọc xem phòng</option>
            <option value="HOAN_COC">Hoàn cọc giữ chân</option>
            <option value="CONG_TIEN_COC">Cộng cọc chủ trọ</option>
            <option value="RUT_TIEN">Rút tiền về ví/bank</option>
          </select>
        </div>
      </div>

      {/* Thông báo lỗi nếu có */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2 animate-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4. Bảng Dữ Liệu Giao Dịch (Khớp 100% Mockup Web) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Mã giao dịch</th>
                <th className="py-3 px-4">Phòng / Nội dung</th>
                <th className="py-3 px-4">Số tiền</th>
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4">Phương thức</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading && transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0088ff]" />
                    <span>Đang tải lịch sử giao dịch từ MariaDB :3307...</span>
                  </td>
                </tr>
              ) : paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700">Chưa tìm thấy giao dịch nào</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Thử điều chỉnh từ khóa hoặc bộ lọc trạng thái.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedList.map((tx) => {
                  const badge = getTransactionStatusBadge(tx.trangThai);
                  const typeInfo = formatTransactionType(tx.loaiGiaoDich);
                  const room = resolveRoomInfo(tx.noiDung);

                  return (
                    <tr
                      key={tx.maGiaoDich}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Mã giao dịch */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0088ff]">
                        <Link
                          to={`/booking/transactions/${tx.maGiaoDich}`}
                          className="hover:underline"
                        >
                          {tx.maGiaoDich}
                        </Link>
                      </td>

                      {/* Phòng / Nội dung */}
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
                            {tx.noiDung || "Giao dịch hệ thống"}
                          </span>
                        )}
                      </td>

                      {/* Số tiền */}
                      <td className="py-3.5 px-4 font-extrabold text-slate-900 whitespace-nowrap">
                        {formatVND(tx.soTien)}
                      </td>

                      {/* Thời gian */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatDateTime(tx.ngayGiaoDich)}
                      </td>

                      {/* Phương thức */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {typeInfo.method}
                        </span>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bgClass} ${badge.textClass} ${badge.borderClass}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`}
                          />
                          {badge.label}
                        </span>
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link
                          to={`/booking/transactions/${tx.maGiaoDich}`}
                          className="text-xs font-semibold text-[#0088ff] hover:text-blue-700 inline-flex items-center gap-0.5 transition-colors"
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

        {/* Phân trang */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Hiển thị {paginatedList.length} / {filteredList.length} giao dịch
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
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
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
            >
              <span>Sau</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Cụm 5 Thẻ Tham Chiếu Trạng Thái Chân Trang (Bám sát Mockup Image 1) */}
      <div className="pt-2">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
          Hệ thống bảo chứng & đối soát giao dịch
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Card 1 */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 text-center space-y-1 shadow-2xs">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <RefreshCw className="w-4 h-4 animate-spin" />
            </div>
            <h5 className="text-xs font-bold text-slate-900">Đang tải giao dịch</h5>
            <p className="text-[10px] text-slate-400">Kiểm tra đối soát...</p>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 text-center space-y-1 shadow-2xs">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <CreditCard className="w-4 h-4" />
            </div>
            <h5 className="text-xs font-bold text-slate-900">Chưa có giao dịch</h5>
            <p className="text-[10px] text-slate-400">Giao dịch an toàn hiện ở đây.</p>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 text-center space-y-1 shadow-2xs">
            <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-4 h-4" />
            </div>
            <h5 className="text-xs font-bold text-slate-900">Không tải được lịch sử</h5>
            <p className="text-[10px] text-slate-400">Kiểm tra kết nối MariaDB :3307</p>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 text-center space-y-1 shadow-2xs">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h5 className="text-xs font-bold text-slate-900">Thanh toán thành công</h5>
            <p className="text-[10px] text-slate-400">Biên nhận đối soát sẵn sàng.</p>
          </div>

          {/* Card 5 (Thay cho Tải biên nhận PDF) */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 text-center space-y-1 shadow-2xs">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h5 className="text-xs font-bold text-slate-900">Bảo chứng an toàn</h5>
            <p className="text-[10px] text-slate-400">Ghi nhận tự động vào sổ cái.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionsPage;
