// mobile/src/app/room/map-search.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { Button, Card, Chip } from "heroui-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFilterStore } from "../../store/useFilterStore";
import { roomService } from "../../services/room.service";
import { RoomSummaryResponse } from "../../types/room.types";
import { PriceMapMarker } from "../../components/room/PriceMapMarker";
import { FilterModal } from "../../components/room/FilterModal";

export default function MapSearchScreen() {
  const { filter } = useFilterStore();
  const [rooms, setRooms] = useState<RoomSummaryResponse[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<RoomSummaryResponse | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);

  useEffect(() => {
    loadMapRooms();
  }, [filter]);

  const loadMapRooms = async () => {
    try {
      setLoading(true);
      const res = await roomService.searchRooms({ ...filter, size: 50 });
      const list = res?.content || [];
      setRooms(list);
      if (list.length > 0) setSelectedRoom(list[0]);
    } catch (error) {
      console.warn("Lỗi tải phòng bản đồ:", error);
    } finally {
      setLoading(false);
    }
  };

  const initialRegion = {
    latitude: selectedRoom?.viDo ? parseFloat(selectedRoom.viDo) : 10.776,
    longitude: selectedRoom?.kinhDo ? parseFloat(selectedRoom.kinhDo) : 106.685,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };

  return (
    <View className="flex-1 bg-white">
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      ) : (
        <MapView
          provider={PROVIDER_DEFAULT}
          style={{ width: "100%", height: "100%" }}
          initialRegion={initialRegion}
        >
          {rooms.map((room) => {
            const lat = parseFloat(room.viDo);
            const lng = parseFloat(room.kinhDo);
            if (isNaN(lat) || isNaN(lng)) return null;

            const isSelected = selectedRoom?.maPhongTro === room.maPhongTro;
            return (
              <Marker
                key={room.maPhongTro}
                coordinate={{ latitude: lat, longitude: lng }}
                onPress={() => setSelectedRoom(room)}
              >
                <PriceMapMarker price={room.giaThue} isSelected={isSelected} />
              </Marker>
            );
          })}
        </MapView>
      )}

      {/* Floating Top Search Bar */}
      <View className="absolute top-12 left-4 right-4">
        <Card className="flex-row items-center px-4 py-3 rounded-2xl shadow-md border border-slate-100 bg-white">
          <Pressable onPress={() => router.back()} className="mr-2.5">
            <Ionicons name="arrow-back" size={22} color="#1E293B" />
          </Pressable>
          <Text
            numberOfLines={1}
            className="flex-1 text-sm font-semibold text-slate-800"
          >
            {filter.keyword || "TP. Hồ Chí Minh"}
          </Text>
          <Pressable
            onPress={() => setIsFilterModalOpen(true)}
            className="p-1"
          >
            <Ionicons name="options-outline" size={20} color="#1E293B" />
          </Pressable>
        </Card>
      </View>

      {/* Floating Bottom Preview Card */}
      {selectedRoom && (
        <View className="absolute bottom-6 left-4 right-4">
          <Card className="p-3 rounded-2xl shadow-lg border border-slate-100 bg-white">
            <View className="flex-row items-center">
              <Image
                source={{
                  uri:
                    selectedRoom.anhDaiDien ||
                    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500",
                }}
                style={{ width: 80, height: 80, borderRadius: 12 }}
                contentFit="cover"
              />

              <Card.Body className="flex-1 ml-3 justify-between h-20 py-0.5">
                <View>
                  <Chip variant="soft" color="success" size="sm">
                    <Chip.Label className="text-[10px] font-bold text-teal-800">
                      Đang chọn
                    </Chip.Label>
                  </Chip>
                  <Text
                    numberOfLines={1}
                    className="text-sm font-bold text-slate-900 mt-1"
                  >
                    {selectedRoom.tenLoaiPhong
                      ? `${selectedRoom.tenLoaiPhong} · `
                      : ""}
                    {selectedRoom.diaChi}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between">
                  <Text className="text-teal-700 font-extrabold text-sm">
                    {(selectedRoom.giaThue / 1_000_000).toFixed(1)} triệu/tháng
                  </Text>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() =>
                      router.push(`/room/${selectedRoom.maPhongTro}` as any)
                    }
                  >
                    <Button.Label className="text-xs font-bold text-teal-700">
                      Xem chi tiết →
                    </Button.Label>
                  </Button>
                </View>
              </Card.Body>
            </View>
          </Card>
        </View>
      )}

      {/* Modal Bộ Lọc */}
      <FilterModal
        visible={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
      />
    </View>
  );
}
