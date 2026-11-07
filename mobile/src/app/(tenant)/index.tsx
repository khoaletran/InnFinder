// mobile/src/app/(tenant)/index.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
// Danh sách các khu vực trọng điểm tìm trọ
const POPULAR_DISTRICTS = [
  {
    id: "binh-thanh",
    name: "Bình Thạnh",
    keyword: "Bình Thạnh",
    imageUrl:
      "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=500",
  },
  {
    id: "quan-10",
    name: "Quận 10",
    keyword: "Quận 10",
    imageUrl: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=500",
  },
  {
    id: "thu-duc",
    name: "TP. Thủ Đức",
    keyword: "Thủ Đức",
    imageUrl:
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=500",
  },
  {
    id: "go-vap",
    name: "Gò Vấp",
    keyword: "Gò Vấp",
    imageUrl:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500",
  },
  {
    id: "quan-5",
    name: "Quận 5",
    keyword: "Quận 5",
    imageUrl:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500",
  },
  {
    id: "quan-1",
    name: "Quận 1",
    keyword: "Quận 1",
    imageUrl: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=500",
  },
];

export default function TenantHomeScreen() {
  const [rooms, setRooms] = useState<RoomSummaryResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true); // loading lần đầu
  const [loadingMore, setLoadingMore] = useState<boolean>(false); // loading khi cuộn
  const [refreshing, setRefreshing] = useState<boolean>(false); // pull-to-refresh
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);

  const sortedDistricts = useMemo(() => {
    return [...POPULAR_DISTRICTS].sort((a, b) => {
      const countA = rooms.filter((r) =>
        r.diaChi?.toLowerCase().includes(a.keyword.toLowerCase()),
      ).length;
      const countB = rooms.filter((r) =>
        r.diaChi?.toLowerCase().includes(b.keyword.toLowerCase()),
      ).length;
      return countB - countA;
    });
  }, [rooms]);

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
      <View className="flex-row items-center justify-between px-4 py-1">
        <InnFinderLogo variant="horizontal" size="md" />

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

      {/* ===== FLOATING SEARCH CARD (BẢN CẢI TIẾN) ===== */}
      <View className="px-4 mt-3">
        <View className="bg-white rounded-3xl p-4 border border-slate-100 shadow-lg shadow-slate-200">
          {/* HÀNG 1: KHU VỰC -> BẤM VÀO MỞ THẲNG BẢN ĐỒ MAP-SEARCH */}
          <Pressable
            onPress={() => router.push("/room/map-search")}
            className="flex-row items-center py-2 active:opacity-80"
          >
            <View className="w-10 h-10 rounded-full bg-teal-50 items-center justify-center mr-3 border border-teal-100">
              <Ionicons name="map-outline" size={20} color="#0D9488" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Khu vực bạn muốn ở
                </Text>
                <View className="bg-teal-50 px-1.5 py-0.5 rounded-md border border-teal-200">
                  <Text className="text-[10px] font-bold text-teal-700">
                    Bản đồ
                  </Text>
                </View>
              </View>
              <Text className="text-sm font-bold text-slate-800 mt-0.5">
                Xem vị trí phòng trên bản đồ
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>

          {/* Vạch ngăn cách mảnh */}
          <View className="h-px bg-slate-100 my-2" />

          {/* HÀNG 2: TIÊU CHÍ & NGÂN SÁCH -> BẤM VÀO MỞ TRANG TÌM KIẾM SEARCH */}
          <View className="flex-row items-center justify-between pt-1">
            <Pressable
              onPress={() => router.push("/search")}
              className="flex-1 flex-row items-center active:opacity-80"
            >
              <View className="w-10 h-10 rounded-full bg-amber-50 items-center justify-center mr-3 border border-amber-100">
                <Ionicons name="options-outline" size={20} color="#D97706" />
              </View>
              <View className="flex-1 pr-2">
                <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Mức giá & Tiện ích
                </Text>
                <Text
                  numberOfLines={1}
                  className="text-sm font-bold text-slate-800 mt-0.5"
                >
                  Linh hoạt, phù hợp
                </Text>
              </View>
            </Pressable>

            {/* Nút Tìm phòng nổi bật */}
            <Pressable
              onPress={() => router.push("/search")}
              className="flex-row items-center bg-teal-700 px-4 py-2.5 rounded-full shadow-md active:bg-teal-800"
            >
              <Ionicons name="search" size={16} color="#FFFFFF" />
              <Text className="text-white font-bold text-xs ml-1.5">
                Tìm phòng
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* 5. Section Khu vực phổ biến (Đếm phòng động từ Backend) */}
      <View className="mt-6 px-4">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-lg font-bold text-slate-900">
              Khu vực phổ biến
            </Text>
            <Text className="text-xs text-slate-500 mt-0.5">
              Các quận phổ biến nhất
            </Text>
          </View>
          <Pressable onPress={() => router.push("/search")}>
            <Text className="text-teal-700 text-xs font-semibold">
              Xem tất cả →
            </Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 16 }}
        >
          {sortedDistricts.map((area) => {
            // Đếm số lượng phòng thực tế khớp với tên quận
            const count = rooms.filter((r) =>
              r.diaChi?.toLowerCase().includes(area.keyword.toLowerCase()),
            ).length;
            const countText =
              count > 0 ? `${count} phòng sẵn có` : "Đang cập nhật";

            return (
              <PopularAreaCard
                key={area.id}
                name={area.name}
                roomCount={countText}
                imageUrl={area.imageUrl}
                onPress={() => handleAreaPress(area.keyword)}
              />
            );
          })}
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
          Chưa có phòng.
        </Text>
      </View>
    </View>
  ) : (
    <View className="py-12 items-center justify-center">
      <ActivityIndicator size="large" color="#0D9488" />
      <Text className="text-slate-500 text-xs mt-2">Đang tải phòng...</Text>
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
              // isHighlighted={index === 0} chu tro co 80 diem uy tin tro len thi noi bat
              isHighlighted={item.diemUyTinChuTro >= 80}
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
