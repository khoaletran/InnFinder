import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Card } from 'heroui-native';
import { adminService } from '../../../services/admin.service';
import { AdminUserItem } from '../../../types/admin.types';

export default function AdminUserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [user, setUser] = useState<AdminUserItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
      adminService
        .getUserById(id)
        .then((res) => {
          if (res) {
            setUser(res);
            setIsLocked(res.trangThai === 'KHOA');
          }
        })
        .finally(() => setLoading(false));
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

  if (loading) {
    return (
      <View style={{ flex: 1 }} className="pt-safe bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0D9488" />
        <Text className="text-sm font-medium text-slate-500 mt-3">Đang tải thông tin tài khoản...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-slate-200/80">
          <Pressable
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
          >
            <Ionicons name="chevron-back" size={20} color="#0F172A" />
          </Pressable>
          <Text className="text-base font-bold text-slate-900 ml-2.5">Chi tiết người dùng</Text>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
            <Ionicons name="person-outline" size={32} color="#94A3B8" />
          </View>
          <Text className="text-base font-bold text-slate-800 mb-1">Không tìm thấy người dùng</Text>
          <Text className="text-xs text-slate-400 text-center mb-5">
            Tài khoản này không tồn tại hoặc đã bị gỡ bỏ khỏi hệ thống.
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="px-5 py-2.5 bg-teal-600 rounded-xl active:bg-teal-700"
          >
            <Text className="text-xs font-bold text-white">Quay lại danh sách</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isLandlord = user.chuTro;
  const isCccdValid = user.cccd && /^\d{12}$/.test(user.cccd);

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

        <View
          className={`px-3 py-1 rounded-full border ${
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
            {isLocked ? 'Đã khóa' : 'Đang hoạt động'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 130 }}
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
          <Text className="text-xs text-slate-500 mt-0.5 font-mono">@{user.tenDangNhap}</Text>

          <View className="flex-row items-center gap-2 mt-2.5">
            <View className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200">
              <Text className="text-xs font-bold text-teal-700">
                {user.vaiTro === 'QUAN_TRI'
                  ? 'Quản trị viên'
                  : isLandlord
                  ? 'Chủ trọ cho thuê'
                  : 'Khách tìm phòng'}
              </Text>
            </View>
            <View className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200">
              <Text className="text-xs font-mono font-bold text-slate-700">
                {user.maNguoiDung}
              </Text>
            </View>
          </View>
        </View>

        {/* Khối Thông tin Chủ trọ (Điểm uy tín & Số dư ví theo AGENTS.md mục 3.2 ChuTro) */}
        {isLandlord ? (
          <>
            <Text className="text-sm font-bold text-slate-900 mb-2">Thông tin ví & Uy tín Chủ trọ</Text>
            <View className="flex-row gap-3 mb-4">
              <Card className="flex-1 p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-xs text-slate-400 font-medium">Điểm uy tín</Text>
                  <Ionicons name="ribbon-outline" size={16} color="#0D9488" />
                </View>
                <Text className="text-2xl font-black text-teal-600">
                  {user.diemUyTin ?? 100} / 100
                </Text>
                <Text className="text-[10px] text-slate-400 mt-1 font-medium">
                  Mức độ uy tín rất tốt
                </Text>
              </Card>

              <Card className="flex-1 p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-xs text-slate-400 font-medium">Số dư ví khả dụng</Text>
                  <Ionicons name="wallet-outline" size={16} color="#0D9488" />
                </View>
                <Text className="text-xl font-black text-slate-900">
                  {(user.soDu ?? 0).toLocaleString('vi-VN')} đ
                </Text>
                <Text className="text-[10px] text-teal-600 mt-1 font-medium">
                  Sẵn sàng rút về ngân hàng
                </Text>
              </Card>
            </View>
          </>
        ) : null}

        {/* Thông tin định danh cơ bản */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Thông tin tài khoản & Định danh</Text>
        <Card className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-4 divide-y divide-slate-100 shadow-xs">
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Mã người dùng (Mã ND)</Text>
            <Text className="text-xs font-bold text-teal-700 font-mono">{user.maNguoiDung}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Tên đăng nhập duy nhất</Text>
            <Text className="text-xs font-semibold text-slate-800">{user.tenDangNhap}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Họ và tên đầy đủ</Text>
            <Text className="text-xs font-semibold text-slate-800">{user.hoVaTen}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Địa chỉ Email</Text>
            <Text className="text-xs font-semibold text-slate-800">{user.email}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Số điện thoại</Text>
            <Text className="text-xs font-semibold text-slate-800">{user.sdt}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Số CCCD (12 chữ số)</Text>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-xs font-bold text-slate-900 font-mono">
                {user.cccd || 'Chưa cung cấp'}
              </Text>
              {isCccdValid ? (
                <Ionicons name="checkmark-circle" size={14} color="#0D9488" />
              ) : null}
            </View>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Thời gian mở tài khoản</Text>
            <Text className="text-xs font-semibold text-slate-800">
              {user.ngayTao || 'Chưa cập nhật'}
            </Text>
          </View>
        </Card>

        {/* Tài khoản ngân hàng liên kết (AGENTS.md mục 3.3 TaiKhoanNganHang) */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Tài khoản ngân hàng liên kết</Text>
        <Card className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-4 shadow-xs">
          {user.soTaiKhoan || user.tenNganHang ? (
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-teal-50 items-center justify-center border border-teal-100">
                  <Ionicons name="card-outline" size={20} color="#0D9488" />
                </View>
                <View>
                  <Text className="text-sm font-bold text-slate-900">
                    {user.tenNganHang || 'Ngân hàng thụ hưởng'}
                  </Text>
                  <Text className="text-xs font-mono font-semibold text-slate-500 mt-0.5">
                    {user.soTaiKhoan || 'Chưa cập nhật STK'}
                  </Text>
                </View>
              </View>
              <View className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                <Text className="text-[10px] font-bold text-emerald-700">Đã liên kết</Text>
              </View>
            </View>
          ) : (
            <View className="py-2 items-center">
              <Text className="text-xs text-slate-400">Người dùng chưa liên kết tài khoản ngân hàng</Text>
            </View>
          )}
        </Card>

        {/* Hoạt động tài khoản */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Thống kê hoạt động</Text>
        <View className="flex-row gap-3 mb-6">
          <Card className="flex-1 p-3.5 bg-white rounded-2xl border border-slate-200/90 items-center shadow-xs">
            <Text className="text-[11px] text-slate-500 font-medium mb-1">Tin đăng phòng</Text>
            <Text className="text-xl font-black text-slate-900">{user.soTinDang}</Text>
          </Card>
          <Card className="flex-1 p-3.5 bg-white rounded-2xl border border-slate-200/90 items-center shadow-xs">
            <Text className="text-[11px] text-slate-500 font-medium mb-1">Lịch hẹn xem</Text>
            <Text className="text-xl font-black text-slate-900">{user.soLichHen}</Text>
          </Card>
          <Card className="flex-1 p-3.5 bg-white rounded-2xl border border-slate-200/90 items-center shadow-xs">
            <Text className="text-[11px] text-slate-500 font-medium mb-1">Giao dịch ví</Text>
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
