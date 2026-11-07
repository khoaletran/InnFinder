// mobile/src/components/room/FilterModal.tsx
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Modal } from "react-native";
import { Button, Chip } from "heroui-native";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useFilterStore } from "../../store/useFilterStore";
import { roomService } from "../../services/room.service";
import { AmenityResponse, CategoryResponse } from "../../types/room.types";

export interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply?: () => void;
}

const PRICE_PRESETS = [
  { label: "Tất cả", value: undefined },
  { label: "< 3 triệu", value: 3_000_000 },
  { label: "< 5 triệu", value: 5_000_000 },
  { label: "< 8 triệu", value: 8_000_000 },
  { label: "< 12 triệu", value: 12_000_000 },
];

const AREA_PRESETS = [
  { label: "Tất cả", value: undefined },
  { label: "< 20 m²", value: 20 },
  { label: "< 30 m²", value: 30 },
  { label: "< 45 m²", value: 45 },
  { label: "< 60 m²", value: 60 },
];

const PEOPLE_PRESETS = [
  { label: "Tất cả", value: undefined },
  { label: "1 người", value: 1 },
  { label: "2 người", value: 2 },
  { label: "3 người", value: 3 },
  { label: "4+ người", value: 4 },
];

export const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  onApply,
}) => {
  const { filter, setFilter, resetFilter } = useFilterStore();
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [amenities, setAmenities] = useState<AmenityResponse[]>([]);

  // State cục bộ của modal (Chỉ nhận undefined nếu không lọc)
  const [selectedMaxPrice, setSelectedMaxPrice] = useState<number | undefined>(
    filter.maxGia,
  );
  const [selectedMaxArea, setSelectedMaxArea] = useState<number | undefined>(
    filter.maxDienTich,
  );
  const [selectedLpt, setSelectedLpt] = useState<string | undefined>(
    filter.maLpt,
  );
  const [selectedPeople, setSelectedPeople] = useState<number | undefined>(
    filter.soNguoi,
  );
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    filter.dsTienIch || [],
  );

  useEffect(() => {
    roomService.getRoomTypes().then((res) => setCategories(res || []));
    roomService.getAmenities().then((res) => setAmenities(res || []));
  }, []);

  // Đồng bộ lại khi mở modal
  useEffect(() => {
    if (visible) {
      setSelectedMaxPrice(filter.maxGia);
      setSelectedMaxArea(filter.maxDienTich);
      setSelectedLpt(filter.maLpt);
      setSelectedPeople(filter.soNguoi);
      setSelectedAmenities(filter.dsTienIch || []);
    }
  }, [visible, filter]);

  const handleApply = () => {
    // CHỈ gán những gì người dùng thật sự chọn, không tự ép giá trị mặc định
    setFilter({
      minGia: undefined,
      maxGia: selectedMaxPrice,
      minDienTich: undefined,
      maxDienTich: selectedMaxArea,
      maLpt: selectedLpt,
      soNguoi: selectedPeople,
      dsTienIch: selectedAmenities,
    });
    onClose();
    if (onApply) onApply();
  };

  const handleReset = () => {
    setSelectedMaxPrice(undefined);
    setSelectedMaxArea(undefined);
    setSelectedLpt(undefined);
    setSelectedPeople(undefined);
    setSelectedAmenities([]);
    resetFilter();
  };

  const toggleAmenity = (id: string) => {
    if (selectedAmenities.includes(id)) {
      setSelectedAmenities(selectedAmenities.filter((item) => item !== id));
    } else {
      setSelectedAmenities([...selectedAmenities, id]);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/50 justify-end" onPress={onClose}>
        <Pressable
          className="bg-white rounded-t-3xl max-h-[85%] pb-6"
          onPress={(e) => e.stopPropagation()}
        >
          <View className="w-10 h-1 bg-slate-300 rounded-full self-center my-2.5" />

          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-2 border-b border-slate-100">
            <Text className="text-lg font-bold text-slate-800">
              Bộ lọc tìm kiếm
            </Text>
            <Pressable onPress={onClose} className="p-1">
              <Ionicons name="close-circle-outline" size={24} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView
            className="px-5 py-4"
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Khoảng giá */}
            <View className="flex-row items-center justify-between mb-2">
              <Text className="font-bold text-slate-800 text-base">
                Khoảng giá tối đa
              </Text>
              <Text className="text-teal-700 font-bold text-sm">
                {selectedMaxPrice
                  ? `≤ ${(selectedMaxPrice / 1_000_000).toFixed(1)} triệu`
                  : "Tất cả mức giá"}
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2 mb-2">
              {PRICE_PRESETS.map((p) => {
                const active = selectedMaxPrice === p.value;
                return (
                  <Chip
                    key={p.label}
                    variant={active ? "primary" : "secondary"}
                    color="default"
                    size="sm"
                    className={active ? "bg-teal-700" : ""}
                    onPress={() => setSelectedMaxPrice(p.value)}
                  >
                    <Chip.Label
                      className={
                        active
                          ? "text-white font-bold text-xs"
                          : "text-slate-600 text-xs"
                      }
                    >
                      {p.label}
                    </Chip.Label>
                  </Chip>
                );
              })}
            </View>
            <Slider
              minimumValue={1_000_000}
              maximumValue={15_000_000}
              step={500_000}
              value={selectedMaxPrice || 15_000_000}
              onValueChange={(val) => {
                if (val >= 15_000_000) setSelectedMaxPrice(undefined);
                else setSelectedMaxPrice(val);
              }}
              minimumTrackTintColor="#0D9488"
              maximumTrackTintColor="#E2E8F0"
              thumbTintColor="#0D9488"
              style={{ width: "100%", height: 36, marginBottom: 16 }}
            />

            {/* 2. Diện tích */}
            <View className="flex-row items-center justify-between mb-2">
              <Text className="font-bold text-slate-800 text-base">
                Diện tích tối đa
              </Text>
              <Text className="text-teal-700 font-bold text-sm">
                {selectedMaxArea
                  ? `≤ ${selectedMaxArea} m²`
                  : "Tất cả diện tích"}
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2 mb-2">
              {AREA_PRESETS.map((a) => {
                const active = selectedMaxArea === a.value;
                return (
                  <Chip
                    key={a.label}
                    variant={active ? "primary" : "secondary"}
                    color="default"
                    size="sm"
                    className={active ? "bg-teal-700" : ""}
                    onPress={() => setSelectedMaxArea(a.value)}
                  >
                    <Chip.Label
                      className={
                        active
                          ? "text-white font-bold text-xs"
                          : "text-slate-600 text-xs"
                      }
                    >
                      {a.label}
                    </Chip.Label>
                  </Chip>
                );
              })}
            </View>
            <Slider
              minimumValue={15}
              maximumValue={80}
              step={5}
              value={selectedMaxArea || 80}
              onValueChange={(val) => {
                if (val >= 80) setSelectedMaxArea(undefined);
                else setSelectedMaxArea(val);
              }}
              minimumTrackTintColor="#0D9488"
              maximumTrackTintColor="#E2E8F0"
              thumbTintColor="#0D9488"
              style={{ width: "100%", height: 36, marginBottom: 16 }}
            />

            {/* 3. Loại phòng */}
            <Text className="font-bold text-slate-800 text-base mb-2">
              Loại phòng
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {categories.map((cat) => {
                const isSelected = selectedLpt === cat.maLpt;
                return (
                  <Chip
                    key={cat.maLpt}
                    variant={isSelected ? "primary" : "secondary"}
                    color="default"
                    size="md"
                    className={isSelected ? "bg-teal-700" : ""}
                    onPress={() =>
                      setSelectedLpt(isSelected ? undefined : cat.maLpt)
                    }
                  >
                    <Chip.Label
                      className={
                        isSelected
                          ? "text-white font-bold text-xs"
                          : "text-slate-700 text-xs"
                      }
                    >
                      {cat.tenLoaiPhongTro}
                    </Chip.Label>
                  </Chip>
                );
              })}
            </View>

            {/* 4. Số người */}
            <Text className="font-bold text-slate-800 text-base mb-2">
              Số người ở
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {PEOPLE_PRESETS.map((p) => {
                const isSelected = selectedPeople === p.value;
                return (
                  <Chip
                    key={p.label}
                    variant={isSelected ? "primary" : "secondary"}
                    color="default"
                    size="sm"
                    className={isSelected ? "bg-teal-700" : ""}
                    onPress={() => setSelectedPeople(p.value)}
                  >
                    <Chip.Label
                      className={
                        isSelected
                          ? "text-white font-bold text-xs"
                          : "text-slate-700 text-xs"
                      }
                    >
                      {p.label}
                    </Chip.Label>
                  </Chip>
                );
              })}
            </View>

            {/* 5. Tiện ích */}
            <Text className="font-bold text-slate-800 text-base mb-2">
              Tiện ích
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-8">
              {amenities.map((item) => {
                const isChecked = selectedAmenities.includes(item.maTienIch);
                return (
                  <Chip
                    key={item.maTienIch}
                    variant={isChecked ? "primary" : "secondary"}
                    color="default"
                    size="sm"
                    className={isChecked ? "bg-teal-700" : ""}
                    onPress={() => toggleAmenity(item.maTienIch)}
                  >
                    <Chip.Label
                      className={
                        isChecked
                          ? "text-white font-bold text-xs"
                          : "text-slate-600 text-xs"
                      }
                    >
                      {item.tenTienIch}
                    </Chip.Label>
                  </Chip>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer */}
          <View className="flex-row items-center justify-between px-5 pt-3 border-t border-slate-100">
            <Button variant="ghost" size="md" onPress={handleReset}>
              <Button.Label className="text-slate-500 font-semibold text-sm">
                Xóa bộ lọc
              </Button.Label>
            </Button>

            <Button
              variant="primary"
              size="md"
              className="bg-teal-700"
              onPress={handleApply}
            >
              <Button.Label className="text-white font-bold text-sm">
                Áp dụng
              </Button.Label>
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
