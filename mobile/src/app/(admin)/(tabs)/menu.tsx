import React from 'react';
import { ScrollView, View, Text, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from 'heroui-native';
import { useAuthStore } from '../../../store/useAuthStore';
import { Colors } from '../../../constants/theme';

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
  badge?: number | string;
}

function ProfileMenuRow({ icon, label, onPress, color = Colors.text, badge }: MenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between py-3.5 px-4 bg-white active:bg-slate-50"
    >
      <View className="flex-row items-center gap-3">
        <Ionicons name={icon} size={20} color={color} />
        <Text className="text-base font-medium text-slate-800">{label}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        {badge ? (
          <View className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200">
            <Text className="text-[11px] font-bold text-teal-700">{badge}</Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </View>
    </Pressable>
  );
}

export default function AdminMenuScreen() {
  const { user, logout } = useAuthStore();

  const displayName = user?.hoVaTen || user?.tenDangNhap || 'Quản Trị Viên';
  const displaySub = user?.email && user?.sdt ? `${user.email} • ${user.sdt}` : (user?.email || 'admin@innfinder.com');

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất tài khoản Quản trị?', [
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
        {/* Header thông tin người dùng đồng bộ 100% với Tenant */}
        <View className="items-center py-6">
          <Avatar size="lg" color="accent" className="size-20 mb-3 border-2 border-teal-600">
            {user?.avatarUrl ? (
              <Avatar.Image source={{ uri: user.avatarUrl }} />
            ) : null}
            <Avatar.Fallback className="bg-teal-100">
              <Text className="text-2xl font-extrabold text-teal-700">
                {displayName ? displayName.slice(0, 2).toUpperCase() : 'AD'}
              </Text>
            </Avatar.Fallback>
          </Avatar>

          <Text className="text-xl font-bold text-slate-900">{displayName}</Text>
          {displaySub ? (
            <Text className="text-xs text-slate-500 mt-1">{displaySub}</Text>
          ) : null}
          <View className="px-3 py-1 rounded-full bg-teal-50 border border-teal-200 mt-2">
            <Text className="text-xs font-bold text-teal-700">Quản trị viên hệ thống</Text>
          </View>
        </View>

        {/* Nhóm 1: Tài khoản cá nhân (đồng bộ hoàn toàn với Tenant) */}
        <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
          Tài khoản cá nhân
        </Text>
        <View className="bg-white rounded-2xl overflow-hidden border border-slate-200 mb-5 divide-y divide-slate-100 shadow-xs">
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

        {/* Nhóm 2: Giám sát vận hành hệ thống */}
        <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
          Giám sát & Báo cáo
        </Text>
        <View className="bg-white rounded-2xl overflow-hidden border border-slate-200 mb-5 divide-y divide-slate-100 shadow-xs">
          <ProfileMenuRow
            icon="calendar-outline"
            label="Lịch xem phòng"
            onPress={() => router.push('/(admin)/appointments' as any)}
          />
          <ProfileMenuRow
            icon="star-outline"
            label="Đánh giá phòng"
            onPress={() => router.push('/(admin)/reviews' as any)}
          />
          <ProfileMenuRow
            icon="stats-chart-outline"
            label="Thống kê nâng cao"
            onPress={() => router.push('/(admin)/statistics')}
          />
        </View>

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
