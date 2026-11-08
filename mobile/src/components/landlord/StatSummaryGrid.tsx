import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card } from 'heroui-native';
import { LandlordDashboardStats } from '../../types/landlord.types';
import { formatVND } from '../../utils/formatVND';

interface Props {
  stats: LandlordDashboardStats;
}

export const StatSummaryGrid: React.FC<Props> = ({ stats }) => {
  const router = useRouter();

  return (
    <View className="flex-row flex-wrap justify-between gap-y-3">
      {/* 1. Tổng phòng */}
      <Pressable
        onPress={() => router.push('/(landlord)/my-rooms')}
        style={{ width: '48%' }}
        className="active:opacity-85"
      >
        <Card className="w-full p-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm justify-between min-h-[108px]">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-slate-500 font-semibold">Tổng phòng</Text>
            <View className="w-8 h-8 rounded-xl bg-teal-50 items-center justify-center border border-teal-100/60">
              <Ionicons name="home-outline" size={16} color="#0d9488" />
            </View>
          </View>
          <View className="mt-1">
            <View className="h-8 justify-center">
              <Text className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {stats.tongPhong}
              </Text>
            </View>
            <Text className="text-[11px] font-semibold text-amber-600 mt-0.5" numberOfLines={1}>
              {stats.phongChoDuyet} phòng chờ duyệt
            </Text>
          </View>
        </Card>
      </Pressable>

      {/* 2. Đang trống */}
      <Pressable
        onPress={() => router.push('/(landlord)/my-rooms?tab=DA_DUYET' as any)}
        style={{ width: '48%' }}
        className="active:opacity-85"
      >
        <Card className="w-full p-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm justify-between min-h-[108px]">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-slate-500 font-semibold">Đang trống</Text>
            <View className="w-8 h-8 rounded-xl bg-blue-50 items-center justify-center border border-blue-100/60">
              <Ionicons name="key-outline" size={16} color="#2563eb" />
            </View>
          </View>
          <View className="mt-1">
            <View className="h-8 justify-center">
              <Text className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {stats.dangTrong}
              </Text>
            </View>
            <Text className="text-[11px] font-semibold text-blue-600 mt-0.5" numberOfLines={1}>
              {stats.dangTrong} phòng chờ cho thuê
            </Text>
          </View>
        </Card>
      </Pressable>

      {/* 3. Đánh giá */}
      <Pressable
        onPress={() => router.push('/(landlord)/reviews' as any)}
        style={{ width: '48%' }}
        className="active:opacity-85"
      >
        <Card className="w-full p-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm justify-between min-h-[108px]">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-slate-500 font-semibold">Đánh giá</Text>
            <View className="w-8 h-8 rounded-xl bg-amber-50 items-center justify-center border border-amber-100/60">
              <Ionicons name="star" size={15} color="#d97706" />
            </View>
          </View>
          <View className="mt-1">
            <View className="h-8 flex-row items-center gap-1">
              <Text className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {stats.diemDanhGia}
              </Text>
              <Ionicons name="star" size={14} color="#f59e0b" />
            </View>
            <Text className="text-[11px] font-semibold text-amber-600 mt-0.5" numberOfLines={1}>
              {stats.tongDanhGia} đánh giá
            </Text>
          </View>
        </Card>
      </Pressable>

      {/* 4. Số dư (Không cần chữ nhỏ, căn chuẩn cao độ ngang bằng các ô khác) */}
      <Pressable
        onPress={() => router.push('/(landlord)/transactions')}
        style={{ width: '48%' }}
        className="active:opacity-85"
      >
        <Card className="w-full p-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm justify-between min-h-[108px]">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-slate-500 font-semibold">Số dư ví</Text>
            <View className="w-8 h-8 rounded-xl bg-emerald-50 items-center justify-center border border-emerald-100/60">
              <Ionicons name="wallet-outline" size={16} color="#16a34a" />
            </View>
          </View>
          <View className="mt-1">
            <View className="h-8 justify-center">
              <Text
                className="text-xl font-black text-emerald-800 tracking-tight"
                numberOfLines={1}
              >
                {formatVND(stats.soDu)}
              </Text>
            </View>
            <View className="h-[16px] mt-0.5" />
          </View>
        </Card>
      </Pressable>
    </View>
  );
};
