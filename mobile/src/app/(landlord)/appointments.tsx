import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WeekCalendarStrip } from '../../components/landlord/WeekCalendarStrip';
import { LandlordAppointmentCard } from '../../components/landlord/LandlordAppointmentCard';
import { landlordService } from '../../services/landlord.service';
import { LandlordAppointmentItem } from '../../types/landlord.types';

export default function AppointmentsScreen() {
  const [selectedDate, setSelectedDate] = useState('2026-08-28');
  const [appointments, setAppointments] = useState<LandlordAppointmentItem[]>([]);

  useEffect(() => {
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

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-slate-50" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3.5 bg-white border-b border-gray-100">
        <Text className="text-lg font-bold text-gray-900">Lịch xem phòng</Text>
      </View>

      {/* Dải lịch tuần */}
      <WeekCalendarStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} />

      {/* Danh sách lịch hẹn trong ngày */}
      <ScrollView
        style={{ flex: 1 }}
        className="px-4 py-4"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-sm font-bold text-gray-900 mb-3">Thứ 5, 28/08/2026</Text>

        {appointments.map((apt) => (
          <LandlordAppointmentCard
            key={apt.id}
            appointment={apt}
            onConfirm={handleConfirm}
            onReject={handleReject}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
