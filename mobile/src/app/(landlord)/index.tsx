import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card } from 'heroui-native';
import { StatSummaryGrid } from '../../components/landlord/StatSummaryGrid';
import { LandlordAppointmentCard } from '../../components/landlord/LandlordAppointmentCard';
import { landlordService } from '../../services/landlord.service';
import {
  LandlordDashboardStats,
  LandlordAppointmentItem,
  LandlordPostItem,
} from '../../types/landlord.types';
import { useAuthStore } from '../../store/useAuthStore';

export default function LandlordDashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [stats, setStats] = useState<LandlordDashboardStats>({
    tongPhong: 0,
    tongPhongMoi: 0,
    dangTrong: 0,
    yeuCauMoi: 0,
    dangThue: 0,
  });

  const [appointments, setAppointments] = useState<LandlordAppointmentItem[]>([]);
  const [recentPosts, setRecentPosts] = useState<LandlordPostItem[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const s = await landlordService.getDashboardStats();
    setStats(s);

    const apts = await landlordService.getAppointments();
    setAppointments(apts);

    const posts = await landlordService.getMyPosts();
    setRecentPosts(posts.slice(0, 2));
  };

  const handleConfirm = async (id: string) => {
    await landlordService.confirmAppointment(id);
    alert('Đã xác nhận lịch xem phòng của khách thành công!');
    loadData();
  };

  const handleReject = async (id: string) => {
    await landlordService.rejectAppointment(id);
    alert('Đã từ chối lịch xem phòng.');
    loadData();
  };

  const displayName = user?.hoVaTen || 'bạn';

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-slate-50" edges={['top']}>
      {/* 1. Header */}
      <View className="px-4 py-3.5 bg-white flex-row items-center justify-between border-b border-gray-100">
        <View>
          <Text className="text-xs text-gray-400 font-medium">Bảng điều khiển</Text>
          <Text className="text-lg font-bold text-gray-900">Xin chào, {displayName}</Text>
        </View>

        <Pressable className="relative w-10 h-10 rounded-full bg-gray-50 items-center justify-center border border-gray-100">
          <Ionicons name="notifications-outline" size={20} color="#374151" />
          {/* Notification badge only when count > 0 */}
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        className="px-4 py-4"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Grid 4 Thống kê */}
        <StatSummaryGrid stats={stats} />

        {/* 3. Lịch xem sắp tới */}
        <View className="mt-6 mb-2">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-bold text-gray-900">Lịch xem sắp tới</Text>
            <Pressable onPress={() => router.push('/(landlord)/appointments')}>
              <Text className="text-xs font-semibold text-teal-700">Xem tất cả &gt;</Text>
            </Pressable>
          </View>

          {appointments.length > 0 ? (
            appointments.map((apt) => (
              <LandlordAppointmentCard
                key={apt.id}
                appointment={apt}
                onConfirm={handleConfirm}
                onReject={handleReject}
              />
            ))
          ) : (
            <Card className="p-4 bg-white rounded-2xl items-center justify-center">
              <Text className="text-xs text-gray-400">Không có lịch xem phòng sắp tới</Text>
            </Card>
          )}
        </View>

        {/* 4. Tin đăng gần đây */}
        <View className="mt-4 mb-8">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-bold text-gray-900">Tin đăng gần đây</Text>
            <Pressable onPress={() => router.push('/(landlord)/my-posts')}>
              <Text className="text-xs font-semibold text-teal-700">Quản lý &gt;</Text>
            </Pressable>
          </View>

          {recentPosts.map((post) => (
            <Card
              key={post.id}
              className="p-3 bg-white rounded-2xl border border-gray-100 mb-2.5 shadow-sm"
            >
              <View className="flex-row items-center gap-3">
                <Image
                  source={{
                    uri:
                      post.hinhAnhUrl ||
                      'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=600',
                  }}
                  className="w-14 h-14 rounded-xl"
                  resizeMode="cover"
                />
                <View className="flex-1">
                  <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
                    {post.tenPhong}
                  </Text>
                  <View className="flex-row items-center justify-between mt-1">
                    <Text className="text-xs font-semibold text-teal-700">
                      {(post.giaThue / 1000000).toFixed(1)} triệu/tháng
                    </Text>
                    <View className="px-2 py-0.5 rounded-full bg-emerald-100">
                      <Text className="text-[10px] font-bold text-emerald-700">Đang hiển thị</Text>
                    </View>
                  </View>
                </View>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
