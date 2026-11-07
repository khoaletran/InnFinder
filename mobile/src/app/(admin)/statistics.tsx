import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from 'heroui-native';
import { adminService } from '../../services/admin.service';
import { AdminDashboardStats } from '../../types/admin.types';

interface MetricItemProps {
  label: string;
  value: string;
  subValue?: string;
}

function MetricCard({ label, value, subValue }: MetricItemProps) {
  return (
    <View style={{ width: '48%' }} className="mb-3">
      <Card style={{ width: '100%' }} className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
        <Text className="text-xs font-semibold text-slate-500 mb-1">{label}</Text>
        <Text className="text-xl font-black text-slate-900">{value}</Text>
        {subValue ? (
          <Text className="text-[11px] font-medium text-teal-600 mt-1">{subValue}</Text>
        ) : null}
      </Card>
    </View>
  );
}

export default function AdminStatisticsScreen() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const data = await adminService.getDashboardStats();
    setStats(data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

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
          <View>
            <Text className="text-xl font-bold text-slate-900">Thống kê</Text>
            <Text className="text-xs text-slate-500 mt-0.5">Báo cáo hiệu suất hệ thống</Text>
          </View>
        </View>

        <Pressable
          onPress={onRefresh}
          className="px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-200 flex-row items-center gap-1.5 active:bg-slate-100"
        >
          <Ionicons name="refresh-outline" size={14} color="#64748B" />
          <Text className="text-xs font-semibold text-slate-700">Làm mới</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* 6 Metric cards dựa trên dữ liệu thật */}
        <Text className="text-base font-bold text-slate-900 mb-3">Hiệu suất vận hành</Text>
        <View className="flex-row flex-wrap justify-between mb-2">
          <MetricCard
            label="Người dùng hệ thống"
            value={String(stats?.nguoiDung.total ?? 0)}
            subValue="Tổng tài khoản"
          />
          <MetricCard
            label="Số bài đăng phòng"
            value={String(stats?.soTinDang.total ?? 0)}
            subValue="Toàn hệ thống"
          />
          <MetricCard
            label="Doanh thu hoa hồng"
            value={stats?.doanhThu.total ?? '0 đ'}
            subValue="Từ cọc thành công"
          />
          <MetricCard
            label="Phòng chờ duyệt"
            value={String(stats?.hangDoi.tinMoi ?? 0)}
            subValue="Đang chờ xử lý"
          />
          <MetricCard
            label="Chủ trọ trên sàn"
            value={String(stats?.hangDoi.xacMinhChuTro ?? 0)}
            subValue="Đã kích hoạt"
          />
          <MetricCard
            label="Khiếu nại / Tố cáo"
            value={String(stats?.khieuNai.total ?? 0)}
            subValue="Cần can thiệp"
          />
        </View>

        {/* Biểu đồ tăng trưởng */}
        <View className="flex-row items-center justify-between mt-2 mb-2">
          <Text className="text-base font-bold text-slate-900">Biến động giao dịch</Text>
        </View>
        <Card className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-4 shadow-xs">
          {stats?.tangTruongGiaoDich && stats.tangTruongGiaoDich.length > 0 ? (
            <View className="h-36 justify-end">
              <View className="flex-row items-end justify-between px-2">
                {stats.tangTruongGiaoDich.map((item, i) => (
                  <View key={i} className="items-center flex-1">
                    <View
                      style={{ height: Math.min(100, item.giaTri) }}
                      className="w-5 bg-teal-600 rounded-t-lg"
                    />
                    <Text className="text-[10px] font-semibold text-slate-400 mt-2">{item.thang}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View className="h-32 items-center justify-center">
              <Ionicons name="bar-chart-outline" size={32} color="#94A3B8" />
              <Text className="text-xs text-slate-400 mt-2">Chưa có đủ số liệu thống kê chu kỳ này</Text>
            </View>
          )}
        </Card>
      </ScrollView>
    </View>
  );
}
