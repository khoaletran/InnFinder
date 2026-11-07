import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from 'heroui-native';
import { WeekCalendarStrip, formatDateKey } from '../../components/landlord/WeekCalendarStrip';
import { LandlordAppointmentCard } from '../../components/landlord/LandlordAppointmentCard';
import { landlordService } from '../../services/landlord.service';
import { LandlordAppointmentItem } from '../../types/landlord.types';

const PAGE_SIZE = 5;

const DAY_NAMES = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

export default function AppointmentsScreen() {
  // 1. Khởi tạo ngày mặc định động là hôm nay (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateKey(new Date()));
  const [appointments, setAppointments] = useState<LandlordAppointmentItem[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset về trang 1 mỗi khi đổi ngày
  useEffect(() => {
    setCurrentPage(1);
    loadAppointments();
  }, [selectedDate]);

  const loadAppointments = async () => {
    const list = await landlordService.getAppointments(selectedDate);
    setAppointments(list);
  };

  const handleConfirm = async (id: string) => {
    await landlordService.confirmAppointment(id);
    alert('Đã xác nhận lịch xem phòng!');
    loadAppointments();
  };

  const handleReject = async (id: string) => {
    await landlordService.rejectAppointment(id);
    alert('Đã từ chối lịch xem phòng.');
    loadAppointments();
  };

  // Tiêu đề ngày định dạng tự động: Ví dụ "Thứ Bảy, 07/11/2026"
  const formattedDateTitle = useMemo(() => {
    if (!selectedDate) return '';
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayName = DAY_NAMES[dateObj.getDay()];
    const dayStr = String(d).padStart(2, '0');
    const monthStr = String(m).padStart(2, '0');
    return `${dayName}, ${dayStr}/${monthStr}/${y}`;
  }, [selectedDate]);

  // Tính toán phân trang
  const totalAppointments = appointments.length;
  const totalPages = Math.max(1, Math.ceil(totalAppointments / PAGE_SIZE));

  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return appointments.slice(start, start + PAGE_SIZE);
  }, [appointments, currentPage]);

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-slate-50" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3.5 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-gray-900">Lịch xem phòng</Text>
        <View className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200">
          <Text className="text-xs font-bold text-teal-700">{totalAppointments} cuộc hẹn</Text>
        </View>
      </View>

      {/* Dải lịch tuần tương tác động */}
      <WeekCalendarStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} />

      {/* Danh sách lịch hẹn */}
      <ScrollView
        style={{ flex: 1 }}
        className="px-4 py-4"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Tiêu đề ngày */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-bold text-gray-900">{formattedDateTitle}</Text>
          {totalAppointments > 0 && (
            <Text className="text-xs text-gray-500">
              Trang {currentPage} / {totalPages}
            </Text>
          )}
        </View>

        {/* Nội dung danh sách */}
        {totalAppointments === 0 ? (
          <Card className="p-8 bg-white rounded-2xl items-center justify-center my-4 border border-gray-100 shadow-sm">
            <Ionicons name="calendar-outline" size={44} color="#94A3B8" />
            <Text className="text-sm font-semibold text-gray-700 mt-3">
              Không có lịch xem phòng nào
            </Text>
            <Text className="text-xs text-gray-400 text-center mt-1">
              Chưa có khách đặt lịch hẹn xem phòng vào ngày {formattedDateTitle}.
            </Text>
          </Card>
        ) : (
          paginatedList.map((apt) => (
            <LandlordAppointmentCard
              key={apt.id}
              appointment={apt}
              onConfirm={handleConfirm}
              onReject={handleReject}
            />
          ))
        )}

        {/* Thanh điều hướng Phân trang (5 lịch / trang) */}
        {totalPages > 1 && (
          <View className="mt-4 pt-3 border-t border-gray-200">
            <View className="flex-row items-center justify-center gap-2">
              {/* Nút Trước */}
              <Pressable
                onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1.5 rounded-xl border flex-row items-center gap-1 ${
                  currentPage === 1
                    ? 'bg-gray-100 border-gray-200 opacity-50'
                    : 'bg-white border-gray-300 active:bg-gray-50'
                }`}
              >
                <Ionicons name="chevron-back" size={14} color="#374151" />
                <Text className="text-xs font-semibold text-gray-700">Trước</Text>
              </Pressable>

              {/* Các nút số trang */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                const isActive = pageNum === currentPage;
                return (
                  <Pressable
                    key={pageNum}
                    onPress={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-xl items-center justify-center border ${
                      isActive
                        ? 'bg-teal-700 border-teal-700'
                        : 'bg-white border-gray-200 active:bg-gray-50'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isActive ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      {pageNum}
                    </Text>
                  </Pressable>
                );
              })}

              {/* Nút Sau */}
              <Pressable
                onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1.5 rounded-xl border flex-row items-center gap-1 ${
                  currentPage === totalPages
                    ? 'bg-gray-100 border-gray-200 opacity-50'
                    : 'bg-white border-gray-300 active:bg-gray-50'
                }`}
              >
                <Text className="text-xs font-semibold text-gray-700">Sau</Text>
                <Ionicons name="chevron-forward" size={14} color="#374151" />
              </Pressable>
            </View>

            <Text className="text-[11px] text-gray-400 text-center mt-2">
              Hiển thị tối đa 5 lịch hẹn / trang
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
