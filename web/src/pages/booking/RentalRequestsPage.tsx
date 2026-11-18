import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  RefreshCw,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useBookingStore } from "../../store/useBookingStore";
import { RentalRequestCard } from "../../components/booking/RentalRequestCard";
import { RentalProgressBar } from "../../components/booking/RentalProgressBar";

export type RentalFilterTab = "ALL" | "PROCESSING" | "ACCEPTED" | "CANCELLED";

export const RentalRequestsPage: React.FC = () => {
  const { appointments, isLoading, error, fetchAppointments } = useBookingStore();
  const [activeTab, setActiveTab] = useState<RentalFilterTab>("ALL");

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Thống kê số lượng theo các nhóm trạng thái
  const counts = useMemo(() => {
    const all = appointments.length;
    const processing = appointments.filter(
      (a) => a.trangThai === "CHO_XAC_NHAN" || a.trangThai === "XAC_NHAN"
    ).length;
    const accepted = appointments.filter((a) => a.trangThai === "HOAN_THANH").length;
    const cancelled = appointments.filter((a) => a.trangThai === "HUY").length;
    return { all, processing, accepted, cancelled };
  }, [appointments]);

  // Cấu hình Tabs viên thuốc đúng như mockup
  const TABS: { key: RentalFilterTab; label: string; count: number }[] = [
    { key: "ALL", label: "Tất cả", count: counts.all },
    { key: "PROCESSING", label: "Đang xử lý", count: counts.processing },
    { key: "ACCEPTED", label: "Đã chấp nhận", count: counts.accepted },
    { key: "CANCELLED", label: "Đã hủy", count: counts.cancelled },
  ];

  // Danh sách sau khi lọc tab
  const filteredList = useMemo(() => {
    switch (activeTab) {
      case "PROCESSING":
        return appointments.filter(
          (a) => a.trangThai === "CHO_XAC_NHAN" || a.trangThai === "XAC_NHAN"
        );
      case "ACCEPTED":
        return appointments.filter((a) => a.trangThai === "HOAN_THANH");
      case "CANCELLED":
        return appointments.filter((a) => a.trangThai === "HUY");
      case "ALL":
      default:
        return appointments;
    }
  }, [appointments, activeTab]);

  // Lịch hẹn / yêu cầu gần nhất để hiển thị Banner "Tiến trình gần nhất"
  const latestItem = useMemo(() => {
    if (appointments.length === 0) return null;
    return appointments[0];
  }, [appointments]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Yêu cầu thuê
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi đề nghị thuê và các bước xác nhận với chủ trọ
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchAppointments()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-semibold text-xs transition-colors shadow-2xs cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
          Đồng bộ trạng thái
        </button>
      </div>

      {/* 2. Filter Tabs (Pills) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((tab) => {
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

      {/* Thông báo lỗi nếu có */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Lưới các Thẻ Yêu cầu thuê (Grid 3 cột) */}
      {isLoading && appointments.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Đang tải yêu cầu thuê</h3>
          <p className="text-xs text-slate-400">Đồng bộ trạng thái từ cơ sở dữ liệu Docker :3307...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Chưa có yêu cầu thuê</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Gửi yêu cầu sau khi xem phòng thực tế hoặc tạo lịch hẹn để theo dõi tiến trình!
          </p>
          <div className="pt-2">
            <Link
              to="/booking/schedule?roomId=PT0111260001"
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-semibold transition-colors"
            >
              Đặt lịch xem phòng
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredList.map((item) => (
            <RentalRequestCard key={item.maDatLich} item={item} />
          ))}
        </div>
      )}

      {/* 4. Banner "Tiến trình gần nhất" (Khớp 100% Mockup Web) */}
      {latestItem && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Tiến trình gần nhất
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {latestItem.tieuDePhong || `Phòng trọ mã #${latestItem.maPhongTro}`}
              </p>
            </div>

            <Link
              to={`/booking/rental/${latestItem.maDatLich}`}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 transition-colors"
            >
              Xem chi tiết <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <RentalProgressBar
            status={latestItem.trangThai}
            sentDate={
              latestItem.thoiGianDat
                ? `${new Date(latestItem.thoiGianDat).getDate()}/${new Date(latestItem.thoiGianDat).getMonth() + 1}`
                : "26/09"
            }
          />
        </div>
      )}

      {/* 5. Cụm 5 Thẻ Tham chiếu Trạng thái (Edge Case Cards chân trang) */}
      <div className="pt-4">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
          Các trạng thái phản hồi & xử lý
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Card 1: Đang tải */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 text-center space-y-1 shadow-2xs">
            <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">Đang tải yêu cầu</h4>
            <p className="text-[10px] text-slate-400 leading-tight">Đồng bộ trạng thái...</p>
          </div>

          {/* Card 2: Chưa có */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 text-center space-y-1 shadow-2xs">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
              <Clock className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">Chưa có yêu cầu thuê</h4>
            <p className="text-[10px] text-slate-400 leading-tight">Gửi yêu cầu sau khi xem.</p>
          </div>

          {/* Card 3: Lỗi */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 text-center space-y-1 shadow-2xs">
            <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-2">
              <AlertCircle className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">Không gửi được</h4>
            <p className="text-[10px] text-slate-400 leading-tight">Dữ liệu chưa được lưu.</p>
          </div>

          {/* Card 4: Thành công */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 text-center space-y-1 shadow-2xs">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">Đã gửi yêu cầu</h4>
            <p className="text-[10px] text-slate-400 leading-tight">Chủ trọ đã nhận tin.</p>
          </div>

          {/* Card 5: Cảnh báo hủy */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 text-center space-y-1 shadow-2xs">
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">Hủy yêu cầu thuê?</h4>
            <p className="text-[10px] text-slate-400 leading-tight">Không thể hoàn tác.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RentalRequestsPage;
