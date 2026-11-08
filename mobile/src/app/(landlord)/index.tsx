import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card } from 'heroui-native';
import { InnFinderLogo } from '../../components/common/InnFinderLogo';
import { StatSummaryGrid } from '../../components/landlord/StatSummaryGrid';
import { LandlordAppointmentCard } from '../../components/landlord/LandlordAppointmentCard';
import { landlordService } from '../../services/landlord.service';
import {
  LandlordDashboardStats,
  LandlordAppointmentItem,
  LandlordPostItem,
} from '../../types/landlord.types';
import { formatVNDShort } from '../../utils/formatVND';
import { useAuthStore } from '../../store/useAuthStore';
import { useLandlordNotificationStore } from '../../store/useLandlordNotificationStore';

export default function LandlordDashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const unreadCount = useLandlordNotificationStore((state) => state.unreadCount);

  const [stats, setStats] = useState<LandlordDashboardStats>({
    tongPhong: 0,
    phongChoDuyet: 0,
    dangTrong: 0,
    tongDanhGia: 0,
    diemDanhGia: '5.0',
    soDu: 0,
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
    try {
      await landlordService.confirmAppointment(id);
      Alert.alert('Thành công', 'Đã xác nhận lịch xem phòng của khách thành công!');
      loadData();
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Lỗi xác nhận');
    }
  };

  const handleReject = (id: string) => {
    Alert.alert(
      'Từ chối lịch hẹn',
      'Xác nhận từ chối lịch hẹn xem phòng này? Tiền cọc giữ chân sẽ được hoàn trả lại cho khách.',
      [
        { text: 'Quay lại', style: 'cancel' },
        {
          text: 'Từ chối lịch',
          style: 'destructive',
          onPress: async () => {
            try {
              await landlordService.rejectAppointment(id, 'Chủ trọ bận lịch vào khung giờ này');
              Alert.alert('Thành công', 'Đã từ chối lịch xem phòng và hoàn cọc cho khách.');
              loadData();
            } catch (e: any) {
              Alert.alert('Lỗi', e?.response?.data?.message || e.message || 'Lỗi từ chối');
            }
          },
        },
      ]
    );
  };

  const handleComplete = (id: string) => {
    Alert.alert(
      'Xác nhận cho thuê phòng',
      'Xác nhận bạn đồng ý cho khách thuê phòng này? Tiền cọc (sau khi trừ phí sàn) sẽ được chuyển vào ví của bạn khi cả 2 bên cùng bấm Xác nhận thuê.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đồng ý cho thuê',
          style: 'default',
          onPress: async () => {
            try {
              const res: any = await landlordService.submitLandlordDecision(id, true);
              if (res?.trangThai === 'HOAN_THANH') {
                Alert.alert(
                  'Thuê phòng thành công!',
                  'Chúc mừng! Cả hai bên đã đồng ý thuê phòng. Hợp đồng đã hoàn tất và tiền cọc (sau khi trừ phí sàn) đã được cộng vào ví của bạn!'
                );
              } else {
                Alert.alert(
                  'Đã gửi quyết định cho thuê',
                  'Bạn đã đồng ý cho khách thuê phòng! Đang chờ khách hàng xác nhận trên ứng dụng để hoàn tất hợp đồng.'
                );
              }
              loadData();
            } catch (e: any) {
              Alert.alert('Lỗi', e?.response?.data?.message || e.message || 'Không thể chốt thuê lúc này.');
            }
          },
        },
      ]
    );
  };

  const handleCancelRental = (id: string) => {
    Alert.alert(
      'Từ chối cho thuê',
      'Xác nhận không cho thuê phòng này? Tiền cọc sẽ được hoàn trả lại cho bạn.',
      [
        { text: 'Quay lại', style: 'cancel' },
        {
          text: 'Không cho thuê',
          style: 'destructive',
          onPress: async () => {
            try {
              await landlordService.submitLandlordDecision(id, false, 'Chủ trọ từ chối cho thuê sau khi xem');
              Alert.alert('Thành công', 'Đã ghi nhận không cho thuê phòng.');
              loadData();
            } catch (e: any) {
              Alert.alert('Lỗi', e?.response?.data?.message || e.message || 'Không thể xử lý lúc này.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-slate-50" edges={['top']}>
      {/* 1. Header: Logo, Chuông & Ô bấm tài khoản (đồng bộ giao diện khách hàng) */}
      <View className="flex-row items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
        <InnFinderLogo variant="horizontal" size="md" />

        <View className="flex-row items-center gap-3">
          {/* Nút chuông thông báo */}
          <Pressable
            onPress={() => router.push('/(landlord)/notifications')}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center relative active:bg-slate-200"
          >
            <Ionicons name="notifications-outline" size={20} color="#334155" />
            {unreadCount > 0 && (
              <View className="w-2 h-2 rounded-full bg-rose-500 absolute top-2 right-2" />
            )}
          </Pressable>

          {/* Ô bấm tài khoản */}
          <Pressable
            onPress={() => router.push('/(landlord)/menu')}
            className="w-9 h-9 rounded-full bg-teal-700 items-center justify-center active:bg-teal-800"
          >
            <Text className="text-white font-bold text-xs">
              {user?.tenDangNhap
                ? user.tenDangNhap.substring(0, 2).toUpperCase()
                : 'CT'}
            </Text>
          </Pressable>
        </View>
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
            <Text className="text-base font-bold text-gray-900">
              Lịch xem sắp tới ({appointments.length})
            </Text>
            <Pressable onPress={() => router.push('/(landlord)/appointments')}>
              <Text className="text-xs font-semibold text-teal-700">Xem tất cả &gt;</Text>
            </Pressable>
          </View>

          {appointments.length > 0 ? (
            appointments.slice(0, 2).map((apt) => (
              <LandlordAppointmentCard
                key={apt.id}
                appointment={apt}
                onConfirm={handleConfirm}
                onReject={handleReject}
                onComplete={handleComplete}
                onCancelRental={handleCancelRental}
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
            <Pressable
              key={post.id}
              onPress={() => router.push(`/room/${post.id}` as any)}
              className="active:opacity-90"
            >
              <Card className="p-3 bg-white rounded-2xl border border-gray-100 mb-2.5 shadow-sm">
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
                        {formatVNDShort(post.giaThue)}
                      </Text>
                      <View
                        className={`px-2 py-0.5 rounded-full ${
                          post.trangThai === 'HOAN_THANH'
                            ? 'bg-emerald-100'
                            : post.trangThai === 'DA_DUYET'
                            ? 'bg-teal-100'
                            : post.trangThai === 'CHO_DUYET'
                            ? 'bg-amber-100'
                            : 'bg-rose-100'
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-bold ${
                            post.trangThai === 'HOAN_THANH'
                              ? 'text-emerald-700'
                              : post.trangThai === 'DA_DUYET'
                              ? 'text-teal-700'
                              : post.trangThai === 'CHO_DUYET'
                              ? 'text-amber-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {post.trangThai === 'HOAN_THANH'
                            ? 'Đã cho thuê'
                            : post.trangThai === 'DA_DUYET'
                            ? 'Đã đăng bài'
                            : post.trangThai === 'CHO_DUYET'
                            ? 'Chờ duyệt'
                            : 'Bị từ chối'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
