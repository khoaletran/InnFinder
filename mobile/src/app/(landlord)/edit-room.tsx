import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button, Card } from 'heroui-native';
import * as ImagePicker from 'expo-image-picker';
import { landlordService } from '../../services/landlord.service';
import { roomService } from '../../services/room.service';
import { tour360Service } from '../../services/tour360.service';
import { RoomDetailResponse } from '../../types/room.types';
import { Tour360Response } from '../../types/tour360.types';
import { formatVND } from '../../utils/formatVND';
import { LocationPickerModal } from '../../components/landlord/LocationPickerModal';
import { Tour360Modal } from '../../components/room/Tour360Modal';

const ROOM_TYPES = [
  { id: 'LPT002', name: 'Phòng trọ khép kín' },
  { id: 'LPT003', name: 'Chung cư mini / Studio' },
  { id: 'LPT001', name: 'Ký túc xá / Sleepbox' },
];

interface AmenityOption {
  id: string;
  name: string;
  iconType: 'ionicons' | 'material';
  iconName: string;
}

const AMENITY_OPTIONS: AmenityOption[] = [
  { id: 'TI0002', name: 'Máy lạnh', iconType: 'material', iconName: 'air-conditioner' },
  { id: 'TI0001', name: 'WiFi', iconType: 'ionicons', iconName: 'wifi-outline' },
  { id: 'TI0005', name: 'Giữ xe', iconType: 'material', iconName: 'garage' },
  { id: 'TI0004', name: 'Tủ lạnh', iconType: 'material', iconName: 'fridge-outline' },
  { id: 'TI0003', name: 'Máy giặt', iconType: 'material', iconName: 'washing-machine' },
  { id: 'TI0006', name: 'Khóa vân tay', iconType: 'ionicons', iconName: 'finger-print-outline' },
];

interface LocalImageItem {
  uri: string;
  isCover: boolean;
}

export default function EditRoomScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [originalRoom, setOriginalRoom] = useState<RoomDetailResponse | null>(null);

  // Form states
  const [tenPhong, setTenPhong] = useState('');
  const [selectedRoomType, setSelectedRoomType] = useState(ROOM_TYPES[0]);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [giaThue, setGiaThue] = useState('3500000');
  const [cocPhong, setCocPhong] = useState('3500000');
  const [dienTich, setDienTich] = useState('24');
  const [soNguoi, setSoNguoi] = useState(2);
  const [diaChi, setDiaChi] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [moTa, setMoTa] = useState('');
  const [images, setImages] = useState<LocalImageItem[]>([]);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number }>({
    latitude: 10.8231,
    longitude: 106.6874,
  });
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [roomTour360, setRoomTour360] = useState<Tour360Response | null>(null);
  const [tour360Open, setTour360Open] = useState(false);

  const handleSelectLocation = (
    coords: { latitude: number; longitude: number },
    suggestedAddress?: string
  ) => {
    setCoordinates(coords);
    if (!diaChi.trim() && suggestedAddress) {
      setDiaChi(suggestedAddress);
    }
  };

  // Modal Báo cáo Xác nhận lại cho Chủ trọ
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadRoomDetail(id);
      tour360Service.getRoomTour(id).then(setRoomTour360).catch(() => {});
    }
  }, [id]);

  const loadRoomDetail = async (roomId: string) => {
    try {
      setLoading(true);
      const data = await roomService.getRoomDetail(roomId);
      setOriginalRoom(data);

      setTenPhong((data as any).tenPhong || `Phòng ${data.maPhongTro}`);
      setDiaChi(data.diaChi || '');
      setGiaThue(data.giaThue ? data.giaThue.toString() : '3500000');
      setCocPhong(data.coc ? data.coc.toString() : '3500000');
      setDienTich(data.dienTich ? data.dienTich.toString() : '24');
      setSoNguoi(data.soNguoi || 2);
      setMoTa(data.moTa || '');

      const c1 = parseFloat(data.viDo || '');
      const c2 = parseFloat(data.kinhDo || '');
      let lat = 10.8231;
      let lng = 106.6874;
      if (!isNaN(c1) && !isNaN(c2)) {
        if (c1 > 90 && c2 <= 90) {
          lat = c2;
          lng = c1;
        } else if (c2 > 90 && c1 <= 90) {
          lat = c1;
          lng = c2;
        } else {
          lat = c1;
          lng = c2;
        }
      }
      setCoordinates({ latitude: lat, longitude: lng });

      const maLpt = data.loaiPhong?.maLpt;
      if (maLpt) {
        const foundType = ROOM_TYPES.find((t) => t.id === maLpt);
        if (foundType) setSelectedRoomType(foundType);
      }

      if (Array.isArray(data.dsTienIch)) {
        setSelectedAmenities(data.dsTienIch.map((t: any) => t.maTienIch));
      }

      if (Array.isArray(data.dsHinhAnh) && data.dsHinhAnh.length > 0) {
        setImages(
          data.dsHinhAnh.map((img: any, idx: number) => ({
            uri: img.url,
            isCover: idx === 0,
          }))
        );
      }
    } catch (e: any) {
      Alert.alert('Lỗi tải phòng', e.message || 'Không thể tải thông tin phòng trọ này.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  // Toggle tiện ích
  const toggleAmenity = (amenityId: string) => {
    if (selectedAmenities.includes(amenityId)) {
      setSelectedAmenities(selectedAmenities.filter((item) => item !== amenityId));
    } else {
      setSelectedAmenities([...selectedAmenities, amenityId]);
    }
  };

  // Chọn ảnh từ thư viện
  const handlePickImages = async () => {
    if (images.length >= 10) {
      Alert.alert('Giới hạn', 'Bạn chỉ được chọn tối đa 10 hình ảnh.');
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Cần quyền truy cập', 'Ứng dụng cần quyền thư viện ảnh để thêm ảnh phòng.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10 - images.length,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const newItems: LocalImageItem[] = result.assets.map((asset) => ({
        uri: asset.uri,
        isCover: false,
      }));
      setImages((prev) => {
        const combined = [...prev, ...newItems];
        if (!combined.some((img) => img.isCover) && combined.length > 0) {
          combined[0].isCover = true;
        }
        return combined;
      });
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length > 0 && !updated.some((img) => img.isCover)) {
        updated[0].isCover = true;
      }
      return updated;
    });
  };

  const setCoverImage = (index: number) => {
    setImages((prev) =>
      prev.map((img, i) => ({
        ...img,
        isCover: i === index,
      }))
    );
  };

  // Kiểm tra hợp lệ trước khi mở Báo cáo Xác nhận
  const handleOpenConfirmReport = () => {
    if (!diaChi.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập địa chỉ phòng trọ.');
      return;
    }
    const rent = Number(giaThue);
    if (!rent || rent <= 0) {
      Alert.alert('Giá không hợp lệ', 'Giá thuê phòng phải lớn hơn 0.');
      return;
    }
    if (images.length === 0) {
      Alert.alert('Thiếu hình ảnh', 'Vui lòng tải lên tối thiểu 1 hình ảnh phòng.');
      return;
    }

    // Mở Modal Báo cáo Xác nhận lại cho Chủ trọ
    setShowConfirmModal(true);
  };

  // Thực hiện lưu sau khi Chủ trọ đã kiểm tra và bấm Xác nhận
  const handleConfirmSave = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);

    try {
      // 1. Sắp xếp ảnh đại diện lên đầu
      const sortedImages = [...images].sort((a, b) => (b.isCover ? 1 : 0) - (a.isCover ? 1 : 0));
      const imageUris = sortedImages.map((img) => img.uri);

      // 2. Upload các ảnh local mới (nếu có) lên Cloudinary
      let uploadedUrls = imageUris;
      try {
        uploadedUrls = await landlordService.uploadImages(imageUris);
      } catch (uploadErr) {
        console.warn('Lỗi upload ảnh lên Cloudinary, dùng danh sách ảnh hiện tại:', uploadErr);
      }

      // 3. Chuẩn bị payload gửi lên API cập nhật phòng
      const payload = {
        maLpt: selectedRoomType.id,
        giaThue: Number(giaThue) || 3500000,
        coc: Number(cocPhong) || 3500000,
        dienTich: Number(dienTich) || 24,
        soNguoi,
        diaChi: diaChi.trim(),
        kinhDo: coordinates.longitude.toString(),
        viDo: coordinates.latitude.toString(),
        dsTienIch: selectedAmenities,
        moTa: moTa.trim(),
        hinhAnhUrls: uploadedUrls,
      };

      await landlordService.updateRoom(id!, payload);

      const isPreviouslyRejected = originalRoom?.trangThai === 'HUY';
      const successMessage = isPreviouslyRejected
        ? 'Cập nhật phòng trọ thành công! Do bài từng bị từ chối, bài đăng đã được tự động gửi lại cho Admin kiểm duyệt.'
        : 'Cập nhật thông tin phòng trọ thành công!';

      Alert.alert('Thành công', successMessage, [
        {
          text: 'Về danh sách phòng',
          onPress: () => router.replace('/(landlord)/my-rooms'),
        },
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể cập nhật phòng lúc này.';
      Alert.alert('Cập nhật thất bại', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1 }} className="bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0f766e" />
        <Text className="text-sm text-gray-500 font-medium mt-3">Đang tải thông tin phòng...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-slate-50" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3.5 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Pressable onPress={() => router.back()} className="p-1 -ml-1 active:opacity-70">
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <View>
            <Text className="text-base font-bold text-gray-900">Chỉnh sửa phòng trọ</Text>
            <Text className="text-xs text-gray-500 font-medium">Mã: #{id}</Text>
          </View>
        </View>

        {originalRoom?.trangThai === 'HUY' && (
          <View className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200">
            <Text className="text-[11px] font-bold text-rose-700">Từng bị từ chối</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        className="px-4 py-4"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner cảnh báo nếu phòng từng bị từ chối duyệt */}
        {originalRoom?.trangThai === 'HUY' && (originalRoom as any)?.liDoHuy && (
          <View className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl">
            <View className="flex-row items-center gap-1.5 mb-1">
              <Ionicons name="alert-circle" size={16} color="#e11d48" />
              <Text className="text-xs font-bold text-rose-800">Lý do bị từ chối trước đây:</Text>
            </View>
            <Text className="text-xs text-rose-700 leading-4">{originalRoom.liDoHuy}</Text>
            <Text className="text-[11px] text-rose-600 font-medium mt-2">
              Lưu ý: Sau khi sửa xong và bấm lưu, bài đăng sẽ tự động chuyển về "Chờ duyệt" để Admin kiểm tra lại.
            </Text>
          </View>
        )}

        {/* 1. THÔNG TIN CƠ BẢN */}
        <Card className="p-4 bg-white rounded-2xl border border-gray-100 mb-4 shadow-sm">
          <Text className="text-sm font-bold text-gray-900 mb-3 flex-row items-center">
            1. Thông tin cơ bản
          </Text>

          {/* Loại phòng */}
          <Text className="text-xs font-semibold text-gray-700 mb-1.5">Loại hình phòng</Text>
          <Pressable
            onPress={() => setShowTypeModal(true)}
            className="flex-row items-center justify-between border border-gray-200 rounded-xl px-3.5 py-3 mb-3 bg-gray-50/60 active:bg-gray-100"
          >
            <Text className="text-sm font-semibold text-gray-900">{selectedRoomType.name}</Text>
            <Ionicons name="chevron-down" size={18} color="#6b7280" />
          </Pressable>

          {/* Địa chỉ */}
          <Text className="text-xs font-semibold text-gray-700 mb-1.5">Địa chỉ cụ thể *</Text>
          <TextInput
            value={diaChi}
            onChangeText={setDiaChi}
            placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
            placeholderTextColor="#9ca3af"
            className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-gray-50/60 mb-2.5"
          />

          {/* Vị trí trên bản đồ */}
          <View className="mb-3">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-xs font-semibold text-gray-700">Vị trí phòng trên bản đồ</Text>
              <Pressable
                onPress={() => setShowLocationModal(true)}
                className="flex-row items-center gap-1 active:opacity-70"
              >
                <Ionicons name="map" size={13} color="#0f766e" />
                <Text className="text-xs font-bold text-teal-700">Đổi trên bản đồ</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => setShowLocationModal(true)}
              className="border border-teal-200 bg-teal-50/50 rounded-xl p-2.5 flex-row items-center justify-between active:bg-teal-100/50"
            >
              <View className="flex-row items-center gap-2 flex-1 pr-2">
                <View className="w-7 h-7 rounded-full bg-teal-100 items-center justify-center">
                  <Ionicons name="location" size={16} color="#0f766e" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-teal-950">
                    Tọa độ: {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}
                  </Text>
                  <Text className="text-[10px] text-teal-700 font-medium">
                    Chạm để điều chỉnh chính xác vị trí hiển thị cho khách
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#0f766e" />
            </Pressable>
          </View>

          {/* Giá thuê & Tiền cọc */}
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <Text className="text-xs font-semibold text-gray-700 mb-1.5">Giá thuê (đ/tháng) *</Text>
              <TextInput
                value={giaThue}
                onChangeText={setGiaThue}
                keyboardType="numeric"
                className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-teal-800 bg-gray-50/60"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-semibold text-gray-700 mb-1.5">Tiền cọc hợp đồng (đ)</Text>
              <TextInput
                value={cocPhong}
                onChangeText={setCocPhong}
                keyboardType="numeric"
                className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 bg-gray-50/60"
              />
            </View>
          </View>

          {/* Diện tích & Số người ở */}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-xs font-semibold text-gray-700 mb-1.5">Diện tích (m²)</Text>
              <TextInput
                value={dienTich}
                onChangeText={setDienTich}
                keyboardType="numeric"
                className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-gray-50/60"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-semibold text-gray-700 mb-1.5">Số người tối đa</Text>
              <View className="flex-row items-center justify-between border border-gray-200 rounded-xl px-2 py-1 bg-gray-50/60">
                <Pressable
                  onPress={() => setSoNguoi(Math.max(1, soNguoi - 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-gray-200 items-center justify-center active:bg-gray-100"
                >
                  <Ionicons name="remove" size={16} color="#374151" />
                </Pressable>
                <Text className="text-sm font-bold text-gray-900">{soNguoi} người</Text>
                <Pressable
                  onPress={() => setSoNguoi(soNguoi + 1)}
                  className="w-8 h-8 rounded-lg bg-white border border-gray-200 items-center justify-center active:bg-gray-100"
                >
                  <Ionicons name="add" size={16} color="#374151" />
                </Pressable>
              </View>
            </View>
          </View>
        </Card>

        {/* 2. TIỆN ÍCH & MÔ TẢ */}
        <Card className="p-4 bg-white rounded-2xl border border-gray-100 mb-4 shadow-sm">
          <Text className="text-sm font-bold text-gray-900 mb-3">2. Tiện ích & Mô tả</Text>

          {/* Danh sách tiện ích */}
          <Text className="text-xs font-semibold text-gray-700 mb-2">Tiện ích phòng</Text>
          <View className="flex-row flex-wrap gap-2.5 mb-4">
            {AMENITY_OPTIONS.map((item) => {
              const isSelected = selectedAmenities.includes(item.id);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => toggleAmenity(item.id)}
                  className={`w-[30%] py-2.5 px-2 rounded-xl items-center border ${
                    isSelected ? 'bg-teal-50 border-teal-600' : 'bg-gray-50/60 border-gray-200'
                  }`}
                >
                  {item.iconType === 'material' ? (
                    <MaterialCommunityIcons
                      name={item.iconName as any}
                      size={20}
                      color={isSelected ? '#0f766e' : '#6b7280'}
                    />
                  ) : (
                    <Ionicons
                      name={item.iconName as any}
                      size={20}
                      color={isSelected ? '#0f766e' : '#6b7280'}
                    />
                  )}
                  <Text
                    className={`text-[11px] font-semibold mt-1 text-center ${
                      isSelected ? 'text-teal-800' : 'text-gray-700'
                    }`}
                  >
                    {item.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Mô tả chi tiết (Không có chữ mẫu) */}
          <Text className="text-xs font-semibold text-gray-700 mb-1.5">Mô tả chi tiết phòng</Text>
          <TextInput
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={moTa}
            onChangeText={setMoTa}
            placeholder=""
            className="border border-gray-200 rounded-xl p-3 text-sm text-gray-900 bg-gray-50/60 min-h-[110px]"
          />
        </Card>

        {/* 3. HÌNH ẢNH PHÒNG */}
        <Card className="p-4 bg-white rounded-2xl border border-gray-100 mb-4 shadow-sm">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-bold text-gray-900">3. Hình ảnh chụp phòng</Text>
            <Text className="text-xs text-gray-400">({images.length}/10 ảnh)</Text>
          </View>

          {/* Nút thêm ảnh */}
          <Pressable
            onPress={handlePickImages}
            className="border-2 border-dashed border-teal-500 bg-teal-50/40 rounded-xl p-4 items-center justify-center mb-3 active:bg-teal-100/50"
          >
            <Ionicons name="camera-outline" size={24} color="#0f766e" />
            <Text className="text-xs font-bold text-teal-800 mt-1">Chọn thêm ảnh tải lên</Text>
          </Pressable>

          {/* Danh sách ảnh */}
          <View className="flex-row flex-wrap gap-2.5">
            {images.map((img, idx) => (
              <Pressable
                key={idx}
                onPress={() => setCoverImage(idx)}
                className="relative w-[30.5%] aspect-square rounded-xl overflow-hidden border border-gray-200"
              >
                <Image source={{ uri: img.uri }} className="w-full h-full" resizeMode="cover" />

                {img.isCover && (
                  <View className="absolute top-1 left-1 bg-teal-700 px-1.5 py-0.5 rounded">
                    <Text className="text-[9px] font-bold text-white">Ảnh chính</Text>
                  </View>
                )}

                <Pressable
                  onPress={() => removeImage(idx)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 items-center justify-center active:bg-black/80"
                >
                  <Ionicons name="close" size={12} color="#ffffff" />
                </Pressable>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Tour 360° đa điểm */}
        <Card className="p-4 rounded-2xl border border-gray-100 bg-white mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <Ionicons name="compass-outline" size={18} color="#0f766e" />
              <Text className="text-sm font-bold text-gray-900">Tour 360° đa điểm</Text>
            </View>
            {roomTour360 && roomTour360.nodes.length > 0 && (
              <View className="bg-emerald-100 px-2 py-0.5 rounded-full">
                <Text className="text-[10px] font-bold text-emerald-800">
                  {roomTour360.nodeCount} góc phòng
                </Text>
              </View>
            )}
          </View>
          <Text className="text-xs text-gray-500 mb-3">
            {roomTour360
              ? `Tour #${roomTour360.maTour} đã sẵn sàng cho khách tham quan.`
              : 'Chưa có Tour 360°. Chọn ảnh Panorama/360° từ máy để tạo tour cho phòng này.'}
          </Text>
          <View className="flex-row gap-2">
            {roomTour360 && roomTour360.nodes.length > 0 && (
              <Pressable
                onPress={() => setTour360Open(true)}
                className="flex-1 bg-slate-100 rounded-xl py-2.5 px-3 items-center justify-center active:bg-slate-200"
              >
                <Text className="text-xs font-bold text-slate-800">Xem thử 360°</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/(landlord)/tour-360',
                  params: { roomId: id, tourId: roomTour360?.maTour ?? '' },
                })
              }
              className="flex-1 bg-teal-700 rounded-xl py-2.5 px-3 items-center justify-center active:bg-teal-800"
            >
              <Text className="text-xs font-bold text-white">
                {roomTour360 ? 'Chỉnh sửa Tour 360°' : 'Tạo Tour 360°'}
              </Text>
            </Pressable>
          </View>
        </Card>
      </ScrollView>

      {/* FOOTER NÚT BẤM */}
      <View className="px-4 py-3 bg-white border-t border-gray-100 flex-row gap-3">
        <View className="flex-1">
          <Button
            variant="outline"
            onPress={() => router.back()}
            className="w-full border-gray-200 py-2.5 rounded-xl"
          >
            <Button.Label className="text-gray-700 font-semibold text-sm">Hủy bỏ</Button.Label>
          </Button>
        </View>

        <View className="flex-1">
          <Button
            variant="primary"
            onPress={handleOpenConfirmReport}
            isDisabled={submitting}
            className="w-full bg-teal-700 py-2.5 rounded-xl"
          >
            <Button.Label className="text-white font-bold text-sm">
              {submitting ? 'Đang lưu...' : 'Xem lại & Lưu'}
            </Button.Label>
          </Button>
        </View>
      </View>

      {/* MODAL 1: CHỌN LOẠI PHÒNG */}
      <Modal visible={showTypeModal} transparent animationType="fade">
        <Pressable
          onPress={() => setShowTypeModal(false)}
          className="flex-1 bg-black/40 items-center justify-center p-4"
        >
          <View className="w-full max-w-sm bg-white rounded-2xl p-4 shadow-xl">
            <Text className="text-base font-bold text-gray-900 mb-3">Chọn loại phòng</Text>
            {ROOM_TYPES.map((type) => {
              const isSelected = type.id === selectedRoomType.id;
              return (
                <Pressable
                  key={type.id}
                  onPress={() => {
                    setSelectedRoomType(type);
                    setShowTypeModal(false);
                  }}
                  className={`p-3 rounded-xl mb-1 flex-row items-center justify-between ${
                    isSelected ? 'bg-teal-50' : 'active:bg-gray-50'
                  }`}
                >
                  <Text className={`text-sm ${isSelected ? 'font-bold text-teal-800' : 'text-gray-800'}`}>
                    {type.name}
                  </Text>
                  {isSelected && <Ionicons name="checkmark" size={18} color="#0f766e" />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* MODAL 2: BÁO CÁO XÁC NHẬN LẠI CHO CHỦ TRỌ TRƯỚC KHI GỬI LƯU */}
      <Modal visible={showConfirmModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-5 max-h-[85%]">
            {/* Header Modal Báo cáo */}
            <View className="flex-row items-center justify-between pb-3 border-b border-gray-100">
              <View>
                <Text className="text-lg font-bold text-gray-900">Báo cáo xác nhận cập nhật</Text>
                <Text className="text-xs text-gray-500">Mã phòng: #{id}</Text>
              </View>
              <Pressable onPress={() => setShowConfirmModal(false)} className="p-1 -mr-1">
                <Ionicons name="close" size={22} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView className="py-3" showsVerticalScrollIndicator={false}>
              {/* Tóm tắt thông tin tài chính */}
              <View className="p-3 bg-teal-50 border border-teal-100 rounded-2xl mb-3">
                <View className="flex-row justify-between items-center mb-1.5">
                  <Text className="text-xs text-teal-700 font-medium">Giá thuê cập nhật:</Text>
                  <Text className="text-base font-extrabold text-teal-900">
                    {formatVND(Number(giaThue) || 0)}/tháng
                  </Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs text-teal-700 font-medium">Tiền cọc hợp đồng:</Text>
                  <Text className="text-sm font-bold text-teal-800">
                    {formatVND(Number(cocPhong) || 0)}
                  </Text>
                </View>
              </View>

              {/* Bảng chi tiết thông số */}
              <View className="border border-gray-100 rounded-2xl p-3 bg-slate-50/70 mb-3 gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-xs text-gray-500">Loại hình:</Text>
                  <Text className="text-xs font-semibold text-gray-800">{selectedRoomType.name}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-xs text-gray-500">Diện tích:</Text>
                  <Text className="text-xs font-semibold text-gray-800">{dienTich} m²</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-xs text-gray-500">Sức chứa tối đa:</Text>
                  <Text className="text-xs font-semibold text-gray-800">{soNguoi} người</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-xs text-gray-500">Địa chỉ:</Text>
                  <Text className="text-xs font-semibold text-gray-800 max-w-[65%]" numberOfLines={2}>
                    {diaChi}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-xs text-gray-500">Tọa độ bản đồ:</Text>
                  <Text className="text-xs font-semibold text-teal-800 font-bold">
                    {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-xs text-gray-500">Số tiện ích đã chọn:</Text>
                  <Text className="text-xs font-semibold text-gray-800">
                    {selectedAmenities.length} tiện ích
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-xs text-gray-500">Số hình ảnh lưu:</Text>
                  <Text className="text-xs font-semibold text-teal-700 font-bold">
                    {images.length} ảnh
                  </Text>
                </View>
              </View>

              {/* Cảnh báo trạng thái kiểm duyệt */}
              {originalRoom?.trangThai === 'HUY' ? (
                <View className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-3">
                  <Text className="text-xs text-amber-800 font-medium leading-4">
                    <Text className="font-bold">Lưu ý kiểm duyệt:</Text> Phòng này từng bị Admin từ chối. Khi bạn bấm xác nhận lưu, phòng sẽ tự động chuyển sang trạng thái <Text className="font-bold">"Chờ duyệt"</Text> để Ban quản trị xét duyệt lại.
                  </Text>
                </View>
              ) : (
                <View className="p-3 bg-blue-50 border border-blue-100 rounded-xl mb-3">
                  <Text className="text-xs text-blue-800 font-medium leading-4">
                    <Text className="font-bold">Thông báo:</Text> Các thay đổi sẽ được cập nhật và hiển thị công khai ngay lập tức trên hệ thống.
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* 2 Nút thao tác trong Modal Báo cáo */}
            <View className="pt-3 border-t border-gray-100 flex-row gap-3">
              <View className="flex-1">
                <Button
                  variant="outline"
                  onPress={() => setShowConfirmModal(false)}
                  className="w-full border-gray-200 py-2.5 rounded-xl"
                >
                  <Button.Label className="text-gray-700 font-semibold text-xs">
                    Sửa tiếp
                  </Button.Label>
                </Button>
              </View>

              <View className="flex-1">
                <Button
                  variant="primary"
                  onPress={handleConfirmSave}
                  className="w-full bg-teal-700 py-2.5 rounded-xl"
                >
                  <Button.Label className="text-white font-bold text-xs">
                    Xác nhận lưu
                  </Button.Label>
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: CHỌN VỊ TRÍ TRÊN BẢN ĐỒ */}
      <LocationPickerModal
        visible={showLocationModal}
        initialCoords={coordinates}
        onClose={() => setShowLocationModal(false)}
        onSelectLocation={handleSelectLocation}
      />

      <Tour360Modal
        visible={tour360Open}
        tourId={roomTour360?.maTour ?? null}
        title={tenPhong}
        onClose={() => setTour360Open(false)}
      />
    </SafeAreaView>
  );
}
