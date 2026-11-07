import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

export interface TimeSlotPickerProps {
  selectedTime: string;
  onSelectTime: (time: string) => void;
  selectedDate?: Date;
  isSlotDisabled?: (time: string) => boolean;
}

// Các khung giờ phổ biến dẫn khách xem phòng
export const TIME_SLOTS = [
  "08:30",
  "09:30",
  "10:30",
  "14:30",
  "15:30",
  "16:30",
  "17:30",
];

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  selectedTime,
  onSelectTime,
  selectedDate,
  isSlotDisabled,
}) => {
  const checkDisabled = (time: string): boolean => {
    if (isSlotDisabled) {
      return isSlotDisabled(time);
    }
    if (selectedDate) {
      const [h, m] = time.split(":").map(Number);
      const slotDate = new Date(selectedDate);
      slotDate.setHours(h, m, 0, 0);
      // Ràng buộc: Thời gian hẹn phải sau hiện tại ít nhất 1 tiếng
      return slotDate.getTime() < Date.now() + 60 * 60 * 1000;
    }
    return false;
  };

  return (
    <View className="flex-row flex-wrap gap-2.5">
      {TIME_SLOTS.map((time) => {
        const isSelected = selectedTime === time;
        const disabled = checkDisabled(time);

        return (
          <TouchableOpacity
            key={time}
            onPress={() => onSelectTime(time)}
            disabled={disabled}
            activeOpacity={0.7}
            className={`px-4 py-2 rounded-xl border ${
              disabled
                ? "border-slate-200 bg-slate-100 opacity-40"
                : isSelected
                  ? "border-teal-600 bg-teal-50"
                  : "border-slate-200 bg-white"
            }`}
          >
            <Text
              className={`text-sm ${
                disabled
                  ? "text-slate-400 font-normal"
                  : isSelected
                    ? "text-teal-700 font-bold"
                    : "text-slate-600 font-medium"
              }`}
            >
              {time}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
