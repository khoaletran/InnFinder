import React from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card } from 'heroui-native';
import { useAuthStore } from '../../store/useAuthStore';

interface AccountRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subLabel?: string;
  onPress: () => void;
  color?: string;
  badge?: string;
}

function AccountMenuRow({
  icon,
  label,
  subLabel,
  onPress,
  color = '#334155',
  badge,
}: AccountRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between py-3.5 px-4 bg-white active:bg-slate-50"
    >
      <View className="flex-row items-center gap-3">
        <View className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center">
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <View>
          <Text className="text-sm font-semibold text-gray-800">{label}</Text>
          {subLabel && <Text className="text-xs text-gray-400 mt-0.5">{subLabel}</Text>}
        </View>
      </View>
      <View className="flex-row items-center gap-2">
        {badge && (
          <View className="px-2 py-0.5 rounded-full bg-emerald-100">
            <Text className="text-[10px] font-bold text-emerald-700">{badge}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
      </View>
    </Pressable>
  );
}

export default function LandlordAccountScreen() {
  const router = useRouter();
  const { user, switchMode, logout } = useAuthStore();

  const displayName = user?.tenDangNhap || 'chutro1';
  const email = user?.email || 'chutro1@gmail.com';
  const sdt = user?.sdt || '0987 654 321';

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất tài khoản Chủ trọ?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login' as any);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-slate-50" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3.5 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-gray-900">Tài khoản</Text>
        <Pressable
          onPress={() => router.push('/(landlord)/transactions')}
          className="flex-row items-center gap-1 px-3 py-1 bg-teal-50 rounded-full border border-teal-200"
        >
          <Ionicons name="wallet-outline" size={14} color="#0F766E" />
          <Text className="text-xs font-bold text-teal-700">Ví: 5.000.000 đ</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        className="px-4 pt-4"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Khối Thông tin Chủ trọ */}
        <Card className="bg-white rounded-2xl p-4 border border-gray-100 mb-4 shadow-sm">
          <View className="flex-row items-center gap-3.5">
            <View className="w-16 h-16 rounded-full bg-teal-100 items-center justify-center border-2 border-teal-600">
              <Text className="text-xl font-bold text-teal-800">
                {displayName.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-base font-bold text-gray-900">{displayName}</Text>
                <Ionicons name="checkmark-circle" size={16} color="#0F766E" />
              </View>
              <Text className="text-xs text-gray-400 mt-0.5">{email} • {sdt}</Text>
              <View className="flex-row items-center gap-2 mt-2">
                <View className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200">
                  <Text className="text-[10px] font-bold text-teal-700">Chủ trọ đã xác thực</Text>
                </View>
                <View className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200">
                  <Text className="text-[10px] font-bold text-amber-700">Uy tín: 100/100</Text>
                </View>
              </View>
            </View>
          </View>
        </Card>

        {/* 3 Thống kê nhanh */}
        <View className="flex-row gap-2.5 mb-4">
          <Pressable
            onPress={() => router.push('/(landlord)/transactions')}
            className="flex-1 bg-white p-3 rounded-2xl border border-gray-100 items-center shadow-sm"
          >
            <Text className="text-[11px] text-gray-400 font-medium">Số dư khả dụng</Text>
            <Text className="text-sm font-bold text-teal-700 mt-1">5.000.000 đ</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(landlord)/my-rooms')}
            className="flex-1 bg-white p-3 rounded-2xl border border-gray-100 items-center shadow-sm"
          >
            <Text className="text-[11px] text-gray-400 font-medium">Phòng quản lý</Text>
            <Text className="text-sm font-bold text-gray-900 mt-1">2 phòng</Text>
          </Pressable>

          <View className="flex-1 bg-white p-3 rounded-2xl border border-gray-100 items-center shadow-sm">
            <Text className="text-[11px] text-gray-400 font-medium">Lịch hẹn mới</Text>
            <Text className="text-sm font-bold text-amber-600 mt-1">1 hẹn</Text>
          </View>
        </View>

        {/* Nhóm 1: Quản lý phòng & Kinh doanh */}
        <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
          Kinh doanh & Phòng trọ
        </Text>
        <View className="bg-white rounded-2xl overflow-hidden border border-gray-100 mb-4 divide-y divide-gray-100 shadow-sm">
          <AccountMenuRow
            icon="business-outline"
            label="Phòng của tôi"
            subLabel="Quản lý tình trạng phòng trống / đang thuê"
            onPress={() => router.push('/(landlord)/my-rooms')}
          />
          <AccountMenuRow
            icon="newspaper-outline"
            label="Bài đăng của tôi"
            subLabel="Kiểm tra trạng thái duyệt tin phòng"
            onPress={() => router.push('/(landlord)/my-posts')}
          />
          <AccountMenuRow
            icon="wallet-outline"
            label="Lịch sử giao dịch & Ví"
            subLabel="Biến động số dư, cọc giữ chân & hoàn tiền"
            onPress={() => router.push('/(landlord)/transactions')}
          />
          <AccountMenuRow
            icon="star-outline"
            label="Đánh giá từ khách thuê"
            subLabel="Xem các nhận xét thực tế từ khách đã xem phòng"
            onPress={() => alert('Danh sách đánh giá từ khách thuê.')}
          />
        </View>

        {/* Nhóm 2: Hồ sơ & Bảo mật */}
        <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
          Hồ sơ & Bảo mật
        </Text>
        <View className="bg-white rounded-2xl overflow-hidden border border-gray-100 mb-4 divide-y divide-gray-100 shadow-sm">
          <AccountMenuRow
            icon="person-outline"
            label="Thông tin cá nhân & CCCD"
            subLabel="Cập nhật thông tin định danh"
            onPress={() => router.push('/user/edit-profile' as any)}
          />
          <AccountMenuRow
            icon="card-outline"
            label="Tài khoản ngân hàng liên kết"
            subLabel="Dùng để nhận tiền rút từ ví hệ thống"
            onPress={() => alert('Quản lý tài khoản ngân hàng rút tiền.')}
          />
          <AccountMenuRow
            icon="lock-closed-outline"
            label="Đổi mật khẩu"
            subLabel="Bảo mật tài khoản"
            onPress={() => router.push('/user/change-password' as any)}
          />
        </View>

        {/* Nhóm 3: Chuyển vai trò & Đăng xuất */}
        <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
          Hệ thống
        </Text>
        <View className="bg-white rounded-2xl overflow-hidden border border-gray-100 mb-6 divide-y divide-gray-100 shadow-sm">
          <AccountMenuRow
            icon="swap-horizontal-outline"
            label="Chuyển sang chế độ Khách thuê"
            subLabel="Tìm kiếm và đặt lịch thuê phòng"
            color="#0F766E"
            onPress={() => {
              switchMode();
              router.replace('/(tenant)' as any);
            }}
          />
          <AccountMenuRow
            icon="log-out-outline"
            label="Đăng xuất"
            color="#EF4444"
            onPress={handleLogout}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
