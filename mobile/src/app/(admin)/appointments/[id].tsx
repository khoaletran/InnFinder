import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Avatar } from 'heroui-native';
import { adminService } from '../../../services/admin.service';
import { AdminAppointmentItem } from '../../../types/admin.types';

export default function AdminAppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [appointment, setAppointment] = useState<AdminAppointmentItem | null>(null);

  useEffect(() => {
    if (id) {
      adminService.getAppointmentById(id).then((res) => {
        if (res) setAppointment(res);
      });
    }
  }, [id]);

  if (!appointment) {
    return (
      <View style={{ flex: 1 }} className="pt-safe bg-slate-50 items-center justify-center">
        <Text className="text-slate-500">Đang tải chi tiết...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-1">
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
          <Text className="text-base font-bold text-slate-900">Chi tiết lịch xem</Text>
        </Pressable>
        <View className="px-2.5 py-0.5 rounded-full bg-blue-100">
          <Text className="text-xs font-bold text-blue-700">{appointment.trangThai}</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-xs font-bold text-slate-500 mb-3">
          MÃ LỊCH HẸN: {appointment.maDatLich}
        </Text>

        {/* Khách hàng */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Thông tin khách hàng</Text>
        <Card className="flex-row items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200 mb-4 shadow-sm">
          <View className="flex-row items-center gap-3">
            <Avatar size="md" color="default" className="size-11">
              <Avatar.Fallback className="bg-slate-100">
                <Text className="text-sm font-bold text-slate-800">
                  {appointment.tenKhachHang.slice(0, 2).toUpperCase()}
                </Text>
              </Avatar.Fallback>
            </Avatar>
            <View>
              <Text className="text-sm font-bold text-slate-900">{appointment.tenKhachHang}</Text>
              <Text className="text-xs text-slate-400 mt-0.5">{appointment.sdtKhachHang}</Text>
            </View>
          </View>
          <View className="w-9 h-9 rounded-full bg-teal-50 items-center justify-center">
            <Ionicons name="call-outline" size={18} color="#0D9488" />
          </View>
        </Card>

        {/* Chủ trọ */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Thông tin chủ nhà</Text>
        <Card className="flex-row items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200 mb-4 shadow-sm">
          <View className="flex-row items-center gap-3">
            <Avatar size="md" color="default" className="size-11">
              <Avatar.Fallback className="bg-teal-100">
                <Text className="text-sm font-bold text-teal-800">
                  {appointment.tenChuTro.slice(0, 2).toUpperCase()}
                </Text>
              </Avatar.Fallback>
            </Avatar>
            <View>
              <Text className="text-sm font-bold text-slate-900">{appointment.tenChuTro}</Text>
              <Text className="text-xs text-slate-400 mt-0.5">{appointment.sdtChuTro}</Text>
            </View>
          </View>
          <View className="w-9 h-9 rounded-full bg-teal-50 items-center justify-center">
            <Ionicons name="call-outline" size={18} color="#0D9488" />
          </View>
        </Card>

        {/* Phòng */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Thông tin phòng</Text>
        <Card className="flex-row p-3 bg-white rounded-2xl border border-slate-200 mb-4 shadow-sm">
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=300',
            }}
            className="w-16 h-16 rounded-xl bg-slate-100"
            resizeMode="cover"
          />
          <View className="flex-1 ml-3 justify-center">
            <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
              {appointment.tenPhongTro}
            </Text>
            <Text className="text-xs text-slate-500 mt-1">{appointment.diaChiPhong}</Text>
          </View>
        </Card>

        {/* Ngày giờ */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Ngày giờ hẹn</Text>
        <Card className="flex-row items-center gap-2.5 p-3.5 bg-white rounded-2xl border border-slate-200 mb-4 shadow-sm">
          <Ionicons name="calendar-outline" size={18} color="#0D9488" />
          <Text className="text-sm font-semibold text-slate-800">{appointment.ngayHen}</Text>
        </Card>

        {/* Ghi chú */}
        {appointment.ghiChu ? (
          <>
            <Text className="text-sm font-bold text-slate-900 mb-2">Ghi chú</Text>
            <Card className="p-3.5 bg-white rounded-2xl border border-slate-200 mb-4 shadow-sm">
              <Text className="text-xs text-slate-600 leading-relaxed">{appointment.ghiChu}</Text>
            </Card>
          </>
        ) : null}

        {/* Trạng thái lịch xem timeline */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Trạng thái lịch xem</Text>
        <Card className="p-4 bg-white rounded-2xl border border-slate-200 mb-6 shadow-sm">
          <View className="flex-row items-start gap-3 mb-3">
            <View className="w-3 h-3 rounded-full bg-emerald-500 mt-0.5" />
            <View>
              <Text className="text-xs font-bold text-slate-800">Đặt lịch hẹn</Text>
              <Text className="text-[11px] text-slate-400">24/10 14:00</Text>
            </View>
          </View>
          <View className="flex-row items-start gap-3 mb-3">
            <View className="w-3 h-3 rounded-full bg-emerald-500 mt-0.5" />
            <View>
              <Text className="text-xs font-bold text-slate-800">Chủ trọ xác nhận</Text>
              <Text className="text-[11px] text-slate-400">24/10 16:30</Text>
            </View>
          </View>
          <View className="flex-row items-start gap-3">
            <View className="w-3 h-3 rounded-full bg-slate-300 mt-0.5" />
            <View>
              <Text className="text-xs font-medium text-slate-500">Hoàn thành xem phòng</Text>
              <Text className="text-[11px] text-slate-400">Chưa diễn ra</Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}
