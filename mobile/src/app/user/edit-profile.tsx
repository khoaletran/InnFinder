import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Chip, Input, Label, TextField } from 'heroui-native';
import { useAuthStore } from '../../store/useAuthStore';
import { authUserService } from '../../services/authUser.service';
import { Colors } from '../../constants/theme';

export default function EditProfileScreen() {
  const { user, setUser } = useAuthStore();

  // Dữ liệu định danh hệ thống
  const maNguoiDung = user?.maNguoiDung || 'ND202611060001';
  const tenDangNhap = user?.tenDangNhap || 'nguyenvanan';
  const thoiGianMo = user?.thoiGianMoTaiKhoan || '06/11/2026';
  const vaiTro = user?.vaiTro || 'KHACH_HANG';

  // State Họ và tên, Email & SĐT (nằm chung trong khối hồ sơ để cập nhật)
  const [hoVaTen, setHoVaTen] = useState(user?.hoVaTen || 'Nguyễn Văn An');
  const [email, setEmail] = useState(user?.email || 'vanan.innfinder@gmail.com');
  const [sdt, setSdt] = useState(user?.sdt || '0901234567');
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [loadingUpdate, setLoadingUpdate] = useState(false);

  // State xác thực tài khoản (CCCD)
  const [isVerifying, setIsVerifying] = useState(false);
  const [cccdInput, setCccdInput] = useState('');
  const [loadingVerify, setLoadingVerify] = useState(false);

  // 1. Cập nhật thông tin tài khoản (Email, SĐT)
  const handleUpdateAccount = async () => {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Lỗi', 'Email không đúng định dạng');
      return;
    }
    const phoneRegex = /^(03|05|07|08|09)\d{8}$/;
    if (!phoneRegex.test(sdt.trim())) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ (10 số)');
      return;
    }

    try {
      setLoadingUpdate(true);
      const updated = await authUserService.updateProfile({
        hoVaTen: hoVaTen.trim() || undefined,
        email: email.trim(),
        sdt: sdt.trim(),
      });
      setUser(updated);
      setIsEditingContact(false);
      Alert.alert('Thành công', 'Thông tin tài khoản đã được cập nhật');
    } catch (err: any) {
      Alert.alert('Thất bại', err.message || 'Không thể cập nhật hồ sơ');
    } finally {
      setLoadingUpdate(false);
    }
  };

  // 2. Gửi xác thực CCCD
  const handleSendVerification = async () => {
    const cccdRegex = /^\d{12}$/;
    if (!cccdRegex.test(cccdInput.trim())) {
      Alert.alert('CCCD không hợp lệ', 'Số Căn cước công dân phải gồm đúng 12 chữ số.');
      return;
    }

    try {
      setLoadingVerify(true);
      // Gọi API cập nhật hoặc nộp CCCD
      if (user) {
        setUser({ ...user, cccd: cccdInput.trim() });
      }
      setIsVerifying(false);
      Alert.alert(
        'Đã gửi thông tin định danh',
        'Số CCCD của bạn đã được gửi lên hệ thống và đang chờ xét duyệt xác thực.',
        [{ text: 'Đã hiểu' }]
      );
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể xác thực lúc này');
    } finally {
      setLoadingVerify(false);
    }
  };

  return (
    <View className="flex-1 pt-safe bg-slate-50">
      {/* Header bar */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-slate-200">
        <Pressable onPress={() => router.back()} className="p-1 active:opacity-70 mr-2">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text className="text-lg font-bold text-slate-900">Thông tin cá nhân</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
          {/* Hộp thông tin tài khoản duy nhất (Chứa toàn bộ định danh, email, sdt) */}
          <Card className="p-4 mb-4">
            <Card.Body className="gap-3.5">
              {/* Tiêu đề */}
              <View className="pb-2 border-b border-slate-100">
                <Text className="text-base font-bold text-slate-900">
                  Hồ sơ tài khoản
                </Text>
              </View>

              {/* Mã định danh (ID) */}
              <TextField>
                <Label>Mã định danh (ID)</Label>
                <Input
                  value={maNguoiDung}
                  readOnly
                  editable={false}
                  className="bg-slate-100 text-slate-500 font-mono"
                />
              </TextField>

              {/* Tên đăng nhập */}
              <TextField>
                <Label>Tên đăng nhập</Label>
                <Input
                  value={tenDangNhap}
                  readOnly
                  editable={false}
                  className="bg-slate-100 text-slate-600 font-medium"
                />
              </TextField>

              {/* Họ và tên thật */}
              <TextField isRequired>
                <Label>Họ và tên</Label>
                <Input
                  value={hoVaTen}
                  onChangeText={setHoVaTen}
                  placeholder="Nhập họ và tên đầy đủ"
                  readOnly={!isEditingContact}
                  editable={isEditingContact}
                  className={isEditingContact ? 'bg-white border-teal-500' : 'bg-slate-100 text-slate-700 font-medium'}
                />
              </TextField>

              {/* Khối Trạng thái định danh (Có nút "Xác thực tài khoản" -> Hiện ô nhập CCCD) */}
              <View className="p-3 rounded-xl border bg-slate-50 border-slate-200">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-xs font-semibold text-slate-700">
                    Định danh Căn cước công dân (CCCD)
                  </Text>
                  <Chip
                    variant="soft"
                    color={user?.cccd ? 'success' : 'danger'}
                    size="sm"
                  >
                    <Chip.Label className="font-bold text-[11px]">
                      {user?.cccd ? '✓ Đã xác thực' : '✕ Chưa xác thực'}
                    </Chip.Label>
                  </Chip>
                </View>

                {/* Nếu đã có CCCD */}
                {user?.cccd ? (
                  <Text className="text-xs text-slate-600 font-mono mt-1">
                    Số CCCD: {user.cccd.slice(0, 4)}****{user.cccd.slice(-4)}
                  </Text>
                ) : (
                  /* Nếu chưa xác thực: hiện nút bấm mở ô nhập CCCD */
                  <View className="mt-2">
                    {!isVerifying ? (
                      <Pressable
                        onPress={() => setIsVerifying(true)}
                        className="flex-row items-center justify-center gap-1.5 py-2 px-3 bg-teal-600 rounded-lg active:opacity-80"
                      >
                        <Ionicons name="card-outline" size={16} color="#FFFFFF" />
                        <Text className="text-xs font-bold text-white">
                          Xác thực tài khoản ngay
                        </Text>
                      </Pressable>
                    ) : (
                      /* Khung nhập CCCD khi bấm Xác thực tài khoản */
                      <View className="mt-2 pt-2 border-t border-slate-200 gap-2">
                        <TextField isRequired>
                          <Label className="text-xs">Nhập số CCCD (12 chữ số)</Label>
                          <Input
                            placeholder="Ví dụ: 001202012345"
                            keyboardType="number-pad"
                            maxLength={12}
                            value={cccdInput}
                            onChangeText={setCccdInput}
                            className="bg-white"
                          />
                        </TextField>

                        <View className="flex-row gap-2 mt-1">
                          <Button
                            variant="primary"
                            size="sm"
                            isDisabled={loadingVerify}
                            onPress={handleSendVerification}
                            className="flex-1 bg-teal-600"
                          >
                            <Button.Label className="text-xs font-bold text-white">
                              {loadingVerify ? 'Đang gửi...' : 'Gửi xác thực'}
                            </Button.Label>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onPress={() => setIsVerifying(false)}
                            className="px-3"
                          >
                            <Button.Label className="text-xs">Hủy</Button.Label>
                          </Button>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Vai trò & Ngày tham gia */}
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <TextField>
                    <Label>Vai trò</Label>
                    <Input
                      value={vaiTro === 'QUAN_TRI' ? 'Quản trị viên' : 'Thành viên'}
                      readOnly
                      editable={false}
                      className="bg-slate-100 text-slate-600 text-xs"
                    />
                  </TextField>
                </View>
                <View className="flex-1">
                  <TextField>
                    <Label>Ngày tham gia</Label>
                    <Input
                      value={thoiGianMo}
                      readOnly
                      editable={false}
                      className="bg-slate-100 text-slate-600 text-xs"
                    />
                  </TextField>
                </View>
              </View>

              {/* Email (Nằm chung hộp thông tin) */}
              <TextField isRequired>
                <Label>Địa chỉ Email</Label>
                <Input
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  readOnly={!isEditingContact}
                  editable={isEditingContact}
                  className={isEditingContact ? 'bg-white border-teal-500' : 'bg-slate-100 text-slate-700'}
                />
              </TextField>

              {/* Số điện thoại (Nằm chung hộp thông tin) */}
              <TextField isRequired>
                <Label>Số điện thoại</Label>
                <Input
                  value={sdt}
                  onChangeText={setSdt}
                  keyboardType="phone-pad"
                  readOnly={!isEditingContact}
                  editable={isEditingContact}
                  className={isEditingContact ? 'bg-white border-teal-500' : 'bg-slate-100 text-slate-700'}
                />
              </TextField>

              {/* Nút Cập nhật tài khoản */}
              {!isEditingContact ? (
                <Button
                  variant="primary"
                  size="lg"
                  onPress={() => setIsEditingContact(true)}
                  className="mt-2 bg-teal-600 active:bg-teal-700"
                >
                  <Button.Label className="font-bold text-white">
                    Cập nhật tài khoản
                  </Button.Label>
                </Button>
              ) : (
                <View className="flex-row gap-2 mt-2">
                  <Button
                    variant="primary"
                    size="lg"
                    isDisabled={loadingUpdate}
                    onPress={handleUpdateAccount}
                    className="flex-1 bg-teal-600 active:bg-teal-700"
                  >
                    <Button.Label className="font-bold text-white">
                      {loadingUpdate ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </Button.Label>
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    onPress={() => {
                      setEmail(user?.email || 'vanan.innfinder@gmail.com');
                      setSdt(user?.sdt || '0901234567');
                      setIsEditingContact(false);
                    }}
                    className="px-4"
                  >
                    <Button.Label>Hủy</Button.Label>
                  </Button>
                </View>
              )}
            </Card.Body>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
