import React from 'react';
import { ScrollView, View, Text, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { Colors } from '../../constants/theme';

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
}

function ProfileMenuRow({ icon, label, onPress, color = Colors.text }: MenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between py-3.5 px-4 bg-white active:bg-slate-50"
    >
      <View className="flex-row items-center gap-3">
        <Ionicons name={icon} size={20} color={color} />
        <Text className="text-base font-medium text-slate-800">{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </Pressable>
  );
}

export default function TenantProfileScreen() {
  const { user, switchMode, logout } = useAuthStore();

  const displayName = user?.tenDangNhap || 'Nguyễn Văn Anh';
  const displaySub = user
    ? `${user.email} • ${user.sdt}`
    : 'vananh@email.com • 0901 234 567';

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất tài khoản?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <View className="flex-1 pt-safe bg-slate-50">
      <ScrollView className="flex-1 px-4 pt-2" showsVerticalScrollIndicator={false}>
        {/* Khối Header Avatar & Tên */}
        <View className="items-center py-6">
          <View className="size-20 rounded-full bg-teal-100 items-center justify-center border-2 border-teal-600 mb-3">
            <Text className="text-2xl font-bold text-teal-700">NA</Text>
          </View>

          <Text className="text-xl font-bold text-slate-900">{displayName}</Text>
          <Text className="text-xs text-slate-500 mt-1 mb-2">{displaySub}</Text>

          <View className="bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
            <Text className="text-xs font-semibold text-emerald-800">Khách thuê</Text>
          </View>
        </View>

        {/* Nhóm 1: Tài khoản cá nhân */}
        <View className="bg-white rounded-2xl overflow-hidden border border-slate-200 mb-4 divide-y divide-slate-100">
          <ProfileMenuRow
            icon="person-outline"
            label="Thông tin cá nhân"
            onPress={() => router.push('/user/edit-profile')}
          />
          <ProfileMenuRow
            icon="lock-closed-outline"
            label="Đổi mật khẩu"
            onPress={() => router.push('/user/change-password')}
          />
        </View>

        {/* Nhóm 2: Lịch & Thuê phòng */}
        <View className="bg-white rounded-2xl overflow-hidden border border-slate-200 mb-4 divide-y divide-slate-100">
          <ProfileMenuRow
            icon="heart-outline"
            label="Phòng yêu thích"
            onPress={() => router.push('/(tenant)/favorites')}
          />
          <ProfileMenuRow
            icon="calendar-outline"
            label="Lịch xem phòng"
            onPress={() => router.push('/booking/appointments')}
          />
          <ProfileMenuRow
            icon="document-text-outline"
            label="Yêu cầu thuê"
            onPress={() => router.push('/booking/rental-requests')}
          />
          <ProfileMenuRow
            icon="receipt-outline"
            label="Lịch sử giao dịch"
            onPress={() => router.push('/booking/transactions')}
          />
        </View>

        {/* Nhóm 3: Đánh giá & Khiếu nại */}
        <View className="bg-white rounded-2xl overflow-hidden border border-slate-200 mb-4 divide-y divide-slate-100">
          <ProfileMenuRow
            icon="star-outline"
            label="Đánh giá phòng"
            onPress={() => router.push('/booking/review')}
          />
          <ProfileMenuRow
            icon="warning-outline"
            label="Gửi khiếu nại"
            onPress={() => router.push('/user/complaint')}
          />
        </View>

        {/* Nút chuyển đổi giao diện Chủ trọ */}
        <Pressable
          onPress={() => {
            switchMode();
            router.replace('/(landlord)');
          }}
          className="flex-row items-center justify-center gap-2 py-3.5 bg-teal-50 border border-teal-300 rounded-xl mb-3 active:opacity-70"
        >
          <Ionicons name="swap-horizontal-outline" size={18} color={Colors.primary} />
          <Text className="text-sm font-bold text-teal-700">Chuyển sang giao diện Chủ trọ</Text>
        </Pressable>

        {/* Nút Đăng xuất */}
        <Pressable
          onPress={handleLogout}
          className="flex-row items-center justify-center gap-2 py-3.5 bg-rose-50 border border-rose-200 rounded-xl mb-10 active:opacity-70"
        >
          <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
          <Text className="text-sm font-bold text-rose-600">Đăng xuất</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
