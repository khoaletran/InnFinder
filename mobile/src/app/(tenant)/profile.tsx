import React from 'react';
import { ScrollView, View, Text, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { Colors } from '../../constants/theme';
import { Avatar, Chip } from 'heroui-native';

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

  const displayName = user?.hoVaTen || user?.tenDangNhap || 'Nguyễn Văn An';
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
        <View className="items-center py-6">
          <Avatar size="lg" color="accent" className="size-20 mb-3 border-2 border-teal-600">
            {user?.avatarUrl ? (
              <Avatar.Image source={{ uri: user.avatarUrl }} />
            ) : null}
            <Avatar.Fallback className="bg-teal-100">
              <Text className="text-2xl font-extrabold text-teal-700">
                {displayName.slice(0, 2).toUpperCase()}
              </Text>
            </Avatar.Fallback>
          </Avatar>

          <Text className="text-xl font-bold text-slate-900">{displayName}</Text>
          <Text className="text-xs text-slate-500 mt-1">{displaySub}</Text>
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

        {/* Kiểm tra điều kiện vai trò Chủ trọ */}
        {user?.chuTro ? (
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
        ) : (
          <Pressable
            onPress={() => router.push('/user/register-landlord')}
            className="flex-row items-center justify-center gap-2 py-3.5 bg-amber-50 border border-amber-300 rounded-xl mb-3 active:opacity-70"
          >
            <Ionicons name="business-outline" size={18} color="#D97706" />
            <Text className="text-sm font-bold text-amber-700">Đăng ký trở thành Chủ trọ</Text>
          </Pressable>
        )}

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
