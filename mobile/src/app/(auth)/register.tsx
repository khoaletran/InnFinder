import React, { useState } from 'react';
import {
  View,
  Text,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import {
  Button,
  Card,
  Input,
  Label,
  TextField,
} from 'heroui-native';
import { authUserService } from '../../services/authUser.service';

export default function RegisterScreen() {
  const [tenDangNhap, setTenDangNhap] = useState('');
  const [hoVaTen, setHoVaTen] = useState('');
  const [email, setEmail] = useState('');
  const [sdt, setSdt] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [xacNhanMatKhau, setXacNhanMatKhau] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Validate theo chuẩn AGENTS.md UC 2.1 (Đăng ký tài khoản Khách hàng ban đầu)
  const validateForm = () => {
    if (!tenDangNhap.trim() || tenDangNhap.length < 3) {
      return 'Tên đăng nhập phải từ 3 ký tự trở lên';
    }
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      return 'Email không đúng định dạng';
    }
    const phoneRegex = /^(03|05|07|08|09)\d{8}$/;
    if (!phoneRegex.test(sdt.trim())) {
      return 'Số điện thoại không hợp lệ (10 số, đầu 03, 05, 07, 08, 09)';
    }
    if (matKhau.length < 8) {
      return 'Mật khẩu phải có tối thiểu 8 ký tự';
    }
    if (matKhau !== xacNhanMatKhau) {
      return 'Xác nhận mật khẩu không trùng khớp';
    }
    return null;
  };

  const handleRegister = async () => {
    const error = validateForm();
    if (error) {
      setErrorMsg(error);
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      // Tài khoản đăng ký mặc định là Khách hàng (chuTro = false).
      // Sau khi tạo tài khoản, người dùng nộp hồ sơ CCCD & Ngân hàng để Admin kiểm duyệt trở thành Chủ trọ.
      await authUserService.register({
        tenDangNhap: tenDangNhap.trim(),
        hoVaTen: hoVaTen.trim() || undefined,
        email: email.trim(),
        sdt: sdt.trim(),
        matKhau,
        xacNhanMatKhau,
        chuTro: false,
      });

      Alert.alert(
        'Đăng ký thành công',
        'Vui lòng kiểm tra email kích hoạt tài khoản hoặc đăng nhập ngay.',
        [
          {
            text: 'Đăng nhập',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Đăng ký thất bại', err.message || 'Không thể tạo tài khoản');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 pt-safe pb-safe bg-slate-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingVertical: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="items-center mb-6">
            <Text className="text-2xl font-black text-teal-600">
              Tạo tài khoản InnFinder
            </Text>
            <Text className="text-sm text-slate-500 mt-1 text-center">
              Khám phá phòng trọ minh bạch, tiện nghi và an toàn
            </Text>
          </View>

          {/* Form Card */}
          <Card className="p-5">
            <Card.Body className="gap-3.5">
              {/* Tên đăng nhập */}
              <TextField isRequired>
                <Label>Tên đăng nhập</Label>
                <Input
                  placeholder="Ví dụ: nguyenvanan"
                  autoCapitalize="none"
                  value={tenDangNhap}
                  onChangeText={setTenDangNhap}
                />
              </TextField>

              {/* Họ và tên */}
              <TextField isRequired>
                <Label>Họ và tên</Label>
                <Input
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={hoVaTen}
                  onChangeText={setHoVaTen}
                />
              </TextField>

              {/* Email */}
              <TextField isRequired>
                <Label>Email</Label>
                <Input
                  placeholder="name@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </TextField>

              {/* Số điện thoại */}
              <TextField isRequired>
                <Label>Số điện thoại</Label>
                <Input
                  placeholder="0901234567"
                  keyboardType="phone-pad"
                  value={sdt}
                  onChangeText={setSdt}
                />
              </TextField>

              {/* Mật khẩu */}
              <TextField isRequired>
                <Label>Mật khẩu</Label>
                <Input
                  placeholder="Tối thiểu 8 ký tự"
                  secureTextEntry
                  value={matKhau}
                  onChangeText={setMatKhau}
                />
              </TextField>

              {/* Nhập lại mật khẩu */}
              <TextField isRequired>
                <Label>Xác nhận mật khẩu</Label>
                <Input
                  placeholder="Nhập lại mật khẩu vừa nhập"
                  secureTextEntry
                  value={xacNhanMatKhau}
                  onChangeText={setXacNhanMatKhau}
                />
              </TextField>

              {/* Báo lỗi validate */}
              {errorMsg ? (
                <View className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
                  <Text className="text-xs font-medium text-rose-600">
                    {errorMsg}
                  </Text>
                </View>
              ) : null}

              {/* Nút Đăng ký */}
              <Button
                variant="primary"
                size="lg"
                isDisabled={loading}
                onPress={handleRegister}
                className="mt-3"
              >
                <Button.Label>
                  {loading ? 'Đang khởi tạo...' : 'Tạo tài khoản'}
                </Button.Label>
              </Button>

              {/* Nút quay lại Đăng nhập */}
              <Button
                variant="ghost"
                onPress={() => router.back()}
              >
                <Button.Label>Đã có tài khoản? Đăng nhập ngay</Button.Label>
              </Button>
            </Card.Body>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
