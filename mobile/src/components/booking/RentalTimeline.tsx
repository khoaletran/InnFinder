import React from "react";
import { View, Text } from "react-native";
import { TrangThaiDatLich } from "../../types/booking.types";

export interface RentalTimelineProps {
  status: TrangThaiDatLich;
  ngayHen: string;
}

const formatDateTime = (isoDate: string): string => {
  try {
    const d = new Date(isoDate);
    const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    const date = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    return `${date} ${time}`;
  } catch {
    return isoDate;
  }
};

export const RentalTimeline: React.FC<RentalTimelineProps> = ({
  status,
  ngayHen,
}) => {
  const isPending = status === "CHO_XAC_NHAN";
  const isConfirmed = status === "XAC_NHAN" || status === "HOAN_THANH";
  const isCompleted = status === "HOAN_THANH";

  return (
    <View className="mt-2">
      <Text className="text-base font-bold text-slate-900 mb-4">
        Tiến độ xử lý
      </Text>

      {/* Bước 1: Gửi yêu cầu thuê */}
      <View className="flex-row">
        <View className="items-center mr-3">
          <View className="w-3.5 h-3.5 rounded-full bg-teal-600" />
          <View className="w-[2px] h-12 bg-teal-600" />
        </View>
        <View className="flex-1 pb-4">
          <Text className="text-sm font-bold text-slate-900">
            Gửi yêu cầu thuê
          </Text>
          <Text className="text-xs text-slate-500 mt-0.5">
            Yêu cầu đã được gửi tới chủ trọ
          </Text>
          <Text className="text-xs text-slate-400 mt-1">
            {formatDateTime(ngayHen)}
          </Text>
        </View>
      </View>

      {/* Bước 2: Chờ chủ trọ phản hồi */}
      <View className="flex-row">
        <View className="items-center mr-3">
          <View
            className={`w-3.5 h-3.5 rounded-full ${
              isConfirmed
                ? "bg-teal-600"
                : isPending
                  ? "border-2 border-teal-600 bg-white"
                  : "bg-slate-200"
            }`}
          />
          <View
            className={`w-[2px] h-12 ${isConfirmed ? "bg-teal-600" : "bg-slate-200"}`}
          />
        </View>
        <View className="flex-1 pb-4">
          <Text
            className={`text-sm font-bold ${
              isPending || isConfirmed ? "text-slate-900" : "text-slate-400"
            }`}
          >
            Chờ chủ trọ phản hồi
          </Text>
          <Text className="text-xs text-slate-500 mt-0.5">
            {isConfirmed
              ? "Chủ trọ đã xác nhận lịch hẹn"
              : "Đang chờ chủ trọ xác nhận lịch hẹn"}
          </Text>
          <Text className="text-xs text-slate-400 mt-1">
            {isConfirmed ? formatDateTime(ngayHen) : "--"}
          </Text>
        </View>
      </View>

      {/* Bước 3: Xác nhận thuê phòng */}
      <View className="flex-row">
        <View className="items-center mr-3">
          <View
            className={`w-3.5 h-3.5 rounded-full ${
              isCompleted
                ? "bg-teal-600"
                : isConfirmed
                  ? "border-2 border-teal-600 bg-white"
                  : "bg-slate-200"
            }`}
          />
          <View
            className={`w-[2px] h-12 ${isCompleted ? "bg-teal-600" : "bg-slate-200"}`}
          />
        </View>
        <View className="flex-1 pb-4">
          <Text
            className={`text-sm font-bold ${
              isConfirmed ? "text-slate-900" : "text-slate-400"
            }`}
          >
            Xác nhận thuê phòng
          </Text>
          <Text className="text-xs text-slate-500 mt-0.5">
            Xác nhận kết quả sau khi xem phòng
          </Text>
          <Text className="text-xs text-slate-400 mt-1">--</Text>
        </View>
      </View>

      {/* Bước 4: Hoàn tất nhận phòng */}
      <View className="flex-row">
        <View className="items-center mr-3">
          <View
            className={`w-3.5 h-3.5 rounded-full ${
              isCompleted ? "bg-teal-600" : "bg-slate-200"
            }`}
          />
        </View>
        <View className="flex-1">
          <Text
            className={`text-sm font-bold ${
              isCompleted ? "text-slate-900" : "text-slate-400"
            }`}
          >
            Hoàn tất nhận phòng
          </Text>
          <Text className="text-xs text-slate-500 mt-0.5">
            Nhận bàn giao phòng trọ thành công
          </Text>
          <Text className="text-xs text-slate-400 mt-1">--</Text>
        </View>
      </View>
    </View>
  );
};
