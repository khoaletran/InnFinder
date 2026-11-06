// mobile/src/components/room/AmenityGrid.tsx
import React from "react";
import { View, Text } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { AmenityResponse } from "../../types/room.types";

interface AmenityGridProps {
  amenities: AmenityResponse[];
}

// Map tên tiện ích sang Icon phù hợp
const getAmenityIcon = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes("lạnh") || lower.includes("điều hòa")) {
    return <Ionicons name="snow-outline" size={22} color="#0D9488" />;
  }
  if (lower.includes("wifi") || lower.includes("mạng")) {
    return <Ionicons name="wifi-outline" size={22} color="#0D9488" />;
  }
  if (lower.includes("xe") || lower.includes("bãi")) {
    return <Ionicons name="car-outline" size={22} color="#0D9488" />;
  }
  if (lower.includes("ban công") || lower.includes("cửa sổ")) {
    return (
      <MaterialCommunityIcons
        name="window-open-variant"
        size={22}
        color="#0D9488"
      />
    );
  }
  if (lower.includes("giặt")) {
    return (
      <MaterialCommunityIcons
        name="washing-machine"
        size={22}
        color="#0D9488"
      />
    );
  }
  if (lower.includes("nội thất") || lower.includes("giường")) {
    return <Ionicons name="bed-outline" size={22} color="#0D9488" />;
  }
  if (lower.includes("bếp") || lower.includes("nấu")) {
    return <Ionicons name="restaurant-outline" size={22} color="#0D9488" />;
  }
  return <Ionicons name="checkmark-circle-outline" size={22} color="#0D9488" />;
};

export const AmenityGrid: React.FC<AmenityGridProps> = ({ amenities }) => {
  if (!amenities || amenities.length === 0) {
    return (
      <Text className="text-slate-400 text-sm">Chưa có thông tin tiện ích</Text>
    );
  }

  return (
    <View className="flex-row flex-wrap gap-2.5">
      {amenities.map((item) => (
        <View
          key={item.maTienIch}
          className="w-[31%] py-3 px-2 rounded-xl border border-slate-100 bg-white items-center justify-center shadow-xs"
        >
          {getAmenityIcon(item.tenTienIch)}
          <Text
            numberOfLines={1}
            className="text-xs text-slate-700 font-medium mt-1.5 text-center"
          >
            {item.tenTienIch}
          </Text>
        </View>
      ))}
    </View>
  );
};
