import React from "react";
import { View, Text } from "react-native";
import { TrangThaiDatLich } from "../../types/booking.types";

export interface RentalProgressBarProps {
  status: TrangThaiDatLich;
}

// 4 bước cố định theo thiết kế
const STEPS = [
  { key: "GUI", label: "Gửi" },
  { key: "CHO_XAC_NHAN", label: "Chờ" },
  { key: "XAC_NHAN", label: "Xác nhận" },
  { key: "HOAN_THANH", label: "Hoàn tất" },
];

// Chuyển Enum backend sang chỉ số bước (0, 1, 2, 3)
const getActiveStepIndex = (status: TrangThaiDatLich): number => {
  switch (status) {
    case "CHO_XAC_NHAN":
      return 1;
    case "XAC_NHAN":
      return 2;
    case "HOAN_THANH":
      return 3;
    case "HUY":
    default:
      return 0;
  }
};

export const RentalProgressBar: React.FC<RentalProgressBarProps> = ({
  status,
}) => {
  const activeIndex = getActiveStepIndex(status);

  return (
    <View className="w-full mt-2">
      {/* Hàng vạch nối và các chấm tròn */}
      <View className="flex-row items-center justify-between relative px-2">
        {/* Đường kẻ ngang xám nền */}
        <View className="absolute left-6 right-6 top-[7px] h-[2px] bg-slate-200" />

        {/* Đường kẻ xanh cho đoạn đã hoàn thành */}
        <View
          className="absolute left-6 top-[7px] h-[2px] bg-teal-600"
          style={{ width: `${(activeIndex / (STEPS.length - 1)) * 88}%` }}
        />

        {STEPS.map((step, index) => {
          const isPassed = index < activeIndex;
          const isCurrent = index === activeIndex;

          return (
            <View key={step.key} className="items-center z-10">
              {/* Chấm tròn: Đã qua -> đặc teal; Hiện tại -> viền teal ruột trắng; Chưa tới -> chấm xám */}
              {isPassed ? (
                <View className="w-4 h-4 rounded-full bg-teal-600" />
              ) : isCurrent ? (
                <View className="w-4 h-4 rounded-full border-2 border-teal-600 bg-white" />
              ) : (
                <View className="w-3.5 h-3.5 rounded-full bg-slate-200" />
              )}
            </View>
          );
        })}
      </View>

      {/* Hàng nhãn tên bước */}
      <View className="flex-row justify-between mt-1.5 px-0.5">
        {STEPS.map((step, index) => {
          const isCurrent = index === activeIndex;
          return (
            <Text
              key={step.key}
              className={`text-xs ${
                isCurrent
                  ? "text-teal-700 font-bold"
                  : "text-slate-400 font-medium"
              }`}
            >
              {step.label}
            </Text>
          );
        })}
      </View>
    </View>
  );
};
