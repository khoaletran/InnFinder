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
  constraintBadge?: string;
  showDualDecision?: boolean;
}

const formatShortDateTime = (isoDate?: string): string => {
  if (!isoDate) return '--/--';
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month} · ${hours}:${minutes}`;
  } catch {
    return isoDate;
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
  ngayHen,
  thoiGianDat,
  daNopCoc,
  daNhanLaiCoc,
  khachHangDongY,
  chuTroDongY,
  liDoHuy,
  coc = 0,
}) => {
  const steps: TimelineStep[] = [];
  const createdTime = formatShortDateTime(thoiGianDat || ngayHen);
  const appointmentTime = formatShortDateTime(ngayHen);

  const effectiveKhachHangDongY =
    status === 'HOAN_THANH' && (khachHangDongY === null || khachHangDongY === undefined)
      ? true
      : khachHangDongY;
  const effectiveChuTroDongY =
    status === 'HOAN_THANH' && (chuTroDongY === null || chuTroDongY === undefined)
      ? true
      : chuTroDongY;

  const hasAnyDecisionAfterViewing =
    Boolean(daNhanLaiCoc) ||
    khachHangDongY !== null && khachHangDongY !== undefined ||
    chuTroDongY !== null && chuTroDongY !== undefined;

  if (status === 'HUY') {
    steps.push({
      id: 'step-1',
      title: 'Bước 1: Gửi yêu cầu đặt lịch xem phòng',
      subtitle: 'Hệ thống đã tiếp nhận phiếu hẹn và gửi thông báo đến Chủ trọ.',
      time: createdTime,
      state: 'completed',
    });

    if (daNopCoc || hasAnyDecisionAfterViewing) {
      steps.push({
        id: 'step-2',
        title: 'Bước 2: Chủ trọ xác nhận lịch hẹn',
        subtitle: 'Chủ trọ đã duyệt khung giờ dẫn xem phòng.',
        time: appointmentTime,
        state: 'completed',
      });
    }

    if (daNopCoc) {
      steps.push({
        id: 'step-3',
        title: 'Bước 3: Nộp cọc giữ chân cho Hệ thống',
        subtitle: `Hệ thống đã tạm giữ ${formatVND(coc)} tiền cọc giữ chân lịch xem.`,
        time: 'Đã nộp cọc',
        state: 'completed',
      });
    }

    if (daNhanLaiCoc) {
      steps.push({
        id: 'step-4',
        title: 'Bước 4: Xem thực tế & Đã nhận lại 100% cọc trực tiếp',
        subtitle: `Chủ trọ đã hoàn trả trực tiếp ${formatVND(coc)} cho khách hàng tại buổi gặp.`,
        time: 'Đã nhận lại cọc',
        state: 'completed',
        constraintBadge: 'Thế chân cọc',
      });
    }

    if (hasAnyDecisionAfterViewing) {
      steps.push({
        id: 'step-5',
        title: 'Bước 5: Quyết định độc lập của Khách hàng & Chủ trọ (Không chốt thuê)',
        subtitle: liDoHuy
          ? `Giao dịch kết thúc không thuê (${liDoHuy}). Hệ thống hoàn trả đủ 100% cọc (${formatVND(coc)}) vào ví Chủ trọ, phí hoa hồng sàn = 0 ₫.`
          : `Ít nhất một bên xác nhận không thuê. Hệ thống hoàn trả đủ 100% cọc (${formatVND(coc)}) vào ví Chủ trọ, phí hoa hồng sàn = 0 ₫.`,
        time: 'Đã hủy thuê',
        state: 'cancelled',
        constraintBadge: 'Sàn thu 0 ₫',
        showDualDecision: true,
      });
    } else {
      steps.push({
        id: 'step-cancel',
        title: 'Lịch hẹn đã bị hủy',
        subtitle: liDoHuy
          ? `Lý do hủy: ${liDoHuy}`
          : 'Lịch hẹn đã bị hủy trước khi hoàn tất xem phòng.',
        time: 'Đã dừng xử lý',
        state: 'cancelled',
      });
    }
  } else if (status === 'HOAN_THANH') {
    steps.push({
      id: 'step-1',
      title: 'Bước 1: Gửi yêu cầu đặt lịch xem phòng',
      subtitle: 'Hệ thống đã tiếp nhận yêu cầu và chuyển thông tin đến Chủ trọ.',
      time: createdTime,
      state: 'completed',
    });
    steps.push({
      id: 'step-2',
      title: 'Bước 2: Chủ trọ xác nhận lịch xem',
      subtitle: 'Chủ trọ đã duyệt khung giờ hẹn xem phòng thực tế.',
      time: appointmentTime,
      state: 'completed',
    });
    steps.push({
      id: 'step-3',
      title: 'Bước 3: Nộp cọc giữ chân lịch xem',
      subtitle: `Khách hàng đã nộp ${formatVND(coc)} cọc giữ chân vào Hệ thống InnFinder.`,
      time: 'Đã tạm giữ',
      state: 'completed',
    });
    steps.push({
      id: 'step-4',
      title: 'Bước 4: Dẫn xem thực tế & Nhận lại 100% cọc trực tiếp',
      subtitle: `Chủ trọ đã trả trực tiếp ${formatVND(coc)} cho khách tại buổi xem; quyền nhận cọc tại sàn chuyển sang Chủ trọ.`,
      time: 'Đã xác nhận',
      state: 'completed',
      constraintBadge: 'Đã nhận lại cọc',
    });
    steps.push({
      id: 'step-5',
      title: 'Bước 5: Cả 2 bên độc lập xác nhận thuê thành công',
      subtitle:
        'Cả Khách hàng và Chủ trọ đều xác nhận đồng ý thuê. Hệ thống trích phí hoa hồng sàn và chuyển phần cọc thế chân còn lại vào ví Chủ trọ.',
      time: 'Hoàn thành',
      state: 'completed',
      constraintBadge: 'Cả 2 bên đồng ý',
      showDualDecision: true,
    });
  } else if (status === 'XAC_NHAN') {
    steps.push({
      id: 'step-1',
      title: 'Bước 1: Gửi yêu cầu đặt lịch xem phòng',
      subtitle: 'Hệ thống đã tiếp nhận phiếu hẹn và gửi đến Chủ trọ.',
      time: createdTime,
      state: 'completed',
    });
    steps.push({
      id: 'step-2',
      title: 'Bước 2: Chủ trọ đã xác nhận lịch xem',
      subtitle: 'Chủ trọ đồng ý lịch hẹn và sẵn sàng dẫn xem phòng.',
      time: appointmentTime,
      state: 'completed',
    });

    if (!daNopCoc) {
      steps.push({
        id: 'step-3',
        title: 'Bước 3: Nộp tiền cọc giữ chân lịch xem',
        subtitle: `Vui lòng nộp khoản cọc ${formatVND(coc)} cho Hệ thống để giữ lịch xem thực tế.`,
        time: 'Đang chờ nộp cọc',
        state: 'active',
        constraintBadge: 'Bắt buộc trước khi xem',
      });
      steps.push({
        id: 'step-4',
        title: 'Bước 4: Gặp xem thực tế & Nhận lại 100% cọc trực tiếp',
        subtitle: 'Chủ trọ hoàn trả trực tiếp 100% tiền cọc tại buổi gặp xem phòng.',
        time: 'Chưa diễn ra',
        state: 'pending',
      });
      steps.push({
        id: 'step-5',
        title: 'Bước 5: Hai bên xác nhận quyết định độc lập',
        subtitle: 'Khách hàng và Chủ trọ độc lập chọn Đồng ý thuê hoặc Không thuê.',
        time: 'Chưa mở khóa',
        state: 'pending',
        showDualDecision: true,
      });
    } else if (!daNhanLaiCoc) {
      steps.push({
        id: 'step-3',
        title: 'Bước 3: Đã nộp cọc giữ chân cho Hệ thống',
        subtitle: `Hệ thống đang tạm giữ ${formatVND(coc)} tiền cọc giữ chân lịch xem.`,
        time: 'Đã nộp cọc',
        state: 'completed',
      });
      steps.push({
        id: 'step-4',
        title: 'Bước 4: Dẫn xem thực tế & Hoàn trả cọc trực tiếp',
        subtitle: `Tại buổi xem phòng, Chủ trọ trực tiếp trả lại 100% cọc (${formatVND(coc)}) cho Khách hàng. Khách bấm "Đã nhận lại cọc từ Chủ trọ" để mở khóa bước quyết định cho cả 2 bên.`,
        time: 'Đang diễn ra',
        state: 'active',
        constraintBadge: 'Cần xác nhận đã nhận lại cọc',
      });
      steps.push({
        id: 'step-5',
        title: 'Bước 5: Quyết định độc lập của Khách hàng & Chủ trọ (Đang khóa)',
        subtitle:
          'Chỉ mở khóa sau khi Khách hàng xác nhận đã nhận lại 100% tiền cọc trực tiếp từ Chủ trọ.',
        time: 'Chờ mở khóa',
        state: 'pending',
        constraintBadge: 'Đang khóa',
        showDualDecision: true,
      });
    } else {
      steps.push({
        id: 'step-3',
        title: 'Bước 3: Đã nộp cọc giữ chân cho Hệ thống',
        subtitle: `Hệ thống tạm giữ ${formatVND(coc)} tiền cọc lịch xem.`,
        time: 'Đã nộp cọc',
        state: 'completed',
      });
      steps.push({
        id: 'step-4',
        title: 'Bước 4: Đã xem phòng & Đã nhận lại 100% cọc trực tiếp',
        subtitle: `Khách hàng đã xác nhận nhận lại đủ ${formatVND(coc)} từ Chủ trọ ngoài đời thực (quyền cọc thế chân chuyển sang Chủ trọ).`,
        time: 'Đã xong',
        state: 'completed',
        constraintBadge: 'Đã mở khóa quyết định',
      });

      const waitingWho =
        (effectiveKhachHangDongY === null || effectiveKhachHangDongY === undefined) &&
        (effectiveChuTroDongY === null || effectiveChuTroDongY === undefined)
          ? 'Chờ cả 2 bên quyết định'
          : effectiveKhachHangDongY === null || effectiveKhachHangDongY === undefined
            ? 'Chờ Khách hàng quyết định'
            : 'Chờ Chủ trọ quyết định';

      steps.push({
        id: 'step-5',
        title: 'Bước 5: Quyết định thuê độc lập (Khách hàng & Chủ trọ)',
        subtitle:
          'Cả 2 bên cùng chọn Đồng ý ➔ Chốt thuê thành công (HOAN_THANH). Có ít nhất 1 bên chọn Không đồng ý ➔ Hủy & hoàn 100% cọc thế chân về ví Chủ trọ (HUY).',
        time: 'Hiện tại',
        state: 'active',
        constraintBadge: waitingWho,
        showDualDecision: true,
      });
    }
  } else {
    steps.push({
      id: 'step-1',
      title: 'Bước 1: Yêu cầu đặt lịch đã được gửi',
      subtitle: 'Hệ thống đã chuyển đầy đủ thông tin phiếu hẹn đến Chủ trọ.',
      time: createdTime,
      state: 'completed',
    });
    steps.push({
      id: 'step-2',
      title: 'Bước 2: Chờ Chủ trọ xác nhận lịch xem',
      subtitle: 'Chủ trọ kiểm tra lịch trống và bấm Xác nhận lịch xem.',
      time: 'Đang chờ duyệt',
      state: 'active',
      constraintBadge: 'Chờ Chủ trọ',
    });
    steps.push({
      id: 'step-3',
      title: 'Bước 3: Nộp cọc giữ chân lịch xem',
      subtitle: `Đặt cọc giữ chân ${formatVND(coc)} qua Hệ thống InnFinder.`,
      time: daNopCoc ? 'Đã nộp cọc' : 'Chờ thực hiện',
      state: daNopCoc ? 'completed' : 'pending',
    });
    steps.push({
      id: 'step-4',
      title: 'Bước 4: Gặp xem thực tế & Nhận lại 100% cọc trực tiếp',
      subtitle: 'Gặp xem phòng đúng hẹn và nhận lại 100% cọc trực tiếp từ Chủ trọ.',
      time: 'Chưa diễn ra',
      state: 'pending',
    });
    steps.push({
      id: 'step-5',
      title: 'Bước 5: Hai bên xác nhận quyết định độc lập',
      subtitle: 'Khách hàng và Chủ trọ độc lập xác nhận thuê hoặc không thuê trên ứng dụng.',
      time: 'Chưa diễn ra',
      state: 'pending',
      showDualDecision: true,
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
                <div className="w-8 h-8 rounded-full border-2 border-[#0088ff] bg-blue-50 text-[#0088ff] flex items-center justify-center shadow-xs animate-pulse">
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
                <div className="flex items-center gap-2 flex-wrap">
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
                  {step.constraintBadge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        step.state === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : step.state === 'active'
                            ? 'bg-blue-100 text-blue-800'
                            : step.state === 'cancelled'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {step.constraintBadge}
                    </span>
                  )}
                </div>

                {step.time && (
                  <span
                    className={`text-xs font-medium whitespace-nowrap ${
                      step.state === 'active'
                        ? 'text-[#0088ff] font-semibold'
                        : step.state === 'cancelled'
                          ? 'text-rose-500'
                          : 'text-slate-400'
                    }`}
                  >
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
                  <div className="flex items-center justify-between gap-2 px-2 py-1 bg-white rounded-lg border border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      Khách hàng:
                    </span>
                    {renderPartyDecisionBadge(
                      effectiveKhachHangDongY,
                      'Đồng ý thuê',
                      'Không thuê',
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 px-2 py-1 bg-white rounded-lg border border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                      <Home className="w-3.5 h-3.5 text-teal-600" />
                      Chủ trọ:
                    </span>
                    {renderPartyDecisionBadge(
                      effectiveChuTroDongY,
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
