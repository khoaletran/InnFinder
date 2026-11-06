import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppointmentCard } from "../../components/booking/AppointmentCard";
import { CancelReasonModal } from "../../components/booking/CancelReasonModal";
import {
  useBookingStore,
  AppointmentFilterTab,
} from "../../store/useBookingStore";
import { AppointmentResponse } from "../../types/booking.types";

const TAB_ITEMS: { key: AppointmentFilterTab; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "CHO_XAC_NHAN", label: "Chờ xác nhận" },
  { key: "XAC_NHAN", label: "Đã xác nhận" },
  { key: "HOAN_THANH", label: "Hoàn tất" },
];

export default function AppointmentsScreen() {
  const {
    appointments,
    isLoading,
    error,
    activeTab,
    setActiveTab,
    fetchAppointments,
    cancelAppointment,
  } = useBookingStore();

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const [isCanceling, setIsCanceling] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const filteredList: AppointmentResponse[] =
    activeTab === "ALL"
      ? appointments
      : appointments.filter((item) => item.trangThai === activeTab);

  const handlePressCancel = (maDatLich: string) => {
    setSelectedId(maDatLich);
    setCancelModalVisible(true);
  };

  const handleConfirmCancel = async (reason: string) => {
    setIsCanceling(true);
    const success = await cancelAppointment(selectedId, reason);
    setIsCanceling(false);
    setCancelModalVisible(false);
    if (success) {
      Alert.alert("Thành công", "Đã hủy lịch hẹn xem phòng.");
    } else {
      Alert.alert("Lỗi", "Hủy lịch thất bại, vui lòng thử lại.");
    }
  };

  const handlePressDetail = (maDatLich: string) => {
    // Điều hướng sang màn hình chi tiết tiến độ (rental-[id].tsx)
    router.push(`/booking/rental-detail?id=${maDatLich}`);
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View className="flex-1 justify-center items-center pt-24 px-8">
        <Ionicons name="calendar-outline" size={56} color="#94A3B8" />
        <Text className="text-base font-bold text-slate-800 mt-4 mb-1">
          Chưa có lịch hẹn
        </Text>
        <Text className="text-xs text-slate-500 text-center leading-5">
          {activeTab === "ALL"
            ? "Bạn chưa đặt lịch xem phòng nào. Tìm phòng và đặt lịch ngay!"
            : "Không có lịch hẹn nào trong trạng thái này."}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#FAFAFA]">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3.5 bg-white">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={8}
          className="mr-3"
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-[19px] font-bold text-slate-900 tracking-tight">
          Lịch xem phòng
        </Text>
      </View>

      {/* Underline Tabs Bar chuẩn Figma */}
      <View className="bg-white border-b border-slate-200 flex-row">
        {TAB_ITEMS.map((tab) => {
          const isSelected = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.8}
              className="flex-1 items-center pt-3 pb-2.5 relative"
            >
              <Text
                className={`text-[13px] font-medium tracking-tight ${
                  isSelected ? "text-[#008080] font-bold" : "text-slate-600"
                }`}
              >
                {tab.label}
              </Text>

              {/* Indicator Underline */}
              {isSelected && (
                <View className="absolute bottom-0 left-2 right-2 h-[2.5px] bg-[#008080] rounded-full" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Thông báo lỗi nếu có */}
      {error && !isLoading && (
        <View className="flex-row items-center bg-red-50 mx-4 mt-3 px-3 py-2 rounded-xl gap-2 border border-red-200">
          <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
          <Text className="text-xs text-red-600 flex-1">{error}</Text>
        </View>
      )}

      {/* Loading hoặc Danh sách */}
      {isLoading && appointments.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#008080" />
          <Text className="mt-3 text-xs text-slate-400">
            Đang tải lịch hẹn...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item) => item.maDatLich}
          renderItem={({ item }) => (
            <AppointmentCard
              item={item}
              onCancel={handlePressCancel}
              onDetail={handlePressDetail}
            />
          )}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 32,
            flexGrow: 1,
          }}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={fetchAppointments}
              colors={["#008080"]}
              tintColor="#008080"
            />
          }
        />
      )}

      {/* Dialog Hủy lịch */}
      <CancelReasonModal
        visible={cancelModalVisible}
        isLoading={isCanceling}
        onClose={() => setCancelModalVisible(false)}
        onConfirm={handleConfirmCancel}
      />
    </SafeAreaView>
  );
}
