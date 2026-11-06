// mobile/src/app/(tenant)/search.tsx
import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList } from "react-native";
import { Chip, Spinner, Tabs } from "heroui-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFilterStore } from "../../store/useFilterStore";
import { roomService } from "../../services/room.service";
import { RoomSummaryResponse } from "../../types/room.types";
import { RoomCard } from "../../components/room/RoomCard";

export default function TenantSearchScreen() {
  const { filter, setFilter, getActiveFilterCount } = useFilterStore();
  const [rooms, setRooms] = useState<RoomSummaryResponse[]>([]);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [keywordInput, setKeywordInput] = useState<string>(
    filter.keyword || "",
  );
  const [viewMode, setViewMode] = useState<string>("list");

  useEffect(() => {
    fetchRooms();
  }, [filter]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await roomService.searchRooms(filter);
      setRooms(res?.content || []);
      setTotalElements(res?.totalElements || 0);
    } catch (error) {
      console.warn("Lỗi tìm kiếm phòng:", error);
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

  return (
    <View className="flex-1 pt-safe bg-white">
      {/* 1. Header Search Bar */}
      <View className="flex-row items-center px-4 py-2 gap-2.5">
        <Pressable onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </Pressable>

        <View className="flex-1 flex-row items-center bg-slate-100 rounded-full px-3.5 py-2">
          <Ionicons name="search" size={18} color="#64748B" />
          <TextInput
            value={keywordInput}
            onChangeText={setKeywordInput}
            onSubmitEditing={() => setFilter({ keyword: keywordInput })}
            placeholder="Tìm theo khu vực, đường..."
            placeholderTextColor="#94A3B8"
            className="flex-1 ml-2 text-sm text-slate-800 p-0"
          />
          {keywordInput !== "" && (
            <Pressable
              onPress={() => {
                setKeywordInput("");
                setFilter({ keyword: "" });
              }}
            >
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={() => router.push("/room/filter-modal")}
          className="p-2.5 rounded-full bg-slate-100 relative"
        >
          <Ionicons name="options-outline" size={20} color="#1E293B" />
          {getActiveFilterCount() > 0 && (
            <View className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-teal-600" />
          )}
        </Pressable>
      </View>

      {/* 2. Filter Active Chips Bar bằng <Chip> HeroUI */}
      <View className="flex-row px-4 py-2 gap-2 flex-wrap">
        {filter.keyword ? (
          <Chip
            variant="primary"
            color="accent"
            size="sm"
            onPress={() => {
              setKeywordInput("");
              setFilter({ keyword: "" });
            }}
          >
            <Chip.Label className="text-xs font-semibold">
              {filter.keyword} ✕
            </Chip.Label>
          </Chip>
        ) : null}

        {filter.minGia || filter.maxGia ? (
          <Chip
            variant="primary"
            color="accent"
            size="sm"
            onPress={() => setFilter({ minGia: undefined, maxGia: undefined })}
          >
            <Chip.Label className="text-xs font-semibold">
              Khoảng giá ✕
            </Chip.Label>
          </Chip>
        ) : (
          <Chip
            variant="secondary"
            size="sm"
            onPress={() => router.push("/room/filter-modal")}
          >
            <Chip.Label className="text-xs text-slate-600">Giá cả</Chip.Label>
          </Chip>
        )}

        <Chip
          variant="secondary"
          size="sm"
          onPress={() => router.push("/room/filter-modal")}
        >
          <Chip.Label className="text-xs text-slate-600">Diện tích</Chip.Label>
        </Chip>

        <Chip
          variant="secondary"
          size="sm"
          onPress={() => router.push("/room/filter-modal")}
        >
          <Chip.Label className="text-xs text-slate-600">Loại phòng</Chip.Label>
        </Chip>
      </View>

      {/* 3. Bar: Tổng số phòng & Tabs HeroUI */}
      <View className="flex-row items-center justify-between px-4 py-2 border-b border-slate-100">
        <Text className="text-sm font-semibold text-slate-700">
          {totalElements} phòng phù hợp
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
          <Spinner size="lg" color="accent" />
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.maPhongTro}
          renderItem={({ item }) => <RoomCard room={item} variant="vertical" />}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Ionicons name="search-outline" size={48} color="#94A3B8" />
              <Text className="text-slate-500 mt-2 text-sm">
                Không tìm thấy phòng trọ nào phù hợp với bộ lọc.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
