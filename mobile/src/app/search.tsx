// mobile/src/app/search.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Chip, Tabs } from "heroui-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFilterStore } from "../store/useFilterStore";
import { roomService } from "../services/room.service";
import { CategoryResponse, RoomSummaryResponse } from "../types/room.types";
import { RoomCard } from "../components/room/RoomCard";
import { FilterModal } from "../components/room/FilterModal";

export default function SearchScreen() {
  const { filter, setFilter, resetFilter, getActiveFilterCount } =
    useFilterStore();
  const [rooms, setRooms] = useState<RoomSummaryResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [keywordInput, setKeywordInput] = useState<string>(
    filter.keyword || "",
  );
  const [viewMode, setViewMode] = useState<string>("list");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [isAiMode, setIsAiMode] = useState<boolean>(false);

  // Load danh mục loại phòng để lấy tên hiển thị lên Chip
  useEffect(() => {
    roomService.getRoomTypes().then((res) => setCategories(res || []));
  }, []);

  // Đồng bộ ô input khi filter.keyword thay đổi từ bên ngoài (chỉ khi không ở chế độ AI)
  useEffect(() => {
    if (!isAiMode) {
      setKeywordInput(filter.keyword || "");
    }
  }, [filter.keyword, isAiMode]);

  // Debounce 450ms: Tự động tìm kiếm sau khi ngừng gõ
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = keywordInput.trim();
      if (isAiMode) {
        if (trimmed.length > 0) {
          fetchAiRooms(trimmed);
        } else {
          fetchRooms();
        }
      } else {
        if (trimmed !== (filter.keyword || "")) {
          setFilter({ keyword: trimmed });
        }
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [keywordInput, isAiMode]);

  useEffect(() => {
    if (!isAiMode) {
      fetchRooms();
    }
  }, [filter, isAiMode]);

  // 1. Tìm kiếm SQL lọc đa tiêu chí thông thường
  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await roomService.searchRooms(filter);
      setRooms(res?.content || []);
      setTotalElements(res?.totalElements || 0);
    } catch (error) {
      console.warn("Lỗi tìm kiếm phòng:", error);
      setRooms([]);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  };

  // 2. Tìm kiếm AI bằng ngôn ngữ tự nhiên (Vector Embeddings)
  const fetchAiRooms = async (prompt: string) => {
    try {
      setLoading(true);
      const res = await roomService.aiSearchRooms(prompt);
      setRooms(res || []);
      setTotalElements(res?.length || 0);
    } catch (error) {
      console.warn("Lỗi tìm kiếm bằng AI:", error);
      setRooms([]);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (val: string) => {
    setViewMode(val);
    if (val === "map") {
      router.push("/room/map-search");
    }
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tenant)");
    }
  };

  const handleToggleAiMode = () => {
    const nextMode = !isAiMode;
    setIsAiMode(nextMode);
    if (!nextMode) {
      fetchRooms();
    } else if (keywordInput.trim().length > 0) {
      fetchAiRooms(keywordInput.trim());
    }
  };

  // Lấy tên loại phòng từ mã
  const selectedCategoryName = categories.find(
    (c) => c.maLpt === filter.maLpt,
  )?.tenLoaiPhongTro;

  return (
    <View className="flex-1 pt-safe bg-white">
      {/* 1. Header Search Bar */}
      <View className="flex-row items-center px-4 py-2 gap-2">
        <Pressable onPress={handleGoBack} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </Pressable>

        {/* Ô nhập từ khóa (Tự động đổi màu tím khi bật AI Search) */}
        <View
          className={`flex-1 flex-row items-center rounded-full px-3 py-1.5 border transition-all ${
            isAiMode
              ? "bg-purple-50/70 border-purple-300"
              : "bg-slate-100 border-transparent"
          }`}
        >
          <Pressable
            onPress={() => {
              if (isAiMode) {
                fetchAiRooms(keywordInput.trim());
              } else {
                setFilter({ keyword: keywordInput.trim() });
              }
            }}
          >
            <Ionicons
              name={isAiMode ? "sparkles" : "search"}
              size={17}
              color={isAiMode ? "#7C3AED" : "#0D9488"}
            />
          </Pressable>

          <TextInput
            value={keywordInput}
            onChangeText={setKeywordInput}
            onSubmitEditing={() => {
              if (isAiMode) {
                fetchAiRooms(keywordInput.trim());
              } else {
                setFilter({ keyword: keywordInput.trim() });
              }
            }}
            placeholder={
              isAiMode
                ? "Hỏi AI: 'phòng có gác xép gần Bách Khoa...'"
                : "Tìm theo địa chỉ, mô tả, tiện ích..."
            }
            placeholderTextColor={isAiMode ? "#A78BFA" : "#94A3B8"}
            returnKeyType="search"
            className="flex-1 ml-2 text-sm text-slate-800 p-0"
          />

          {keywordInput !== "" && (
            <Pressable
              onPress={() => {
                setKeywordInput("");
                if (!isAiMode) setFilter({ keyword: "" });
              }}
              className="p-1"
            >
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </Pressable>
          )}
        </View>

        {/* Nút BẬT/TẮT AI Search Nổi Bật */}
        <Pressable
          onPress={handleToggleAiMode}
          className={`px-2.5 py-1.5 rounded-full flex-row items-center border transition-all ${
            isAiMode
              ? "bg-purple-600 border-purple-600 shadow-sm"
              : "bg-purple-50 border-purple-200 active:bg-purple-100"
          }`}
        >
          <Ionicons
            name="sparkles"
            size={13}
            color={isAiMode ? "#FFFFFF" : "#7C3AED"}
          />
          <Text
            className={`text-xs font-bold ml-1 ${
              isAiMode ? "text-white" : "text-purple-700"
            }`}
          >
            AI
          </Text>
        </Pressable>

        {/* Nút Mở Modal Bộ Lọc */}
        <Pressable
          onPress={() => setIsFilterModalOpen(true)}
          className="p-2 rounded-full bg-slate-100 relative"
        >
          <Ionicons name="options-outline" size={20} color="#1E293B" />
          {getActiveFilterCount() > 0 && (
            <View className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-teal-600" />
          )}
        </Pressable>
      </View>

      {/* BANNER THÔNG TIN KHI ĐANG DÙNG AI SEARCH */}
      {isAiMode && (
        <View className="mx-4 my-1.5 p-2.5 rounded-xl bg-purple-50 border border-purple-200 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2 flex-1 mr-2">
            <View className="w-6 h-6 rounded-full bg-purple-600 items-center justify-center">
              <Ionicons name="sparkles" size={12} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text className="text-[11px] font-bold text-purple-900">
                Đang tìm kiếm bằng AI (Vector Embedding)
              </Text>
              <Text className="text-[10px] text-purple-700" numberOfLines={1}>
                Tự động hiểu nghĩa: gác lửng/xép, thú cưng, nấu ăn, thoáng mát...
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => setIsAiMode(false)}
            className="px-2 py-0.5 rounded-md bg-white border border-purple-200 active:bg-purple-100"
          >
            <Text className="text-[10px] font-bold text-purple-700">Tắt</Text>
          </Pressable>
        </View>
      )}

      {/* 2. Filter Active Chips Bar Động (Cuộn ngang) */}
      <View className="py-2 border-b border-slate-100">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          bounces={true}
          overScrollMode="always"
          contentContainerStyle={{
            paddingLeft: 16,
            paddingRight: 30,
            gap: 8,
            alignItems: "center",
          }}
        >
          {/* Chip Từ khóa */}
          {filter.keyword && !isAiMode ? (
            <Chip
              variant="primary"
              color="default"
              size="sm"
              className="bg-teal-700"
              onPress={() => {
                setKeywordInput("");
                setFilter({ keyword: "" });
              }}
            >
              <Chip.Label className="text-xs font-semibold text-white">
                "{filter.keyword}" ✕
              </Chip.Label>
            </Chip>
          ) : null}

          {/* Chip Giá cả */}
          {filter.maxGia !== undefined ? (
            <Chip
              variant="primary"
              color="default"
              size="sm"
              className="bg-teal-700"
              onPress={() =>
                setFilter({ minGia: undefined, maxGia: undefined })
              }
            >
              <Chip.Label className="text-xs font-semibold text-white">
                ≤ {(filter.maxGia / 1_000_000).toFixed(1)} tr ✕
              </Chip.Label>
            </Chip>
          ) : (
            <Chip
              variant="secondary"
              size="sm"
              onPress={() => setIsFilterModalOpen(true)}
            >
              <Chip.Label className="text-xs text-slate-600">Giá cả</Chip.Label>
            </Chip>
          )}

          {/* Chip Diện tích */}
          {filter.maxDienTich !== undefined ? (
            <Chip
              variant="primary"
              color="default"
              size="sm"
              className="bg-teal-700"
              onPress={() =>
                setFilter({ minDienTich: undefined, maxDienTich: undefined })
              }
            >
              <Chip.Label className="text-xs font-semibold text-white">
                ≤ {filter.maxDienTich} m² ✕
              </Chip.Label>
            </Chip>
          ) : (
            <Chip
              variant="secondary"
              size="sm"
              onPress={() => setIsFilterModalOpen(true)}
            >
              <Chip.Label className="text-xs text-slate-600">
                Diện tích
              </Chip.Label>
            </Chip>
          )}

          {/* Chip Loại phòng (Hiển thị tên thật của loại phòng) */}
          {filter.maLpt ? (
            <Chip
              variant="primary"
              color="default"
              size="sm"
              className="bg-teal-700"
              onPress={() => setFilter({ maLpt: undefined })}
            >
              <Chip.Label className="text-xs font-semibold text-white">
                {selectedCategoryName || filter.maLpt} ✕
              </Chip.Label>
            </Chip>
          ) : (
            <Chip
              variant="secondary"
              size="sm"
              onPress={() => setIsFilterModalOpen(true)}
            >
              <Chip.Label className="text-xs text-slate-600">
                Loại phòng
              </Chip.Label>
            </Chip>
          )}

          {/* Chip Số người */}
          {filter.soNguoi !== undefined ? (
            <Chip
              variant="primary"
              color="default"
              size="sm"
              className="bg-teal-700"
              onPress={() => setFilter({ soNguoi: undefined })}
            >
              <Chip.Label className="text-xs font-semibold text-white">
                {filter.soNguoi} người ✕
              </Chip.Label>
            </Chip>
          ) : (
            <Chip
              variant="secondary"
              size="sm"
              onPress={() => setIsFilterModalOpen(true)}
            >
              <Chip.Label className="text-xs text-slate-600">
                Số người
              </Chip.Label>
            </Chip>
          )}

          {/* Chip Tiện ích */}
          {filter.dsTienIch && filter.dsTienIch.length > 0 ? (
            <Chip
              variant="primary"
              color="default"
              size="sm"
              className="bg-teal-700"
              onPress={() => setFilter({ dsTienIch: [] })}
            >
              <Chip.Label className="text-xs font-semibold text-white">
                {filter.dsTienIch.length} tiện ích ✕
              </Chip.Label>
            </Chip>
          ) : (
            <Chip
              variant="secondary"
              size="sm"
              onPress={() => setIsFilterModalOpen(true)}
            >
              <Chip.Label className="text-xs text-slate-600">
                Tiện ích
              </Chip.Label>
            </Chip>
          )}
        </ScrollView>
      </View>

      {/* 3. Bar: Tổng số phòng & Tabs HeroUI */}
      <View className="flex-row items-center justify-between px-4 py-2 border-b border-slate-100">
        <Text className="text-sm font-semibold text-slate-700">
          {isAiMode
            ? `✨ AI tìm thấy ${totalElements} phòng phù hợp`
            : `${totalElements} phòng phù hợp`}
        </Text>

        <View className="w-44">
          <Tabs value={viewMode} onValueChange={handleTabChange}>
            <Tabs.List className="h-8 p-0.5 rounded-lg bg-slate-100">
              <Tabs.Trigger value="list" className="flex-1 rounded-md">
                <Tabs.Label className="text-xs font-semibold">
                  Danh sách
                </Tabs.Label>
              </Tabs.Trigger>
              <Tabs.Trigger value="map" className="flex-1 rounded-md">
                <Tabs.Label className="text-xs font-semibold">
                  Bản đồ
                </Tabs.Label>
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs>
        </View>
      </View>

      {/* 4. Danh sách phòng từ Backend */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator
            size="large"
            color={isAiMode ? "#7C3AED" : "#0D9488"}
          />
          {isAiMode && (
            <Text className="text-xs text-purple-700 font-semibold mt-2">
              AI đang phân tích ý định và tìm kiếm ngữ nghĩa...
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.maPhongTro}
          renderItem={({ item }) => <RoomCard room={item} variant="vertical" />}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center py-20 px-6">
              <Ionicons
                name={isAiMode ? "sparkles-outline" : "search-outline"}
                size={48}
                color={isAiMode ? "#A78BFA" : "#94A3B8"}
              />
              <Text className="text-slate-700 font-bold mt-3 text-center text-sm">
                {isAiMode
                  ? "AI chưa tìm thấy phòng trọ nào khớp với yêu cầu của bạn."
                  : "Không tìm thấy phòng trọ nào phù hợp với bộ lọc."}
              </Text>
              {isAiMode && (
                <Text className="text-slate-400 text-xs text-center mt-1 max-w-xs">
                  Hãy thử gõ câu lệnh khác như: "phòng có gác lửng", "gần trường đại học", "cho nuôi mèo"...
                </Text>
              )}
            </View>
          }
        />
      )}

      {/* 5. Modal Bộ Lọc */}
      <FilterModal
        visible={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
      />
    </View>
  );
}
