import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@heroui/react';
import {
  AlertCircle,
  ArrowRight,
  ArrowUpDown,
  Calendar,
  LayoutGrid,
  LayoutList,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AppointmentCard } from '@/components/booking/AppointmentCard';
import { CancelConfirmModal } from '@/components/booking/CancelConfirmModal';
import { RentalProgressBar } from '@/components/booking/RentalProgressBar';
import { RentalRequestCard } from '@/components/booking/RentalRequestCard';
import { EmptyState } from '@/components/common/EmptyState';
import { useBookingStore, type AppointmentFilterTab } from '@/store/useBookingStore';

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
  } = useBookingStore();

  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');

  const [cancelModalVisible, setCancelModalVisible] = useState<boolean>(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('');
  const [isCanceling, setIsCanceling] = useState<boolean>(false);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const counts = useMemo(() => {
    const all = appointments.length;
    const pending = appointments.filter((a) => a.trangThai === 'CHO_XAC_NHAN').length;
    const confirmed = appointments.filter((a) => a.trangThai === 'XAC_NHAN').length;
    const completed = appointments.filter((a) => a.trangThai === 'HOAN_THANH').length;
    const cancelled = appointments.filter((a) => a.trangThai === 'HUY').length;
    return { all, pending, confirmed, completed, cancelled };
  }, [appointments]);

  const activeRental = useMemo(() => {
    return (
      appointments.find(
        (a) => a.trangThai === 'XAC_NHAN' || a.trangThai === 'CHO_XAC_NHAN',
      ) || null
    );
  }, [appointments]);

  const TAB_ITEMS: { key: AppointmentFilterTab; label: string; count: number }[] = [
    { key: 'ALL', label: 'Tất cả', count: counts.all },
    { key: 'XAC_NHAN', label: 'Sắp tới', count: counts.confirmed },
    { key: 'CHO_XAC_NHAN', label: 'Chờ phản hồi', count: counts.pending },
    { key: 'HOAN_THANH', label: 'Đã hoàn tất', count: counts.completed },
    { key: 'HUY', label: 'Đã hủy', count: counts.cancelled },
  ];

  const filteredAppointments = useMemo(() => {
    let list =
      activeTab === 'ALL'
        ? appointments
        : appointments.filter((a) => a.trangThai === activeTab);

    if (searchKeyword.trim() !== '') {
      const kw = searchKeyword.toLowerCase();
      list = list.filter(
        (a) =>
          (a.tieuDePhong && a.tieuDePhong.toLowerCase().includes(kw)) ||
          (a.diaChiPhong && a.diaChiPhong.toLowerCase().includes(kw)) ||
          (a.maDatLich && a.maDatLich.toLowerCase().includes(kw)) ||
          (a.tenChuTro && a.tenChuTro.toLowerCase().includes(kw)),
      );
    }

    return [...list].sort((a, b) => {
      const timeA = new Date(a.ngayHen || 0).getTime();
      const timeB = new Date(b.ngayHen || 0).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }, [appointments, activeTab, searchKeyword, sortOrder]);

  const handleOpenCancel = (maDatLich: string) => {
    setSelectedAppointmentId(maDatLich);
    setCancelModalVisible(true);
  };

  // Không hoàn ví 2 lần (Backend tự ghi sổ cái hoàn cọc khi hủy hợp lệ)
  const handleConfirmCancel = async (reason: string) => {
    if (!selectedAppointmentId) return;
    setIsCanceling(true);
    const res = await cancelAppointment(selectedAppointmentId, reason);
    setIsCanceling(false);
    setCancelModalVisible(false);

    if (res.success) {
      toast.success('Đã hủy lịch hẹn xem phòng thành công');
      await fetchAppointments(true);
    } else {
      toast.error(res.message || 'Hủy lịch hẹn thất bại');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Lịch xem & Thuê phòng
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi toàn bộ lịch hẹn xem phòng (`PhieuDatLich`), cọc giữ chân và tiến trình thuê
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Danh sách</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
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
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <Link
            to="/search"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tìm phòng đặt lịch</span>
          </Link>
        </div>
      </div>

      {activeRental && (
        <Card className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
          <Card.Header className="p-0 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <Card.Title className="text-sm sm:text-base font-bold text-slate-900">
                Tiến trình xem & thuê phòng gần nhất
              </Card.Title>
              <Card.Description className="text-xs text-slate-500 mt-0.5">
                {activeRental.tieuDePhong || `Phòng trọ mã #${activeRental.maPhongTro}`} · Mã lịch: #{activeRental.maDatLich}
              </Card.Description>
            </div>

            <Link
              to={`/appointments/${activeRental.maDatLich}`}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 transition-colors"
            >
              Xem chi tiết tiến trình <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Card.Header>

          <Card.Content className="p-0 pt-2">
            <RentalProgressBar
              status={activeRental.trangThai}
              sentDate={
                activeRental.thoiGianDat
                  ? `${new Date(activeRental.thoiGianDat).getDate()}/${new Date(activeRental.thoiGianDat).getMonth() + 1}`
                  : '--/--'
              }
            />
          </Card.Content>
        </Card>
      )}

      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {TAB_ITEMS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              type="button"
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer border ${
                isActive
                  ? 'bg-teal-50 border-teal-500 text-teal-800 shadow-2xs font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  isActive ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pt-1">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {filteredAppointments.length} phiếu đặt lịch
        </div>

        <div className="flex items-center gap-3">
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

          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-medium text-slate-600 transition-colors cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span>{sortOrder === 'desc' ? 'Ngày gần nhất ↓' : 'Ngày cũ nhất ↑'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchAppointments()}
            className="text-xs font-bold text-rose-800 underline hover:no-underline cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {isLoading && appointments.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">Đang tải danh sách lịch hẹn...</h3>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <EmptyState
          title="Chưa có lịch hẹn xem phòng"
          description={
            searchKeyword
              ? `Không tìm thấy lịch hẹn nào khớp với từ khóa "${searchKeyword}".`
              : 'Chọn một phòng ưng ý trên bản đồ tìm kiếm để đặt lịch hẹn gặp chủ trọ.'
          }
          icon={<Calendar className="w-7 h-7" />}
          action={
            <Link
              to="/search"
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Khám phá phòng trọ
            </Link>
          }
        />
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAppointments.map((item) => (
            <RentalRequestCard key={item.maDatLich} item={item} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden divide-y divide-slate-100">
          {filteredAppointments.map((item) => (
            <AppointmentCard
              key={item.maDatLich}
              item={item}
              onCancel={handleOpenCancel}
              isDepositPaid={!!item.daNopCoc || paidAppointmentIds.includes(item.maDatLich)}
            />
          ))}
        </div>
      )}

      <CancelConfirmModal
        isOpen={cancelModalVisible}
        isLoading={isCanceling}
        onClose={() => setCancelModalVisible(false)}
        onConfirmCancel={handleConfirmCancel}
        title="Hủy lịch xem phòng"
        description="Vui lòng nhập lý do hủy lịch hẹn (liDoHuy bắt buộc)"
        cancelButtonText={isCanceling ? 'Đang hủy...' : 'Xác nhận hủy'}
        keepButtonText="Giữ lại lịch"
      />
    </div>
  );
};

export default AppointmentsPage;
