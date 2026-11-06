// mobile/src/app/(tenant)/index.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Chip } from "heroui-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { roomService } from "../../services/room.service";
import { RoomSummaryResponse } from "../../types/room.types";
import { useFilterStore } from "../../store/useFilterStore";
import { PopularAreaCard } from "../../components/room/PopularAreaCard";
import { RoomCard } from "../../components/room/RoomCard";
import { useAuthStore } from "../../store/useAuthStore";

export default function TenantHomeScreen() {
  const [rooms, setRooms] = useState<RoomSummaryResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { setFilter } = useFilterStore();
  const { user, token } = useAuthStore();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // 1. Tải danh sách phòng từ Backend (Public API)
      const roomRes = await roomService.searchRooms({ page: 0, size: 10 });
      setRooms(roomRes?.content || []);

      // 2. Chỉ gọi API yêu thích nếu đã đăng nhập (tránh lỗi 403 Forbidden)
      if (token) {
        const favRes = await roomService.getMyFavorites().catch(() => []);
        if (favRes && Array.isArray(favRes)) {
          useFilterStore
            .getState()
            .setFavoriteIds(favRes.map((r) => r.maPhongTro));
        }
      }
    } catch (error) {
      console.warn("Lỗi tải phòng từ Backend:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAreaPress = (areaName: string) => {
    setFilter({ keyword: areaName });
    router.push("/(tenant)/search");
  };

  return (
    <View className="flex-1 pt-safe bg-white">
      {/* 1. Header: Logo & Avatar */}
      <View className="flex-row items-center justify-between px-4 py-2.5">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-lg bg-teal-600 items-center justify-center">
            <Ionicons name="home" size={18} color="#FFFFFF" />
          </View>
          <Text className="text-xl font-extrabold text-teal-800">TrọTốt</Text>
        </View>

        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.push("/(tenant)/notifications" as any)}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center relative"
          >
            <Ionicons name="notifications-outline" size={20} color="#334155" />
            <View className="w-2 h-2 rounded-full bg-red-500 absolute top-2 right-2" />
          </Pressable>

          <Pressable
            onPress={() => router.push("/(tenant)/profile" as any)}
            className="w-9 h-9 rounded-full bg-teal-600 items-center justify-center"
          >
            <Text className="text-white font-bold text-xs">
              {user?.tenDangNhap
                ? user.tenDangNhap.substring(0, 2).toUpperCase()
                : "NA"}
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* 2. Badge Thông điệp */}
        <View className="px-4 mt-2">
          <View className="bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-full self-start">
            <Text className="text-teal-800 text-xs font-semibold">
              Hơn 28.000 phòng đã xác thực
            </Text>
          </View>
        </View>

        {/* 3. Thanh tìm kiếm */}
        <View className="px-4 mt-3">
          <Pressable
            onPress={() => router.push("/(tenant)/search")}
            className="flex-row items-center bg-slate-50 border border-slate-200 px-4 py-3 rounded-full"
          >
            <Ionicons name="search" size={20} color="#94A3B8" />
            <Text className="text-slate-400 ml-2.5 text-sm">
              Bạn muốn tìm phòng ở đâu?
            </Text>
          </Pressable>
        </View>

        {/* 4. Pills lọc nhanh */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3 px-4"
          contentContainerStyle={{ gap: 8 }}
        >
          <Chip
            variant="primary"
            color="default"
            size="md"
            onPress={() => router.push("/room/filter-modal")}
            className="bg-teal-700"
          >
            <Chip.Label className="text-xs font-semibold text-white">
              Khu vực
            </Chip.Label>
          </Chip>
          <Chip
            variant="secondary"
            size="md"
            onPress={() => router.push("/room/filter-modal")}
          >
            <Chip.Label className="text-xs font-medium text-slate-700">
              Giá cả
            </Chip.Label>
          </Chip>
          <Chip
            variant="secondary"
            size="md"
            onPress={() => router.push("/room/filter-modal")}
          >
            <Chip.Label className="text-xs font-medium text-slate-700">
              Diện tích
            </Chip.Label>
          </Chip>
          <Chip
            variant="secondary"
            size="md"
            onPress={() => router.push("/room/filter-modal")}
          >
            <Chip.Label className="text-xs font-medium text-slate-700">
              Loại phòng
            </Chip.Label>
          </Chip>
        </ScrollView>

        {/* 5. Section Khu vực phổ biến */}
        <View className="mt-6 px-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-slate-900">
              Khu vực phổ biến
            </Text>
            <Pressable onPress={() => router.push("/(tenant)/search")}>
              <Text className="text-teal-700 text-xs font-semibold">
                Xem tất cả →
              </Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <PopularAreaCard
              name="TP. Hồ Chí Minh"
              roomCount="12,480 phòng"
              imageUrl="https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=500"
              onPress={() => handleAreaPress("Hồ Chí Minh")}
            />
            <PopularAreaCard
              name="Hà Nội"
              roomCount="8,250 phòng"
              imageUrl="https://images.unsplash.com/photo-1509062522246-3755977927d7?w=500"
              onPress={() => handleAreaPress("Hà Nội")}
            />
            <PopularAreaCard
              name="Đà Nẵng"
              roomCount="3,120 phòng"
              imageUrl="https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=500"
              onPress={() => handleAreaPress("Đà Nẵng")}
            />
          </ScrollView>
        </View>

        {/* 6. Section Phòng gần bạn */}
        <View className="mt-6 px-4 pb-12">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-slate-900">
              Phòng gần bạn
            </Text>
            <Pressable onPress={() => router.push("/(tenant)/search")}>
              <Text className="text-teal-700 text-xs font-semibold">
                Xem thêm
              </Text>
            </Pressable>
          </View>

          {loading ? (
            <View className="py-12 items-center justify-center">
              <ActivityIndicator size="large" color="#0D9488" />
              <Text className="text-slate-500 text-xs mt-2">
                Đang tải phòng từ Backend...
              </Text>
            </View>
          ) : rooms.length > 0 ? (
            rooms.map((room, index) => (
              <RoomCard
                key={room.maPhongTro}
                room={room}
                variant="vertical"
                isHighlighted={index === 0}
              />
            ))
          ) : (
            <View className="py-10 items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Ionicons name="business-outline" size={36} color="#94A3B8" />
              <Text className="text-slate-600 font-semibold text-sm mt-2">
                Backend đang trả về 0 phòng có trạng thái DA_DUYET.
              </Text>
              <Text className="text-slate-400 text-xs text-center mt-1 px-4">
                Hãy mở CSDL innfinder_db và đảm bảo có phòng trọ với cột
                trang_thai = 'DA_DUYET'.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
