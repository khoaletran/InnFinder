import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Button, Card } from 'heroui-native';
import { adminService } from '../../../services/admin.service';
import { AdminUserItem } from '../../../types/admin.types';

export default function AdminUserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [user, setUser] = useState<AdminUserItem | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (id) {
      adminService.getUserById(id).then((res) => {
        if (res) {
          setUser(res);
          setIsLocked(res.trangThai === 'KHOA');
        }
      });
    }
  }, [id]);

  const handleToggleLock = () => {
    const actionText = isLocked ? 'Mở khoá' : 'Khoá';
    Alert.alert(
      `${actionText} tài khoản`,
      `Bạn có chắc chắn muốn ${actionText.toLowerCase()} tài khoản này?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: actionText,
          style: isLocked ? 'default' : 'destructive',
          onPress: async () => {
            if (id) {
              await adminService.toggleUserLock(id, !isLocked);
              setIsLocked(!isLocked);
            }
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <View style={{ flex: 1 }} className="pt-safe bg-slate-50 items-center justify-center">
        <Text className="text-slate-500">Đang tải thông tin...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-1">
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
          <Text className="text-base font-bold text-slate-900">Chi tiết người dùng</Text>
        </Pressable>
        <Ionicons name="ellipsis-vertical" size={20} color="#64748B" />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card Header */}
        <View className="items-center py-4 bg-white rounded-2xl border border-slate-200 mb-4 shadow-sm">
          <Avatar size="lg" color="default" className="size-20 mb-3 border-2 border-teal-600">
            {user.avatarUrl ? <Avatar.Image source={{ uri: user.avatarUrl }} /> : null}
            <Avatar.Fallback className="bg-teal-100">
              <Text className="text-2xl font-bold text-teal-800">
                {user.hoVaTen.slice(0, 2).toUpperCase()}
              </Text>
            </Avatar.Fallback>
          </Avatar>
          <Text className="text-lg font-bold text-slate-900">{user.hoVaTen}</Text>
          <View className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 mt-1">
            <Text className="text-xs font-bold text-teal-700">
              {user.vaiTro === 'QUAN_TRI' ? 'Quản trị viên' : user.chuTro ? 'Chủ trọ' : 'Khách hàng'}
            </Text>
          </View>
        </View>

        {/* Thông tin cá nhân */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Thông tin cá nhân</Text>
        <Card className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 divide-y divide-slate-100 shadow-sm">
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500">Họ và tên</Text>
            <Text className="text-xs font-semibold text-slate-800">{user.hoVaTen}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500">Email</Text>
            <Text className="text-xs font-semibold text-slate-800">{user.email}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500">Số điện thoại</Text>
            <Text className="text-xs font-semibold text-slate-800">{user.sdt}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500">Trạng thái</Text>
            <View className="flex-row items-center gap-1.5">
              <View
                className={`w-2 h-2 rounded-full ${
                  isLocked ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
              />
              <Text
                className={`text-xs font-bold ${
                  isLocked ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {isLocked ? 'Đã khoá' : 'Hoạt động'}
              </Text>
            </View>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500">Ngày tham gia</Text>
            <Text className="text-xs font-semibold text-slate-800">{user.ngayTao}</Text>
          </View>
        </Card>

        {/* Hoạt động */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Hoạt động</Text>
        <View className="flex-row gap-3 mb-6">
          <Card className="flex-1 p-3 bg-white rounded-2xl border border-slate-200 items-center shadow-sm">
            <Text className="text-[11px] text-slate-500 mb-1">Tin đăng</Text>
            <Text className="text-lg font-extrabold text-slate-900">{user.soTinDang}</Text>
          </Card>
          <Card className="flex-1 p-3 bg-white rounded-2xl border border-slate-200 items-center shadow-sm">
            <Text className="text-[11px] text-slate-500 mb-1">Lịch xem</Text>
            <Text className="text-lg font-extrabold text-slate-900">{user.soLichHen}</Text>
          </Card>
          <Card className="flex-1 p-3 bg-white rounded-2xl border border-slate-200 items-center shadow-sm">
            <Text className="text-[11px] text-slate-500 mb-1">Giao dịch</Text>
            <Text className="text-lg font-extrabold text-slate-900">{user.soGiaoDich}</Text>
          </Card>
        </View>

        {/* Nút hành động */}
        <View className="flex-row gap-3">
          <Pressable
            onPress={handleToggleLock}
            className={`flex-1 py-3.5 rounded-xl items-center justify-center border active:opacity-70 ${
              isLocked
                ? 'bg-emerald-50 border-emerald-300'
                : 'bg-rose-50 border-rose-300'
            }`}
          >
            <Text
              className={`text-sm font-bold ${
                isLocked ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {isLocked ? 'Mở khoá tài khoản' : 'Khoá tài khoản'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => Alert.alert('Thông báo', 'Đã lưu thay đổi thông tin.')}
            className="flex-1 py-3.5 rounded-xl items-center justify-center bg-teal-600 active:bg-teal-700"
          >
            <Text className="text-sm font-bold text-white">Cập nhật</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
