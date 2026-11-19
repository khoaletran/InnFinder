import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@heroui/react';
import { AlertCircle, ArrowRight, Clock, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RentalProgressBar } from '@/components/booking/RentalProgressBar';
import { RentalRequestCard } from '@/components/booking/RentalRequestCard';
import { EmptyState } from '@/components/common/EmptyState';
import { useBookingStore } from '@/store/useBookingStore';

export type RentalFilterTab = 'ALL' | 'PROCESSING' | 'ACCEPTED' | 'CANCELLED';

export const RentalsPage: React.FC = () => {
  const { appointments, isLoading, error, fetchAppointments } = useBookingStore();
  const [activeTab, setActiveTab] = useState<RentalFilterTab>('ALL');

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const counts = useMemo(() => {
    const all = appointments.length;
    const processing = appointments.filter(
      (a) => a.trangThai === 'CHO_XAC_NHAN' || a.trangThai === 'XAC_NHAN',
    ).length;
    const accepted = appointments.filter((a) => a.trangThai === 'HOAN_THANH').length;
    const cancelled = appointments.filter((a) => a.trangThai === 'HUY').length;
    return { all, processing, accepted, cancelled };
  }, [appointments]);

  const TABS: { key: RentalFilterTab; label: string; count: number }[] = [
    { key: 'ALL', label: 'Tất cả', count: counts.all },
    { key: 'PROCESSING', label: 'Đang xử lý & Chờ chốt', count: counts.processing },
    { key: 'ACCEPTED', label: 'Đã chốt thuê', count: counts.accepted },
    { key: 'CANCELLED', label: 'Đã hủy / Không thuê', count: counts.cancelled },
  ];

  const filteredList = useMemo(() => {
    switch (activeTab) {
      case 'PROCESSING':
        return appointments.filter(
          (a) => a.trangThai === 'CHO_XAC_NHAN' || a.trangThai === 'XAC_NHAN',
        );
      case 'ACCEPTED':
        return appointments.filter((a) => a.trangThai === 'HOAN_THANH');
      case 'CANCELLED':
        return appointments.filter((a) => a.trangThai === 'HUY');
      case 'ALL':
      default:
        return appointments;
    }
  }, [appointments, activeTab]);

  const latestItem = appointments[0] || null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Quyết định thuê & Hợp đồng
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Xác nhận đã nhận lại cọc trực tiếp từ Chủ trọ và đưa ra quyết định độc lập Thuê / Không
            thuê
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchAppointments()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-semibold text-xs transition-colors shadow-2xs cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-teal-600' : ''}`} />
          Đồng bộ trạng thái
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {TABS.map((tab) => {
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

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {latestItem && (
        <Card className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <Card.Header className="p-0 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <Card.Title className="text-base font-bold text-slate-900">
                Tiến trình gần nhất
              </Card.Title>
              <Card.Description className="text-xs text-slate-500 mt-0.5">
                {latestItem.tieuDePhong || `Phòng trọ mã #${latestItem.maPhongTro}`}
              </Card.Description>
            </div>

            <Link
              to={`/appointments/${latestItem.maDatLich}`}
              className="text-xs font-bold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1 transition-colors"
            >
              Mở bảng xác nhận <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Card.Header>

          <Card.Content className="p-0 pt-2">
            <RentalProgressBar
              status={latestItem.trangThai}
              sentDate={
                latestItem.thoiGianDat
                  ? `${new Date(latestItem.thoiGianDat).getDate()}/${new Date(latestItem.thoiGianDat).getMonth() + 1}`
                  : '--/--'
              }
            />
          </Card.Content>
        </Card>
      )}

      {isLoading && appointments.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Đang tải tiến trình thuê...</h3>
        </div>
      ) : filteredList.length === 0 ? (
        <EmptyState
          title="Chưa có tiến trình thuê phòng"
          description="Đặt lịch hẹn xem phòng thực tế để bắt đầu quy trình xác nhận thuê an toàn."
          icon={<Clock className="w-7 h-7" />}
          action={
            <Link
              to="/search"
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-full text-xs font-semibold transition-colors"
            >
              Tìm phòng ngay
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredList.map((item) => (
            <RentalRequestCard key={item.maDatLich} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};

export default RentalsPage;
