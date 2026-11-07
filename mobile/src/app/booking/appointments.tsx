import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "heroui-native";

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
  const { tab } = useLocalSearchParams<{ tab?: AppointmentFilterTab }>();
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
    if (tab) {
      setActiveTab(tab);
    }
    fetchAppointments();
  }, [tab]);

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
    const result = await cancelAppointment(selectedId, reason);
    setIsCanceling(false);
    setCancelModalVisible(false);

    if (result.success) {
      Alert.alert("Thành công", "Đã hủy lịch hẹn xem phòng.");
    } else {
      Alert.alert(
        "Lỗi",
        result.message || "Hủy lịch thất bại, vui lòng thử lại.",
      );
    }
  };

  const handlePressDetail = (maDatLich: string) => {
    router.push(`/booking/rental-detail?id=${maDatLich}`);
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View className="items-center justify-center py-24 px-6">
        <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
          <Ionicons name="calendar-outline" size={32} color="#94A3B8" />
        </View>
        <Text className="text-sm font-semibold text-slate-700">
          Chưa có lịch hẹn xem phòng
        </Text>
        <Text className="text-xs text-slate-400 mt-1 text-center">
          {activeTab === "ALL"
            ? "Bạn chưa đặt lịch xem phòng nào. Hãy khám phá phòng và đặt lịch ngay!"
            : "Không tìm thấy lịch hẹn nào trong trạng thái này."}
        </Text>
        <Button
          variant="primary"
          size="md"
          onPress={() => router.push("/(tenant)/index")}
          className="mt-4 rounded-full bg-teal-600 active:bg-teal-700"
        >
          <Button.Label className="text-white font-bold text-xs">
            Khám phá phòng ngay
          </Button.Label>
        </Button>
      </View>
    );
  };

  return (
    <View className="flex-1 pt-safe bg-slate-50">
      {/* 1. Header chuẩn InnFinder đồng bộ 100% với Phòng yêu thích */}
      <View className="px-4 py-3 bg-white border-b border-slate-200/80">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-xl font-bold text-slate-900">
              Lịch xem phòng
            </Text>
            <Text className="text-xs text-slate-500 mt-0.5">
              Theo dõi & quản lý các cuộc hẹn xem phòng
            </Text>
          </View>
          <View className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200">
            <Text className="text-xs font-bold text-teal-700">
              {filteredList.length} lịch hẹn
            </Text>
          </View>
        </View>

        {/* 2. Dải Pills lọc trạng thái bo tròn mượt mà */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {TAB_ITEMS.map((tabItem) => {
            const isSelected = activeTab === tabItem.key;
            return (
              <Pressable
                key={tabItem.key}
                onPress={() => setActiveTab(tabItem.key)}
                className={`px-3.5 py-1.5 rounded-full border ${
                  isSelected
                    ? "bg-teal-700 border-teal-700"
                    : "bg-white border-slate-200"
                }`}
              >
                <Text
                  className={`text-xs ${
                    isSelected
                      ? "font-semibold text-white"
                      : "font-medium text-slate-700"
                  }`}
                >
                  {tabItem.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Thông báo lỗi nếu có */}
      {error && !isLoading && (
        <View className="flex-row items-center bg-red-50 mx-4 mt-3 px-3 py-2 rounded-xl gap-2 border border-red-200">
          <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
          <Text className="text-xs text-red-600 flex-1">{error}</Text>
        </View>
      )}

      {/* Danh sách thẻ lịch hẹn */}
      {isLoading && appointments.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0D9488" />
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
            paddingBottom: 100,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
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

      {/* Modal Hủy lịch */}
      <CancelReasonModal
        visible={cancelModalVisible}
        isLoading={isCanceling}
        onClose={() => setCancelModalVisible(false)}
        onConfirm={handleConfirmCancel}
      />
    </View>
  );
}
