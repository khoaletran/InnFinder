// mobile/src/components/room/RoomCard.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Card, Chip } from "heroui-native";
import { Image } from "expo-image";
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

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  variant = "vertical",
  isHighlighted = false,
}) => {
  const { favoriteIds, toggleFavoriteLocal } = useFilterStore();
  const isFavorite = favoriteIds.includes(room.maPhongTro);

  const formatPrice = (price?: number) => {
    if (!price) return "0 đ/tháng";
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
    } catch {
      toggleFavoriteLocal(room.maPhongTro);
    }
  };

  // 1. Thẻ ngang (Horizontal) cho màn Yêu thích
  if (variant === "horizontal") {
    return (
      <Pressable
        onPress={() => router.push(`/room/${room.maPhongTro}` as any)}
        className="mb-3 active:opacity-90"
      >
        <Card className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <View className="flex-row items-center">
            <Image
              source={{
                uri:
                  room.anhDaiDien ||
                  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500",
              }}
              style={{ width: 92, height: 92, borderRadius: 12 }}
              contentFit="cover"
              transition={200}
            />
            <Card.Body className="flex-1 ml-3.5 justify-between h-24 py-0.5">
              <Card.Title
                numberOfLines={1}
                className="text-base font-bold text-slate-800"
              >
                {room.tenLoaiPhong ? `${room.tenLoaiPhong} · ` : ""}
                {room.diaChi}
              </Card.Title>

              <Text className="text-teal-600 font-extrabold text-base">
                {formatPrice(room.giaThue)}
              </Text>

              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-slate-500">
                  {room.dienTich} m² ·{" "}
                  {room.diaChi.split(",").pop()?.trim() || "Hồ Chí Minh"}
                </Text>

                <Pressable onPress={handleFavoritePress} hitSlop={10}>
                  <Ionicons
                    name={isFavorite ? "heart" : "heart-outline"}
                    size={22}
                    color={isFavorite ? "#0D9488" : "#94A3B8"}
                  />
                </Pressable>
              </View>
            </Card.Body>
          </View>
        </Card>
      </Pressable>
    );
  }

  // 2. Thẻ dọc (Vertical) cho Trang chủ & Tìm kiếm
  return (
    <Pressable
      onPress={() => router.push(`/room/${room.maPhongTro}` as any)}
      className="mb-4 active:opacity-95"
    >
      <Card className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        {/* Khung ảnh */}
        <View className="relative w-full h-48 bg-slate-100">
          <Image
            source={{
              uri:
                room.anhDaiDien ||
                "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600",
            }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={200}
          />

          {isHighlighted && (
            <View className="absolute top-3 left-3 bg-amber-500 px-2.5 py-1 rounded-md">
              <Text className="text-[10px] font-extrabold text-white tracking-wider">
                NỔI BẬT
              </Text>
            </View>
          )}

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

        <Card.Body className="p-3.5">
          <Card.Title
            numberOfLines={1}
            className="text-base font-bold text-slate-900 mb-1"
          >
            {room.tenLoaiPhong ? `${room.tenLoaiPhong} - ` : ""}
            {room.diaChi}
          </Card.Title>

          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-teal-600 font-extrabold text-lg">
              {formatPrice(room.giaThue)}
            </Text>
            <Text className="text-slate-500 font-semibold text-sm">
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

          <View className="flex-row items-center gap-1.5">
            <Chip variant="soft" color="default" size="sm">
              <Chip.Label className="text-xs text-slate-600">
                Phòng {room.soNguoi} người
              </Chip.Label>
            </Chip>
            <Chip variant="soft" color="accent" size="sm">
              <Chip.Label className="text-xs text-teal-800">
                Uy tín {room.diemUyTinChuTro ?? 100}đ
              </Chip.Label>
            </Chip>
          </View>
        </Card.Body>
      </Card>
    </Pressable>
  );
};
