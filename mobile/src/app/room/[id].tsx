// mobile/src/app/room/[id].tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  Share,
  ActivityIndicator,
} from "react-native";
import { Avatar, Button, Card, Spinner } from "heroui-native";
import { Image } from "expo-image";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { roomService } from "../../services/room.service";
import { RoomDetailResponse } from "../../types/room.types";
import { useFilterStore } from "../../store/useFilterStore";
import { useAuthStore } from "../../store/useAuthStore";
import { AmenityGrid } from "../../components/room/AmenityGrid";

export default function RoomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [room, setRoom] = useState<RoomDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  const { user, activeMode } = useAuthStore();
  const isLandlordView =
    activeMode === "LANDLORD" ||
    (user?.maNguoiDung && room?.chuTro?.maChuTro === user.maNguoiDung);

  const { favoriteIds, toggleFavoriteLocal } = useFilterStore();
  const isFavorite = id ? favoriteIds.includes(id) : false;

  useEffect(() => {
    if (id) {
      loadDetail(id);
    }
  }, [id]);

  const loadDetail = async (roomId: string) => {
    try {
      setLoading(true);
      const data = await roomService.getRoomDetail(roomId);
      setRoom(data);
    } catch (error) {
      console.warn("Lỗi tải chi tiết phòng:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFavorite = async () => {
    if (!id) return;
    const next = toggleFavoriteLocal(id);
    try {
      if (next) await roomService.addFavorite(id);
      else await roomService.removeFavorite(id);
    } catch {
      toggleFavoriteLocal(id);
    }
  };

  const handleCall = () => {
    if (room?.chuTro?.sdt) Linking.openURL(`tel:${room.chuTro.sdt}`);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  if (!room) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-6">
        <Text className="text-slate-600 text-base">
          Không tìm thấy thông tin phòng trọ.
        </Text>
        <Button
          variant="primary"
          size="md"
          onPress={() => router.back()}
          className="mt-4"
        >
          <Button.Label>Quay lại</Button.Label>
        </Button>
      </View>
    );
  }

  const images =
    room.dsHinhAnh && room.dsHinhAnh.length > 0
      ? room.dsHinhAnh
      : [
          {
            maHinhAnh: "1",
            url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
            thuTuAnh: 0,
            laDaiDien: true,
          },
        ];

  return (
    <View className="flex-1 bg-white">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* 1. Image Carousel & Floating Actions */}
        <View className="relative w-full h-80 bg-slate-900">
          <Image
            source={{ uri: images[activeImageIndex]?.url }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />

          <View className="absolute top-12 left-0 right-0 flex-row justify-between px-4">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/90 items-center justify-center shadow-md"
            >
              <Ionicons name="arrow-back" size={20} color="#1E293B" />
            </Pressable>

            <View className="flex-row gap-2.5">
              <Pressable
                onPress={() => Share.share({ message: room.diaChi })}
                className="w-10 h-10 rounded-full bg-white/90 items-center justify-center shadow-md"
              >
                <Ionicons name="share-outline" size={20} color="#1E293B" />
              </Pressable>
              {!isLandlordView && (
                <Pressable
                  onPress={handleFavorite}
                  className="w-10 h-10 rounded-full bg-white/90 items-center justify-center shadow-md"
                >
                  <Ionicons
                    name={isFavorite ? "heart" : "heart-outline"}
                    size={20}
                    color={isFavorite ? "#0D9488" : "#1E293B"}
                  />
                </Pressable>
              )}
            </View>
          </View>

          <View className="absolute bottom-3 right-3 bg-black/60 px-2.5 py-1 rounded-md">
            <Text className="text-white text-xs font-semibold">
              {activeImageIndex + 1}/{images.length}
            </Text>
          </View>
        </View>

        {/* 2. Tiêu đề, Giá & Đặt cọc */}
        <View className="p-5 border-b border-slate-100">
          <Text className="text-xl font-bold text-slate-900 leading-snug">
            {room.loaiPhong?.tenLoaiPhongTro
              ? `${room.loaiPhong.tenLoaiPhongTro} · `
              : ""}
            {room.diaChi}
          </Text>

          <View className="flex-row items-baseline justify-between mt-2.5">
            <Text className="text-2xl font-extrabold text-teal-700">
              {(room.giaThue / 1_000_000).toFixed(1)} triệu/tháng
            </Text>
            <Text className="text-slate-500 text-xs">
              Đặt cọc: {(room.coc / 1_000_000).toFixed(1)} triệu
            </Text>
          </View>

          {/* 3 Ô thông số dùng Card HeroUI */}
          <View className="flex-row justify-between mt-4 gap-2.5">
            <Card className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <Text className="text-xs text-slate-500">Diện tích</Text>
              <Text className="text-base font-bold text-slate-800 mt-0.5">
                {room.dienTich} m²
              </Text>
            </Card>
            <Card className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <Text className="text-xs text-slate-500">Sức chứa</Text>
              <Text className="text-base font-bold text-slate-800 mt-0.5">
                {room.soNguoi} người
              </Text>
            </Card>
            <Card className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <Text className="text-xs text-slate-500">Khu vực</Text>
              <Text
                numberOfLines={1}
                className="text-base font-bold text-slate-800 mt-0.5"
              >
                {room.diaChi.split(",").pop()?.trim() || "Hồ Chí Minh"}
              </Text>
            </Card>
          </View>
        </View>

        {/* 3. Tiện ích */}
        <View className="p-5 border-b border-slate-100">
          <Text className="text-base font-bold text-slate-900 mb-3">
            Tiện ích
          </Text>
          <AmenityGrid amenities={room.dsTienIch} />
        </View>

        {/* 4. Mô tả chi tiết */}
        <View className="p-5 border-b border-slate-100">
          <Text className="text-base font-bold text-slate-900 mb-2">
            Mô tả chi tiết
          </Text>
          <Text className="text-sm text-slate-600 leading-relaxed">
            {room.moTa || "Phòng trọ đầy đủ tiện nghi, an ninh tốt."}
          </Text>
        </View>

        {/* 5. Thông tin Chủ trọ dùng Avatar HeroUI */}
        {room.chuTro && (
          <View className="p-5 flex-row items-center justify-between border-b border-slate-100 pb-28">
            <View className="flex-row items-center gap-3">
              <Avatar size="md" color="accent">
                <Avatar.Fallback>
                  <Text className="text-white font-bold text-sm">
                    {room.chuTro.hoTen
                      ? room.chuTro.hoTen.substring(0, 2).toUpperCase()
                      : "CT"}
                  </Text>
                </Avatar.Fallback>
              </Avatar>
              <View>
                <Text className="text-base font-bold text-slate-800">
                  {room.chuTro.hoTen || "Chủ trọ"}
                </Text>
                <Text className="text-xs text-teal-700 font-semibold mt-0.5">
                  Điểm uy tín: {room.chuTro.diemUyTin ?? 100}/100
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* 6. Fixed Bottom Action Bar */}
      {isLandlordView ? (
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-5 py-3.5 flex-row items-center gap-3 pb-safe shadow-lg">
          <View className="flex-1">
            <Text className="text-xs text-slate-500 font-medium">Trạng thái phòng</Text>
            <View className="flex-row items-center mt-1">
              <View
                className={`w-2 h-2 rounded-full mr-2 ${
                  room.trangThai === 'HOAN_THANH'
                    ? 'bg-emerald-500'
                    : room.trangThai === 'DA_DUYET'
                    ? 'bg-teal-600'
                    : room.trangThai === 'CHO_DUYET'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
              />
              <Text className="text-sm font-bold text-slate-800">
                {room.trangThai === 'HOAN_THANH'
                  ? 'Đã cho thuê'
                  : room.trangThai === 'DA_DUYET'
                  ? 'Đã đăng bài'
                  : room.trangThai === 'CHO_DUYET'
                  ? 'Chờ duyệt'
                  : 'Bị từ chối'}
              </Text>
            </View>
          </View>

          <View className="flex-1">
            <Button
              variant="primary"
              size="lg"
              onPress={() => router.back()}
              className="w-full rounded-full bg-teal-700"
            >
              <Button.Label className="font-bold text-white">
                Quay lại
              </Button.Label>
            </Button>
          </View>
        </View>
      ) : (
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-5 py-3.5 flex-row gap-3 pb-safe shadow-lg">
          <View className="flex-1">
            <Button
              variant="outline"
              size="lg"
              onPress={handleCall}
              className="w-full rounded-full"
            >
              <Button.Label className="font-bold text-slate-800">
                Gọi điện
              </Button.Label>
            </Button>
          </View>

          <View className="flex-1">
            <Button
              variant="primary"
              size="lg"
              onPress={() =>
                router.push({
                  pathname: "/booking/schedule-modal" as any,
                  params: {
                    roomId: room.maPhongTro,
                    title: room.moTa
                      ? room.moTa.slice(0, 40)
                      : `Phòng trọ #${room.maPhongTro}`,
                    price: room.giaThue,
                    image: room.dsHinhAnh?.[0]?.url || "",
                  },
                })
              }
              className="w-full rounded-full bg-teal-600"
            >
              <Button.Label className="font-bold text-white">
                Đặt lịch xem
              </Button.Label>
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}
