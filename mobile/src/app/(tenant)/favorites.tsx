// mobile/src/app/(tenant)/favorites.tsx
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { Button, Spinner } from "heroui-native";
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
    <View className="flex-1 pt-safe bg-white">
      {/* 1. Header */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-slate-100">
        <Pressable onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </Pressable>
        <Text className="text-lg font-bold text-slate-800">
          Phòng yêu thích
        </Text>
        <Button variant="ghost" size="sm">
          <Button.Label className="text-teal-700 font-semibold text-sm">
            Chỉnh sửa
          </Button.Label>
        </Button>
      </View>

      {/* 2. Danh sách phòng yêu thích từ Backend */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Spinner size="lg" color="accent" />
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.maPhongTro}
          renderItem={({ item }) => (
            <RoomCard room={item} variant="horizontal" />
          )}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center py-24">
              <Ionicons
                name="heart-dislike-outline"
                size={54}
                color="#CBD5E1"
              />
              <Text className="text-slate-500 font-medium text-sm mt-3">
                Bạn chưa lưu phòng trọ yêu thích nào.
              </Text>
              <Button
                variant="primary"
                size="md"
                onPress={() => router.push("/(tenant)/search")}
                className="mt-4 rounded-full bg-teal-600"
              >
                <Button.Label className="text-white font-bold text-xs">
                  Khám phá ngay
                </Button.Label>
              </Button>
            </View>
          }
        />
      )}
    </View>
  );
}
