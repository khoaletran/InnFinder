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

  if (status === "HUY") {
    // 1. LUỒNG KHI LỊCH HẸN BỊ HỦY
    steps.push({
      id: "step-1",
      title: "Gửi yêu cầu thuê phòng",
      subtitle: "Yêu cầu đặt lịch đã được gửi thành công",
      time: formatDateTime(ngayHen),
      state: "completed",
    });

    if (daNopCoc || daNhanLaiCoc || khachHangDongY !== undefined) {
      steps.push({
        id: "step-2",
        title: "Chủ trọ đã xác nhận lịch hẹn",
        subtitle: "Chủ trọ đã đồng ý lịch xem phòng trước đó",
        time: formatDateTime(ngayHen),
        state: "completed",
      });
    }

    steps.push({
      id: "step-cancel",
      title: "Lịch hẹn đã bị hủy",
      subtitle: liDoHuy
        ? `Lý do: ${liDoHuy}`
        : "Lịch hẹn xem phòng đã bị hủy bởi người dùng hoặc chủ trọ",
      time: "Đã dừng xử lý",
      state: "cancelled",
    });

    if (coc && coc > 0 && daNopCoc) {
      steps.push({
        id: "step-refund",
        title: "Hoàn trả tiền cọc giữ chân",
        subtitle: `100% tiền cọc (${formatCurrency(coc)}) đã được hoàn trả nguyên vẹn về ví của bạn`,
        time: "Đã hoàn tất",
        state: "completed",
      });
    }
  } else if (status === "HOAN_THANH") {
    // 2. LUỒNG KHI HOÀN TẤT THUÊ PHÒNG
    steps.push({
      id: "step-1",
      title: "Gửi yêu cầu thuê phòng",
      subtitle: "Yêu cầu đặt lịch đã được gửi thành công",
      time: formatDateTime(ngayHen),
      state: "completed",
    });
    steps.push({
      id: "step-2",
      title: "Chủ trọ đã xác nhận lịch hẹn",
      subtitle: "Chủ trọ đã đồng ý lịch xem phòng",
      time: formatDateTime(ngayHen),
      state: "completed",
    });
    steps.push({
      id: "step-3",
      title: "Xem phòng & Nhận lại cọc",
      subtitle: `Buổi xem phòng kết thúc, chủ trọ đã hoàn trả 100% cọc (${formatCurrency(coc || 0)}) trực tiếp`,
      time: "Đã xong",
      state: "completed",
    });
    steps.push({
      id: "step-4",
      title: "Chốt hợp đồng thuê thành công",
      subtitle: "Cả hai bên đã xác nhận hoàn tất thuê phòng",
      time: "Hoàn tất",
      state: "completed",
    });
  } else if (status === "XAC_NHAN") {
    // 3. LUỒNG KHI CHỦ TRỌ ĐÃ DUYỆT (ĐANG XỬ LÝ NỘP CỌC / GẶP MẶT)
    steps.push({
      id: "step-1",
      title: "Gửi yêu cầu thuê phòng",
      subtitle: "Yêu cầu đặt lịch đã được gửi thành công",
      time: formatDateTime(ngayHen),
      state: "completed",
    });
    steps.push({
      id: "step-2",
      title: "Chủ trọ đã xác nhận lịch hẹn",
      subtitle: "Chủ trọ đã duyệt lịch xem phòng",
      time: formatDateTime(ngayHen),
      state: "completed",
    });

    if (!daNopCoc) {
      steps.push({
        id: "step-3",
        title: "Nộp tiền cọc giữ chân",
        subtitle: `Vui lòng nộp cọc ${formatCurrency(coc || 0)} để giữ phòng và hoàn tất lịch xem`,
        time: "Đang chờ nộp cọc",
        state: "active",
      });
      steps.push({
        id: "step-4",
        title: "Xác nhận kết quả thuê phòng",
        subtitle: "Đưa ra quyết định thuê phòng sau khi xem thực tế",
        time: "Chưa diễn ra",
        state: "pending",
      });
    } else if (!daNhanLaiCoc) {
      steps.push({
        id: "step-3",
        title: "Đã nộp cọc - Chờ xem phòng",
        subtitle: "Hãy đến xem phòng đúng giờ. Chủ trọ sẽ trả lại 100% cọc trực tiếp khi gặp mặt",
        time: "Sẵn sàng xem phòng",
        state: "active",
      });
      steps.push({
        id: "step-4",
        title: "Xác nhận kết quả thuê phòng",
        subtitle: "Đưa ra quyết định thuê phòng sau khi xem thực tế",
        time: "Chưa diễn ra",
        state: "pending",
      });
    } else {
      steps.push({
        id: "step-3",
        title: "Đã xem phòng & Nhận lại cọc",
        subtitle: "Bạn đã nhận lại 100% tiền cọc trực tiếp từ chủ trọ",
        time: "Đã xong",
        state: "completed",
      });

      if (khachHangDongY === null || khachHangDongY === undefined) {
        steps.push({
          id: "step-4",
          title: "Xác nhận kết quả thuê phòng",
          subtitle: "Vui lòng chọn Thuê phòng hoặc Không thuê",
          time: "Đang chờ quyết định",
          state: "active",
        });
      } else if (khachHangDongY === true) {
        steps.push({
          id: "step-4",
          title: "Đã chọn Thuê phòng",
          subtitle: "Đang chờ Chủ trọ chốt quyết định cho thuê",
          time: "Đang chờ chủ trọ",
          state: "active",
        });
      } else {
        steps.push({
          id: "step-4",
          title: "Đã chọn Không thuê",
          subtitle: "Bạn đã từ chối thuê phòng này",
          time: "Đã dừng",
          state: "cancelled",
        });
      }
    }
  } else {
    // 4. LUỒNG CHO_XAC_NHAN
    steps.push({
      id: "step-1",
      title: "Gửi yêu cầu thuê phòng",
      subtitle: "Yêu cầu đã được gửi tới chủ trọ",
      time: formatDateTime(ngayHen),
      state: "completed",
    });
    steps.push({
      id: "step-2",
      title: "Chờ chủ trọ phản hồi",
      subtitle: "Đang chờ chủ trọ xác nhận lịch hẹn xem phòng",
      time: "Đang xử lý...",
      state: "active",
    });
    steps.push({
      id: "step-3",
      title: "Nộp cọc & Xem phòng thực tế",
      subtitle: "Nộp cọc giữ chân sau khi chủ trọ đồng ý",
      time: "Chưa diễn ra",
      state: "pending",
    });
    steps.push({
      id: "step-4",
      title: "Hoàn tất nhận phòng",
      subtitle: "Nhận bàn giao phòng trọ thành công",
      time: "Chưa diễn ra",
      state: "pending",
    });
  }

  return (
    <View className="mt-2">
      <Text className="text-base font-bold text-slate-900 mb-4">
        Tiến độ xử lý
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
                        ? "text-teal-600"
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
