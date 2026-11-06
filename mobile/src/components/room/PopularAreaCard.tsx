// mobile/src/components/room/PopularAreaCard.tsx
import React from "react";
import { View, Text, Pressable, Image } from "react-native";

interface PopularAreaCardProps {
  name: string;
  roomCount: string;
  imageUrl: string;
  onPress: () => void;
}

export const PopularAreaCard: React.FC<PopularAreaCardProps> = ({
  name,
  roomCount,
  imageUrl,
  onPress,
}) => {
  return (
    <Pressable onPress={onPress} className="mr-3">
      <View className="w-32 h-44 rounded-2xl overflow-hidden relative shadow-sm bg-slate-200">
        <Image
          source={{ uri: imageUrl }}
          className="w-full h-full"
          resizeMode="cover"
        />
        {/* Lớp overlay tối dần để đọc chữ */}
        <View className="absolute inset-0 bg-black/25 justify-between p-2.5">
          <View />
          <View>
            <Text className="text-white font-bold text-sm leading-tight">
              {name}
            </Text>
            <Text className="text-white/80 text-xs mt-0.5">{roomCount}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
};
