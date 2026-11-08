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

  // Load danh mục loại phòng để lấy tên hiển thị lên Chip
  useEffect(() => {
    roomService.getRoomTypes().then((res) => setCategories(res || []));
  }, []);

  // Đồng bộ ô input khi filter.keyword thay đổi từ bên ngoài
  useEffect(() => {
    setKeywordInput(filter.keyword || "");
  }, [filter.keyword]);

  // Debounce 450ms: Tự động cập nhật filter.keyword sau khi ngừng gõ
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = keywordInput.trim();
      if (trimmed !== (filter.keyword || "")) {
        setFilter({ keyword: trimmed });
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  useEffect(() => {
    fetchRooms();
  }, [filter]);

  // Tìm kiếm phòng: nếu có từ khóa thì tìm theo ngôn ngữ tự nhiên (AI Semantic Search), ngược lại lọc đa tiêu chí
  const fetchRooms = async () => {
    try {
      setLoading(true);
      const prompt = filter.keyword?.trim();
      if (prompt && prompt.length > 0) {
        // 1. Tìm kiếm theo ngôn ngữ tự nhiên (Vector Embeddings)
        let results = await roomService.aiSearchRooms(prompt);
        if (!results) results = [];

        // 2. Kết hợp lọc thêm các tiêu chí phụ nếu người dùng chọn trong FilterModal
        let filtered = results;
        if (filter.minGia !== undefined && filter.minGia >= 0) {
          filtered = filtered.filter((r) => r.giaThue >= (filter.minGia ?? 0));
        }
        if (filter.maxGia !== undefined && filter.maxGia > 0) {
          filtered = filtered.filter(
            (r) => r.giaThue <= (filter.maxGia ?? Infinity),
          );
        }
        if (filter.minDienTich !== undefined && filter.minDienTich >= 0) {
          filtered = filtered.filter(
            (r) => r.dienTich >= (filter.minDienTich ?? 0),
          );
        }
        if (filter.maxDienTich !== undefined && filter.maxDienTich > 0) {
          filtered = filtered.filter(
            (r) => r.dienTich <= (filter.maxDienTich ?? Infinity),
          );
        }
        if (filter.soNguoi !== undefined && filter.soNguoi > 0) {
          filtered = filtered.filter((r) => r.soNguoi >= (filter.soNguoi ?? 0));
        }
        if (filter.maLpt && filter.maLpt.trim() !== "") {
          filtered = filtered.filter((r) => r.maLpt === filter.maLpt);
        }

        setRooms(filtered);
        setTotalElements(filtered.length);
      } else {
        // Tìm kiếm đa tiêu chí thông thường khi chưa nhập từ khóa
        const res = await roomService.searchRooms(filter);
        setRooms(res?.content || []);
        setTotalElements(res?.totalElements || 0);
      }
    } catch (error) {
      console.warn("Lỗi tìm kiếm phòng:", error);
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

        {/* Ô nhập từ khóa tìm kiếm theo ngôn ngữ tự nhiên */}
        <View className="flex-1 flex-row items-center rounded-full px-3 py-1.5 bg-slate-100 border border-transparent">
          <Pressable
            onPress={() => {
              setFilter({ keyword: keywordInput.trim() });
            }}
          >
            <Ionicons name="search" size={17} color="#0D9488" />
          </Pressable>

          <TextInput
            value={keywordInput}
            onChangeText={setKeywordInput}
            onSubmitEditing={() => {
              setFilter({ keyword: keywordInput.trim() });
            }}
            placeholder="Tìm theo ngôn ngữ tự nhiên (VD: phòng có gác xép...)"
            placeholderTextColor="#94A3B8"
            returnKeyType="search"
            className="flex-1 ml-2 text-sm text-slate-800 p-0"
          />

          {keywordInput !== "" && (
            <Pressable
              onPress={() => {
                setKeywordInput("");
                setFilter({ keyword: "" });
              }}
              className="p-1"
            >
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </Pressable>
          )}
        </View>

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
          {filter.keyword ? (
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
          {`${totalElements} phòng phù hợp`}
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
          <ActivityIndicator size="large" color="#0D9488" />
          <Text className="text-xs text-slate-500 font-medium mt-2">
            Đang tìm kiếm phòng trọ phù hợp...
          </Text>
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
                name="search-outline"
                size={48}
                color="#94A3B8"
              />
              <Text className="text-slate-700 font-bold mt-3 text-center text-sm">
                Không tìm thấy phòng trọ nào phù hợp với yêu cầu của bạn.
              </Text>
              <Text className="text-slate-400 text-xs text-center mt-1 max-w-xs">
                Hãy thử tìm bằng các cụm từ như: "phòng có gác lửng", "gần trường đại học", "cho nuôi mèo", "giá rẻ"...
              </Text>
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
