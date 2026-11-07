import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Card } from 'heroui-native';
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
              Alert.alert('Thành công', `Đã ${actionText.toLowerCase()} tài khoản.`);
            }
          },
        },
      ]
    );
  };

  const handleResetPassword = () => {
    Alert.alert(
      'Reset mật khẩu người dùng',
      `Đặt lại mật khẩu cho tài khoản "${user?.hoVaTen}" về mật khẩu tạm thời "InnFinder@2026"?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Reset mật khẩu',
          style: 'default',
          onPress: async () => {
            if (id) {
              await adminService.resetUserPassword(id, 'InnFinder@2026');
              Alert.alert(
                'Thành công',
                'Mật khẩu mới đã được đặt lại thành: InnFinder@2026. Hãy thông báo cho người dùng đổi lại mật khẩu sau khi đăng nhập.'
              );
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
      {/* Header chuẩn stack */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200/80">
        <View className="flex-row items-center gap-2.5">
          <Pressable
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
          >
            <Ionicons name="chevron-back" size={20} color="#0F172A" />
          </Pressable>
          <Text className="text-base font-bold text-slate-900">Chi tiết người dùng</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card Header */}
        <View className="items-center py-5 bg-white rounded-2xl border border-slate-200/90 mb-4 shadow-xs">
          <Avatar size="lg" color="default" className="size-20 mb-3 border-2 border-teal-600">
            {user.avatarUrl ? <Avatar.Image source={{ uri: user.avatarUrl }} /> : null}
            <Avatar.Fallback className="bg-teal-50">
              <Text className="text-2xl font-bold text-teal-800">
                {user.hoVaTen.slice(0, 2).toUpperCase()}
              </Text>
            </Avatar.Fallback>
          </Avatar>
          <Text className="text-lg font-bold text-slate-900">{user.hoVaTen}</Text>
          <Text className="text-xs text-slate-500 mt-0.5">@{user.tenDangNhap}</Text>
          <View className="flex-row items-center gap-2 mt-2">
            <View className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200">
              <Text className="text-xs font-bold text-teal-700">
                {user.vaiTro === 'QUAN_TRI' ? 'Quản trị viên' : user.chuTro ? 'Chủ trọ' : 'Khách hàng'}
              </Text>
            </View>
            <View
              className={`px-2.5 py-0.5 rounded-full border ${
                isLocked
                  ? 'bg-rose-50 border-rose-200'
                  : 'bg-emerald-50 border-emerald-200'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  isLocked ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {isLocked ? 'Đã khoá' : 'Đang hoạt động'}
              </Text>
            </View>
          </View>
        </View>

        {/* Thông tin cơ bản */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Thông tin cơ bản</Text>
        <Card className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-4 divide-y divide-slate-100 shadow-xs">
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Mã định danh (Mã ND)</Text>
            <Text className="text-xs font-bold text-teal-700">{user.maNguoiDung}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Tên đăng nhập</Text>
            <Text className="text-xs font-semibold text-slate-800">{user.tenDangNhap}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Họ và tên</Text>
            <Text className="text-xs font-semibold text-slate-800">{user.hoVaTen}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Email</Text>
            <Text className="text-xs font-semibold text-slate-800">{user.email}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Số điện thoại</Text>
            <Text className="text-xs font-semibold text-slate-800">{user.sdt}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Căn cước công dân (CCCD)</Text>
            <Text className="text-xs font-semibold text-slate-800">
              {user.cccd ? `${user.cccd.slice(0, 4)}****${user.cccd.slice(-4)}` : 'Chưa cập nhật'}
            </Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Ngày mở tài khoản</Text>
            <Text className="text-xs font-semibold text-slate-800">{user.ngayTao || 'Chưa cập nhật'}</Text>
          </View>
        </Card>

        {/* Hoạt động tài khoản */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Hoạt động tài khoản</Text>
        <View className="flex-row gap-3 mb-6">
          <Card className="flex-1 p-3.5 bg-white rounded-2xl border border-slate-200/90 items-center shadow-xs">
            <Text className="text-[11px] text-slate-500 font-medium mb-1">Tin đăng</Text>
            <Text className="text-xl font-black text-slate-900">{user.soTinDang}</Text>
          </Card>
          <Card className="flex-1 p-3.5 bg-white rounded-2xl border border-slate-200/90 items-center shadow-xs">
            <Text className="text-[11px] text-slate-500 font-medium mb-1">Lịch xem</Text>
            <Text className="text-xl font-black text-slate-900">{user.soLichHen}</Text>
          </Card>
          <Card className="flex-1 p-3.5 bg-white rounded-2xl border border-slate-200/90 items-center shadow-xs">
            <Text className="text-[11px] text-slate-500 font-medium mb-1">Giao dịch</Text>
            <Text className="text-xl font-black text-slate-900">{user.soGiaoDich}</Text>
          </Card>
        </View>

        {/* Nút hành động Admin (Hỗ trợ reset mật khẩu và Khoá/Mở khoá tài khoản) */}
        <View className="flex-row gap-3">
          <Pressable
            onPress={handleResetPassword}
            className="flex-1 flex-row items-center justify-center gap-1.5 py-3.5 rounded-xl border border-amber-300 bg-amber-50 active:opacity-80"
          >
            <Ionicons name="key-outline" size={17} color="#D97706" />
            <Text className="text-xs font-bold text-amber-700">Reset mật khẩu</Text>
          </Pressable>

          <Pressable
            onPress={handleToggleLock}
            className={`flex-1 flex-row items-center justify-center gap-1.5 py-3.5 rounded-xl border active:opacity-80 ${
              isLocked
                ? 'bg-emerald-50 border-emerald-300'
                : 'bg-rose-50 border-rose-200'
            }`}
          >
            <Ionicons
              name={isLocked ? 'lock-open-outline' : 'lock-closed-outline'}
              size={17}
              color={isLocked ? '#047857' : '#E11D48'}
            />
            <Text
              className={`text-xs font-bold ${
                isLocked ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {isLocked ? 'Mở khoá tài khoản' : 'Khoá tài khoản'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
