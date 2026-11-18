import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Plus,
  RefreshCw,
  Search,
  AlertCircle,
  ArrowUpDown,
  LayoutList,
  LayoutGrid,
} from "lucide-react";
import {
  useBookingStore,
  type AppointmentFilterTab,
} from "../../store/useBookingStore";
import { AppointmentCard } from "../../components/booking/AppointmentCard";
import { RentalRequestCard } from "../../components/booking/RentalRequestCard";
import { CancelConfirmModal } from "../../components/booking/CancelConfirmModal";

export const AppointmentsPage: React.FC = () => {
  const {
    appointments,
    isLoading,
    error,
    activeTab,
    setActiveTab,
    fetchAppointments,
    cancelAppointment,
    paidAppointmentIds,
    refundWallet,
  } = useBookingStore();

  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");

  // Modal hủy lịch (Khớp Ảnh 2)
  const [cancelModalVisible, setCancelModalVisible] = useState<boolean>(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>("");
  const [isCanceling, setIsCanceling] = useState<boolean>(false);

  // Tải danh sách lịch hẹn khi vào trang
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Thống kê số lượng theo từng Tab
  const counts = useMemo(() => {
    const all = appointments.length;
    const pending = appointments.filter((a) => a.trangThai === "CHO_XAC_NHAN").length;
    const confirmed = appointments.filter((a) => a.trangThai === "XAC_NHAN").length;
    const completed = appointments.filter((a) => a.trangThai === "HOAN_THANH").length;
    const cancelled = appointments.filter((a) => a.trangThai === "HUY").length;
    return { all, pending, confirmed, completed, cancelled };
  }, [appointments]);

  // Danh sách Tabs định dạng viên thuốc (Pill Tabs)
  const TAB_ITEMS: { key: AppointmentFilterTab; label: string; count: number }[] = [
    { key: "ALL", label: "Tất cả", count: counts.all },
    { key: "XAC_NHAN", label: "Sắp tới", count: counts.confirmed },
    { key: "CHO_XAC_NHAN", label: "Chờ phản hồi", count: counts.pending },
    { key: "HOAN_THANH", label: "Đã hoàn tất", count: counts.completed },
    { key: "HUY", label: "Đã hủy", count: counts.cancelled },
  ];

  // Lọc và sắp xếp danh sách
  const filteredAppointments = useMemo(() => {
    let list = activeTab === "ALL"
      ? appointments
      : appointments.filter((a) => a.trangThai === activeTab);

    // Lọc theo từ khóa tìm kiếm (Tên phòng, địa chỉ, mã lịch, chủ trọ)
    if (searchKeyword.trim() !== "") {
      const kw = searchKeyword.toLowerCase();
      list = list.filter(
        (a) =>
          (a.tieuDePhong && a.tieuDePhong.toLowerCase().includes(kw)) ||
          (a.diaChiPhong && a.diaChiPhong.toLowerCase().includes(kw)) ||
          (a.maDatLich && a.maDatLich.toLowerCase().includes(kw)) ||
          (a.tenChuTro && a.tenChuTro.toLowerCase().includes(kw))
      );
    }

    // Sắp xếp theo ngày hẹn
    return [...list].sort((a, b) => {
      const timeA = new Date(a.ngayHen || 0).getTime();
      const timeB = new Date(b.ngayHen || 0).getTime();
      return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
    });
  }, [appointments, activeTab, searchKeyword, sortOrder]);

  // Kích hoạt Modal Hủy lịch
  const handleOpenCancel = (maDatLich: string) => {
    setSelectedAppointmentId(maDatLich);
    setCancelModalVisible(true);
  };

  // Xác nhận hủy lịch
  const handleConfirmCancel = async (reason: string) => {
    if (!selectedAppointmentId) return;
    setIsCanceling(true);

    const target = appointments.find((a) => a.maDatLich === selectedAppointmentId);
    const wasPaid = !!target?.daNopCoc || paidAppointmentIds.includes(selectedAppointmentId);

    const res = await cancelAppointment(selectedAppointmentId, reason);
    setIsCanceling(false);
    setCancelModalVisible(false);

    if (res.success) {
      if (wasPaid && target?.coc) {
        await refundWallet(target.coc);
      }
      await fetchAppointments(true);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Lịch xem & Thuê phòng
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi toàn bộ lịch hẹn xem phòng, nộp cọc giữ chân và tiến trình chốt hợp đồng thuê
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Chuyển đổi giao diện: Danh sách hoặc Thẻ */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Chế độ xem dạng bảng danh sách"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Danh sách</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "cards"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Chế độ xem dạng thẻ tiến trình"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Thẻ tiến trình</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => fetchAppointments()}
            disabled={isLoading}
            className="p-2.5 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
          </button>

          <Link
            to="/booking/schedule?roomId=PT0111260001"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0088ff] hover:bg-blue-600 active:bg-blue-700 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Đặt lịch mới</span>
          </Link>
        </div>
      </div>

      {/* 2. Filter Tabs viên thuốc (Pill Tabs) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {TAB_ITEMS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              type="button"
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer border ${
                isActive
                  ? "bg-teal-50 border-teal-500 text-teal-800 shadow-2xs font-bold"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  isActive ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Toolbar: Tìm kiếm & Sắp xếp */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pt-1">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {filteredAppointments.length} lịch gần nhất
        </div>

        <div className="flex items-center gap-3">
          {/* Ô tìm kiếm nhanh */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên phòng, mã lịch..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-700 w-48 sm:w-60"
            />
          </div>

          {/* Nút đổi thứ tự sắp xếp */}
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-medium text-slate-600 transition-colors cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span>{sortOrder === "desc" ? "Ngày gần nhất ↓" : "Ngày cũ nhất ↑"}</span>
          </button>
        </div>
      </div>

      {/* Thông báo lỗi kết nối nếu có */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchAppointments()}
            className="text-xs font-bold text-rose-800 underline hover:no-underline"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* 4. Nội dung Danh sách Lịch hẹn: Theo Chế độ Danh sách (List) hoặc Thẻ (Cards) */}
      {isLoading && appointments.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">Đang tải lịch hẹn</h3>
          <p className="text-xs text-slate-400">Đồng bộ phản hồi từ chủ trọ và cơ sở dữ liệu Docker :3307...</p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Calendar className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Chưa có lịch xem phòng</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchKeyword
              ? `Không tìm thấy lịch hẹn nào khớp với từ khóa "${searchKeyword}".`
              : "Bạn chưa có lịch hẹn nào ở trạng thái này. Đặt lịch xem phòng ngay để trải nghiệm thực tế!"}
          </p>
          <div className="pt-2">
            <Link
              to="/booking/schedule?roomId=PT0111260001"
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#0088ff] hover:bg-blue-600 text-white rounded-full text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Đặt lịch xem phòng mẫu
            </Link>
          </div>
        </div>
      ) : viewMode === "cards" ? (
        /* CHẾ ĐỘ THẺ TIẾN TRÌNH (GRID 3 CỘT) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAppointments.map((item) => (
            <RentalRequestCard key={item.maDatLich} item={item} />
          ))}
        </div>
      ) : (
        /* CHẾ ĐỘ DANH SÁCH BẢNG (LIST VIEW HÀNG NGANG) */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden divide-y divide-slate-100">
          {filteredAppointments.map((item) => (
            <AppointmentCard
              key={item.maDatLich}
              item={item}
              onCancel={handleOpenCancel}
              isDepositPaid={
                !!item.daNopCoc || paidAppointmentIds.includes(item.maDatLich)
              }
            />
          ))}
        </div>
      )}

      {/* MODAL HỦY LỊCH XEM PHÒNG (Khớp 100% Mobile) */}
      <CancelConfirmModal
        isOpen={cancelModalVisible}
        isLoading={isCanceling}
        onClose={() => setCancelModalVisible(false)}
        onConfirmCancel={handleConfirmCancel}
        title="Hủy lịch xem phòng"
        description="Vui lòng cho biết lý do bạn muốn hủy lịch hẹn này"
        cancelButtonText={isCanceling ? "Đang hủy..." : "Xác nhận hủy"}
        keepButtonText="Giữ lại lịch"
      />
    </div>
  );
};

export default AppointmentsPage;
