// mobile/src/app/room/[id].tsx
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  Share,
  ActivityIndicator,
  FlatList,
  Modal,
  Dimensions,
  PanResponder,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar, Button, Card, Spinner } from "heroui-native";
import { Image } from "expo-image";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { roomService } from "../../services/room.service";
import { RoomDetailResponse } from "../../types/room.types";
import { useFilterStore } from "../../store/useFilterStore";
import { useAuthStore } from "../../store/useAuthStore";
import { AmenityGrid } from "../../components/room/AmenityGrid";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function RoomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [room, setRoom] = useState<RoomDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  // States cho modal xem ảnh toàn màn hình
  const [viewerVisible, setViewerVisible] = useState<boolean>(false);
  const [viewerIndex, setViewerIndex] = useState<number>(0);
  const bannerRef = useRef<FlatList>(null);
  const viewerRef = useRef<FlatList>(null);

  // Animation states cho cử chỉ kéo ảnh thu nhỏ & biến mất
  const panY = useRef(new Animated.Value(0)).current;

  const openViewer = (index: number) => {
    panY.setValue(0);
    setViewerIndex(index);
    setViewerVisible(true);
  };

  const closeViewer = () => {
    Animated.timing(panY, {
      toValue: SCREEN_HEIGHT,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setViewerVisible(false);
      panY.setValue(0);
    });
  };

  // PanResponder bắt cử chỉ kéo ảnh lên hoặc xuống
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Chỉ kích hoạt khi kéo theo phương dọc rõ rệt để không cản trở vuốt ảnh ngang
        return (
          Math.abs(gestureState.dy) > 12 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5
        );
      },
      onPanResponderMove: (_, gestureState) => {
        panY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        // Nếu kéo xuống quá 80px hoặc vuốt xuống nhanh
        if (gestureState.dy > 80 || gestureState.vy > 0.5) {
          Animated.timing(panY, {
            toValue: SCREEN_HEIGHT,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            setViewerVisible(false);
            panY.setValue(0);
          });
        }
        // Nếu kéo lên quá 80px hoặc vuốt lên nhanh
        else if (gestureState.dy < -80 || gestureState.vy < -0.5) {
          Animated.timing(panY, {
            toValue: -SCREEN_HEIGHT,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            setViewerVisible(false);
            panY.setValue(0);
          });
        }
        // Kéo nhẹ chưa đủ ngưỡng thì nảy đàn hồi về ban đầu
        else {
          Animated.spring(panY, {
            toValue: 0,
            friction: 7,
            tension: 40,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Hiệu ứng co nhỏ ảnh (scale từ 1 xuống 0.5) khi kéo lên hoặc xuống
  const imageScale = panY.interpolate({
    inputRange: [-SCREEN_HEIGHT, 0, SCREEN_HEIGHT],
    outputRange: [0.5, 1, 0.5],
    extrapolate: "clamp",
  });

  // Hiệu ứng mờ dần của ảnh khi kéo
  const imageOpacity = panY.interpolate({
    inputRange: [-SCREEN_HEIGHT * 0.45, 0, SCREEN_HEIGHT * 0.45],
    outputRange: [0, 1, 0],
    extrapolate: "clamp",
  });

  // Hiệu ứng mờ dần của nền đen
  const backdropOpacity = panY.interpolate({
    inputRange: [-SCREEN_HEIGHT * 0.5, 0, SCREEN_HEIGHT * 0.5],
    outputRange: [0, 1, 0],
    extrapolate: "clamp",
  });

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
          <FlatList
            ref={bannerRef}
            data={images}
            keyExtractor={(_, index) => `banner-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setActiveImageIndex(newIndex);
            }}
            renderItem={({ item, index }) => (
              <Pressable
                onPress={() => openViewer(index)}
                style={{ width: SCREEN_WIDTH, height: 320 }}
                className="active:opacity-95"
              >
                <Image
                  source={{ uri: item.url }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              </Pressable>
            )}
          />

          <View className="absolute top-12 left-0 right-0 flex-row justify-between px-4 pointer-events-box-none">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/90 items-center justify-center shadow-md active:bg-white"
            >
              <Ionicons name="arrow-back" size={20} color="#1E293B" />
            </Pressable>

            <View className="flex-row gap-2.5">
              <Pressable
                onPress={() => Share.share({ message: room.diaChi })}
                className="w-10 h-10 rounded-full bg-white/90 items-center justify-center shadow-md active:bg-white"
              >
                <Ionicons name="share-outline" size={20} color="#1E293B" />
              </Pressable>
              {!isLandlordView && (
                <Pressable
                  onPress={handleFavorite}
                  className="w-10 h-10 rounded-full bg-white/90 items-center justify-center shadow-md active:bg-white"
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

          {/* Badge đếm số ảnh - Bấm vào sẽ mở xem full ảnh */}
          <Pressable
            onPress={() => openViewer(activeImageIndex)}
            className="absolute bottom-3 right-3 bg-black/60 px-3 py-1.5 rounded-full flex-row items-center gap-1.5 active:bg-black/80"
          >
            <Ionicons name="images-outline" size={14} color="#ffffff" />
            <Text className="text-white text-xs font-semibold">
              {activeImageIndex + 1}/{images.length}
            </Text>
          </Pressable>
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

      {/* 7. Modal Xem ảnh Toàn màn hình (Chỉ hiển thị ảnh, vuốt lên/xuống thu nhỏ và biến mất) */}
      <Modal
        visible={viewerVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeViewer}
      >
        <View className="flex-1">
          {/* Nền đen mờ dần theo chuyển động kéo */}
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "#000000",
              opacity: backdropOpacity,
            }}
          />

          {/* Container ảnh có hiệu ứng translateY, scale và opacity */}
          <Animated.View
            {...panResponder.panHandlers}
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              transform: [{ translateY: panY }, { scale: imageScale }],
              opacity: imageOpacity,
            }}
          >
            {/* Danh sách ảnh vuốt ngang full màn hình */}
            <FlatList
              ref={viewerRef}
              data={images}
              keyExtractor={(_, index) => `viewer-${index}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={viewerIndex}
              getItemLayout={(_, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
              onMomentumScrollEnd={(e) => {
                const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setViewerIndex(newIndex);
                setActiveImageIndex(newIndex);
                bannerRef.current?.scrollToIndex({ index: newIndex, animated: false });
              }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={closeViewer}
                  style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                  className="items-center justify-center"
                >
                  <Image
                    source={{ uri: item.url }}
                    style={{ width: SCREEN_WIDTH, height: "100%" }}
                    contentFit="contain"
                  />
                </Pressable>
              )}
            />
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}
