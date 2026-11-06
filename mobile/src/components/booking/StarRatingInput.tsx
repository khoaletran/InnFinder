import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface StarRatingInputProps {
  value: number; // Điểm hiện tại (1 - 5)
  onChange?: (val: number) => void;
  size?: number; // Kích thước icon
  readOnly?: boolean;
}

export const StarRatingInput: React.FC<StarRatingInputProps> = ({
  value,
  onChange,
  size = 24,
  readOnly = false,
}) => {
  return (
    <View className="flex-row items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= value;
        return (
          <TouchableOpacity
            key={star}
            disabled={readOnly}
            onPress={() => onChange && onChange(star)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isFilled ? "star" : "star"}
              size={size}
              color={isFilled ? "#F59E0B" : "#E2E8F0"} // Vàng cam nếu được chọn, xám nhạt nếu chưa
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
