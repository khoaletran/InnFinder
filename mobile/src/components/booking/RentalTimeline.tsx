import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TrangThaiDatLich } from "../../types/booking.types";

export interface RentalTimelineProps {
  status: TrangThaiDatLich;
  ngayHen: string;
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
}

const formatDateTime = (isoDate?: string): string => {
  if (!isoDate) return "--/--/----";
  try {
    const d = new Date(isoDate);
    const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    const date = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    return `${date} ${time}`;
  } catch {
    return isoDate;
  }
};

const formatCurrency = (amount?: number): string => {
  if (!amount) return "0 đ";
  return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
};

export const RentalTimeline: React.FC<RentalTimelineProps> = ({
  status,
  ngayHen,
  daNopCoc,
  daNhanLaiCoc,
  khachHangDongY,
  chuTroDongY,
  liDoHuy,
  coc,
}) => {
  const steps: TimelineStep[] = [];
  const cocAmount = coc || 200000;

  if (status === "HUY") {
    // 1. LUỒNG KHI LỊCH HẸN BỊ HỦY
    steps.push({
      id: "step-1",
      title: "Bước 1: Gửi yêu cầu đặt lịch xem phòng",
      subtitle: "Hệ thống đã tiếp nhận yêu cầu đặt lịch hẹn.",
      time: formatDateTime(ngayHen),
      state: "completed",
    });

    if (daNopCoc) {
      steps.push({
        id: "step-2",
        title: "Bước 2: Nộp cọc giữ chân cho Hệ thống",
        subtitle: `Hệ thống đã tạm giữ ${formatCurrency(cocAmount)} tiền cọc giữ chân.`,
        time: "Đã nộp cọc",
        state: "completed",
      });
    }

    if (daNopCoc && (daNhanLaiCoc || khachHangDongY !== undefined || chuTroDongY !== undefined)) {
      steps.push({
        id: "step-3",
        title: "Bước 3: Chủ trọ xác nhận lịch hẹn",
        subtitle: "Chủ trọ đã đồng ý lịch xem phòng trước đó.",
        time: formatDateTime(ngayHen),
        state: "completed",
      });
    }

    if (daNhanLaiCoc) {
      steps.push({
        id: "step-4",
        title: "Bước 4: Xem thực tế & Nhận lại 100% cọc trực tiếp",
        subtitle: `Chủ trọ đã hoàn trả trực tiếp ${formatCurrency(cocAmount)} cho khách hàng tại buổi gặp.`,
        time: "Đã nhận lại cọc",
        state: "completed",
      });
    }

    steps.push({
      id: "step-cancel",
      title: "Lịch hẹn đã kết thúc / bị hủy",
      subtitle: liDoHuy
        ? `Lý do: ${liDoHuy}`
        : "Lịch hẹn xem phòng đã bị hủy bởi người dùng hoặc chủ trọ.",
      time: "Đã dừng xử lý",
      state: "cancelled",
    });

    if (cocAmount > 0 && daNopCoc && !daNhanLaiCoc) {
      steps.push({
        id: "step-refund",
        title: "Hoàn trả tiền cọc giữ chân",
        subtitle: `100% tiền cọc (${formatCurrency(cocAmount)}) đã được hoàn trả nguyên vẹn về ví của bạn.`,
        time: "Đã hoàn tất",
        state: "completed",
      });
    }
  } else if (status === "HOAN_THANH") {
    // 2. LUỒNG KHI HOÀN TẤT THUÊ PHÒNG (Swimlane 2.3)
    steps.push({
      id: "step-1",
      title: "Bước 1: Gửi yêu cầu đặt lịch xem phòng",
      subtitle: "Hệ thống đã tiếp nhận yêu cầu đặt lịch hẹn.",
      time: formatDateTime(ngayHen),
      state: "completed",
    });
    steps.push({
      id: "step-2",
      title: "Bước 2: Nộp cọc giữ chân cho Hệ thống",
      subtitle: `Đã nộp ${formatCurrency(cocAmount)} cọc giữ chân qua Hệ thống InnFinder.`,
      time: "Đã nộp cọc",
      state: "completed",
    });
    steps.push({
      id: "step-3",
      title: "Bước 3: Chủ trọ xác nhận lịch hẹn",
      subtitle: "Chủ trọ đã duyệt lịch xem phòng.",
      time: formatDateTime(ngayHen),
      state: "completed",
    });
    steps.push({
      id: "step-4",
      title: "Bước 4: Xem thực tế & Nhận lại 100% cọc trực tiếp",
      subtitle: `Chủ trọ đã hoàn trả 100% cọc (${formatCurrency(cocAmount)}) trực tiếp cho khách khi gặp mặt.`,
      time: "Đã nhận lại cọc",
      state: "completed",
    });
    steps.push({
      id: "step-5",
      title: "Bước 5: Chốt thuê thành công",
      subtitle: "Cả hai bên đã xác nhận đồng ý thuê. Hệ thống đã trích phí hoa hồng và chuyển cọc thế chân cho Chủ trọ.",
      time: "Hoàn tất",
      state: "completed",
    });
  } else if (status === "XAC_NHAN") {
    // 3. LUỒNG KHI CHỦ TRỌ ĐÃ XÁC NHẬN (XAC_NHAN)
    steps.push({
      id: "step-1",
      title: "Bước 1: Gửi yêu cầu đặt lịch xem phòng",
      subtitle: "Hệ thống đã tiếp nhận yêu cầu đặt lịch hẹn.",
      time: formatDateTime(ngayHen),
      state: "completed",
    });
    steps.push({
      id: "step-2",
      title: "Bước 2: Nộp cọc giữ chân cho Hệ thống",
      subtitle: `Đã nộp ${formatCurrency(cocAmount)} cọc giữ chân qua Hệ thống InnFinder.`,
      time: "Đã nộp cọc",
      state: "completed",
    });
    steps.push({
      id: "step-3",
      title: "Bước 3: Chủ trọ đã xác nhận lịch xem",
      subtitle: "Chủ trọ đã duyệt lịch xem phòng.",
      time: formatDateTime(ngayHen),
      state: "completed",
    });

    if (!daNhanLaiCoc) {
      steps.push({
        id: "step-4",
        title: "Bước 4: Dẫn xem thực tế & Hoàn trả cọc trực tiếp",
        subtitle: `Tại buổi xem phòng, Chủ trọ trực tiếp trả lại 100% cọc (${formatCurrency(cocAmount)}) cho bạn. Bấm xác nhận đã nhận cọc để mở khóa quyết định.`,
        time: "Đang diễn ra",
        state: "active",
      });
      steps.push({
        id: "step-5",
        title: "Bước 5: Quyết định độc lập của hai bên",
        subtitle: "Chỉ mở khóa sau khi khách hàng xác nhận đã nhận lại 100% cọc trực tiếp từ Chủ trọ.",
        time: "Chờ mở khóa",
        state: "pending",
      });
    } else {
      steps.push({
        id: "step-4",
        title: "Bước 4: Đã xem phòng & Nhận lại 100% cọc trực tiếp",
        subtitle: `Bạn đã nhận lại đủ ${formatCurrency(cocAmount)} trực tiếp từ Chủ trọ ngoài đời thực.`,
        time: "Đã nhận lại cọc",
        state: "completed",
      });

      if (khachHangDongY === null || khachHangDongY === undefined) {
        steps.push({
          id: "step-5",
          title: "Bước 5: Quyết định độc lập của hai bên",
          subtitle: "Vui lòng chọn Đồng ý thuê hoặc Không thuê phòng.",
          time: "Đang chờ quyết định",
          state: "active",
        });
      } else if (khachHangDongY === true) {
        steps.push({
          id: "step-5",
          title: "Bước 5: Bạn đã chọn Đồng ý thuê",
          subtitle: "Đang chờ Chủ trọ chốt quyết định cho thuê độc lập.",
          time: "Đang chờ Chủ trọ",
          state: "active",
        });
      } else {
        steps.push({
          id: "step-5",
          title: "Bước 5: Bạn đã chọn Không thuê",
          subtitle: "Bạn đã từ chối thuê phòng này.",
          time: "Đã từ chối",
          state: "cancelled",
        });
      }
    }
  } else {
    // 4. LUỒNG CHO_XAC_NHAN
    steps.push({
      id: "step-1",
      title: "Bước 1: Gửi yêu cầu đặt lịch xem phòng",
      subtitle: "Hệ thống đã tiếp nhận yêu cầu đặt lịch hẹn.",
      time: formatDateTime(ngayHen),
      state: "completed",
    });

    if (daNopCoc) {
      steps.push({
        id: "step-2",
        title: "Bước 2: Nộp cọc giữ chân cho Hệ thống",
        subtitle: `Đã nộp ${formatCurrency(cocAmount)} cọc giữ chân qua Hệ thống InnFinder.`,
        time: "Đã nộp cọc",
        state: "completed",
      });
      steps.push({
        id: "step-3",
        title: "Bước 3: Chờ Chủ trọ xác nhận lịch xem",
        subtitle: "Chủ trọ đang kiểm tra lịch trống để duyệt lịch hẹn.",
        time: "Đang chờ duyệt",
        state: "active",
      });
    } else {
      steps.push({
        id: "step-2",
        title: "Bước 2: Nộp cọc giữ chân cho Hệ thống",
        subtitle: `Vui lòng đặt cọc giữ chân ${formatCurrency(cocAmount)} qua Hệ thống InnFinder để Chủ trọ duyệt lịch.`,
        time: "Chờ nộp cọc",
        state: "active",
      });
      steps.push({
        id: "step-3",
        title: "Bước 3: Chờ Chủ trọ xác nhận lịch xem",
        subtitle: "Sẽ mở khóa sau khi khách hàng nộp cọc giữ chân.",
        time: "Chưa mở khóa",
        state: "pending",
      });
    }

    steps.push({
      id: "step-4",
      title: "Bước 4: Dẫn xem thực tế & Hoàn trả cọc trực tiếp",
      subtitle: "Gặp xem phòng đúng hẹn và nhận lại 100% cọc trực tiếp từ Chủ trọ.",
      time: "Chưa diễn ra",
      state: "pending",
    });
    steps.push({
      id: "step-5",
      title: "Bước 5: Quyết định độc lập của hai bên",
      subtitle: "Khách hàng và Chủ trọ độc lập xác nhận thuê trên ứng dụng.",
      time: "Chưa diễn ra",
      state: "pending",
    });
  }

  return (
    <View className="mt-2">
      <Text className="text-base font-bold text-slate-900 mb-4">
        Tiến trình Swimlane Khép kín
      </Text>

      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;

        let dotElement: React.ReactNode;
        let lineClass = "w-[2px] bg-slate-200 flex-1 my-1";

        if (step.state === "completed") {
          dotElement = (
            <View className="w-5 h-5 rounded-full bg-teal-600 items-center justify-center">
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            </View>
          );
          lineClass = "w-[2px] bg-teal-600 flex-1 my-1";
        } else if (step.state === "active") {
          dotElement = (
            <View className="w-5 h-5 rounded-full border-2 border-teal-600 bg-teal-50 items-center justify-center">
              <View className="w-2 h-2 rounded-full bg-teal-600" />
            </View>
          );
          lineClass = "w-[2px] bg-slate-200 flex-1 my-1";
        } else if (step.state === "cancelled") {
          dotElement = (
            <View className="w-5 h-5 rounded-full bg-rose-500 items-center justify-center">
              <Ionicons name="close" size={12} color="#FFFFFF" />
            </View>
          );
          lineClass = "w-[2px] bg-rose-200 flex-1 my-1";
        } else {
          dotElement = (
            <View className="w-5 h-5 rounded-full bg-slate-200 items-center justify-center">
              <View className="w-2 h-2 rounded-full bg-slate-300" />
            </View>
          );
          lineClass = "w-[2px] bg-slate-200 flex-1 my-1";
        }

        return (
          <View key={step.id} className="flex-row">
            {/* Cột hiển thị icon và đường nối */}
            <View className="items-center mr-3.5">
              {dotElement}
              {!isLast && <View className={lineClass} style={{ minHeight: 36 }} />}
            </View>

            {/* Nội dung thông tin bước */}
            <View className={`flex-1 ${isLast ? "pb-1" : "pb-5"}`}>
              <Text
                className={`text-sm font-bold ${
                  step.state === "cancelled"
                    ? "text-rose-600"
                    : step.state === "pending"
                      ? "text-slate-400"
                      : "text-slate-900"
                }`}
              >
                {step.title}
              </Text>
              <Text
                className={`text-xs mt-0.5 leading-4 ${
                  step.state === "cancelled"
                    ? "text-rose-500"
                    : step.state === "pending"
                      ? "text-slate-400"
                      : "text-slate-600"
                }`}
              >
                {step.subtitle}
              </Text>
              {step.time && (
                <Text
                  className={`text-[11px] mt-1 font-medium ${
                    step.state === "cancelled"
                      ? "text-rose-400"
                      : step.state === "active"
                        ? "text-teal-600 font-bold"
                        : "text-slate-400"
                  }`}
                >
                  {step.time}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};
