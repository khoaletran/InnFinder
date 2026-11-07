// mobile/src/app/(tenant)/favorites.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Button } from "heroui-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { roomService } from "../../services/room.service";
import { RoomSummaryResponse } from "../../types/room.types";
import { useFilterStore } from "../../store/useFilterStore";
import { RoomCard } from "../../components/room/RoomCard";

export default function TenantFavoritesScreen() {
  const [favorites, setFavorites] = useState<RoomSummaryResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { favoriteIds } = useFilterStore();

  useEffect(() => {
    fetchFavorites();
  }, [favoriteIds.length]);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const data = await roomService.getMyFavorites();
      setFavorites(data || []);
      useFilterStore
        .getState()
        .setFavoriteIds((data || []).map((r) => r.maPhongTro));
    } catch (error) {
      console.warn("Lỗi lấy phòng yêu thích:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 pt-safe bg-slate-50">
      {/* 1. Header chuẩn phong cách InnFinder */}
      <View className="px-4 py-3 bg-white border-b border-slate-200/80">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-bold text-slate-900">
              Phòng yêu thích
            </Text>
            <Text className="text-xs text-slate-500 mt-0.5">
              Các phòng trọ bạn đã lưu để theo dõi
            </Text>
          </View>
          <View className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200">
            <Text className="text-xs font-bold text-teal-700">
              {favorites.length} phòng
            </Text>
          </View>
        </View>
      </View>

      {/* 2. Danh sách phòng yêu thích từ Backend */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.maPhongTro}
          renderItem={({ item }) => (
            <RoomCard room={item} variant="horizontal" />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center py-24 px-6">
              <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
                <Ionicons
                  name="heart-dislike-outline"
                  size={32}
                  color="#94A3B8"
                />
              </View>
              <Text className="text-sm font-semibold text-slate-700">
                Chưa có phòng yêu thích
              </Text>
              <Text className="text-xs text-slate-400 mt-1 text-center">
                Nhấn biểu tượng trái tim ở phòng trọ bất kỳ để lưu lại xem sau.
              </Text>
              <Button
                variant="primary"
                size="md"
                onPress={() => router.push("/(tenant)/index")}
                className="mt-4 rounded-full bg-teal-600 active:bg-teal-700"
              >
                <Button.Label className="text-white font-bold text-xs">
                  Khám phá phòng ngay
                </Button.Label>
              </Button>
            </View>
          }
        />
      )}
    </View>
  );
}
