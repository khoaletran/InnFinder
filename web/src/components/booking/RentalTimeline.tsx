import React from 'react';
import { Check, Clock, Home, User, X } from 'lucide-react';
import type { TrangThaiDatLich } from '@/types/booking.types';
import { formatVND } from '@/utils/formatters';

export interface RentalTimelineProps {
  status: TrangThaiDatLich;
  ngayHen: string;
  thoiGianDat?: string;
  daNopCoc?: boolean;
  daNhanLaiCoc?: boolean;
  khachHangDongY?: boolean | null;
  chuTroDongY?: boolean | null;
  liDoHuy?: string;
  coc?: number;
}

interface TimelineStep {
  id: string;
  title: string;
  subtitle: string;
  time?: string;
  state: 'completed' | 'active' | 'pending' | 'cancelled';
  showDualDecision?: boolean;
}

const formatShortDateTime = (isoDate?: string): string => {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month} · ${hours}:${minutes}`;
  } catch {
    return '';
  }
};

const renderPartyDecisionBadge = (
  decision: boolean | null | undefined,
  agreeLabel: string,
  declineLabel: string,
) => {
  if (decision === true) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">
        <Check className="w-3 h-3 stroke-[2.5]" />
        {agreeLabel}
      </span>
    );
  }
  if (decision === false) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700">
        <X className="w-3 h-3 stroke-[2.5]" />
        {declineLabel}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">
      <Clock className="w-3 h-3" />
      Chờ xác nhận
    </span>
  );
};

export const RentalTimeline: React.FC<RentalTimelineProps> = ({
  status,
  thoiGianDat,
  daNopCoc,
  daNhanLaiCoc,
  khachHangDongY,
  chuTroDongY,
  liDoHuy,
  coc = 0,
}) => {
  const steps: TimelineStep[] = [];

  // 1. Bước 1: Gửi yêu cầu đặt lịch (Luôn có)
  steps.push({
    id: 'step-created',
    title: 'Gửi yêu cầu đặt lịch xem phòng',
    subtitle: 'Hệ thống đã tiếp nhận yêu cầu đặt lịch hẹn.',
    time: formatShortDateTime(thoiGianDat),
    state: 'completed',
  });

  // 2. Bước 2: Nộp cọc giữ chân (Nếu lịch có yêu cầu cọc)
  if (coc > 0) {
    if (daNopCoc) {
      steps.push({
        id: 'step-deposit',
        title: 'Nộp tiền cọc giữ chân',
        subtitle: `Đã nộp ${formatVND(coc)} tiền cọc giữ chân vào hệ thống.`,
        state: 'completed',
      });
    } else if (status === 'CHO_XAC_NHAN' || status === 'XAC_NHAN') {
      steps.push({
        id: 'step-deposit-pending',
        title: 'Nộp tiền cọc giữ chân',
        subtitle: `Vui lòng nộp ${formatVND(coc)} tiền cọc để giữ lịch hẹn.`,
        state: 'active',
      });
    }
  }

  // 3. Bước 3: Chủ trọ xác nhận lịch xem
  // CHỈ hiển thị khi có căn cứ THẬT SỰ là chủ trọ đã từng xác nhận
  const hasLandlordConfirmed =
    status === 'XAC_NHAN' ||
    status === 'HOAN_THANH' ||
    Boolean(daNhanLaiCoc) ||
    khachHangDongY != null ||
    chuTroDongY != null ||
    (Boolean(liDoHuy) &&
      (liDoHuy!.includes('sau khi xác nhận') ||
        liDoHuy!.includes('> 2h') ||
        liDoHuy!.includes('sát giờ') ||
        liDoHuy!.includes('sau khi xem') ||
        liDoHuy!.includes('No-show') ||
        liDoHuy!.includes('vắng mặt')));

  if (hasLandlordConfirmed) {
    steps.push({
      id: 'step-landlord-confirmed',
      title: 'Chủ trọ đã xác nhận lịch hẹn',
      subtitle: 'Chủ trọ đồng ý khung giờ hẹn dẫn xem phòng thực tế.',
      state: 'completed',
    });
  } else if (status === 'CHO_XAC_NHAN') {
    steps.push({
      id: 'step-landlord-pending',
      title: 'Chờ Chủ trọ xác nhận lịch',
      subtitle: 'Chủ trọ đang kiểm tra phòng trống để duyệt lịch hẹn.',
      state: 'active',
    });
  }

  // 4. Bước 4: Đã nhận lại cọc trực tiếp tại buổi xem (Chỉ khi daNhanLaiCoc = true)
  if (daNhanLaiCoc) {
    steps.push({
      id: 'step-received-deposit',
      title: 'Đã nhận lại 100% cọc trực tiếp',
      subtitle: `Khách hàng đã nhận lại đủ ${formatVND(coc)} từ Chủ trọ tại buổi gặp.`,
      state: 'completed',
    });
  } else if (status === 'XAC_NHAN' && daNopCoc) {
    steps.push({
      id: 'step-viewing-active',
      title: 'Gặp xem phòng & Nhận lại cọc',
      subtitle: `Tại buổi xem, Chủ trọ hoàn trả trực tiếp ${formatVND(coc)} tiền cọc cho bạn.`,
      state: 'active',
    });
  }

  // 5. Bước 5: Quyết định thuê phòng (Chỉ khi có dữ liệu quyết định hoặc đang chờ quyết định)
  const hasDecisionData =
    (khachHangDongY !== null && khachHangDongY !== undefined) ||
    (chuTroDongY !== null && chuTroDongY !== undefined);

  if (hasDecisionData) {
    steps.push({
      id: 'step-decision',
      title: 'Quyết định thuê phòng',
      subtitle: 'Xác nhận lựa chọn của hai bên:',
      state: status === 'HOAN_THANH' ? 'completed' : status === 'HUY' ? 'cancelled' : 'active',
      showDualDecision: true,
    });
  } else if (status === 'XAC_NHAN' && daNhanLaiCoc) {
    steps.push({
      id: 'step-decision-waiting',
      title: 'Quyết định thuê phòng',
      subtitle: 'Vui lòng đưa ra quyết định thuê hoặc không thuê phòng.',
      state: 'active',
      showDualDecision: true,
    });
  }

  // 6. Bước Kết thúc (Hoàn thành hoặc Hủy)
  if (status === 'HOAN_THANH') {
    steps.push({
      id: 'step-completed',
      title: 'Thuê phòng thành công',
      subtitle: 'Hai bên đã thống nhất thuê phòng.',
      state: 'completed',
    });
  } else if (status === 'HUY') {
    steps.push({
      id: 'step-cancelled',
      title: 'Lịch hẹn đã bị hủy',
      subtitle: liDoHuy ? `Lý do: ${liDoHuy}` : 'Lịch hẹn đã kết thúc.',
      state: 'cancelled',
    });
  }

  return (
    <div className="space-y-0">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="relative flex gap-4 items-start">
            {!isLast && (
              <div
                className={`absolute left-[15px] top-[26px] bottom-0 w-[2px] -ml-[1px] ${
                  step.state === 'completed'
                    ? 'bg-emerald-500'
                    : step.state === 'cancelled'
                      ? 'bg-rose-300'
                      : 'bg-slate-200'
                }`}
              />
            )}

            <div className="relative z-10 shrink-0 mt-0.5">
              {step.state === 'completed' && (
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                  <Check className="w-4 h-4 stroke-[2.5]" />
                </div>
              )}
              {step.state === 'active' && (
                <div className="w-8 h-8 rounded-full border-2 border-teal-600 bg-teal-50 text-teal-600 flex items-center justify-center shadow-xs animate-pulse">
                  <Clock className="w-4 h-4 stroke-[2.2]" />
                </div>
              )}
              {step.state === 'cancelled' && (
                <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs">
                  <X className="w-4 h-4 stroke-[2.5]" />
                </div>
              )}
              {step.state === 'pending' && (
                <div className="w-8 h-8 rounded-full border border-slate-300 bg-slate-100 text-slate-400 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                </div>
              )}
            </div>

            <div className={`flex-1 min-w-0 ${isLast ? 'pb-2' : 'pb-6'}`}>
              <div className="flex items-center justify-between gap-2">
                <h4
                  className={`text-sm font-bold ${
                    step.state === 'cancelled'
                      ? 'text-rose-600'
                      : step.state === 'pending'
                        ? 'text-slate-400'
                        : 'text-slate-900'
                  }`}
                >
                  {step.title}
                </h4>

                {step.time && (
                  <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
                    {step.time}
                  </span>
                )}
              </div>

              <p
                className={`text-xs mt-1 leading-relaxed ${
                  step.state === 'cancelled'
                    ? 'text-rose-500'
                    : step.state === 'pending'
                      ? 'text-slate-400'
                      : 'text-slate-600'
                }`}
              >
                {step.subtitle}
              </p>

              {step.showDualDecision && (
                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-white rounded-lg border border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-teal-600" />
                      Khách hàng:
                    </span>
                    {renderPartyDecisionBadge(
                      khachHangDongY,
                      'Đồng ý thuê',
                      'Không thuê',
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-white rounded-lg border border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                      <Home className="w-3.5 h-3.5 text-teal-600" />
                      Chủ trọ:
                    </span>
                    {renderPartyDecisionBadge(
                      chuTroDongY,
                      'Đồng ý cho thuê',
                      'Từ chối cho thuê',
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RentalTimeline;
