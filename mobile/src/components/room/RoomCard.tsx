// mobile/src/components/room/RoomCard.tsx
import React from "react";
import { View, Text, Pressable, Image } from "react-native";
import { Card, Chip } from "heroui-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { RoomSummaryResponse } from "../../types/room.types";
import { useFilterStore } from "../../store/useFilterStore";
import { roomService } from "../../services/room.service";

interface RoomCardProps {
  room: RoomSummaryResponse;
  variant?: "vertical" | "horizontal";
  isHighlighted?: boolean;
}
//react fc no tu truyen vao props
export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  variant = "vertical",
  isHighlighted = false,
}) => {
  const { favoriteIds, toggleFavoriteLocal } = useFilterStore();
  const isFavorite = favoriteIds.includes(room.maPhongTro);

  const formatPrice = (price: number) => {
    if (price >= 1_000_000) {
      const million = price / 1_000_000;
      return `${million % 1 === 0 ? million : million.toFixed(1)} triệu/tháng`;
    }
    return `${price.toLocaleString("vi-VN")} đ/tháng`;
  };

  const handleFavoritePress = async (e: any) => {
    e.stopPropagation();
    const nextState = toggleFavoriteLocal(room.maPhongTro);
    try {
      if (nextState) {
        await roomService.addFavorite(room.maPhongTro);
      } else {
        await roomService.removeFavorite(room.maPhongTro);
      }
    } catch (error) {
      // Revert if error
      toggleFavoriteLocal(room.maPhongTro);
    }
  };

  if (variant === "horizontal") {
    return (
      <Pressable
        onPress={() => router.push(`/room/${room.maPhongTro}` as any)}
        className="mb-3"
      >
        <Card className="flex-row p-3 rounded-2xl bg-white border border-slate-100 shadow-sm items-center">
          <Image
            source={{
              uri:
                room.anhDaiDien ||
                "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500",
            }}
            className="w-24 h-24 rounded-xl bg-slate-200"
            resizeMode="cover"
          />
          <View className="flex-1 ml-3 justify-between h-24 py-0.5">
            <Text
              numberOfLines={1}
              className="text-base font-bold text-slate-800"
            >
              {room.tenLoaiPhong ? `${room.tenLoaiPhong} · ` : ""}
              {room.diaChi}
            </Text>
            <Text className="text-teal-600 font-bold text-base">
              {formatPrice(room.giaThue)}
            </Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-slate-500">
                {room.dienTich} m² · {room.soNguoi} người
              </Text>
              <Pressable
                onPress={handleFavoritePress}
                hitSlop={10}
                className="p-1"
              >
                <Ionicons
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={22}
                  color={isFavorite ? "#0D9488" : "#94A3B8"}
                />
              </Pressable>
            </View>
          </View>
        </Card>
      </Pressable>
    );
  }

  // Dạng thẻ Dọc (Vertical)
  return (
    <Pressable
      onPress={() => router.push(`/room/${room.maPhongTro}` as any)}
      className="mb-4"
    >
      <Card className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        {/* Khung ảnh */}
        <View className="relative w-full h-48 bg-slate-200">
          <Image
            source={{
              uri:
                room.anhDaiDien ||
                "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500",
            }}
            className="w-full h-full"
            resizeMode="cover"
          />
          {/* Badge Nổi bật nếu có */}
          {isHighlighted && (
            <View className="absolute top-3 left-3 bg-amber-500 px-2.5 py-1 rounded-md">
              <Text className="text-white text-xs font-bold tracking-wider">
                NỔI BẬT
              </Text>
            </View>
          )}

          {/* Nút thả tim góc phải */}
          <Pressable
            onPress={handleFavoritePress}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 items-center justify-center shadow-sm"
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={20}
              color={isFavorite ? "#0D9488" : "#64748B"}
            />
          </Pressable>
        </View>

        {/* Nội dung thông tin */}
        <Card.Body className="p-3.5">
          <Text
            numberOfLines={1}
            className="text-base font-bold text-slate-900 mb-1"
          >
            {room.tenLoaiPhong ? `${room.tenLoaiPhong} - ` : ""}
            {room.diaChi}
          </Text>

          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-teal-600 font-bold text-lg">
              {formatPrice(room.giaThue)}
            </Text>
            <Text className="text-slate-500 font-medium text-sm">
              {room.dienTich} m²
            </Text>
          </View>

          <View className="flex-row items-center mb-2.5">
            <Ionicons name="location-outline" size={14} color="#64748B" />
            <Text
              numberOfLines={1}
              className="text-xs text-slate-500 ml-1 flex-1"
            >
              {room.diaChi}
            </Text>
          </View>

          {/* Các Chip tiện ích rút gọn */}
          <View className="flex-row items-center flex-wrap gap-1.5">
            <View className="bg-slate-100 px-2 py-0.5 rounded-md">
              <Text className="text-xs text-slate-600">
                Phòng {room.soNguoi} người
              </Text>
            </View>
            <View className="bg-slate-100 px-2 py-0.5 rounded-md">
              <Text className="text-xs text-slate-600">
                Uy tín {room.diemUyTinChuTro ?? 100}đ
              </Text>
            </View>
          </View>
        </Card.Body>
      </Card>
    </Pressable>
  );
};
