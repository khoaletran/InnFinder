import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AppointmentCard } from '@/components/booking/AppointmentCard';
import { CancelConfirmModal, type BankInfoInput } from '@/components/booking/CancelConfirmModal';
import { RefundSuccessModal } from '@/components/booking/RefundSuccessModal';
import { AppButton } from '@/components/common/AppButton';
import { EmptyState } from '@/components/common/EmptyState';
import { PageContainer, PageHeader } from '@/components/common/PageContainer';
import { SkeletonList } from '@/components/common/SkeletonList';
import { useBookingStore } from '@/store/useBookingStore';
import type { AppointmentResponse, TrangThaiDatLich } from '@/types/booking.types';
import { formatVND } from '@/utils/formatters';

type StatusFilter = 'ALL' | TrangThaiDatLich;

interface StatusTabConfig {
  key: StatusFilter;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STATUS_TABS: StatusTabConfig[] = [
  { key: 'ALL', label: 'Tất cả', icon: Calendar },
  { key: 'CHO_XAC_NHAN', label: 'Chờ xác nhận', icon: Clock },
  { key: 'XAC_NHAN', label: 'Đã xác nhận', icon: CheckCircle2 },
  { key: 'HOAN_THANH', label: 'Hoàn tất', icon: ShieldCheck },
  { key: 'HUY', label: 'Đã hủy', icon: XCircle },
];

export const AppointmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    appointments,
    isLoading,
    error,
    fetchAppointments,
    cancelAppointment,
    paidAppointmentIds,
  } = useBookingStore();

  const [statusTab, setStatusTab] = useState<StatusFilter>('ALL');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('asc');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  const [cancelModalVisible, setCancelModalVisible] = useState<boolean>(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('');
  const [isCanceling, setIsCanceling] = useState<boolean>(false);
  const [refundModalData, setRefundModalData] = useState<{
    isOpen: boolean;
    maDatLich: string;
    amount: number;
    bankName?: string;
    accountNumber?: string;
  } | null>(null);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Đếm số lượng theo từng trạng thái cho thanh tab Shopee
  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      ALL: appointments.length,
      CHO_XAC_NHAN: 0,
      XAC_NHAN: 0,
      HOAN_THANH: 0,
      HUY: 0,
    };
    for (const apt of appointments) {
      if (apt.trangThai && apt.trangThai in counts) {
        counts[apt.trangThai as StatusFilter]++;
      }
    }
    return counts;
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    let list = [...appointments];

    // Lọc theo tab trạng thái Shopee
    if (statusTab !== 'ALL') {
      list = list.filter((a) => a.trangThai === statusTab);
    }

    // Lọc theo từ khóa tìm kiếm
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

    return list.sort((a, b) => {
      const timeA = new Date(a.ngayHen || 0).getTime();
      const timeB = new Date(b.ngayHen || 0).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }, [appointments, statusTab, searchKeyword, sortOrder]);

  const { upcomingAppointments, pastAppointments } = useMemo(() => {
    const upcoming: AppointmentResponse[] = [];
    const past: AppointmentResponse[] = [];

    for (const apt of filteredAppointments) {
      if (apt.trangThai === 'CHO_XAC_NHAN' || apt.trangThai === 'XAC_NHAN') {
        upcoming.push(apt);
      } else {
        past.push(apt);
      }
    }

    return {
      upcomingAppointments: upcoming,
      pastAppointments: past,
    };
  }, [filteredAppointments]);

  const handleOpenCancel = (maDatLich: string) => {
    setSelectedAppointmentId(maDatLich);
    setCancelModalVisible(true);
  };

  const handleConfirmCancel = async (reason: string, bankInfo?: BankInfoInput) => {
    if (!selectedAppointmentId) return;
    const targetAppt = appointments.find((a) => a.maDatLich === selectedAppointmentId);
    const isLate =
      targetAppt &&
      targetAppt.trangThai === 'XAC_NHAN' &&
      targetAppt.ngayHen &&
      new Date(targetAppt.ngayHen).getTime() - Date.now() < 2 * 60 * 60 * 1000;

    setIsCanceling(true);
    const res = await cancelAppointment(selectedAppointmentId, reason, bankInfo);
    setIsCanceling(false);
    setCancelModalVisible(false);

    if (res.success) {
      const coCocHoan = targetAppt && targetAppt.daNopCoc && (targetAppt.coc || 0) > 0 && !isLate;
      if (coCocHoan) {
        setRefundModalData({
          isOpen: true,
          maDatLich: selectedAppointmentId,
          amount: targetAppt.coc || 0,
          bankName: bankInfo?.tenNganHang,
          accountNumber: bankInfo?.soTaiKhoan,
        });
      } else {
        toast.success('Đã hủy lịch hẹn xem phòng thành công');
      }
      await fetchAppointments(true);
    } else {
      toast.error(res.message || 'Hủy lịch hẹn thất bại');
    }
  };

  return (
    <PageContainer width="wide" className="space-y-6">
      <PageHeader
        title="Lịch xem phòng"
        subtitle="Theo dõi lịch hẹn sắp tới, cọc giữ chân và tiến trình thuê phòng"
        action={
          <>
            <AppButton
              variant="secondary"
              size="md"
              onClick={() => fetchAppointments(true)}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-600' : ''}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </AppButton>

            <AppButton variant="primary" size="md" onClick={() => navigate('/search')}>
              <Plus className="w-4 h-4" />
              <span>Đặt lịch mới</span>
            </AppButton>
          </>
        }
      />

      {/* THANH TRẠNG THÁI TIẾN TRÌNH THEO PHONG CÁCH SHOPEE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="flex items-center overflow-x-auto no-scrollbar divide-x sm:divide-x-0 divide-slate-100">
          {STATUS_TABS.map((tab) => {
            const isActive = statusTab === tab.key;
            const count = statusCounts[tab.key] ?? 0;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusTab(tab.key)}
                className={`flex-1 min-w-[130px] sm:min-w-0 py-3.5 px-3 sm:px-4 text-sm font-semibold transition-all relative flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'text-teal-700 font-bold bg-teal-50/40'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-teal-600' : 'text-slate-400'
                  }`}
                />
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold transition-colors ${
                    isActive
                      ? 'bg-teal-600 text-white'
                      : count > 0
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-slate-50 text-slate-400'
                  }`}
                >
                  {count}
                </span>
                {/* Active indicator bar like Shopee */}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 shadow-xs" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Thanh tìm kiếm & sắp xếp */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Tìm theo tên phòng, địa chỉ, mã lịch..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full h-10 pl-10 pr-4 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 text-slate-900 placeholder:text-slate-500"
          />
        </div>

        <AppButton
          variant="secondary"
          size="md"
          onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
        >
          <ArrowUpDown className="w-4 h-4 text-slate-600" />
          <span>{sortOrder === 'asc' ? 'Sắp diễn ra trước ↑' : 'Mới nhất trước ↓'}</span>
        </AppButton>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <AppButton variant="secondary" size="sm" onClick={() => fetchAppointments(true)}>
            Thử lại
          </AppButton>
        </div>
      )}

      {/* Loading / Empty / Content */}
      {isLoading && appointments.length === 0 ? (
        <SkeletonList variant="horizontal" count={3} />
      ) : filteredAppointments.length === 0 ? (
        <EmptyState
          title={
            statusTab !== 'ALL'
              ? `Không có lịch hẹn "${STATUS_TABS.find((t) => t.key === statusTab)?.label}"`
              : 'Chưa có lịch hẹn xem phòng'
          }
          description={
            searchKeyword
              ? `Không tìm thấy lịch hẹn nào khớp với từ khóa "${searchKeyword}".`
              : statusTab !== 'ALL'
                ? `Hiện tại bạn không có lịch hẹn nào đang ở trạng thái này.`
                : 'Chọn một phòng ưng ý trên bản đồ tìm kiếm để đặt lịch hẹn gặp chủ trọ.'
          }
          icon={<Calendar className="w-6 h-6" />}
          action={
            searchKeyword ? (
              <AppButton variant="primary" size="md" onClick={() => setSearchKeyword('')}>
                Xóa từ khóa tìm kiếm
              </AppButton>
            ) : statusTab !== 'ALL' ? (
              <AppButton variant="secondary" size="md" onClick={() => setStatusTab('ALL')}>
                Xem tất cả lịch hẹn
              </AppButton>
            ) : (
              <AppButton variant="primary" size="md" onClick={() => navigate('/search')}>
                Khám phá phòng trọ
              </AppButton>
            )
          }
        />
      ) : statusTab !== 'ALL' ? (
        /* Khi đang chọn một tab cụ thể: Hiển thị danh sách lọc theo tab đó */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              {STATUS_TABS.find((t) => t.key === statusTab)?.label} ({filteredAppointments.length})
            </h2>
          </div>

          <div className="space-y-4">
            {filteredAppointments.map((item) => (
              <AppointmentCard
                key={item.maDatLich}
                item={item}
                onCancel={handleOpenCancel}
                isDepositPaid={
                  !!item.daNopCoc || paidAppointmentIds.includes(item.maDatLich)
                }
                muted={item.trangThai === 'HUY'}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Danh sách chia 2 nhóm: Sắp tới (nổi bật) & Đã qua (mờ hơn) */
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Sắp tới ({upcomingAppointments.length})
              </h2>
            </div>

            {upcomingAppointments.length > 0 ? (
              <div className="space-y-4">
                {upcomingAppointments.map((item) => (
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
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-sm text-slate-600 shadow-xs">
                Bạn chưa có lịch xem phòng nào sắp diễn ra.
              </div>
            )}
          </section>

          {pastAppointments.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-bold text-slate-700">
                Đã qua ({pastAppointments.length})
              </h2>
              <div className="space-y-4">
                {pastAppointments.map((item) => (
                  <AppointmentCard
                    key={item.maDatLich}
                    item={item}
                    onCancel={handleOpenCancel}
                    isDepositPaid={
                      !!item.daNopCoc || paidAppointmentIds.includes(item.maDatLich)
                    }
                    muted={true}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {(() => {
        const selectedAppt = appointments.find((a) => a.maDatLich === selectedAppointmentId);
        const isLateCancel =
          selectedAppt?.trangThai === 'XAC_NHAN' &&
          selectedAppt.ngayHen &&
          new Date(selectedAppt.ngayHen).getTime() - new Date().getTime() < 2 * 60 * 60 * 1000;

        return (
          <CancelConfirmModal
            isOpen={cancelModalVisible}
            isLoading={isCanceling}
            onClose={() => setCancelModalVisible(false)}
            onConfirmCancel={handleConfirmCancel}
            title={
              isLateCancel
                ? 'Hủy lịch hẹn sát giờ?'
                : 'Hủy lịch xem phòng'
            }
            description={
              isLateCancel
                ? `⚠️ Bạn đang hủy lịch trong vòng 2 tiếng trước giờ hẹn. Nếu hủy trong thời gian này, tiền cọc ${formatVND(selectedAppt?.coc || 0)} sẽ không được hoàn lại và sẽ được dùng để bồi thường cho chủ trọ.\nBạn có chắc chắn muốn hủy lịch hẹn này không?`
                : 'Vui lòng chọn hoặc nhập lý do hủy lịch hẹn. Tiền cọc sẽ được hoàn trả theo quy định.'
            }
            cancelButtonText={
              isCanceling
                ? 'Đang hủy...'
                : isLateCancel
                  ? 'Chấp nhận mất cọc & Hủy'
                  : selectedAppt?.daNopCoc && (selectedAppt?.coc || 0) > 0
                    ? 'Xác nhận hủy & Hoàn cọc'
                    : 'Xác nhận hủy'
            }
            keepButtonText="Giữ lại lịch"
            depositAmount={selectedAppt?.coc || 0}
            isRefundEligible={!isLateCancel && Boolean(selectedAppt?.daNopCoc) && (selectedAppt?.coc || 0) > 0}
          />
        );
      })()}

      {/* Hộp thoại thông báo yêu cầu hoàn tiền đã gửi đi thành công */}
      {refundModalData && (
        <RefundSuccessModal
          isOpen={refundModalData.isOpen}
          onClose={() => setRefundModalData(null)}
          onViewTransactions={() => {
            setRefundModalData(null);
            navigate('/transactions');
          }}
          maDatLich={refundModalData.maDatLich}
          depositAmount={refundModalData.amount}
          bankName={refundModalData.bankName}
          accountNumber={refundModalData.accountNumber}
        />
      )}
    </PageContainer>
  );
};

export default AppointmentsPage;
