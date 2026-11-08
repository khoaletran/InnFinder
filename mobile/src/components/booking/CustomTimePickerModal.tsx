import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface CustomTimePickerModalProps {
  visible: boolean;
  selectedDateTime: Date;
  onClose: () => void;
  onConfirm: (newDateTime: Date) => void;
}

// Khung giờ xem phòng phổ biến từ 06:00 sáng đến 22:00 tối
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6 -> 22
// Bước nhảy 5 phút
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export const CustomTimePickerModal: React.FC<CustomTimePickerModalProps> = ({
  visible,
  selectedDateTime,
  onClose,
  onConfirm,
}) => {
  const [hour, setHour] = useState<number>(selectedDateTime.getHours());
  const [minute, setMinute] = useState<number>(() => {
    const m = selectedDateTime.getMinutes();
    return (Math.round(m / 5) * 5) % 60;
  });

  // State quản lý việc mở Dropdown: 'hour' | 'minute' | null
  const [openDropdown, setOpenDropdown] = useState<"hour" | "minute" | null>(
    null,
  );

  useEffect(() => {
    if (visible) {
      setHour(selectedDateTime.getHours());
      const m = selectedDateTime.getMinutes();
      setMinute((Math.round(m / 5) * 5) % 60);
      setOpenDropdown(null);
    }
  }, [visible, selectedDateTime]);

  // Kiểm tra thời gian có hợp lệ không (cách thời điểm hiện tại ít nhất 1 tiếng)
  const candidate = new Date(selectedDateTime);
  candidate.setHours(hour, minute, 0, 0);
  const isValidTime = candidate.getTime() >= Date.now() + 60 * 60 * 1000;

  const handleConfirm = () => {
    if (!isValidTime) return;
    const result = new Date(selectedDateTime);
    result.setHours(hour, minute, 0, 0);
    onConfirm(result);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center items-center px-4">
        {/* Nền mờ bấm ra ngoài để đóng */}
        <Pressable className="absolute inset-0" onPress={onClose} />

        {/* Khối Modal Card */}
        <View className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 z-10">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 rounded-full bg-teal-50 items-center justify-center">
                <Ionicons name="time-outline" size={18} color="#0D9488" />
              </View>
              <View>
                <Text className="text-base font-bold text-slate-900">
                  Chọn giờ xem phòng
                </Text>
                <Text className="text-[11px] text-slate-500">
                  Từ 06:00 đến 22:00
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="p-1 rounded-full bg-slate-100"
              hitSlop={8}
            >
              <Ionicons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Ô số hiển thị giờ đã chọn dạng Digital Clock (Bấm trực tiếp vào để mở dropdown) */}
          <View className="my-3.5 items-center justify-center bg-teal-50/70 border border-teal-200/80 py-3 rounded-2xl">
            <Text className="text-[11px] font-semibold text-teal-700 uppercase tracking-wider mb-1">
              Giờ xem phòng được chọn
            </Text>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() =>
                  setOpenDropdown((prev) => (prev === "hour" ? null : "hour"))
                }
                className={`px-3 py-1 rounded-xl border ${
                  openDropdown === "hour"
                    ? "bg-teal-600 border-teal-600"
                    : "bg-white border-teal-200 shadow-xs"
                }`}
              >
                <Text
                  className={`text-3xl font-extrabold ${
                    openDropdown === "hour" ? "text-white" : "text-teal-800"
                  }`}
                >
                  {String(hour).padStart(2, "0")}
                </Text>
              </TouchableOpacity>

              <Text className="text-2xl font-bold text-teal-600">:</Text>

              <TouchableOpacity
                onPress={() =>
                  setOpenDropdown((prev) =>
                    prev === "minute" ? null : "minute",
                  )
                }
                className={`px-3 py-1 rounded-xl border ${
                  openDropdown === "minute"
                    ? "bg-teal-600 border-teal-600"
                    : "bg-white border-teal-200 shadow-xs"
                }`}
              >
                <Text
                  className={`text-3xl font-extrabold ${
                    openDropdown === "minute" ? "text-white" : "text-teal-800"
                  }`}
                >
                  {String(minute).padStart(2, "0")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 2 Khối Dropdown: Giờ & Phút */}
          <View className="flex-row gap-3 mb-3 items-start">
            {/* DROPDOWN GIỜ */}
            <View className="flex-1">
              <Text className="text-xs font-semibold text-slate-500 mb-1">
                Giờ
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setOpenDropdown((prev) => (prev === "hour" ? null : "hour"))
                }
                activeOpacity={0.7}
                className={`flex-row items-center justify-between px-3 py-2.5 rounded-xl border ${
                  openDropdown === "hour"
                    ? "border-teal-600 bg-teal-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <Text
                  className={`text-sm ${
                    openDropdown === "hour"
                      ? "font-bold text-teal-700"
                      : "font-semibold text-slate-800"
                  }`}
                >
                  {String(hour).padStart(2, "0")} giờ
                </Text>
                <Ionicons
                  name={openDropdown === "hour" ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={openDropdown === "hour" ? "#0D9488" : "#64748B"}
                />
              </TouchableOpacity>

              {/* Danh sách xổ xuống khi ấn vào Giờ */}
              {openDropdown === "hour" && (
                <View className="mt-1.5 max-h-48 rounded-xl border border-teal-200 bg-white shadow-lg overflow-hidden">
                  <ScrollView
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                  >
                    {HOURS.map((h) => {
                      const isSelected = h === hour;
                      return (
                        <TouchableOpacity
                          key={h}
                          onPress={() => {
                            setHour(h);
                            setOpenDropdown(null);
                          }}
                          className={`py-2 px-3 flex-row items-center justify-between border-b border-slate-50 ${
                            isSelected ? "bg-teal-50" : "bg-white"
                          }`}
                        >
                          <Text
                            className={`text-sm ${
                              isSelected
                                ? "font-bold text-teal-700"
                                : "text-slate-700"
                            }`}
                          >
                            {String(h).padStart(2, "0")} giờ
                          </Text>
                          {isSelected && (
                            <Ionicons
                              name="checkmark"
                              size={16}
                              color="#0D9488"
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* DROPDOWN PHÚT */}
            <View className="flex-1">
              <Text className="text-xs font-semibold text-slate-500 mb-1">
                Phút
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setOpenDropdown((prev) =>
                    prev === "minute" ? null : "minute",
                  )
                }
                activeOpacity={0.7}
                className={`flex-row items-center justify-between px-3 py-2.5 rounded-xl border ${
                  openDropdown === "minute"
                    ? "border-teal-600 bg-teal-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <Text
                  className={`text-sm ${
                    openDropdown === "minute"
                      ? "font-bold text-teal-700"
                      : "font-semibold text-slate-800"
                  }`}
                >
                  {String(minute).padStart(2, "0")} phút
                </Text>
                <Ionicons
                  name={
                    openDropdown === "minute" ? "chevron-up" : "chevron-down"
                  }
                  size={16}
                  color={openDropdown === "minute" ? "#0D9488" : "#64748B"}
                />
              </TouchableOpacity>

              {/* Danh sách xổ xuống khi ấn vào Phút */}
              {openDropdown === "minute" && (
                <View className="mt-1.5 max-h-48 rounded-xl border border-teal-200 bg-white shadow-lg overflow-hidden">
                  <ScrollView
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                  >
                    {MINUTES.map((m) => {
                      const isSelected = m === minute;
                      return (
                        <TouchableOpacity
                          key={m}
                          onPress={() => {
                            setMinute(m);
                            setOpenDropdown(null);
                          }}
                          className={`py-2 px-3 flex-row items-center justify-between border-b border-slate-50 ${
                            isSelected ? "bg-teal-50" : "bg-white"
                          }`}
                        >
                          <Text
                            className={`text-sm ${
                              isSelected
                                ? "font-bold text-teal-700"
                                : "text-slate-700"
                            }`}
                          >
                            {String(m).padStart(2, "0")} phút
                          </Text>
                          {isSelected && (
                            <Ionicons
                              name="checkmark"
                              size={16}
                              color="#0D9488"
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          {/* Cảnh báo nếu giờ hẹn không hợp lệ (nhỏ hơn hiện tại + 1 tiếng) */}
          {!isValidTime && (
            <View className="flex-row items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-xl px-2.5 py-1.5 mb-3">
              <Ionicons name="alert-circle" size={14} color="#E11D48" />
              <Text className="text-[11px] text-rose-600 flex-1 leading-4">
                Giờ hẹn cần cách thời điểm hiện tại ít nhất 1 tiếng.
              </Text>
            </View>
          )}

          {/* 2 Nút hành động */}
          <View className="flex-row gap-2 pt-2 border-t border-slate-100">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-slate-100 items-center justify-center"
            >
              <Text className="text-xs font-semibold text-slate-700">Đóng</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              disabled={!isValidTime}
              className={`flex-1 py-2.5 rounded-xl items-center justify-center ${
                isValidTime ? "bg-teal-600" : "bg-teal-300 opacity-60"
              }`}
            >
              <Text className="text-xs font-bold text-white">Xác nhận giờ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
