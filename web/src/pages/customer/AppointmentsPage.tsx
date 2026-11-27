import React, { useEffect, useMemo, useState } from 'react';
import { Card, Chip } from '@heroui/react';
import {
  AlertCircle,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CancelConfirmModal, type BankInfoInput } from '@/components/booking/CancelConfirmModal';
import { RefundSuccessModal } from '@/components/booking/RefundSuccessModal';
import { AppButton } from '@/components/common/AppButton';
import { EmptyState } from '@/components/common/EmptyState';
import { PageContainer } from '@/components/common/PageContainer';
import { SkeletonList } from '@/components/common/SkeletonList';
import { RoommateBookingLink } from '@/components/roommate/RoommateCards';
import { useBookingStore } from '@/store/useBookingStore';
import type { TrangThaiDatLich } from '@/types/booking.types';
import { formatDateTime, formatVND } from '@/utils/formatters';

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

  const renderStatusChip = (status: TrangThaiDatLich) => {
    switch (status) {
      case 'CHO_XAC_NHAN':
        return (
          <Chip size="sm" variant="soft" color="warning" className="font-bold">
            Chờ xác nhận
          </Chip>
        );
      case 'XAC_NHAN':
        return (
          <Chip size="sm" variant="soft" color="accent" className="font-bold">
            Đã xác nhận
          </Chip>
        );
      case 'HOAN_THANH':
        return (
          <Chip size="sm" variant="soft" color="success" className="font-bold">
            Hoàn tất
          </Chip>
        );
      case 'HUY':
        return (
          <Chip size="sm" variant="soft" color="danger" className="font-bold">
            Đã hủy
          </Chip>
        );
    }
  };

  return (
    <PageContainer width="wide" className="space-y-5">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <AppButton variant="secondary" size="sm" onClick={() => fetchAppointments(true)}>
            Thử lại
          </AppButton>
        </div>
      )}

      <Card className="bg-surface rounded-xl border border-border overflow-x-clip p-0">
        <Card.Header className="p-0 border-b border-border sticky top-[100px] z-30 bg-white/95 backdrop-blur-md rounded-t-xl">
          {/* Hàng 1: Tìm kiếm + Sắp xếp + Làm mới + Đặt lịch mới (chung 1 dòng) */}
          <div className="p-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="w-4 h-4 text-text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo tên phòng, địa chỉ, mã lịch..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface-subtle border border-border text-xs text-text placeholder:text-text-subtle focus:outline-none focus:bg-surface focus:border-accent"
                />
              </div>

              <button
                type="button"
                onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                className="px-3 py-2 rounded-lg border border-border bg-surface text-xs font-semibold text-slate-700 hover:bg-surface-subtle inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                <span>{sortOrder === 'asc' ? 'Sắp diễn ra trước ↑' : 'Mới nhất trước ↓'}</span>
              </button>

              {(searchKeyword || statusTab !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchKeyword('');
                    setStatusTab('ALL');
                  }}
                  className="px-3 py-2 rounded-lg border border-border bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 cursor-pointer whitespace-nowrap"
                >
                  Đặt lại
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => fetchAppointments(true)}
                disabled={isLoading}
                className="px-3 py-2 rounded-lg bg-white border border-border hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Làm mới</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/search')}
                className="px-3.5 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Đặt lịch mới</span>
              </button>
            </div>
          </div>

          {/* Hàng 2: Tabs trạng thái gạch chân chia đều chuẩn Admin */}
          <div className="flex items-center border-t border-slate-100 overflow-x-auto bg-white">
            {STATUS_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = statusTab === tab.key;
              const count = statusCounts[tab.key] ?? 0;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusTab(tab.key)}
                  className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'border-teal-700 text-teal-800'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-700' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold leading-none ${
                      isActive ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </Card.Header>

        <Card.Content className="p-0 overflow-x-auto">
          {isLoading && appointments.length === 0 ? (
            <div className="p-4">
              <SkeletonList variant="horizontal" count={3} />
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="p-6">
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
                      ? 'Hiện tại bạn không có lịch hẹn nào đang ở trạng thái này.'
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
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Mã lịch hẹn</th>
                  <th className="py-3 px-4">Phòng trọ</th>
                  <th className="py-3 px-4">Chủ trọ</th>
                  <th className="py-3 px-4">Thời gian hẹn</th>
                  <th className="py-3 px-4">Cọc giữ chân</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAppointments.map((item) => {
                  const isPaid = Boolean(item.daNopCoc) || paidAppointmentIds.includes(item.maDatLich);
                  const hasUnpaidDeposit = (item.coc ?? 0) > 0 && !isPaid;
                  const canCancel =
                    (item.trangThai === 'CHO_XAC_NHAN' || item.trangThai === 'XAC_NHAN') &&
                    !item.daNhanLaiCoc;
                  const detailRoute = `/appointments/${item.maDatLich}`;
                  const depositRoute = `/appointments/deposit/${item.maDatLich}`;
                  const reviewRoute = `/reviews/create/${item.maPhongTro}?roomTitle=${encodeURIComponent(
                    item.tieuDePhong || '',
                  )}&roomAddress=${encodeURIComponent(
                    item.diaChiPhong || '',
                  )}&roomImage=${encodeURIComponent(item.hinhAnh || '')}`;

                  return (
                    <tr
                      key={item.maDatLich}
                      onClick={() => navigate(detailRoute)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                        #{item.maDatLich}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5 min-w-[200px] max-w-[280px]">
                          <img
                            src={
                              item.hinhAnh ||
                              'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=200'
                            }
                            alt={item.tieuDePhong || 'Phòng trọ'}
                            className="w-12 h-9 rounded-lg object-cover bg-slate-100 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">
                              {item.tieuDePhong || `Phòng #${item.maPhongTro}`}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">{item.diaChiPhong}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="font-semibold text-slate-800">{item.tenChuTro || 'Chủ trọ'}</p>
                        <p className="text-[11px] text-slate-500">{item.sdtChuTro || '--'}</p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-700">
                        {formatDateTime(item.ngayHen)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="font-bold text-slate-900">{formatVND(item.coc)}</p>
                        <p className="text-[11px] text-slate-500">
                          {item.coc > 0 ? (isPaid ? 'Đã nộp' : 'Chưa nộp') : 'Miễn cọc'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderStatusChip(item.trangThai)}
                      </td>
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {hasUnpaidDeposit && canCancel && (
                            <button
                              type="button"
                              onClick={() =>
                                navigate(depositRoute, {
                                  state: {
                                    roomId: item.maPhongTro,
                                    roomTitle: item.tieuDePhong,
                                    roomImage: item.hinhAnh,
                                    depositAmount: item.coc,
                                    ngayHen: item.ngayHen,
                                  },
                                })
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <CreditCard className="w-3 h-3" />
                              Nộp cọc
                            </button>
                          )}
                          {item.trangThai === 'HOAN_THANH' && (
                            <>
                              <RoommateBookingLink id={item.maDatLich} />
                              <button
                                type="button"
                                onClick={() => navigate(reviewRoute)}
                                className="px-2.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Star className="w-3 h-3" />
                                Đánh giá
                              </button>
                            </>
                          )}
                          {canCancel && (
                            <button
                              type="button"
                              onClick={() => handleOpenCancel(item.maDatLich)}
                              className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold cursor-pointer"
                            >
                              Hủy
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => navigate(detailRoute)}
                            className="px-2.5 py-1.5 rounded-lg border border-border bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold cursor-pointer"
                          >
                            Chi tiết
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card.Content>
      </Card>

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
