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

  const isSuccess = transaction.trangThai === 'THANH_CONG';
  const isFailed = transaction.trangThai === 'THAT_BAI';

  return (
    <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
      {/* Header chuẩn tenant */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200/80">
        <View className="flex-row items-center gap-2.5">
          <Pressable
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
          >
            <Ionicons name="chevron-back" size={20} color="#0F172A" />
          </Pressable>
          <Text className="text-base font-bold text-slate-900">Chi tiết giao dịch</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Số tiền lớn */}
        <View className="items-center py-6 bg-white rounded-2xl border border-slate-200/90 mb-4 shadow-xs">
          <Text className="text-xs font-semibold text-slate-400 mb-1">Số tiền thanh toán</Text>
          <Text className="text-3xl font-black text-teal-600">
            {transaction.soTien.toLocaleString('vi-VN')} đ
          </Text>
          <View
            className={`px-3 py-1 rounded-full mt-2.5 ${
              isSuccess
                ? 'bg-emerald-50 border border-emerald-200'
                : isFailed
                ? 'bg-rose-50 border border-rose-200'
                : 'bg-amber-50 border border-amber-200'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                isSuccess
                  ? 'text-emerald-700'
                  : isFailed
                  ? 'text-rose-700'
                  : 'text-amber-700'
              }`}
            >
              {isSuccess ? 'Giao dịch thành công' : isFailed ? 'Giao dịch thất bại' : 'Đang xử lý'}
            </Text>
          </View>
        </View>

        {/* Thông tin giao dịch */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Thông tin giao dịch</Text>
        <Card className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-4 divide-y divide-slate-100 shadow-xs">
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Mã giao dịch</Text>
            <Text className="text-xs font-bold text-slate-800">{transaction.maGiaoDich}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Thời gian giao dịch</Text>
            <Text className="text-xs font-medium text-slate-800">{transaction.thoiGian}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Loại giao dịch</Text>
            <Text className="text-xs font-semibold text-teal-700">{transaction.loaiGiaoDich}</Text>
          </View>
        </Card>

        {/* Hai bên tham gia */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Đối tác liên quan</Text>
        <Card className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-4 divide-y divide-slate-100 shadow-xs">
          <View className="flex-row items-center justify-between py-2.5">
            <View>
              <Text className="text-xs text-slate-400 font-medium">Khách hàng thanh toán</Text>
              <Text className="text-sm font-bold text-slate-800 mt-0.5">
                {transaction.nguoiThucHien}
              </Text>
            </View>
            <View className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center">
              <Ionicons name="person-outline" size={16} color="#64748B" />
            </View>
          </View>
          <View className="flex-row items-center justify-between py-2.5">
            <View>
              <Text className="text-xs text-slate-400 font-medium">Chủ trọ nhận tiền</Text>
              <Text className="text-sm font-bold text-slate-800 mt-0.5">
                {transaction.chuTro}
              </Text>
            </View>
            <View className="w-8 h-8 rounded-full bg-teal-50 items-center justify-center">
              <Ionicons name="business-outline" size={16} color="#0D9488" />
            </View>
          </View>
          <View className="py-2.5">
            <Text className="text-xs text-slate-400 font-medium">Phòng trọ áp dụng</Text>
            <Text className="text-xs font-semibold text-slate-800 mt-0.5">
              {transaction.phongTro}
            </Text>
          </View>
        </Card>

        {/* Chi phí Breakdown */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Chi tiết khấu trừ & hoa hồng</Text>
        <Card className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-4 divide-y divide-slate-100 shadow-xs">
          <View className="flex-row justify-between py-2">
            <Text className="text-xs text-slate-500 font-medium">Tiền cọc giữ chân</Text>
            <Text className="text-xs font-bold text-slate-800">
              {transaction.tienCoc.toLocaleString('vi-VN')} đ
            </Text>
          </View>
          <View className="flex-row justify-between py-2">
            <Text className="text-xs text-slate-500 font-medium">Phí dịch vụ trích lại cho InnFinder</Text>
            <Text className="text-xs font-bold text-rose-600">
              - {transaction.phiDichVu.toLocaleString('vi-VN')} đ
            </Text>
          </View>
          <View className="flex-row justify-between py-2.5 border-t border-slate-200">
            <Text className="text-xs font-bold text-slate-900">Chủ trọ thực nhận vào ví</Text>
            <Text className="text-base font-black text-teal-600">
              {transaction.thucNhan.toLocaleString('vi-VN')} đ
            </Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}
