// mobile/src/app/room/filter-modal.tsx
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput } from "react-native";
import { Button, Card, Chip } from "heroui-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Slider from "@react-native-community/slider";
import { useFilterStore } from "../../store/useFilterStore";
import { roomService } from "../../services/room.service";
import { AmenityResponse, CategoryResponse } from "../../types/room.types";

export default function FilterModalScreen() {
  const { filter, setFilter, resetFilter } = useFilterStore();
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [amenities, setAmenities] = useState<AmenityResponse[]>([]);

  const [keyword, setKeyword] = useState<string>(filter.keyword || "");
  const [priceRange, setPriceRange] = useState<number>(
    filter.maxGia || 8_000_000,
  );
  const [areaRange, setAreaRange] = useState<number>(filter.maxDienTich || 45);
  const [selectedLpt, setSelectedLpt] = useState<string | undefined>(
    filter.maLpt,
  );
  const [peopleCount, setPeopleCount] = useState<number>(filter.soNguoi || 2);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    filter.dsTienIch || [],
  );

  useEffect(() => {
    roomService.getRoomTypes().then((res) => setCategories(res || []));
    roomService.getAmenities().then((res) => setAmenities(res || []));
  }, []);

  const handleApply = () => {
    setFilter({
      keyword,
      minGia: 1_500_000,
      maxGia: priceRange,
      minDienTich: 15,
      maxDienTich: areaRange,
      maLpt: selectedLpt,
      soNguoi: peopleCount,
      dsTienIch: selectedAmenities,
    });
    router.back();
  };

  const handleReset = () => {
    resetFilter();
    setKeyword("");
    setPriceRange(8_000_000);
    setAreaRange(45);
    setSelectedLpt(undefined);
    setPeopleCount(2);
    setSelectedAmenities([]);
  };

  const toggleAmenity = (id: string) => {
    if (selectedAmenities.includes(id)) {
      setSelectedAmenities(selectedAmenities.filter((item) => item !== id));
    } else {
      setSelectedAmenities([...selectedAmenities, id]);
    }
  };

  return (
    <View className="flex-1 pt-safe bg-white">
      {/* Header Modal */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-slate-100">
        <View className="w-8" />
        <Text className="text-lg font-bold text-slate-800">Bộ lọc</Text>
        <Pressable onPress={() => router.back()} className="p-1">
          <Ionicons name="close-circle-outline" size={24} color="#64748B" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1 px-5 py-4"
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Khu vực bằng Card HeroUI */}
        <Text className="font-bold text-slate-800 text-base mb-2">Khu vực</Text>
        <View className="mb-4 gap-2.5">
          <Card className="px-4 py-3 flex-row items-center justify-between border border-slate-200">
            <Text className="text-slate-800 text-sm font-medium">
              TP. Hồ Chí Minh
            </Text>
            <Ionicons name="chevron-down" size={18} color="#64748B" />
          </Card>
          <Card className="px-4 py-2.5 flex-row items-center justify-between border border-slate-200">
            <TextInput
              value={keyword}
              onChangeText={setKeyword}
              placeholder="Nhập Quận, Huyện hoặc Tên đường..."
              placeholderTextColor="#94A3B8"
              className="text-slate-800 text-sm flex-1 p-0"
            />
            <Ionicons name="chevron-down" size={18} color="#64748B" />
          </Card>
        </View>

        {/* 2. Khoảng giá */}
        <View className="flex-row items-center justify-between mb-2">
          <Text className="font-bold text-slate-800 text-base">Khoảng giá</Text>
          <Text className="text-teal-700 font-bold text-sm">
            0 — {(priceRange / 1_000_000).toFixed(1)} triệu
          </Text>
        </View>
        <Slider
          minimumValue={1_000_000}
          maximumValue={15_000_000}
          step={500_000}
          value={priceRange}
          onValueChange={setPriceRange}
          minimumTrackTintColor="#0D9488"
          maximumTrackTintColor="#E2E8F0"
          thumbTintColor="#0D9488"
          style={{ width: "100%", height: 40 }}
        />

        {/* 3. Diện tích */}
        <View className="flex-row items-center justify-between mt-3 mb-2">
          <Text className="font-bold text-slate-800 text-base">Diện tích</Text>
          <Text className="text-teal-700 font-bold text-sm">
            15 m² — {areaRange} m²
          </Text>
        </View>
        <Slider
          minimumValue={15}
          maximumValue={100}
          step={5}
          value={areaRange}
          onValueChange={setAreaRange}
          minimumTrackTintColor="#0D9488"
          maximumTrackTintColor="#E2E8F0"
          thumbTintColor="#0D9488"
          style={{ width: "100%", height: 40 }}
        />

        {/* 4. Loại phòng từ Backend dùng <Chip> HeroUI */}
        <Text className="font-bold text-slate-800 text-base mt-4 mb-2.5">
          Loại phòng
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {categories.map((cat) => {
            const isSelected = selectedLpt === cat.maLpt;
            return (
              <Chip
                key={cat.maLpt}
                variant={isSelected ? "primary" : "secondary"}
                color="accent"
                size="md"
                onPress={() =>
                  setSelectedLpt(isSelected ? undefined : cat.maLpt)
                }
              >
                <Chip.Label
                  className={
                    isSelected ? "text-white font-bold" : "text-slate-700"
                  }
                >
                  {cat.tenLoaiPhongTro}
                </Chip.Label>
              </Chip>
            );
          })}
        </View>

        {/* 5. Số người */}
        <View className="flex-row items-center justify-between mt-2 mb-6">
          <Text className="font-bold text-slate-800 text-base">Số người</Text>
          <View className="flex-row items-center border border-slate-200 rounded-xl overflow-hidden">
            <Pressable
              onPress={() => setPeopleCount(Math.max(1, peopleCount - 1))}
              className="px-3.5 py-2 bg-slate-50"
            >
              <Text className="text-slate-800 font-bold text-base">-</Text>
            </Pressable>
            <Text className="px-4 text-slate-900 font-bold text-sm">
              {peopleCount}
            </Text>
            <Pressable
              onPress={() => setPeopleCount(peopleCount + 1)}
              className="px-3.5 py-2 bg-slate-50"
            >
              <Text className="text-slate-800 font-bold text-base">+</Text>
            </Pressable>
          </View>
        </View>

        {/* 6. Tiện ích từ Backend dùng <Chip> HeroUI */}
        <Text className="font-bold text-slate-800 text-base mb-2.5">
          Tiện ích
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-8">
          {amenities.map((item) => {
            const isChecked = selectedAmenities.includes(item.maTienIch);
            return (
              <Chip
                key={item.maTienIch}
                variant={isChecked ? "primary" : "secondary"}
                color="accent"
                size="sm"
                onPress={() => toggleAmenity(item.maTienIch)}
              >
                <Chip.Label
                  className={
                    isChecked ? "text-white font-bold" : "text-slate-600"
                  }
                >
                  {item.tenTienIch}
                </Chip.Label>
              </Chip>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer bằng <Button> HeroUI */}
      <View className="flex-row items-center justify-between px-5 py-4 border-t border-slate-100 pb-safe">
        <Button variant="ghost" size="md" onPress={handleReset}>
          <Button.Label className="text-slate-500 font-semibold text-sm">
            Xóa bộ lọc
          </Button.Label>
        </Button>

        <Button variant="primary" size="md" onPress={handleApply}>
          <Button.Label className="text-white font-bold text-sm">
            Áp dụng
          </Button.Label>
        </Button>
      </View>
    </View>
  );
}
