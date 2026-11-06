import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

export interface TimeSlotPickerProps {
  selectedTime: string;
  onSelectTime: (time: string) => void;
}

// Các khung giờ phổ biến dẫn khách xem phòng
const TIME_SLOTS = [
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
}) => {
  return (
    <View className="flex-row flex-wrap gap-2.5">
      {TIME_SLOTS.map((time) => {
        const isSelected = selectedTime === time;
        return (
          <TouchableOpacity
            key={time}
            onPress={() => onSelectTime(time)}
            activeOpacity={0.7}
            className={`px-4 py-2 rounded-xl border ${
              isSelected
                ? "border-teal-600 bg-teal-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <Text
              className={`text-sm ${
                isSelected
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
