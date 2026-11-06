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
import { Button, Card, Input, Label, TextField } from 'heroui-native';
import { useAuthStore } from '../../store/useAuthStore';
import { authUserService } from '../../services/authUser.service';
import { Colors } from '../../constants/theme';

export default function RegisterLandlordScreen() {
  const { user } = useAuthStore();

  const [cccd, setCccd] = useState('');
  const [tenNganHang, setTenNganHang] = useState('');
  const [soTaiKhoan, setSoTaiKhoan] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    // Ràng buộc CCCD 12 số chuẩn hệ thống InnFinder
    const cccdRegex = /^\d{12}$/;
    if (!cccdRegex.test(cccd.trim())) {
      Alert.alert('CCCD không hợp lệ', 'Số Căn cước công dân phải gồm đúng 12 chữ số.');
      return;
    }

    if (!tenNganHang.trim() || !soTaiKhoan.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ tên ngân hàng và số tài khoản nhận tiền.');
      return;
    }

    try {
      setLoading(true);
      await authUserService.upgradeToLandlord({
        cccd: cccd.trim(),
        tenNganHang: tenNganHang.trim(),
        soTaiKhoan: soTaiKhoan.trim(),
      });

      Alert.alert(
        'Đã gửi đơn xét duyệt',
        'Hồ sơ đăng ký làm Chủ trọ của bạn đã được chuyển tới Ban quản trị InnFinder. Chúng tôi sẽ thông báo kết quả qua email và mục Thông báo trong vòng 24h.',
        [
          {
            text: 'Về trang cá nhân',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Gửi đơn thất bại', err.message || 'Có lỗi xảy ra, vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 pt-safe bg-slate-50">
      {/* Header bar */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-slate-200">
        <Pressable onPress={() => router.back()} className="p-1 active:opacity-70 mr-2">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text className="text-lg font-bold text-slate-900">
          Đăng ký trở thành Chủ trọ
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-4 py-5" showsVerticalScrollIndicator={false}>
          {/* Banner Giới thiệu & Lợi ích */}
          <View className="p-4 bg-teal-50 border border-teal-200 rounded-2xl mb-5">
            <View className="flex-row items-center gap-2 mb-2">
              <Ionicons name="shield-checkmark" size={22} color={Colors.primary} />
              <Text className="text-base font-bold text-teal-900">
                Chính sách an toàn & Xác thực
              </Text>
            </View>
            <Text className="text-xs text-teal-800 leading-relaxed">
              InnFinder cam kết bảo vệ quyền lợi giữa Chủ phòng và Khách thuê qua hệ thống
              giữ cọc tự động. Việc cung cấp CCCD và số tài khoản ngân hàng giúp bài đăng
              của bạn đạt mức độ uy tín cao và nhận tiền thuê phòng minh bạch.
            </Text>
          </View>

          {/* Form Thông tin */}
          <Card className="p-5 mb-6">
            <Card.Body className="gap-4">
              <Text className="text-sm font-bold text-slate-800 mb-1">
                Thông tin định danh & Thanh toán
              </Text>

              {/* CCCD 12 số */}
              <TextField isRequired>
                <Label>Số Căn cước công dân (CCCD)</Label>
                <Input
                  placeholder="Nhập đủ 12 chữ số CCCD"
                  keyboardType="number-pad"
                  maxLength={12}
                  value={cccd}
                  onChangeText={setCccd}
                />
              </TextField>

              {/* Ngân hàng nhận tiền */}
              <TextField isRequired>
                <Label>Ngân hàng nhận tiền</Label>
                <Input
                  placeholder="Ví dụ: Vietcombank, Vietinbank, MBBank..."
                  value={tenNganHang}
                  onChangeText={setTenNganHang}
                />
              </TextField>

              {/* Số tài khoản ngân hàng */}
              <TextField isRequired>
                <Label>Số tài khoản ngân hàng</Label>
                <Input
                  placeholder="Nhập số tài khoản ngân hàng"
                  keyboardType="number-pad"
                  value={soTaiKhoan}
                  onChangeText={setSoTaiKhoan}
                />
              </TextField>

              {/* Ghi chú bảo mật */}
              <View className="flex-row items-center gap-1.5 pt-1">
                <Ionicons name="lock-closed-outline" size={14} color="#64748B" />
                <Text className="text-[11px] text-slate-500">
                  Thông tin của bạn được mã hóa an toàn theo tiêu chuẩn bảo mật.
                </Text>
              </View>

              {/* Nút gửi đơn */}
              <Button
                variant="primary"
                size="lg"
                isDisabled={loading}
                onPress={handleSubmit}
                className="mt-2 bg-teal-600 active:bg-teal-700"
              >
                <Button.Label className="font-bold text-white">
                  {loading ? 'Đang gửi hồ sơ...' : 'Nộp hồ sơ xét duyệt'}
                </Button.Label>
              </Button>
            </Card.Body>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
