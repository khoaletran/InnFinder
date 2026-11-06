import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from 'heroui-native';
import { adminService } from '../../../services/admin.service';
import { AdminTransactionItem } from '../../../types/admin.types';

export default function AdminTransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [transaction, setTransaction] = useState<AdminTransactionItem | null>(null);

  useEffect(() => {
    if (id) {
      adminService.getTransactionById(id).then((res) => {
        if (res) setTransaction(res);
      });
    }
  }, [id]);

  if (!transaction) {
    return (
      <View style={{ flex: 1 }} className="pt-safe bg-slate-50 items-center justify-center">
        <Text className="text-slate-500">Đang tải chi tiết...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-slate-200">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-1">
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
          <Text className="text-base font-bold text-slate-900">Chi tiết giao dịch</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Số tiền lớn */}
        <View className="items-center py-6 bg-white rounded-2xl border border-slate-200 mb-4 shadow-sm">
          <Text className="text-xs text-slate-400 mb-1">Số tiền thanh toán</Text>
          <Text className="text-3xl font-extrabold text-teal-700">
            {transaction.soTien.toLocaleString('vi-VN')} đ
          </Text>
          <View className="px-3 py-1 rounded-full bg-emerald-100 mt-2">
            <Text className="text-xs font-bold text-emerald-700">{transaction.trangThai}</Text>
          </View>
        </View>

        {/* Thông tin giao dịch */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Thông tin giao dịch</Text>
        <Card className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 divide-y divide-slate-100 shadow-sm">
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500">Mã giao dịch</Text>
            <Text className="text-xs font-bold text-slate-800">{transaction.maGiaoDich}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500">Ngày giao dịch</Text>
            <Text className="text-xs font-medium text-slate-800">{transaction.thoiGian}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500">Loại giao dịch</Text>
            <Text className="text-xs font-medium text-slate-800">{transaction.loaiGiaoDich}</Text>
          </View>
        </Card>

        {/* Hai bên tham gia */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Đối tác liên quan</Text>
        <Card className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 divide-y divide-slate-100 shadow-sm">
          <View className="flex-row items-center justify-between py-2.5">
            <View>
              <Text className="text-xs text-slate-400">Khách hàng thanh toán</Text>
              <Text className="text-sm font-bold text-slate-800 mt-0.5">
                {transaction.nguoiThucHien}
              </Text>
            </View>
            <Ionicons name="person-outline" size={18} color="#64748B" />
          </View>
          <View className="flex-row items-center justify-between py-2.5">
            <View>
              <Text className="text-xs text-slate-400">Chủ trọ nhận tiền</Text>
              <Text className="text-sm font-bold text-slate-800 mt-0.5">
                {transaction.chuTro}
              </Text>
            </View>
            <Ionicons name="business-outline" size={18} color="#64748B" />
          </View>
          <View className="py-2.5">
            <Text className="text-xs text-slate-400">Phòng trọ áp dụng</Text>
            <Text className="text-xs font-semibold text-slate-800 mt-0.5">
              {transaction.phongTro}
            </Text>
          </View>
        </Card>

        {/* Chi phí Breakdown */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Chi phí Breakdown</Text>
        <Card className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 divide-y divide-slate-100 shadow-sm">
          <View className="flex-row justify-between py-2">
            <Text className="text-xs text-slate-500">Tiền cọc phòng</Text>
            <Text className="text-xs font-semibold text-slate-800">
              {transaction.tienCoc.toLocaleString('vi-VN')} đ
            </Text>
          </View>
          <View className="flex-row justify-between py-2">
            <Text className="text-xs text-slate-500">Phí dịch vụ hệ thống</Text>
            <Text className="text-xs font-semibold text-rose-600">
              - {transaction.phiDichVu.toLocaleString('vi-VN')} đ
            </Text>
          </View>
          <View className="flex-row justify-between py-2.5 border-t border-slate-200">
            <Text className="text-xs font-bold text-slate-900">Chủ trọ thực nhận</Text>
            <Text className="text-sm font-extrabold text-teal-700">
              {transaction.thucNhan.toLocaleString('vi-VN')} đ
            </Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}
