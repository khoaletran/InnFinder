// mobile/src/app/room/map-search.tsx
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
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

  const mapRef = useRef<MapView>(null);
  const hasCenteredUser = useRef<boolean>(false);

  // 1. Tự động xin quyền GPS của Android ngay khi mở màn hình
  useEffect(() => {
    const requestLocation = async () => {
      if (Platform.OS === "android") {
        try {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          );
        } catch (err) {
          console.warn("Lỗi xin quyền vị trí:", err);
        }
      }
    };
    requestLocation();
  }, []);

  // 2. Tải danh sách phòng từ Backend
  useEffect(() => {
    loadMapRooms();
  }, [filter]);

  const loadMapRooms = async () => {
    try {
      setLoading(true);
      const res = await roomService.searchRooms({ ...filter, size: 50 });
      const list = res?.content || [];
      setRooms(list);
      // Mới vào không chọn phòng nào cả
      setSelectedRoom(null);
    } catch (error) {
      console.warn("Lỗi tải phòng bản đồ:", error);
      setRooms([]);
      setSelectedRoom(null);
    } finally {
      setLoading(false);
    }
  };

  // Tọa độ khởi tạo mặc định (fallback nếu chưa bật GPS)
  const initialRegion = {
    latitude: 10.7769,
    longitude: 106.6958,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };

  // 3. Tự động lướt camera về vị trí hiện tại của bạn
  const handleUserLocationChange = (event: any) => {
    const coord = event?.nativeEvent?.coordinate;
    if (coord?.latitude && coord?.longitude && !hasCenteredUser.current) {
      hasCenteredUser.current = true;
      mapRef.current?.animateToRegion(
        {
          latitude: coord.latitude,
          longitude: coord.longitude,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        },
        1000,
      );
    }
  };

  return (
    <View className="flex-1 bg-white">
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      ) : (
        <MapView
          ref={mapRef}
          provider={PROVIDER_DEFAULT}
          style={{ width: "100%", height: "100%" }}
          initialRegion={initialRegion}
          showsUserLocation={true} // Hiện chấm xanh vị trí của bạn
          showsMyLocationButton={true}
          onUserLocationChange={handleUserLocationChange}
        >
          {rooms.map((room) => {
            const lat = parseFloat(room.viDo);
            const lng = parseFloat(room.kinhDo);
            if (isNaN(lat) || isNaN(lng)) return null;

            const isSelected = selectedRoom?.maPhongTro === room.maPhongTro;
            return (
              <Marker
                key={room.maPhongTro} // Giữ key cố định để không bị giật nhả sự kiện
                coordinate={{ latitude: lat, longitude: lng }}
                onPress={(e) => {
                  e?.stopPropagation?.();
                  setSelectedRoom(room); // ✅ Bấm phòng nào nhận ngay phòng đó
                }}
              >
                <PriceMapMarker price={room.giaThue} isSelected={isSelected} />
              </Marker>
            );
          })}
        </MapView>
      )}

      {/* Floating Top Search Bar */}
      <View
        className="absolute top-12 left-4 right-4 z-10"
        style={{ elevation: 10 }}
      >
        <Card className="flex-row items-center px-4 py-3 rounded-2xl shadow-md border border-slate-100 bg-white">
          <Pressable onPress={() => router.back()} className="mr-2.5">
            <Ionicons name="arrow-back" size={22} color="#1E293B" />
          </Pressable>
          <Text
            numberOfLines={1}
            className="flex-1 text-sm font-semibold text-slate-800"
          >
            {filter.keyword || "Bản đồ phòng trọ"}
          </Text>
          <Pressable onPress={() => setIsFilterModalOpen(true)} className="p-1">
            <Ionicons name="options-outline" size={20} color="#1E293B" />
          </Pressable>
        </Card>
      </View>

      {/* Floating Bottom Preview Card: Luôn nổi trên Map nhờ zIndex và elevation */}
      {selectedRoom && (
        <View
          style={{
            position: "absolute",
            bottom: 24,
            left: 16,
            right: 16,
            zIndex: 999,
            elevation: 20,
          }}
        >
          <Card className="p-3 rounded-2xl shadow-2xl border border-slate-100 bg-white relative">
            {/* Nút đóng thẻ phòng */}
            <Pressable
              onPress={() => setSelectedRoom(null)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-100 items-center justify-center z-30 active:bg-slate-200"
            >
              <Ionicons name="close" size={16} color="#64748B" />
            </Pressable>

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

              <Card.Body className="flex-1 ml-3 justify-between h-20 py-0.5 pr-6">
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
