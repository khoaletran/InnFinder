import React, { useState } from 'react';
import { View, Text, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button, Card, FieldError, Input, Label, TextField } from 'heroui-native';
import { authUserService } from '../../services/authUser.service';
import { useAuthStore } from '../../store/useAuthStore';

export default function LoginScreen() {
  const [tenDangNhap, setTenDangNhap] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const setAuth = useAuthStore((s) => s.setAuth);

  const handleLogin = async () => {
    if (!tenDangNhap.trim() || !matKhau.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const authRes = await authUserService.login({ tenDangNhap, matKhau });
      const profile = await authUserService.getMyProfile();
      await setAuth(authRes.token, profile);

      if (profile.chuTro) {
        router.replace('/(landlord)');
      } else {
        router.replace('/(tenant)');
      }
    } catch (err: any) {
      Alert.alert('Đăng nhập thất bại', err.message || 'Sai thông tin đăng nhập');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 justify-center px-5">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="items-center mb-8">
          <Text className="text-3xl font-extrabold text-teal-600">InnFinder</Text>
          <Text className="text-sm text-slate-500 mt-1">
            Tìm phòng trọ minh bạch & an toàn
          </Text>
        </View>

        <Card className="p-5">
          <Card.Body className="gap-4">
            <TextField isRequired isInvalid={!!errorMsg && !tenDangNhap}>
              <Label>Tên đăng nhập</Label>
              <Input
                placeholder="Nhập tên đăng nhập"
                autoCapitalize="none"
                value={tenDangNhap}
                onChangeText={setTenDangNhap}
              />
            </TextField>

            <TextField isRequired isInvalid={!!errorMsg && !matKhau}>
              <Label>Mật khẩu</Label>
              <Input
                placeholder="Nhập mật khẩu (tối thiểu 8 ký tự)"
                secureTextEntry
                value={matKhau}
                onChangeText={setMatKhau}
              />
              {errorMsg ? <FieldError>{errorMsg}</FieldError> : null}
            </TextField>

            <Button
              variant="primary"
              size="lg"
              isDisabled={loading}
              onPress={handleLogin}
              className="mt-2"
            >
              <Button.Label>
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </Button.Label>
            </Button>

            <Button
              variant="ghost"
              onPress={() => router.push('/(auth)/register')}
            >
              <Button.Label>Chưa có tài khoản? Đăng ký ngay</Button.Label>
            </Button>
          </Card.Body>
        </Card>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}