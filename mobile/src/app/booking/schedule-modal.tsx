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
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Button, Chip } from "heroui-native";

import { bookingService } from "../../services/booking.service";
import { roomService } from "../../services/room.service";
import { useBookingStore } from "../../store/useBookingStore";
import { useAuthStore } from "../../store/useAuthStore";
import { AppointmentCreateRequest } from "../../types/booking.types";
import { RoomDetailResponse } from "../../types/room.types";
import { CustomTimePickerModal } from "../../components/booking/CustomTimePickerModal";
import {
  TimeSlotPicker,
  TIME_SLOTS,
} from "../../components/booking/TimeSlotPicker";

export default function ScheduleModalScreen() {
  const {
    roomId,
    title,
    price,
    image,
    categoryName: paramCategoryName,
    depositAmount: paramDepositAmount,
  } = useLocalSearchParams<{
    roomId?: string;
    title?: string;
    price?: string;
    image?: string;
    categoryName?: string;
    depositAmount?: string;
  }>();

  const { user, isAuthenticated } = useAuthStore();
  const { fetchAppointments } = useBookingStore();

  const [roomData, setRoomData] = useState<RoomDetailResponse | null>(null);

  // Ràng buộc: Lịch hẹn phải cách hiện tại ít nhất 1 tiếng
  const isSlotValid = (slot: string, date: Date) => {
    const [h, m] = slot.split(":").map(Number);
    const slotDate = new Date(date);
    slotDate.setHours(h, m, 0, 0);
    return slotDate.getTime() >= Date.now() + 60 * 60 * 1000;
  };

  // Khởi tạo thời gian ban đầu: ưu tiên slot hợp lệ đầu tiên trong ngày hôm nay
  const [selectedDateTime, setSelectedDateTime] = useState<Date>(() => {
    const today = new Date();
    const firstValidSlot = TIME_SLOTS.find((slot) => isSlotValid(slot, today));
    if (firstValidSlot) {
      const [h, m] = firstValidSlot.split(":").map(Number);
      const d = new Date(today);
      d.setHours(h, m, 0, 0);
      return d;
    }
    // Nếu hôm nay đã qua hết khung giờ nhanh, mặc định là 2 tiếng sau
    return new Date(Date.now() + 2 * 60 * 60 * 1000);
  });

  // State điều khiển mở hộp thoại chọn ngày hoặc giờ tuỳ biến
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);

  // Khung giờ chọn nhanh bằng Chip: chọn slot hợp lệ đầu tiên nếu có
  const [selectedQuickTime, setSelectedQuickTime] = useState<string>(() => {
    const today = new Date();
    const firstValidSlot = TIME_SLOTS.find((slot) => isSlotValid(slot, today));
    return firstValidSlot || "";
  });

  // Xóa số điện thoại ảo, lấy số thật của người dùng
  const [phoneNumber, setPhoneNumber] = useState<string>(user?.sdt || "");
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Tải thông tin phòng để lấy Loại phòng và Mức cọc xem phòng thật
  useEffect(() => {
    if (roomId) {
      roomService
        .getRoomDetail(roomId)
        .then((data) => setRoomData(data))
        .catch(() => {});
    }
  }, [roomId]);

  // Mức cọc giữ chân lấy động 100% từ bảng Coc của Loại phòng trong DB
  const depositAmount =
    roomData?.loaiPhong?.soTienCoc ??
    (paramDepositAmount ? Number(paramDepositAmount) : 0);

  const categoryName =
    roomData?.loaiPhong?.tenLoaiPhongTro ||
    paramCategoryName ||
    "Phòng trọ";

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
    return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
  };

  // Chọn ngày từ DateTimePicker
  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (event.type === "set" && date) {
      const updated = new Date(selectedDateTime);
      updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());

      // Kiểm tra tính hợp lệ của khung giờ đã chọn trên ngày mới
      if (selectedQuickTime) {
        if (!isSlotValid(selectedQuickTime, updated)) {
          const firstValid = TIME_SLOTS.find((slot) =>
            isSlotValid(slot, updated),
          );
          if (firstValid) {
            setSelectedQuickTime(firstValid);
            const [h, m] = firstValid.split(":").map(Number);
            updated.setHours(h, m, 0, 0);
          } else {
            setSelectedQuickTime("");
          }
        }
      } else {
        if (updated.getTime() < Date.now() + 60 * 60 * 1000) {
          const firstValid = TIME_SLOTS.find((slot) =>
            isSlotValid(slot, updated),
          );
          if (firstValid) {
            setSelectedQuickTime(firstValid);
            const [h, m] = firstValid.split(":").map(Number);
            updated.setHours(h, m, 0, 0);
          } else {
            updated.setTime(Date.now() + 2 * 60 * 60 * 1000);
          }
        }
      }

      setSelectedDateTime(updated);
    }
  };

  // Chọn giờ tuỳ biến từ CustomTimePickerModal (hỗ trợ mượt mà cả iOS & Android)
  const handleCustomTimeConfirm = (newDateTime: Date) => {
    setSelectedDateTime(newDateTime);
    setSelectedQuickTime(""); // Bỏ chọn khung giờ nhanh
    setShowTimePicker(false);
  };

  // Chọn khung giờ nhanh từ component TimeSlotPicker
  const handleSelectQuickTime = (slot: string) => {
    setSelectedQuickTime(slot);
    const [h, m] = slot.split(":").map(Number);
    const updated = new Date(selectedDateTime);
    updated.setHours(h, m, 0, 0);
    setSelectedDateTime(updated);
  };

  // BƯỚC 2: Khách gửi yêu cầu đặt lịch hẹn (Chờ Chủ trọ duyệt trước khi nộp cọc)
  const handleCreateAppointment = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        "Yêu cầu đăng nhập",
        "Bạn cần đăng nhập tài khoản để đặt lịch xem phòng trọ.",
        [
          { text: "Để sau", style: "cancel" },
          {
            text: "Đăng nhập ngay",
            onPress: () => router.push("/(auth)/login" as any),
          },
        ]
      );
      return;
    }

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
      const res = await bookingService.createAppointment(payload);
      await fetchAppointments();
      setIsSubmitting(false);

      // Điều hướng ngay sang trang Thanh toán cọc giữ chân
      router.replace({
        pathname: "/booking/deposit-payment",
        params: {
          appointmentId: res.maDatLich,
          roomId: roomId,
          roomTitle: displayTitle,
          roomImage: displayImage || "",
          depositAmount: String(depositAmount),
          ngayHen: isoString,
          categoryName: categoryName,
          phoneNumber: phoneNumber,
        },
      });
    } catch (err: any) {
      setIsSubmitting(false);
      Alert.alert(
        "Lỗi gửi lịch",
        err.response?.data?.message ||
          err.message ||
          "Không thể đặt lịch xem phòng, vui lòng thử lại.",
      );
    }
  };

  const displayImage = image || roomData?.dsHinhAnh?.[0]?.url;
  const displayTitle =
    title || roomData?.moTa?.slice(0, 40) || `Phòng trọ mã #${roomId || "..."}`;
  const displayPrice = price
    ? formatCurrency(Number(price))
    : formatCurrency(roomData?.giaThue);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={{ flex: 1 }} className="bg-white">
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

        <View className="items-center justify-center py-24 px-6 flex-1">
          <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
            <Ionicons name="lock-closed-outline" size={32} color="#94A3B8" />
          </View>
          <Text className="text-base font-bold text-slate-800 text-center">
            Vui lòng đăng nhập
          </Text>
          <Text className="text-xs text-slate-500 mt-1.5 text-center max-w-xs leading-5">
            Bạn cần đăng nhập tài khoản để đặt lịch xem phòng trọ và nộp cọc giữ chân.
          </Text>
          <Button
            variant="primary"
            size="md"
            onPress={() => router.push("/(auth)/login" as any)}
            className="mt-5 rounded-full bg-teal-600 px-6"
          >
            <Button.Label className="text-white font-bold text-sm">
              Đăng nhập ngay
            </Button.Label>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

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
        <View className="flex-row items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-4">
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

        {/* 3. THÔNG TIN CỌC GIỮ CHÂN (Theo Loại phòng từ DB) */}
        <View className="bg-teal-50/60 border border-teal-200 p-4 rounded-2xl mb-5">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-xs font-bold text-teal-900 uppercase tracking-wide">
              Mức cọc xem phòng (Dự kiến)
            </Text>
            <Chip size="sm" variant="soft" color="accent">
              <Chip.Label>{categoryName}</Chip.Label>
            </Chip>
          </View>

          <View className="flex-row justify-between items-baseline my-1">
            <Text className="text-xs text-slate-600">Tiền cọc giữ chân:</Text>
            <Text className="text-lg font-extrabold text-teal-700">
              {formatCurrency(depositAmount)}
            </Text>
          </View>

          <View className="flex-row items-center gap-1.5 mt-2 pt-2 border-t border-teal-100">
            <Ionicons name="information-circle" size={16} color="#0D9488" />
            <Text className="text-[11px] text-teal-800 flex-1 leading-4">
              Lưu ý: Bạn sẽ tiến hành nộp cọc giữ chân ở bước tiếp theo để hệ thống gửi phiếu hẹn tới Chủ trọ xét duyệt. InnFinder cam kết hoàn trả 100% sau buổi xem phòng.


            </Text>
          </View>
        </View>

        {/* 4. Chọn Ngày xem */}
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

        {/* 5. Chọn Khung giờ bằng TimeSlotPicker */}
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
            selectedDate={selectedDateTime}
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

        {/* 6. Số điện thoại liên hệ */}
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

        {/* 7. Ghi chú cho chủ trọ */}
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

      {/* DateTimePicker chuẩn đa nền tảng (iOS Modal tờ lịch & Android Dialog) */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View className="flex-1 bg-black/50 justify-center items-center px-4">
            <Pressable
              className="absolute inset-0"
              onPress={() => setShowDatePicker(false)}
            />
            <View className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 z-10">
              {/* Header Modal */}
              <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 mb-2">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 rounded-full bg-teal-50 items-center justify-center">
                    <Ionicons name="calendar-outline" size={18} color="#0D9488" />
                  </View>
                  <Text className="text-base font-bold text-slate-900">
                    Chọn ngày xem phòng
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  className="p-1 rounded-full bg-slate-100"
                >
                  <Ionicons name="close" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Tờ lịch Apple xịn xò hiển thị trực tiếp */}
              <DateTimePicker
                value={selectedDateTime}
                mode="date"
                display="inline"
                minimumDate={new Date()}
                onChange={handleDateChange}
                themeVariant="light"
                accentColor="#0D9488"
              />

              {/* Nút chốt ngày */}
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                className="mt-3 bg-teal-600 py-3 rounded-xl items-center active:bg-teal-700"
              >
                <Text className="text-white font-bold text-sm">
                  Xác nhận ngày này
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      ) : (
        showDatePicker && (
          <DateTimePicker
            value={selectedDateTime}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={handleDateChange}
          />
        )
      )}

      {/* Modal chọn giờ riêng biệt chuẩn UI InnFinder (hỗ trợ cả iOS & Android) */}
      <CustomTimePickerModal
        visible={showTimePicker}
        selectedDateTime={selectedDateTime}
        onClose={() => setShowTimePicker(false)}
        onConfirm={handleCustomTimeConfirm}
      />

      {/* 8. Nút Gửi yêu cầu đặt lịch HeroUI Native */}
      <View className="px-5 py-3.5 border-t border-slate-100 bg-white">
        <Button
          variant="primary"
          size="lg"
          onPress={handleCreateAppointment}
          isDisabled={isSubmitting}
          className="w-full rounded-xl bg-teal-600"
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Button.Label className="font-bold text-white text-base">
              Gửi yêu cầu & Nộp cọc xem phòng
            </Button.Label>
          )}
        </Button>
      </View>
    </SafeAreaView>
  );
}
