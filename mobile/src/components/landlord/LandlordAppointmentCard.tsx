import React from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { Card, Button } from 'heroui-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LandlordAppointmentItem } from '../../types/landlord.types';

export interface LandlordAppointmentCardProps {
  appointment: LandlordAppointmentItem;
  onConfirm: (id: string) => void | Promise<void>;
  onReject: (id: string) => void | Promise<void>;
  onComplete?: (id: string) => void | Promise<void>;
  onCancelRental?: (id: string) => void | Promise<void>;
}

export type Props = LandlordAppointmentCardProps;

const STATUS_CONFIG: Record<
  LandlordAppointmentItem['trangThai'],
  { label: string; bg: string; text: string; border: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  CHO_XAC_NHAN: {
    label: 'Chờ xác nhận',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: 'time-outline',
  },
  XAC_NHAN: {
    label: 'Đã xác nhận xem',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: 'checkmark-circle-outline',
  },
  HOAN_THANH: {
    label: 'Đã thuê phòng',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: 'ribbon-outline',
  },
  HUY: {
    label: 'Đã hủy',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: 'close-circle-outline',
  },
};

export const LandlordAppointmentCard: React.FC<Props> = ({
  appointment,
  onConfirm,
  onReject,
  onComplete,
  onCancelRental,
}) => {
  const statusInfo = STATUS_CONFIG[appointment.trangThai] || STATUS_CONFIG.CHO_XAC_NHAN;

  const handleCall = () => {
    if (appointment.sdt) {
      Linking.openURL(`tel:${appointment.sdt}`);
    }
  };

  return (
    <Card className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm mb-3">
      {/* 1. Header: Thông tin khách hàng & Badge trạng thái */}
      <View className="flex-row items-center justify-between mb-3 pb-3 border-b border-gray-100">
        <View className="flex-row items-center gap-2.5 flex-1 mr-2">
          <View className="w-10 h-10 rounded-full bg-teal-100 items-center justify-center">
            <Text className="text-xs font-bold text-teal-800">
              {appointment.khachHangTen ? appointment.khachHangTen.slice(0, 2).toUpperCase() : 'KH'}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
              {appointment.khachHangTen}
            </Text>
            <Pressable onPress={handleCall} className="flex-row items-center gap-1 mt-0.5">
              <Ionicons name="call-outline" size={12} color="#0D9488" />
              <Text className="text-xs text-teal-700 font-medium">{appointment.sdt}</Text>
            </Pressable>
          </View>
        </View>

        {/* Badge trạng thái */}
        <View className={`px-2.5 py-1 rounded-full border flex-row items-center gap-1 ${statusInfo.bg} ${statusInfo.border}`}>
          <Ionicons name={statusInfo.icon} size={12} color={statusInfo.text.replace('text-', '#')} />
          <Text className={`text-[11px] font-bold ${statusInfo.text}`}>{statusInfo.label}</Text>
        </View>
      </View>

      {/* 2. Thông tin phòng trọ & Thời gian hẹn */}
      <View className="flex-row items-center gap-3 bg-slate-50 p-3 rounded-xl mb-3">
        {appointment.hinhAnh ? (
          <Image
            source={{ uri: appointment.hinhAnh }}
            style={{ width: 56, height: 56, borderRadius: 10 }}
            contentFit="cover"
          />
        ) : (
          <View className="w-14 h-14 rounded-xl bg-slate-200 items-center justify-center">
            <Ionicons name="home-outline" size={24} color="#64748B" />
          </View>
        )}

        <View className="flex-1">
          <Text className="text-xs font-bold text-gray-900 mb-1" numberOfLines={1}>
            {appointment.phongTen}
          </Text>
          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center gap-1">
              <Ionicons name="calendar-outline" size={12} color="#0D9488" />
              <Text className="text-xs text-gray-600 font-medium">{appointment.ngayHen}</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Ionicons name="time-outline" size={12} color="#0D9488" />
              <Text className="text-xs text-teal-700 font-semibold">{appointment.thoiGian}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 3. Tiền cọc & Ghi chú nếu có */}
      <View className="mb-3 space-y-1">
        {appointment.coc && appointment.coc > 0 ? (
          <View className="flex-row items-center justify-between py-1 px-2 bg-amber-50/60 rounded-lg mb-1">
            <Text className="text-xs text-amber-900 font-medium">Cọc giữ chân xem phòng:</Text>
            <Text className="text-xs font-bold text-amber-700">
              {appointment.coc.toLocaleString('vi-VN')} đ
            </Text>
          </View>
        ) : null}

        {appointment.ghiChu ? (
          <View className="px-1">
            <Text className="text-xs text-gray-500 italic" numberOfLines={2}>
              "{appointment.ghiChu}"
            </Text>
          </View>
        ) : null}
      </View>

      {/* 4. Các nút hành động thông minh theo trạng thái */}
      {appointment.trangThai === 'CHO_XAC_NHAN' && (
        <View className="flex-row gap-2 mt-1">
          <View className="flex-1">
            <Button
              variant="outline"
              size="sm"
              onPress={() => onReject(appointment.id)}
              className="w-full border-rose-200 active:bg-rose-50"
            >
              <Button.Label className="text-rose-600 text-xs font-medium">Từ chối</Button.Label>
            </Button>
          </View>

          <View className="flex-1">
            <Button
              variant="primary"
              size="sm"
              onPress={() => onConfirm(appointment.id)}
              className="w-full bg-teal-700"
            >
              <Button.Label className="text-white text-xs font-bold">Xác nhận lịch xem</Button.Label>
            </Button>
          </View>
        </View>
      )}

      {appointment.trangThai === 'XAC_NHAN' && (
        <View className="flex-row gap-2 mt-1">
          <View className="flex-1">
            <Button
              variant="outline"
              size="sm"
              onPress={() => onCancelRental?.(appointment.id)}
              className="w-full border-gray-300 active:bg-gray-50"
            >
              <Button.Label className="text-gray-700 text-xs font-medium">Không thuê</Button.Label>
            </Button>
          </View>

          <View className="flex-1">
            <Button
              variant="primary"
              size="sm"
              onPress={() => onComplete?.(appointment.id)}
              className="w-full bg-emerald-700"
            >
              <Button.Label className="text-white text-xs font-bold">Xác nhận thuê</Button.Label>
            </Button>
          </View>
        </View>
      )}

      {appointment.trangThai === 'HOAN_THANH' && (
        <View className="py-2 px-3 bg-emerald-50 rounded-xl items-center border border-emerald-200/80">
          <Text className="text-xs font-semibold text-emerald-800">
            ✓ Phòng đã được chốt cho khách thuê thành công
          </Text>
        </View>
      )}

      {appointment.trangThai === 'HUY' && (
        <View className="py-2 px-3 bg-gray-50 rounded-xl items-center border border-gray-200">
          <Text className="text-xs font-medium text-gray-500">
            Lịch hẹn đã kết thúc hoặc bị hủy
          </Text>
        </View>
      )}
    </Card>
  );
};

export default LandlordAppointmentCard;
