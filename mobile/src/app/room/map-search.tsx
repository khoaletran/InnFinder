// mobile/src/app/room/map-search.tsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";
import { Button, Card, Chip } from "heroui-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFilterStore } from "../../store/useFilterStore";
import { roomService } from "../../services/room.service";
import { RoomSummaryResponse } from "../../types/room.types";
import { PriceMapMarker } from "../../components/room/PriceMapMarker";
import { FilterModal } from "../../components/room/FilterModal";

// 1. Hàm tính khoảng cách giữa 2 tọa độ GPS theo km (Công thức Haversine)
function getDistanceInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Bán kính trái đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 2. Hàm thông minh tự động chuẩn hóa tọa độ (Tự sửa nếu kinh độ và vĩ độ bị lưu ngược)
function getValidCoords(
  room: RoomSummaryResponse,
): { lat: number; lng: number } | null {
  const c1 = parseFloat(room.viDo);
  const c2 = parseFloat(room.kinhDo);
  if (isNaN(c1) || isNaN(c2)) return null;

  let lat = c1;
  let lng = c2;

  // Ở Việt Nam: Vĩ độ (lat) luôn nằm trong khoảng [8, 24], Kinh độ (lng) nằm trong [102, 110]
  // Nếu viDo > 90 (ví dụ 106.6297) -> rõ ràng viDo đang giữ Kinh độ, cần đảo ngược lại!
  if (c1 > 90 && c2 <= 90) {
    lat = c2;
    lng = c1;
  } else if (c2 > 90 && c1 <= 90) {
    lat = c1;
    lng = c2;
  }

  // Nếu vẫn ngoài phạm vi Trái Đất [-90, 90] thì bỏ qua
  if (lat < -90 || lat > 90) return null;

  return { lat, lng };
}

export default function MapSearchScreen() {
  const { filter } = useFilterStore();
  const [rooms, setRooms] = useState<RoomSummaryResponse[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<RoomSummaryResponse | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState(false);
  const mapRef = useRef<MapView>(null);
  const [myLocation, setMyLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // 1. Tự động xin quyền GPS và lấy tọa độ thật của bạn
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (loc?.coords) {
            const currentCoords = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            };
            setMyLocation(currentCoords);

            // Tự động lướt bản đồ tới vị trí GPS thật của bạn
            mapRef.current?.animateToRegion(
              {
                ...currentCoords,
                latitudeDelta: 0.04,
                longitudeDelta: 0.04,
              },
              1000,
            );
          }
        }
      } catch (err) {
        console.warn("Lỗi định vị vị trí:", err);
      }
    })();
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
      setSelectedRoom(null);
    } catch (error) {
      console.warn("Lỗi tải phòng bản đồ:", error);
      setRooms([]);
      setSelectedRoom(null);
    } finally {
      setLoading(false);
    }
  };

  // Tọa độ mặc định ban đầu
  const initialRegion = {
    latitude: 10.8231,
    longitude: 106.6874,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  // Nút bấm bay về lại vị trí của bạn
  const handleRecenter = () => {
    if (isLocating) return;
    setIsLocating(true);
    setSelectedRoom(null);

    if (myLocation) {
      mapRef.current?.animateToRegion(
        {
          latitude: myLocation.latitude,
          longitude: myLocation.longitude,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        },
        800,
      );
    }
    setTimeout(() => setIsLocating(false), 900);
  };

  // 3. LỌC CÁC PHÒNG TRONG BÁN KÍNH 5KM (TỰ ĐỘNG CHUẨN HÓA TỌA ĐỘ)
  // 3. LỌC CHUẨN: CHỈ LẤY PHÒNG TRONG 5KM, KHÔNG CÓ THÌ ĐỂ TRỐNG
  const filteredRooms = useMemo(() => {
    if (!myLocation) return [];

    return rooms.filter((room) => {
      const coords = getValidCoords(room);
      if (!coords) return false;

      const distance = getDistanceInKm(
        myLocation.latitude,
        myLocation.longitude,
        coords.lat,
        coords.lng,
      );

      // Đúng trong vòng 5km mới lấy, ngoài 5km bỏ qua
      return distance <= 5;
    });
  }, [rooms, myLocation]);
  //return nearby.length > 0 ? nearby : rooms;
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
          showsUserLocation={true}
          showsMyLocationButton={false}
        >
          {/* VÒNG TRÒN BÁN KÍNH 5KM QUANH VỊ TRÍ GPS CỦA BẠN */}
          {myLocation && (
            <Circle
              center={myLocation}
              radius={5000} // 5000m = 5km
              fillColor="rgba(13, 148, 136, 0.08)"
              strokeColor="rgba(13, 148, 136, 0.45)"
              strokeWidth={1.5}
            />
          )}

          {/* RENDER CÁC PHÒNG ĐÃ ĐƯỢC CHUẨN HÓA TỌA ĐỘ */}
          {filteredRooms.map((room) => {
            const coords = getValidCoords(room);
            if (!coords) return null;

            const isSelected = selectedRoom?.maPhongTro === room.maPhongTro;
            return (
              <Marker
                key={room.maPhongTro}
                coordinate={{ latitude: coords.lat, longitude: coords.lng }}
                zIndex={isSelected ? 99 : 1}
                onPress={(e) => {
                  e?.stopPropagation?.();
                  setSelectedRoom(room); // ✅ Bấm vào cờ phòng hiện ngay Card thông tin!
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
          <View className="flex-1">
            <Text
              numberOfLines={1}
              className="text-sm font-semibold text-slate-800"
            >
              {filter.keyword || "Bản đồ phòng trọ"}
            </Text>
            <Text className="text-[10px] text-teal-700 font-bold">
              Bán kính 5km · {filteredRooms.length} phòng trọ
            </Text>
          </View>
          <Pressable onPress={() => setIsFilterModalOpen(true)} className="p-1">
            <Ionicons name="options-outline" size={20} color="#1E293B" />
          </Pressable>
        </Card>
      </View>

      {/* Nút định vị tròn GPS */}
      <View
        className="absolute right-4 z-20 items-center justify-center"
        style={{
          bottom: selectedRoom ? 215 : 32,
          elevation: 20,
        }}
      >
        {isLocating && (
          <View className="absolute -inset-1.5 rounded-full border-2 border-teal-400 bg-teal-400/25 animate-ping" />
        )}
        <Pressable
          onPress={handleRecenter}
          disabled={isLocating}
          className={`w-12 h-12 rounded-full items-center justify-center shadow-2xl border transition-all active:scale-90 ${
            isLocating
              ? "bg-teal-600 border-teal-500 scale-105"
              : "bg-white border-slate-200/80 active:bg-teal-50"
          }`}
          style={{
            shadowColor: isLocating ? "#0D9488" : "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isLocating ? 0.45 : 0.2,
            shadowRadius: 8,
          }}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="locate" size={24} color="#0D9488" />
          )}
        </Pressable>
      </View>

      {/* Floating Bottom Preview Card: Bấm vào cờ phòng sẽ bật Card này lên */}
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
