import React from 'react';
import { ScrollView, View, Text, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { Colors } from '../../constants/theme';
import { Avatar } from 'heroui-native';

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

export default function LandlordAccountScreen() {
  const { user, switchMode, logout } = useAuthStore();

  const displayName = user?.hoVaTen || user?.tenDangNhap || 'Nguyễn Văn An';
  const displaySub = user
    ? `${user.email} • ${user.sdt}`
    : 'vananh@email.com • 0901 234 567';

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất tài khoản Chủ trọ?', [
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
    <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
      <ScrollView
        style={{ flex: 1 }}
        className="px-4 pt-2"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Khối Header Avatar & Tên */}
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
            icon="newspaper-outline"
            label="Quản lý bài đăng"
            onPress={() => router.push('/(landlord)/my-posts')}
          />
          <ProfileMenuRow
            icon="heart-outline"
            label="Phòng yêu thích"
            onPress={() => router.push('/(tenant)/favorites')}
          />
          <ProfileMenuRow
            icon="calendar-outline"
            label="Lịch xem phòng"
            onPress={() => router.push('/(landlord)/appointments')}
          />
          <ProfileMenuRow
            icon="document-text-outline"
            label="Yêu cầu thuê"
            onPress={() => router.push('/(landlord)/rental-requests')}
          />
          <ProfileMenuRow
            icon="receipt-outline"
            label="Lịch sử giao dịch"
            onPress={() => router.push('/(landlord)/transactions')}
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

        {/* Nút trở lại chức năng người dùng */}
        <Pressable
          onPress={() => {
            switchMode();
            router.replace('/(tenant)');
          }}
          className="flex-row items-center justify-center gap-2 py-3.5 bg-amber-50 border border-amber-300 rounded-xl mb-3 active:opacity-70"
        >
          <Ionicons name="swap-horizontal-outline" size={18} color="#D97706" />
          <Text className="text-sm font-bold text-amber-700">Trở lại chức năng người dùng</Text>
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
