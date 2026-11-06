import React, { useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "heroui-native";

import { RentalProgressBar } from "../../components/booking/RentalProgressBar";
import { useBookingStore } from "../../store/useBookingStore";
import {
  AppointmentResponse,
  TrangThaiDatLich,
} from "../../types/booking.types";

// Map badge trạng thái góc phải
const getStatusBadge = (status: TrangThaiDatLich) => {
  switch (status) {
    case "CHO_XAC_NHAN":
      return {
        label: "Chờ xác nhận",
        bg: "bg-amber-50",
        text: "text-amber-700",
      };
    case "XAC_NHAN":
      return {
        label: "Đã xác nhận",
        bg: "bg-emerald-50",
        text: "text-emerald-700",
      };
    case "HOAN_THANH":
      return { label: "Hoàn tất", bg: "bg-sky-50", text: "text-sky-700" };
    case "HUY":
    default:
      return { label: "Đã hủy", bg: "bg-rose-50", text: "text-rose-600" };
  }
};

const formatCurrency = (amount: number): string => {
  const million = amount / 1000000;
  return `${million.toFixed(1).replace(".0", "")} triệu/tháng`;
};

const formatDate = (isoDate: string): string => {
  try {
    const d = new Date(isoDate);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  } catch {
    return isoDate;
  }
};

export default function RentalRequestsScreen() {
  const { appointments, isLoading, fetchAppointments } = useBookingStore();

  useEffect(() => {
    fetchAppointments();
  }, []);

  const renderCard = ({ item }: { item: AppointmentResponse }) => {
    const badge = getStatusBadge(item.trangThai);

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() =>
          router.push(`/booking/rental-detail?id=${item.maDatLich}`)
        }
      >
        <Card className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 shadow-none">
          {/* Hàng 1: Ảnh + Tiêu đề + Giá thuê */}
          <View className="flex-row items-center gap-3">
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

          {/* Hàng 2: Tóm tắt ngày nhận */}
          <Text className="text-xs text-slate-500 mt-3 mb-3">
            Ngày hẹn: {formatDate(item.ngayHen)}
          </Text>

          {/* Hàng 3: Trạng thái xử lý & Badge */}
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-sm text-slate-600 font-medium">
              Trạng thái xử lý
            </Text>
            <View className={`${badge.bg} px-3 py-1 rounded-full`}>
              <Text className={`text-xs font-semibold ${badge.text}`}>
                {badge.label}
              </Text>
            </View>
          </View>

          {/* Hàng 4: Thanh tiến trình Stepper */}
          <RentalProgressBar status={item.trangThai} />
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-slate-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900">Yêu cầu thuê</Text>
      </View>

      {/* Danh sách yêu cầu */}
      {isLoading && appointments.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0D9488" />
          <Text className="mt-3 text-xs text-slate-400">
            Đang tải yêu cầu thuê...
          </Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.maDatLich}
          renderItem={renderCard}
          contentContainerClassName="p-4"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={fetchAppointments}
              colors={["#0D9488"]}
              tintColor="#0D9488"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
