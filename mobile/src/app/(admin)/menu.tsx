import React from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from 'heroui-native';
import { useAuthStore } from '../../store/useAuthStore';
import { Colors } from '../../constants/theme';

interface MenuRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  badge?: number | string;
}

function MenuRow({ icon, label, onPress, badge }: MenuRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between py-3.5 px-4 bg-white active:bg-slate-50"
    >
      <View className="flex-row items-center gap-3">
        <View className="w-8 h-8 rounded-full bg-teal-50 items-center justify-center">
          <Ionicons name={icon} size={17} color="#0D9488" />
        </View>
        <Text className="text-sm font-semibold text-slate-800">{label}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        {badge ? (
          <View className="px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200">
            <Text className="text-[11px] font-bold text-rose-600">{badge}</Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
      </View>
    </Pressable>
  );
}

export default function AdminMenuScreen() {
  const { user, logout } = useAuthStore();

  const displayName = user?.hoVaTen || user?.tenDangNhap || 'Quản Trị Viên';
  const displayEmail = user?.email || 'admin@innfinder.com';

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất tài khoản Quản trị?', [
      { text: 'Huỷ', style: 'cancel' },
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
        {/* Header Profile đồng bộ trang cá nhân khách hàng */}
        <View className="items-center py-6">
          <Avatar size="lg" color="accent" className="size-20 mb-3 border-2 border-teal-600">
            {user?.avatarUrl ? <Avatar.Image source={{ uri: user.avatarUrl }} /> : null}
            <Avatar.Fallback className="bg-teal-50">
              <Text className="text-2xl font-black text-teal-700">
                {displayName.slice(0, 2).toUpperCase()}
              </Text>
            </Avatar.Fallback>
          </Avatar>

          <Text className="text-xl font-bold text-slate-900">{displayName}</Text>
          <Text className="text-xs text-slate-500 mt-1">{displayEmail}</Text>
          <View className="px-3 py-1 rounded-full bg-teal-50 border border-teal-200 mt-2">
            <Text className="text-xs font-bold text-teal-700">Quản trị viên hệ thống</Text>
          </View>
        </View>

        {/* Nhóm 1: Tài khoản cá nhân */}
        <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
          Tài khoản
        </Text>
        <View className="bg-white rounded-2xl overflow-hidden border border-slate-200/90 mb-5 divide-y divide-slate-100 shadow-xs">
          <MenuRow
            icon="person-outline"
            label="Thông tin cá nhân"
            onPress={() => router.push('/(admin)/profile')}
          />
          <MenuRow
            icon="lock-closed-outline"
            label="Đổi mật khẩu"
            onPress={() => router.push('/(admin)/change-password')}
          />
        </View>

        {/* Nhóm 2: Chức năng quản trị */}
        <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
          Quản trị & Giám sát
        </Text>
        <View className="bg-white rounded-2xl overflow-hidden border border-slate-200/90 mb-5 divide-y divide-slate-100 shadow-xs">
          <MenuRow
            icon="speedometer-outline"
            label="Dashboard điều hành"
            onPress={() => router.push('/(admin)')}
          />
          <MenuRow
            icon="people-outline"
            label="Quản lý người dùng"
            onPress={() => router.push('/(admin)/users')}
          />
          <MenuRow
            icon="list-outline"
            label="Quản lý danh mục"
            onPress={() => router.push('/(admin)/categories')}
          />
          <MenuRow
            icon="newspaper-outline"
            label="Kiểm duyệt bài đăng"
            badge="124"
            onPress={() => router.push('/(admin)/posts')}
          />
          <MenuRow
            icon="calendar-outline"
            label="Lịch xem phòng"
            onPress={() => router.push('/(admin)/appointments')}
          />
          <MenuRow
            icon="receipt-outline"
            label="Quản lý giao dịch"
            onPress={() => router.push('/(admin)/transactions')}
          />
          <MenuRow
            icon="star-outline"
            label="Đánh giá phòng"
            onPress={() => router.push('/(admin)/reviews')}
          />
          <MenuRow
            icon="warning-outline"
            label="Khiếu nại & Vi phạm"
            badge="12"
            onPress={() => router.push('/(admin)/complaints')}
          />
          <MenuRow
            icon="stats-chart-outline"
            label="Thống kê nâng cao"
            onPress={() => router.push('/(admin)/statistics')}
          />
        </View>

        {/* Nút Đăng xuất */}
        <Pressable
          onPress={handleLogout}
          className="flex-row items-center justify-center gap-2 py-3.5 bg-rose-50 border border-rose-200 rounded-xl mb-10 active:opacity-80"
        >
          <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
          <Text className="text-sm font-bold text-rose-600">Đăng xuất tài khoản</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
