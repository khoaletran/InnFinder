import React from 'react';
import { View, Text } from 'react-native';
import { Card, Button } from 'heroui-native';
import { Ionicons } from '@expo/vector-icons';
import { LandlordAppointmentItem } from '../../types/landlord.types';

interface Props {
  appointment: LandlordAppointmentItem;
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
}

export const LandlordAppointmentCard: React.FC<Props> = ({
  appointment,
  onConfirm,
  onReject,
}) => {
  return (
    <Card className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm mb-3">
      {/* Khách & SĐT */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <View className="w-9 h-9 rounded-full bg-teal-100 items-center justify-center">
            <Text className="text-xs font-bold text-teal-800">
              {appointment.khachHangTen.slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text className="text-sm font-bold text-gray-900">{appointment.khachHangTen}</Text>
            <Text className="text-xs text-gray-400">{appointment.sdt}</Text>
          </View>
        </View>

        <View className="bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
          <Text className="text-[11px] font-semibold text-amber-700">Chờ xác nhận</Text>
        </View>
      </View>

      {/* Phòng & Giờ xem */}
      <View className="bg-gray-50 p-2.5 rounded-xl my-2">
        <Text className="text-xs font-semibold text-gray-800 mb-1" numberOfLines={1}>
          {appointment.phongTen}
        </Text>
        <View className="flex-row items-center gap-1">
          <Ionicons name="time-outline" size={13} color="#0f766e" />
          <Text className="text-xs font-semibold text-teal-700">{appointment.thoiGian}</Text>
        </View>
      </View>

      {/* Ghi chú */}
      {appointment.ghiChu && (
        <Text className="text-xs text-gray-500 italic mb-3">
          "{appointment.ghiChu}"
        </Text>
      )}

      {/* 2 nút hành động */}
      <View className="flex-row gap-2 mt-1">
        <View className="flex-1">
          <Button
            variant="outline"
            size="sm"
            onPress={() => onReject(appointment.id)}
            className="w-full border-gray-200"
          >
            <Button.Label className="text-gray-600 text-xs font-medium">Từ chối</Button.Label>
          </Button>
        </View>

        <View className="flex-1">
          <Button
            variant="primary"
            size="sm"
            onPress={() => onConfirm(appointment.id)}
            className="w-full bg-teal-700"
          >
            <Button.Label className="text-white text-xs font-bold">Xác nhận</Button.Label>
          </Button>
        </View>
      </View>
    </Card>
  );
};
