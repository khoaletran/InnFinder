import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadService } from '../../services/upload.service';
import { authUserService } from '../../services/authUser.service';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Button } from 'heroui-native';
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
  const { user, isAuthenticated, switchMode, logout, setUser } = useAuthStore();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleChangeAvatar = () => {
    Alert.alert(
      'Cập nhật ảnh đại diện',
      'Chọn hình thức tải ảnh đại diện lên hệ thống:',
      [
        {
          text: 'Chụp ảnh mới',
          onPress: async () => {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) {
              Alert.alert('Cần quyền camera', 'Vui lòng cấp quyền truy cập máy ảnh để chụp ảnh đại diện.');
              return;
            }
            const res = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.85,
            });
            if (!res.canceled && res.assets?.[0]?.uri) {
              await processUploadAvatar(res.assets[0].uri);
            }
          },
        },
        {
          text: 'Chọn từ thư viện',
          onPress: async () => {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) {
              Alert.alert('Cần quyền thư viện', 'Vui lòng cấp quyền truy cập thư viện ảnh.');
              return;
            }
            const res = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.85,
            });
            if (!res.canceled && res.assets?.[0]?.uri) {
              await processUploadAvatar(res.assets[0].uri);
            }
          },
        },
        { text: 'Hủy', style: 'cancel' },
      ]
    );
  };

  const processUploadAvatar = async (localUri: string) => {
    try {
      setUploadingAvatar(true);
      // 1. Upload lên Cloudinary vào thư mục innfinder/avatars
      const cloudUrl = await uploadService.uploadSingleImage(localUri, 'avatars');
      if (!cloudUrl) {
        throw new Error('Không nhận được URL từ máy chủ Cloudinary');
      }

      // 2. Cập nhật hồ sơ người dùng trên Backend
      const updated = await authUserService.updateProfile({
        email: user?.email || '',
        sdt: user?.sdt || '',
        hoVaTen: user?.hoVaTen,
        hinhDaiDien: cloudUrl,
        avatarUrl: cloudUrl,
      });

      // 3. Cập nhật state trong zustand store
      setUser(updated);
      Alert.alert('Thành công', 'Ảnh đại diện đã được cập nhật thành công!');
    } catch (err: any) {
      console.error('Lỗi khi đổi avatar:', err);
      Alert.alert('Lỗi cập nhật ảnh đại diện', err?.message || 'Không thể tải ảnh đại diện lên.');
    } finally {
      setUploadingAvatar(false);
    }
  };

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

  const displayName = user?.hoVaTen || user?.tenDangNhap || '';
  const displaySub = user?.email && user?.sdt ? `${user.email} • ${user.sdt}` : (user?.email || user?.sdt || '');

  return (
    <View className="flex-1 pt-safe bg-slate-50">
      <ScrollView className="flex-1 px-4 pt-2" showsVerticalScrollIndicator={false}>
        {isAuthenticated && user ? (
          /* ================= ĐÃ ĐĂNG NHẬP: HIỂN THỊ TOÀN BỘ CHỨC NĂNG ================= */
          <>
            {/* Header thông tin người dùng */}
            <View className="items-center py-6">
              <View className="relative mb-3">
                <Avatar size="lg" color="accent" className="size-24 border-2 border-teal-600">
                  {user.avatarUrl || user.hinhDaiDien ? (
                    <Avatar.Image source={{ uri: user.avatarUrl || user.hinhDaiDien }} />
                  ) : null}
                  <Avatar.Fallback className="bg-teal-100">
                    <Text className="text-2xl font-extrabold text-teal-700">
                      {displayName ? displayName.slice(0, 2).toUpperCase() : 'ND'}
                    </Text>
                  </Avatar.Fallback>
                </Avatar>

                {/* Nút chỉnh sửa ảnh đại diện ở góc dưới bên phải */}
                <Pressable
                  onPress={handleChangeAvatar}
                  disabled={uploadingAvatar}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  className="absolute bottom-0 right-0 size-8 rounded-full bg-teal-600 border-2 border-white items-center justify-center shadow-md active:bg-teal-700"
                >
                  {uploadingAvatar ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                  )}
                </Pressable>
              </View>

              <Text className="text-xl font-bold text-slate-900">{displayName}</Text>
              {displaySub ? (
                <Text className="text-xs text-slate-500 mt-1">{displaySub}</Text>
              ) : null}
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

            {/* Nhóm 2: Lịch & Giao dịch */}
            <View className="bg-white rounded-2xl overflow-hidden border border-slate-200 mb-4 divide-y divide-slate-100">
              <ProfileMenuRow
                icon="heart-outline"
                label="Phòng yêu thích"
                onPress={() => router.push('/(tenant)/favorites')}
              />
              <ProfileMenuRow
                icon="calendar-outline"
                label="Lịch xem phòng"
                onPress={() => router.push('/(tenant)/appointments')}
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
                onPress={() =>
                  router.push({
                    pathname: "/(tenant)/appointments",
                    params: { tab: "HOAN_THANH" },
                  })
                }
              />
              <ProfileMenuRow
                icon="warning-outline"
                label="Gửi khiếu nại"
                onPress={() => router.push('/user/complaint')}
              />
            </View>

            {/* Nút chuyển đổi vai trò */}
            {user.vaiTro === 'QUAN_TRI' ? (
              <Pressable
                onPress={() => router.replace('/(admin)')}
                className="flex-row items-center justify-center gap-2 py-3.5 bg-purple-50 border border-purple-300 rounded-xl mb-3 active:opacity-70"
              >
                <Ionicons name="shield-checkmark-outline" size={18} color="#7E22CE" />
                <Text className="text-sm font-bold text-purple-700">Vào bảng quản trị Admin</Text>
              </Pressable>
            ) : user.chuTro ? (
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
          </>
        ) : (
          /* ================= CHƯA ĐĂNG NHẬP: ẨN TOÀN BỘ CÁC MỤC, CHỈ HIỆN KHỐI ĐĂNG NHẬP ================= */
          <View className="items-center py-10 px-6 bg-white rounded-3xl border border-slate-200 my-8 shadow-sm">
            <View className="size-20 rounded-full bg-teal-50 border border-teal-200 items-center justify-center mb-4">
              <Ionicons name="person-outline" size={38} color={Colors.primary} />
            </View>
            <Text className="text-xl font-bold text-slate-900 text-center">
              Chào mừng bạn đến với InnFinder
            </Text>
            <Text className="text-xs text-slate-500 text-center mt-2 mb-6 leading-relaxed">
              Vui lòng đăng nhập để xem hồ sơ cá nhân, đổi mật khẩu, theo dõi lịch hẹn xem phòng và gửi khiếu nại.
            </Text>
            <Button
              variant="primary"
              size="lg"
              onPress={() => router.push('/(auth)/login')}
              className="w-full bg-teal-600 active:bg-teal-700 rounded-xl"
            >
              <Button.Label className="font-bold text-white text-base">
                Đăng nhập / Đăng ký ngay
              </Button.Label>
            </Button>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
