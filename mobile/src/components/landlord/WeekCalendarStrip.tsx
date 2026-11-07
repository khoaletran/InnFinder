import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  selectedDate: string; // Định dạng 'YYYY-MM-DD'
  onSelectDate: (date: string) => void;
}

// Hàm chuẩn hoá ngày dạng YYYY-MM-DD từ Date object địa phương (tránh lệch timezone)
export const formatDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Hàm lấy ngày Thứ 2 đầu tuần của 1 ngày bất kỳ
const getMondayOfWeek = (date: Date): Date => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 là Chủ nhật, 1 là Thứ 2, ...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export const WeekCalendarStrip: React.FC<Props> = ({ selectedDate, onSelectDate }) => {
  // Lấy ngày hiện tại
  const todayStr = useMemo(() => formatDateKey(new Date()), []);

  // Khởi tạo ngày bắt đầu tuần (Thứ 2) dựa trên selectedDate
  const [currentMonday, setCurrentMonday] = useState<Date>(() => {
    if (selectedDate) {
      const [y, m, d] = selectedDate.split('-').map(Number);
      return getMondayOfWeek(new Date(y, m - 1, d));
    }
    return getMondayOfWeek(new Date());
  });

  // Modal mở lịch tháng để nhảy nhanh tới ngày bất kỳ
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [modalYear, setModalYear] = useState(new Date().getFullYear());
  const [modalMonth, setModalMonth] = useState(new Date().getMonth()); // 0-indexed

  // Tạo danh sách 7 ngày trong tuần từ Thứ 2 đến Chủ Nhật
  const weekDays = useMemo(() => {
    return DAY_LABELS.map((dayName, idx) => {
      const date = new Date(currentMonday);
      date.setDate(currentMonday.getDate() + idx);
      const fullDate = formatDateKey(date);
      const dayNum = String(date.getDate()).padStart(2, '0');
      const isToday = fullDate === todayStr;
      return { dayName, dayNum, fullDate, isToday, rawDate: date };
    });
  }, [currentMonday, todayStr]);

  // Tiêu đề tháng hiển thị
  const headerMonthText = useMemo(() => {
    const sunday = new Date(currentMonday);
    sunday.setDate(currentMonday.getDate() + 6);

    const mStart = currentMonday.getMonth() + 1;
    const yStart = currentMonday.getFullYear();
    const mEnd = sunday.getMonth() + 1;
    const yEnd = sunday.getFullYear();

    if (mStart === mEnd && yStart === yEnd) {
      return `Tháng ${mStart}, ${yStart}`;
    }
    if (yStart === yEnd) {
      return `Tháng ${mStart} - ${mEnd}, ${yStart}`;
    }
    return `Tháng ${mStart}/${yStart} - ${mEnd}/${yEnd}`;
  }, [currentMonday]);

  // Chuyển sang tuần trước (-7 ngày)
  const handlePrevWeek = () => {
    const prev = new Date(currentMonday);
    prev.setDate(currentMonday.getDate() - 7);
    setCurrentMonday(prev);
  };

  // Chuyển sang tuần sau (+7 ngày)
  const handleNextWeek = () => {
    const next = new Date(currentMonday);
    next.setDate(currentMonday.getDate() + 7);
    setCurrentMonday(next);
  };

  // Quay về ngày hôm nay
  const handleGoToday = () => {
    const today = new Date();
    setCurrentMonday(getMondayOfWeek(today));
    onSelectDate(formatDateKey(today));
  };

  // Tính toán các ngày trong tháng cho Modal chọn nhanh
  const monthDays = useMemo(() => {
    const firstDayOfMonth = new Date(modalYear, modalMonth, 1);
    const lastDayOfMonth = new Date(modalYear, modalMonth + 1, 0);
    const totalDays = lastDayOfMonth.getDate();

    // Thứ mấy trong tuần của ngày 1 (Thứ 2 = 0, CN = 6)
    let startDayIdx = firstDayOfMonth.getDay() - 1;
    if (startDayIdx === -1) startDayIdx = 6;

    const days: Array<{ dayNum: number; fullDate: string } | null> = [];

    // Ô trống đầu tháng
    for (let i = 0; i < startDayIdx; i++) {
      days.push(null);
    }
    // Các ngày trong tháng
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(modalYear, modalMonth, d);
      days.push({ dayNum: d, fullDate: formatDateKey(date) });
    }
    return days;
  }, [modalYear, modalMonth]);

  const handlePickFromModal = (fullDate: string) => {
    const [y, m, d] = fullDate.split('-').map(Number);
    const pickedDate = new Date(y, m - 1, d);
    setCurrentMonday(getMondayOfWeek(pickedDate));
    onSelectDate(fullDate);
    setShowMonthModal(false);
  };

  return (
    <View className="bg-white px-4 py-3 border-b border-gray-100">
      {/* 1. Header Tháng & Các nút điều hướng tuần */}
      <View className="flex-row items-center justify-between mb-3">
        <Pressable
          onPress={() => {
            const [y, m] = (selectedDate || todayStr).split('-').map(Number);
            setModalYear(y);
            setModalMonth(m - 1);
            setShowMonthModal(true);
          }}
          className="flex-row items-center gap-1.5 active:opacity-70 py-1"
        >
          <Text className="text-sm font-bold text-gray-900">{headerMonthText}</Text>
          <Ionicons name="calendar-outline" size={16} color="#0D9488" />
        </Pressable>

        <View className="flex-row items-center gap-2">
          {/* Nút Hôm nay */}
          <Pressable
            onPress={handleGoToday}
            className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 active:bg-teal-100"
          >
            <Text className="text-[11px] font-bold text-teal-700">Hôm nay</Text>
          </Pressable>

          {/* Nút Tuần trước */}
          <Pressable
            onPress={handlePrevWeek}
            className="w-7 h-7 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
          >
            <Ionicons name="chevron-back" size={16} color="#374151" />
          </Pressable>

          {/* Nút Tuần sau */}
          <Pressable
            onPress={handleNextWeek}
            className="w-7 h-7 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
          >
            <Ionicons name="chevron-forward" size={16} color="#374151" />
          </Pressable>
        </View>
      </View>

      {/* 2. Dải 7 ngày trong tuần */}
      <View className="flex-row justify-between">
        {weekDays.map((item) => {
          const isSelected = item.fullDate === selectedDate;
          return (
            <Pressable
              key={item.fullDate}
              onPress={() => onSelectDate(item.fullDate)}
              className="items-center"
            >
              <Text
                className={`text-[11px] font-medium mb-1 ${
                  isSelected ? 'text-teal-700 font-bold' : 'text-gray-400'
                }`}
              >
                {item.dayName}
              </Text>

              <View
                className={`w-9 h-9 rounded-full items-center justify-center ${
                  isSelected ? 'bg-teal-700' : item.isToday ? 'bg-teal-50 border border-teal-300' : 'bg-transparent'
                }`}
              >
                <Text
                  className={`text-sm font-bold ${
                    isSelected
                      ? 'text-white'
                      : item.isToday
                      ? 'text-teal-700'
                      : 'text-gray-800'
                  }`}
                >
                  {item.dayNum}
                </Text>
              </View>

              {/* Chấm tròn báo hiệu ngày hôm nay nếu không được focus */}
              {item.isToday && !isSelected ? (
                <View className="w-1 h-1 rounded-full bg-teal-600 mt-0.5" />
              ) : (
                <View className="w-1 h-1 mt-0.5" />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* 3. Modal Lịch Tháng (Chọn nhanh ngày bất kỳ trong năm) */}
      <Modal
        visible={showMonthModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMonthModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl">
            {/* Header Modal Tháng */}
            <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <Pressable
                onPress={() => {
                  if (modalMonth === 0) {
                    setModalMonth(11);
                    setModalYear((y) => y - 1);
                  } else {
                    setModalMonth((m) => m - 1);
                  }
                }}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Ionicons name="chevron-back" size={18} color="#374151" />
              </Pressable>

              <Text className="text-base font-bold text-gray-900">
                Tháng {modalMonth + 1}, {modalYear}
              </Text>

              <Pressable
                onPress={() => {
                  if (modalMonth === 11) {
                    setModalMonth(0);
                    setModalYear((y) => y + 1);
                  } else {
                    setModalMonth((m) => m + 1);
                  }
                }}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Ionicons name="chevron-forward" size={18} color="#374151" />
              </Pressable>
            </View>

            {/* Thứ trong tuần */}
            <View className="flex-row justify-between mb-2">
              {DAY_LABELS.map((label) => (
                <Text key={label} className="w-9 text-center text-xs font-semibold text-gray-400">
                  {label}
                </Text>
              ))}
            </View>

            {/* Lưới các ngày trong tháng */}
            <View className="flex-row flex-wrap">
              {monthDays.map((item, idx) => {
                if (!item) {
                  return <View key={`empty-${idx}`} className="w-[14.28%] h-9" />;
                }
                const isSelected = item.fullDate === selectedDate;
                const isToday = item.fullDate === todayStr;

                return (
                  <Pressable
                    key={item.fullDate}
                    onPress={() => handlePickFromModal(item.fullDate)}
                    className="w-[14.28%] h-9 items-center justify-center my-0.5"
                  >
                    <View
                      className={`w-8 h-8 rounded-full items-center justify-center ${
                        isSelected
                          ? 'bg-teal-700'
                          : isToday
                          ? 'bg-teal-50 border border-teal-300'
                          : 'bg-transparent'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isSelected
                            ? 'text-white'
                            : isToday
                            ? 'text-teal-700'
                            : 'text-gray-800'
                        }`}
                      >
                        {item.dayNum}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Nút đóng modal */}
            <Pressable
              onPress={() => setShowMonthModal(false)}
              className="mt-4 py-2.5 rounded-xl bg-gray-100 items-center active:bg-gray-200"
            >
              <Text className="text-xs font-semibold text-gray-700">Đóng</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};
