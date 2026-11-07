// mobile/src/app/(tenant)/index.tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  FlatList,
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
import { useNotificationStore } from "../../store/useNotificationStore";
import { InnFinderLogo } from "../../components/common/InnFinderLogo";
import { FilterModal } from "../../components/room/FilterModal";

const PAGE_SIZE = 10;

export default function TenantHomeScreen() {
  const [rooms, setRooms] = useState<RoomSummaryResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true); // loading lần đầu
  const [loadingMore, setLoadingMore] = useState<boolean>(false); // loading khi cuộn
  const [refreshing, setRefreshing] = useState<boolean>(false); // pull-to-refresh
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);

  const { setFilter } = useFilterStore();
  const { user, token } = useAuthStore();
  const unreadNotifications = useNotificationStore((s) => s.unreadCount);

  // Tải trang đầu tiên (hoặc reset khi refresh)
  const loadFirstPage = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const roomRes = await roomService.searchRooms({
          page: 0,
          size: PAGE_SIZE,
        });

        const content = roomRes?.content || [];
        setRooms(content);
        setPage(0);
        // hasMore: ưu tiên field `last` của Spring Page, fallback theo số lượng
        setHasMore(
          typeof roomRes?.last === "boolean"
            ? !roomRes.last
            : content.length === PAGE_SIZE,
        );

        // Chỉ gọi API yêu thích nếu đã đăng nhập
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
        setRefreshing(false);
      }
    },
    [token],
  );

  // Tải trang tiếp theo
  const loadMore = useCallback(async () => {
    if (loading || loadingMore || refreshing || !hasMore) return;
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const res = await roomService.searchRooms({
        page: nextPage,
        size: PAGE_SIZE,
      });
      const content = res?.content || [];

      if (content.length > 0) {
        // Loại bỏ trùng lặp phòng (phòng tránh backend trả trùng)
        setRooms((prev) => {
          const existed = new Set(prev.map((r) => r.maPhongTro));
          const merged = [
            ...prev,
            ...content.filter((r) => !existed.has(r.maPhongTro)),
          ];
          return merged;
        });
        setPage(nextPage);
      }

      setHasMore(
        typeof res?.last === "boolean"
          ? !res.last
          : content.length === PAGE_SIZE,
      );
    } catch (error) {
      console.warn("Lỗi tải thêm phòng:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, refreshing, hasMore, page]);

  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  const handleAreaPress = (areaName: string) => {
    setFilter({ keyword: areaName });
    router.push("/search");
  };

  const onRefresh = () => {
    setHasMore(true);
    loadFirstPage(true);
  };

  // ===== Header của FlatList (toàn bộ phần trên) =====
  const ListHeader = (
    <>
      {/* 1. Header: Logo & Avatar */}
      <View className="flex-row items-center justify-between px-4 py-2.5">
        <InnFinderLogo variant="horizontal" size="sm" />

        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.push("/(tenant)/notifications" as any)}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center relative"
          >
            <Ionicons name="notifications-outline" size={20} color="#334155" />
            {unreadNotifications > 0 && (
              <View className="w-2 h-2 rounded-full bg-red-500 absolute top-2 right-2" />
            )}
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

      {/* 3. Thanh tìm kiếm */}
      <View className="px-4 mt-3">
        <Pressable
          onPress={() => router.push("/search")}
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
          onPress={() => setIsFilterModalOpen(true)}
          className="bg-teal-700"
        >
          <Chip.Label className="text-xs font-semibold text-white">
            Khu vực
          </Chip.Label>
        </Chip>
        <Chip
          variant="secondary"
          size="md"
          onPress={() => setIsFilterModalOpen(true)}
        >
          <Chip.Label className="text-xs font-medium text-slate-700">
            Giá cả
          </Chip.Label>
        </Chip>
        <Chip
          variant="secondary"
          size="md"
          onPress={() => setIsFilterModalOpen(true)}
        >
          <Chip.Label className="text-xs font-medium text-slate-700">
            Diện tích
          </Chip.Label>
        </Chip>
        <Chip
          variant="secondary"
          size="md"
          onPress={() => setIsFilterModalOpen(true)}
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
          <Pressable onPress={() => router.push("/search")}>
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

      {/* 6. Tiêu đề section Phòng gần bạn */}
      <View className="mt-6 px-4 mb-3 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-slate-900">Phòng gần bạn</Text>
        <Pressable onPress={() => router.push("/search")}>
          <Text className="text-teal-700 text-xs font-semibold">Xem thêm</Text>
        </Pressable>
      </View>
    </>
  );

  // ===== Footer: loading more / hết dữ liệu =====
  const ListFooter = (
    <View className="px-4 pb-12">
      {loadingMore ? (
        <View className="py-6 items-center justify-center">
          <ActivityIndicator size="small" color="#0D9488" />
          <Text className="text-slate-500 text-xs mt-2">
            Đang tải thêm phòng...
          </Text>
        </View>
      ) : rooms.length > 0 && !hasMore ? (
        <View className="py-6 items-center justify-center">
          <Text className="text-slate-400 text-xs">
            Đã hiển thị tất cả phòng
          </Text>
        </View>
      ) : null}
    </View>
  );

  // ===== Empty state =====
  const ListEmpty = !loading ? (
    <View className="px-4">
      <View className="py-10 items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
        <Ionicons name="business-outline" size={36} color="#94A3B8" />
        <Text className="text-slate-600 font-semibold text-sm mt-2 text-center px-6">
          Backend đang trả về 0 phòng có trạng thái DA_DUYET.
        </Text>
      </View>
    </View>
  ) : (
    <View className="py-12 items-center justify-center">
      <ActivityIndicator size="large" color="#0D9488" />
      <Text className="text-slate-500 text-xs mt-2">
        Đang tải phòng từ Backend...
      </Text>
    </View>
  );

  return (
    <View className="flex-1 pt-safe bg-white">
      <FlatList
        data={rooms}
        keyExtractor={(item) => String(item.maPhongTro)}
        renderItem={({ item, index }) => (
          <View className="px-4">
            <RoomCard
              room={item}
              variant="vertical"
              isHighlighted={index === 0}
            />
          </View>
        )}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={ListEmpty}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 0 }}
        // Tối ưu hiệu năng
        removeClippedSubviews
        initialNumToRender={PAGE_SIZE}
        maxToRenderPerBatch={PAGE_SIZE}
        windowSize={5}
      />
      <FilterModal
        visible={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={() => router.push("/search")}
      />
    </View>
  );
}
