import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Button } from "heroui-native";

import { bookingService } from "../../services/booking.service";
import { roomService } from "../../services/room.service";
import { useBookingStore } from "../../store/useBookingStore";
import { useAuthStore } from "../../store/useAuthStore";
import { AppointmentCreateRequest } from "../../types/booking.types";
import { RoomDetailResponse } from "../../types/room.types";
import { TimeSlotPicker } from "../../components/booking/TimeSlotPicker";

export default function ScheduleModalScreen() {
  const { roomId, title, price, image } = useLocalSearchParams<{
    roomId?: string;
    title?: string;
    price?: string;
    image?: string;
  }>();

  const user = useAuthStore((state) => state.user);
  const { fetchAppointments } = useBookingStore();

  const [roomData, setRoomData] = useState<RoomDetailResponse | null>(null);

  // Mặc định thời gian hẹn là 2 tiếng sau thời điểm hiện tại
  const defaultDateTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const [selectedDateTime, setSelectedDateTime] =
    useState<Date>(defaultDateTime);

  // State điều khiển mở hộp thoại chọn ngày hoặc giờ tuỳ biến
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);

  // Khung giờ chọn nhanh bằng Chip
  const [selectedQuickTime, setSelectedQuickTime] = useState<string>("09:30");

  // Xóa số điện thoại ảo, lấy số thật của người dùng
  const [phoneNumber, setPhoneNumber] = useState<string>(user?.sdt || "");
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Tải thông tin phòng nếu chưa có sẵn từ params
  useEffect(() => {
    if (roomId && (!title || !price)) {
      roomService
        .getRoomDetail(roomId)
        .then((data) => setRoomData(data))
        .catch(() => {});
    }
  }, [roomId, title, price]);

  // Định dạng ngày hiển thị
  const formatDateDisplay = (d: Date): string => {
    const days = [
      "Chủ nhật",
      "Thứ 2",
      "Thứ 3",
      "Thứ 4",
      "Thứ 5",
      "Thứ 6",
      "Thứ 7",
    ];
    const dayName = days[d.getDay()];
    const dateStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    return `${dayName}, ${dateStr}`;
  };

  const formatTimeDisplay = (d: Date): string => {
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const formatCurrency = (amount?: number): string => {
    if (!amount) return "Đang cập nhật";
    const million = amount / 1000000;
    return `${million.toFixed(1).replace(".0", "")} triệu/tháng`;
  };

  // Chọn ngày từ DateTimePicker
  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (event.type === "set" && date) {
      const updated = new Date(selectedDateTime);
      updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      setSelectedDateTime(updated);
    }
  };

  // Chọn giờ tuỳ biến từ DateTimePicker
  const handleTimeChange = (event: DateTimePickerEvent, time?: Date) => {
    setShowTimePicker(Platform.OS === "ios");
    if (event.type === "set" && time) {
      const updated = new Date(selectedDateTime);
      updated.setHours(time.getHours(), time.getMinutes(), 0, 0);
      setSelectedDateTime(updated);
      setSelectedQuickTime(""); // Bỏ chọn khung giờ nhanh
    }
  };

  // Chọn khung giờ nhanh từ component TimeSlotPicker
  const handleSelectQuickTime = (slot: string) => {
    setSelectedQuickTime(slot);
    const [h, m] = slot.split(":").map(Number);
    const updated = new Date(selectedDateTime);
    updated.setHours(h, m, 0, 0);
    setSelectedDateTime(updated);
  };

  // Xác nhận đặt lịch
  const handleConfirm = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập số điện thoại liên hệ.");
      return;
    }

    if (!roomId) {
      Alert.alert("Lỗi", "Không tìm thấy mã phòng trọ để đặt lịch.");
      return;
    }

    // RÀNG BUỘC: Thời gian hẹn phải cách hiện tại ít nhất 1 tiếng
    const now = Date.now();
    const oneHourLater = now + 60 * 60 * 1000;

    if (selectedDateTime.getTime() < oneHourLater) {
      Alert.alert(
        "Thời gian hẹn không hợp lệ",
        "Thời gian hẹn xem phòng phải sau thời điểm hiện tại ít nhất 1 tiếng. Vui lòng chọn lại!",
      );
      return;
    }

    // Định dạng ISO: yyyy-MM-ddTHH:mm:ss
    const year = selectedDateTime.getFullYear();
    const month = String(selectedDateTime.getMonth() + 1).padStart(2, "0");
    const day = String(selectedDateTime.getDate()).padStart(2, "0");
    const h = String(selectedDateTime.getHours()).padStart(2, "0");
    const m = String(selectedDateTime.getMinutes()).padStart(2, "0");
    const isoString = `${year}-${month}-${day}T${h}:${m}:00`;

    const payload: AppointmentCreateRequest = {
      maPhongTro: roomId,
      ngayHen: isoString,
      ghiChu: note.trim() || undefined,
    };

    setIsSubmitting(true);
    try {
      await bookingService.createAppointment(payload);
      await fetchAppointments();
      setIsSubmitting(false);

      Alert.alert("Thành công", "Đặt lịch xem phòng thành công!", [
        {
          text: "Xem lịch hẹn",
          onPress: () => router.replace("/booking/appointments"),
        },
      ]);
    } catch (err: any) {
      setIsSubmitting(false);
      Alert.alert(
        "Lỗi đặt lịch",
        err.message || "Không thể đặt lịch xem phòng, vui lòng thử lại.",
      );
    }
  };

  const displayImage = image || roomData?.dsHinhAnh?.[0]?.url;
  const displayTitle =
    title || roomData?.moTa?.slice(0, 40) || `Phòng trọ mã #${roomId || "..."}`;
  const displayPrice = price
    ? formatCurrency(Number(price))
    : formatCurrency(roomData?.giaThue);

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-white">
      {/* 1. Header Modal */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100">
        <Text className="text-xl font-bold text-slate-900">
          Đặt lịch xem phòng
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
        >
          <Ionicons name="close" size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Thẻ tóm tắt phòng */}
        <View className="flex-row items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-5">
          {displayImage ? (
            <Image
              source={{ uri: displayImage }}
              className="w-14 h-14 rounded-xl bg-slate-200"
              resizeMode="cover"
            />
          ) : (
            <View className="w-14 h-14 rounded-xl bg-slate-200 items-center justify-center">
              <Ionicons name="home-outline" size={20} color="#64748B" />
            </View>
          )}
          <View className="flex-1">
            <Text
              className="text-sm font-bold text-slate-900"
              numberOfLines={1}
            >
              {displayTitle}
            </Text>
            <Text className="text-xs font-bold text-teal-600 mt-0.5">
              {displayPrice}
            </Text>
          </View>
        </View>

        {/* 3. Chọn Ngày xem */}
        <View className="mb-4">
          <Text className="text-sm font-bold text-slate-900 mb-2">
            Ngày xem phòng
          </Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
            className="flex-row items-center justify-between border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 active:bg-slate-100"
          >
            <Text className="text-sm font-semibold text-slate-800">
              {formatDateDisplay(selectedDateTime)}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#0D9488" />
          </TouchableOpacity>
        </View>

        {/* 4. Chọn Khung giờ bằng TimeSlotPicker */}
        <View className="mb-3">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-sm font-bold text-slate-900">
              Khung giờ xem phòng
            </Text>
            <TouchableOpacity
              onPress={() => setShowTimePicker(true)}
              className="flex-row items-center"
            >
              <Text className="text-xs font-semibold text-teal-600 mr-1">
                Giờ khác ({formatTimeDisplay(selectedDateTime)})
              </Text>
              <Ionicons name="time-outline" size={14} color="#0D9488" />
            </TouchableOpacity>
          </View>
          <TimeSlotPicker
            selectedTime={selectedQuickTime}
            onSelectTime={handleSelectQuickTime}
          />
        </View>

        {/* Ghi chú điều kiện 1 tiếng */}
        <View className="flex-row items-center gap-1.5 mb-5 px-1">
          <Ionicons
            name="information-circle-outline"
            size={14}
            color="#64748B"
          />
          <Text className="text-xs text-slate-500">
            Lưu ý: Thời gian hẹn phải cách thời điểm hiện tại ít nhất 1 tiếng.
          </Text>
        </View>

        {/* 5. Số điện thoại liên hệ */}
        <View className="mb-5">
          <Text className="text-sm font-bold text-slate-900 mb-2">
            Số điện thoại liên hệ
          </Text>
          <TextInput
            className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 bg-white"
            placeholder="Nhập số điện thoại liên hệ..."
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
        </View>

        {/* 6. Ghi chú cho chủ trọ */}
        <View className="mb-6">
          <Text className="text-sm font-bold text-slate-900 mb-2">
            Ghi chú (Tùy chọn)
          </Text>
          <TextInput
            className="border border-slate-200 rounded-xl p-3 text-sm text-slate-800 bg-white min-h-[80px]"
            placeholder="Ví dụ: Tôi có thể đến sớm hơn 10 phút..."
            placeholderTextColor="#94A3B8"
            value={note}
            onChangeText={setNote}
            multiline
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* DateTimePicker native */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDateTime}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={handleDateChange}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={selectedDateTime}
          mode="time"
          display="default"
          is24Hour={true}
          onChange={handleTimeChange}
        />
      )}

      {/* 7. Nút Xác nhận đặt lịch HeroUI Native */}
      <View className="px-5 py-3.5 border-t border-slate-100 bg-white">
        <Button
          variant="primary"
          size="lg"
          onPress={handleConfirm}
          isDisabled={isSubmitting}
          className="w-full rounded-xl bg-teal-600"
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Button.Label className="font-bold text-white text-base">
              Xác nhận đặt lịch
            </Button.Label>
          )}
        </Button>
      </View>
    </SafeAreaView>
  );
}
