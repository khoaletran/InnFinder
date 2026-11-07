import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from 'heroui-native';
import { adminService } from '../../../services/admin.service';
import { AdminDashboardStats } from '../../../types/admin.types';
import { AdminStatCard } from '../../../components/admin/AdminStatCard';
import { InnFinderLogo } from '../../../components/common/InnFinderLogo';
import { useAuthStore } from '../../../store/useAuthStore';

export default function AdminDashboardScreen() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();

  const loadData = async () => {
    const res = await adminService.getDashboardStats();
    setStats(res);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const displayName = user?.hoVaTen || user?.tenDangNhap || 'Admin';
  const pendingAlertCount =
    (stats?.hangDoi.tinMoi || 0) + (stats?.hangDoi.baoCaoViPham || 0);

  return (
    <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
      {/* ===== HEADER ADMIN TINH GỌN ===== */}
      <View className="px-4 py-3 bg-white border-b border-slate-200/80 flex-row items-center justify-between">
        {/* 1. Logo & Badge Quản trị viên */}
        <View className="flex-row items-center gap-2">
          <InnFinderLogo variant="horizontal" size="sm" />
          <View className="px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200">
            <Text className="text-[10px] font-bold text-teal-700">Quản trị viên</Text>
          </View>
        </View>

        {/* 2. Actions: Chuông thông báo & Avatar */}
        <View className="flex-row items-center gap-2.5">
          <Pressable
            onPress={() => router.push({ pathname: '/(admin)/processing', params: { tab: 'complaints' } } as any)}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center relative active:bg-slate-200"
          >
            <Ionicons name="notifications-outline" size={19} color="#334155" />
            {pendingAlertCount > 0 ? (
              <View className="min-w-[16px] h-4 px-1 rounded-full bg-rose-500 absolute -top-1 -right-1 items-center justify-center border border-white">
                <Text className="text-[9px] font-bold text-white">
                  {pendingAlertCount > 99 ? '99+' : pendingAlertCount}
                </Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => router.push('/user/edit-profile')}
            className="w-9 h-9 rounded-full bg-teal-600 items-center justify-center active:opacity-90"
          >
            <Text className="text-white font-bold text-xs">
              {displayName.slice(0, 2).toUpperCase()}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ===== NỘI DUNG CHÍNH ADMIN DASHBOARD ===== */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="p-4">
          {/* Section 1: Chỉ số hệ thống */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-bold text-slate-900">Chỉ số hệ thống</Text>
            <Pressable onPress={() => router.push('/(admin)/statistics')}>
              <Text className="text-xs font-semibold text-teal-600">Xem chi tiết →</Text>
            </Pressable>
          </View>

          <View className="flex-row flex-wrap justify-between">
            <AdminStatCard
              label="Người dùng"
              value={stats?.nguoiDung.total ?? 0}
              subValue="Tổng tài khoản"
              iconName="people-outline"
              onPress={() => router.push('/(admin)/management')}
            />
            <AdminStatCard
              label="Số tin đăng"
              value={stats?.soTinDang.total ?? 0}
              subValue="Phòng trong hệ thống"
              iconName="newspaper-outline"
              onPress={() => router.push({ pathname: '/(admin)/processing', params: { tab: 'posts' } } as any)}
            />
            <AdminStatCard
              label="Doanh thu hoa hồng"
              value={stats?.doanhThu.total ?? '0 đ'}
              subValue="Từ cọc thành công"
              iconName="cash-outline"
              onPress={() => router.push('/(admin)/transactions')}
            />
            <AdminStatCard
              label="Khiếu nại"
              value={stats?.khieuNai.total ?? 0}
              subValue="Cần xử lý"
              isAlert={Boolean(stats?.khieuNai.isAlert)}
              iconName="warning-outline"
              onPress={() => router.push({ pathname: '/(admin)/processing', params: { tab: 'complaints' } } as any)}
            />
          </View>

          {/* Section 2: Hàng đợi xử lý */}
          <Text className="text-base font-bold text-slate-900 mt-2 mb-3">Hàng đợi xử lý</Text>
          <Card className="bg-white rounded-2xl border border-slate-200/90 p-2 divide-y divide-slate-100 mb-4 shadow-xs">
            <Pressable
              onPress={() => router.push({ pathname: '/(admin)/processing', params: { tab: 'posts' } } as any)}
              className="flex-row items-center justify-between p-3 active:bg-slate-50 rounded-xl"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-lg bg-teal-50 items-center justify-center">
                  <Ionicons name="document-text-outline" size={18} color="#0D9488" />
                </View>
                <Text className="text-sm font-semibold text-slate-800">Tin mới chờ duyệt</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200">
                  <Text className="text-xs font-bold text-rose-600">
                    {stats?.hangDoi.tinMoi ?? 0}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.push({ pathname: '/(admin)/processing', params: { tab: 'landlords' } } as any)}
              className="flex-row items-center justify-between p-3 active:bg-slate-50 rounded-xl"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-lg bg-amber-50 items-center justify-center">
                  <Ionicons name="shield-checkmark-outline" size={18} color="#D97706" />
                </View>
                <Text className="text-sm font-semibold text-slate-800">Xác minh chủ trọ</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200">
                  <Text className="text-xs font-bold text-amber-700">
                    {stats?.hangDoi.xacMinhChuTro ?? 0}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.push({ pathname: '/(admin)/processing', params: { tab: 'complaints' } } as any)}
              className="flex-row items-center justify-between p-3 active:bg-slate-50 rounded-xl"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-lg bg-rose-50 items-center justify-center">
                  <Ionicons name="alert-circle-outline" size={18} color="#E11D48" />
                </View>
                <Text className="text-sm font-semibold text-slate-800">Báo cáo vi phạm</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200">
                  <Text className="text-xs font-bold text-rose-600">
                    {stats?.hangDoi.baoCaoViPham ?? 0}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </View>
            </Pressable>
          </Card>

          {/* Section 3: Tăng trưởng giao dịch (6 tháng) */}
          <View className="flex-row items-center justify-between mt-2 mb-3">
            <Text className="text-base font-bold text-slate-900">
              Tăng trưởng giao dịch
            </Text>
            <View className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200">
              <Text className="text-[11px] font-semibold text-slate-600">6 tháng qua</Text>
            </View>
          </View>

          <Card className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
            {stats?.tangTruongGiaoDich && stats.tangTruongGiaoDich.length > 0 ? (
              <View className="h-44 flex-row items-end justify-between px-2 pt-6">
                {stats.tangTruongGiaoDich.map((item, idx) => {
                  const heightPercent = (item.giaTri / 120) * 100;
                  return (
                    <View key={idx} className="items-center flex-1">
                      <View
                        style={{ height: `${heightPercent}%` }}
                        className="w-7 bg-teal-600 rounded-t-lg"
                      />
                      <Text className="text-xs font-semibold text-slate-500 mt-2">
                        {item.thang}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View className="h-32 items-center justify-center">
                <Ionicons name="bar-chart-outline" size={32} color="#94A3B8" />
                <Text className="text-xs text-slate-400 mt-2">Chưa có dữ liệu tăng trưởng giao dịch</Text>
              </View>
            )}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
