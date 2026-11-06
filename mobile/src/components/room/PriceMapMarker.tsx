// mobile/src/components/room/PriceMapMarker.tsx
import React from "react";
import { View, Text } from "react-native";

interface PriceMapMarkerProps {
  price: number;
  isSelected?: boolean;
}

export const PriceMapMarker: React.FC<PriceMapMarkerProps> = ({
  price,
  isSelected = false,
}) => {
  const shortPrice =
    price >= 1_000_000
      ? `${(price / 1_000_000).toFixed(1).replace(".0", "")}tr`
      : `${Math.round(price / 1000)}k`;

  return (
    <View
      className={`px-3 py-1.5 rounded-full border border-white shadow-md ${
        isSelected ? "bg-teal-900 scale-105" : "bg-teal-600"
      }`}
    >
      <Text className="text-white text-xs font-bold tracking-tight">
        {shortPrice}
      </Text>
    </View>
  );
};
