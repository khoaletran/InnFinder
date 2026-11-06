import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { RentalTimeline } from "../../components/booking/RentalTimeline";
import { CancelReasonModal } from "../../components/booking/CancelReasonModal";
import { useBookingStore } from "../../store/useBookingStore";

const formatCurrency = (amount?: number): string => {
  if (!amount) return "0 triệu/tháng";
  const million = amount / 1000000;
  return `${million.toFixed(1).replace(".0", "")} triệu/tháng`;
};

const formatPrice = (amount?: number): string => {
  if (!amount) return "0 triệu";
  const million = amount / 1000000;
  return `${million.toFixed(1).replace(".0", "")} triệu`;
};

const formatDate = (isoDate?: string): string => {
  if (!isoDate) return "--/--/----";
  try {
    const d = new Date(isoDate);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  } catch {
    return isoDate;
  }
};

export default function RentalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // 1. Lấy thêm isLoading từ useBookingStore
  const { appointments, isLoading, fetchAppointments, cancelAppointment } =
    useBookingStore();
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  useEffect(() => {
    if (appointments.length === 0) {
      fetchAppointments();
    }
  }, []);
  const item = appointments.find((a) => a.maDatLich === id);
  // TRẠNG THÁI 1: Đang nạp dữ liệu từ Backend
  if (isLoading && !item) {
    return (
      <SafeAreaView style={{ flex: 1 }} className="bg-white">
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-slate-100">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-900">
            Chi tiết yêu cầu
          </Text>
        </View>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0D9488" />
          <Text className="text-xs text-slate-400 mt-3">
            Đang tải chi tiết yêu cầu...
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  // TRẠNG THÁI 2: Đã nạp xong nhưng không tìm thấy mã đặt lịch này
  if (!item) {
    return (
      <SafeAreaView style={{ flex: 1 }} className="bg-white">
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-slate-100">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-900">
            Chi tiết yêu cầu
          </Text>
        </View>
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="alert-circle-outline" size={56} color="#CBD5E1" />
          <Text className="text-base font-bold text-slate-800 mt-4 mb-2">
            Không tìm thấy thông tin
          </Text>
          <Text className="text-xs text-slate-400 text-center mb-6 leading-5">
            Yêu cầu thuê này có thể đã bị xóa hoặc mã phòng không tồn tại.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="px-6 py-3 bg-teal-600 rounded-xl active:opacity-80"
          >
            <Text className="text-white font-semibold text-sm">
              Quay lại danh sách
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  // TRẠNG THÁI 3: Từ đây trở xuống, TypeScript tự động hiểu 100% item không thể null/undefined
  // Bạn có thể dùng item.ngayHen, item.giaThue, item.coc thoải mái mà không lo lỗi!
  const handleCallLandlord = () => {
    if (item.sdtChuTro) {
      Linking.openURL(`tel:${item.sdtChuTro}`);
    } else {
      Alert.alert("Thông báo", "Chưa có số điện thoại của chủ trọ.");
    }
  };

  // Xác nhận hủy yêu cầu
  const handleConfirmCancel = async (reason: string) => {
    setIsCanceling(true);
    const success = await cancelAppointment(item.maDatLich, reason);
    setIsCanceling(false);
    setCancelModalVisible(false);
    if (success) {
      Alert.alert("Thành công", "Đã hủy yêu cầu thuê phòng.");
      router.back();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-white">
      {/* 1. Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-slate-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900">
          Chi tiết yêu cầu
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 30,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Tóm tắt phòng */}
        <View className="flex-row items-center gap-3 pb-4 border-b border-slate-100">
          <Image
            source={{
              uri:
                item.hinhAnh ||
                "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500",
            }}
            className="w-16 h-16 rounded-xl bg-slate-100"
            resizeMode="cover"
          />
          <View className="flex-1">
            <Text
              className="text-base font-bold text-slate-900"
              numberOfLines={1}
            >
              {item.tieuDePhong || `Phòng trọ mã #${item.maPhongTro}`}
            </Text>
            <Text className="text-sm font-bold text-teal-600 mt-1">
              {formatCurrency(item.giaThue)}
            </Text>
          </View>
        </View>

        {/* 3. Bảng thông tin giá & cọc (Khớp 100% Ảnh 2) */}
        <View className="py-4 border-b border-slate-100 gap-3">
          <View className="flex-row justify-between">
            <Text className="text-sm text-slate-500">Ngày nhận phòng</Text>
            <Text className="text-sm font-bold text-slate-900">
              {formatDate(item.ngayHen)}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-sm text-slate-500">Giá thuê</Text>
            <Text className="text-sm font-bold text-slate-900">
              {formatCurrency(item.giaThue)}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-sm text-slate-500">Tiền đặt cọc xem</Text>
            <Text className="text-sm font-bold text-slate-900">
              {formatPrice(item.coc)}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-sm text-slate-500">Chủ trọ</Text>
            <Text className="text-sm font-bold text-slate-900">
              {item.tenChuTro || "Chủ trọ"}
            </Text>
          </View>
        </View>

        {/* 4. Dòng thời gian tiến độ xử lý */}
        <View className="py-4">
          <RentalTimeline status={item.trangThai} ngayHen={item.ngayHen} />
        </View>
      </ScrollView>

      {/* 5. Cố định 2 nút hành động ở đáy màn hình */}
      <View className="flex-row items-center gap-3 px-4 py-3 bg-white border-t border-slate-100">
        <TouchableOpacity
          onPress={() => setCancelModalVisible(true)}
          className="flex-1 py-3 rounded-xl border border-rose-500 items-center justify-center"
        >
          <Text className="text-base font-semibold text-rose-500">
            Hủy yêu cầu
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleCallLandlord}
          className="flex-1 py-3 rounded-xl bg-teal-600 items-center justify-center"
        >
          <Text className="text-base font-semibold text-white">
            Liên hệ chủ trọ
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal Hủy lịch HeroUI */}
      <CancelReasonModal
        visible={cancelModalVisible}
        isLoading={isCanceling}
        onClose={() => setCancelModalVisible(false)}
        onConfirm={handleConfirmCancel}
      />
    </SafeAreaView>
  );
}
