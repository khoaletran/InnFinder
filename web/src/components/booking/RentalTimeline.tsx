import React from "react";
import { Check, Clock, X } from "lucide-react";
import type { TrangThaiDatLich } from "../../types/booking.types";
import { formatVND } from "../../utils/formatVND";

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
  state: "completed" | "active" | "pending" | "cancelled";
  constraintBadge?: string;
}

const formatDateTime = (isoDate?: string): string => {
  if (!isoDate) return "--/--";
  try {
    const d = new Date(isoDate);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month} · ${hours}:${minutes}`;
  } catch {
    return isoDate;
  }
};

export const RentalTimeline: React.FC<RentalTimelineProps> = ({
  status,
  ngayHen,
  thoiGianDat,
  daNopCoc,
  daNhanLaiCoc,
  khachHangDongY,
  chuTroDongY: _chuTroDongY,
  liDoHuy,
  coc = 0,
}) => {
  const steps: TimelineStep[] = [];

  const createdTime = formatDateTime(thoiGianDat || ngayHen);
  const appointmentTime = formatDateTime(ngayHen);

  if (status === "HUY") {
    // 1. Luồng khi lịch bị hủy
    steps.push({
      id: "step-1",
      title: "Yêu cầu đã được gửi",
      subtitle: "Hệ thống đã tiếp nhận và chuyển thông tin đến chủ trọ.",
      time: createdTime,
      state: "completed",
    });

    if (daNopCoc || daNhanLaiCoc || khachHangDongY !== undefined) {
      steps.push({
        id: "step-2",
        title: "Chủ trọ đã xác nhận lịch hẹn",
        subtitle: "Chủ trọ đã duyệt lịch xem phòng trước khi có quyết định hủy.",
        time: appointmentTime,
        state: "completed",
      });
    }

    steps.push({
      id: "step-cancel",
      title: "Lịch hẹn đã bị hủy",
      subtitle: liDoHuy ? `Lý do hủy: ${liDoHuy}` : "Lịch hẹn đã hủy bởi khách hoặc chủ trọ.",
      time: "Đã dừng xử lý",
      state: "cancelled",
    });

    if (coc > 0 && daNopCoc) {
      steps.push({
        id: "step-refund",
        title: "Xử lý hoàn trả tiền cọc giữ chân",
        subtitle: `100% tiền cọc (${formatVND(coc)}) được bảo lưu hoàn tất theo quy chế bảo đảm quyền lợi của InnFinder.`,
        time: "Đã xử lý",
        state: "completed",
      });
    }
  } else if (status === "HOAN_THANH") {
    // 2. Luồng hoàn thành toàn bộ Swimlane
    steps.push({
      id: "step-1",
      title: "Yêu cầu đã được gửi",
      subtitle: "Hệ thống đã chuyển đầy đủ thông tin đến chủ trọ.",
      time: createdTime,
      state: "completed",
    });
    steps.push({
      id: "step-2",
      title: "Chủ trọ đã xác nhận lịch",
      subtitle: "Chủ trọ đã mở yêu cầu, xem hồ sơ khách và duyệt khung giờ xem phòng.",
      time: appointmentTime,
      state: "completed",
    });
    steps.push({
      id: "step-3",
      title: "Xem phòng thực tế & Nhận lại 100% cọc",
      subtitle: `Hai bên đã gặp mặt dẫn xem phòng thực tế. Chủ trọ đã hoàn trả 100% cọc (${formatVND(coc)}) trực tiếp ngoài đời.`,
      time: "Đã xác nhận",
      state: "completed",
      constraintBadge: "Đã nhận lại cọc",
    });
    steps.push({
      id: "step-4",
      title: "Chốt hợp đồng thuê thành công",
      subtitle: "Cả hai bên độc lập xác nhận đồng ý thuê phòng. Giao dịch thành công, sàn hoàn tất trích phí dịch vụ.",
      time: "Hoàn tất",
      state: "completed",
      constraintBadge: "Cả 2 bên đồng ý",
    });
  } else if (status === "XAC_NHAN") {
    // 3. Luồng đang xử lý gặp mặt / nhận cọc / ra quyết định
    steps.push({
      id: "step-1",
      title: "Yêu cầu đã được gửi",
      subtitle: "Hệ thống đã chuyển đầy đủ thông tin đến chủ trọ.",
      time: createdTime,
      state: "completed",
    });
    steps.push({
      id: "step-2",
      title: "Chủ trọ đã duyệt lịch xem",
      subtitle: "Chủ trọ đã đồng ý lịch hẹn và sẵn sàng đón tiếp khách.",
      time: appointmentTime,
      state: "completed",
    });

    if (!daNopCoc) {
      steps.push({
        id: "step-3",
        title: "Nộp tiền cọc giữ chân",
        subtitle: `Vui lòng nộp khoản cọc ${formatVND(coc)} để giữ phòng và đảm bảo quyền lợi khi gặp xem thực tế.`,
        time: "Đang chờ nộp cọc",
        state: "active",
        constraintBadge: "Bắt buộc trước khi xem",
      });
      steps.push({
        id: "step-4",
        title: "Chờ xác nhận thuê / Quyết định",
        subtitle: "Đưa ra quyết định thuê phòng sau khi xem thực tế.",
        time: "Chưa diễn ra",
        state: "pending",
      });
    } else if (!daNhanLaiCoc) {
      steps.push({
        id: "step-3",
        title: "Gặp xem thực tế & Hoàn trả cọc trực tiếp",
        subtitle: `Chủ trọ sẽ dẫn xem phòng và trực tiếp hoàn trả 100% tiền cọc (${formatVND(coc)}) cho bạn ngoài đời (tiền mặt / CK cá nhân). Bạn cần bấm "Đã nhận lại cọc" để mở khóa bước quyết định.`,
        time: "Đang diễn ra",
        state: "active",
        constraintBadge: "Ràng buộc Swimlane: Cần nhận cọc trước",
      });
      steps.push({
        id: "step-4",
        title: "Chờ xác nhận thuê (Khóa tạm thời)",
        subtitle: "Quyền chọn [Thuê] / [Không thuê] sẽ mở khóa ngay sau khi bạn xác nhận đã nhận lại cọc từ Chủ trọ.",
        time: "Chờ mở khóa",
        state: "pending",
        constraintBadge: "Đang khóa",
      });
    } else {
      steps.push({
        id: "step-3",
        title: "Đã xem phòng & Đã nhận lại 100% cọc",
        subtitle: `Bạn đã xác nhận nhận lại đủ ${formatVND(coc)} tiền cọc từ chủ trọ ngoài đời thực.`,
        time: "Đã xong",
        state: "completed",
        constraintBadge: "Đã mở khóa quyết định",
      });

      if (khachHangDongY === null || khachHangDongY === undefined) {
        steps.push({
          id: "step-4",
          title: "Chờ xác nhận thuê",
          subtitle: "Vui lòng bấm [Xác nhận thuê] nếu ưng ý phòng hoặc [Xác nhận không thuê] nếu không phù hợp.",
          time: "Hiện tại",
          state: "active",
          constraintBadge: "Cần bạn quyết định",
        });
      } else if (khachHangDongY === true) {
        steps.push({
          id: "step-4",
          title: "Đã chọn: Đồng ý thuê phòng",
          subtitle: "Bạn đã xác nhận thuê. Hệ thống đang chờ Chủ trọ đưa ra quyết định độc lập để hoàn tất.",
          time: "Đang chờ chủ trọ",
          state: "active",
          constraintBadge: "Chờ chủ trọ",
        });
      } else {
        steps.push({
          id: "step-4",
          title: "Đã chọn: Không thuê",
          subtitle: "Bạn đã từ chối thuê phòng này. Hệ thống bảo lưu quyền lợi và hoàn tất quy trình.",
          time: "Đã dừng",
          state: "cancelled",
        });
      }
    }
  } else {
    // 4. Luồng CHO_XAC_NHAN
    steps.push({
      id: "step-1",
      title: "Yêu cầu đã được gửi",
      subtitle: "Hệ thống đã chuyển đầy đủ thông tin đến chủ trọ.",
      time: createdTime,
      state: "completed",
    });
    steps.push({
      id: "step-2",
      title: "Chờ chủ trọ xem & phản hồi",
      subtitle: "Chủ trọ thường phản hồi trong vòng 2 giờ làm việc.",
      time: "Đang xử lý...",
      state: "active",
      constraintBadge: "Chờ duyệt",
    });
    steps.push({
      id: "step-3",
      title: "Gặp xem thực tế & Nhận lại cọc",
      subtitle: "Gặp mặt xem phòng đúng hẹn và nhận lại 100% tiền cọc trực tiếp ngoài đời.",
      time: "Chưa diễn ra",
      state: "pending",
    });
    steps.push({
      id: "step-4",
      title: "Chờ xác nhận thuê",
      subtitle: "Độc lập quyết định thuê sau khi xem phòng.",
      time: "Chưa diễn ra",
      state: "pending",
    });
  }

  return (
    <div className="space-y-0">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="relative flex gap-4 items-start">
            {/* Đường nối dọc */}
            {!isLast && (
              <div
                className={`absolute left-[15px] top-[26px] bottom-0 w-[2px] -ml-[1px] ${
                  step.state === "completed"
                    ? "bg-emerald-500"
                    : step.state === "cancelled"
                    ? "bg-rose-300"
                    : "bg-slate-200"
                }`}
              />
            )}

            {/* Icon trạng thái */}
            <div className="relative z-10 flex-shrink-0 mt-0.5">
              {step.state === "completed" && (
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                  <Check className="w-4 h-4 stroke-[2.5]" />
                </div>
              )}
              {step.state === "active" && (
                <div className="w-8 h-8 rounded-full border-2 border-[#0088ff] bg-blue-50 text-[#0088ff] flex items-center justify-center shadow-xs animate-pulse">
                  <Clock className="w-4 h-4 stroke-[2.2]" />
                </div>
              )}
              {step.state === "cancelled" && (
                <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs">
                  <X className="w-4 h-4 stroke-[2.5]" />
                </div>
              )}
              {step.state === "pending" && (
                <div className="w-8 h-8 rounded-full border border-slate-300 bg-slate-100 text-slate-400 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                </div>
              )}
            </div>

            {/* Nội dung bước */}
            <div className={`flex-1 min-w-0 ${isLast ? "pb-2" : "pb-6"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4
                    className={`text-sm font-bold ${
                      step.state === "cancelled"
                        ? "text-rose-600"
                        : step.state === "pending"
                        ? "text-slate-400"
                        : "text-slate-900"
                    }`}
                  >
                    {step.title}
                  </h4>
                  {step.constraintBadge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        step.state === "completed"
                          ? "bg-emerald-100 text-emerald-800"
                          : step.state === "active"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {step.constraintBadge}
                    </span>
                  )}
                </div>

                {step.time && (
                  <span
                    className={`text-xs font-medium whitespace-nowrap ${
                      step.state === "active"
                        ? "text-[#0088ff] font-semibold"
                        : step.state === "cancelled"
                        ? "text-rose-500"
                        : "text-slate-400"
                    }`}
                  >
                    {step.time}
                  </span>
                )}
              </div>

              <p
                className={`text-xs mt-1 leading-relaxed ${
                  step.state === "cancelled"
                    ? "text-rose-500"
                    : step.state === "pending"
                    ? "text-slate-400"
                    : "text-slate-600"
                }`}
              >
                {step.subtitle}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RentalTimeline;
