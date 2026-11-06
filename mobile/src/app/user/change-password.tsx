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
import { authUserService } from '../../services/authUser.service';
import { Colors } from '../../constants/theme';

export default function ChangePasswordScreen() {
  const [matKhauCu, setMatKhauCu] = useState('');
  const [matKhauMoi, setMatKhauMoi] = useState('');
  const [xacNhanMatKhauMoi, setXacNhanMatKhauMoi] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChangePassword = async () => {
    if (!matKhauCu.trim()) {
      setErrorMsg('Vui lòng nhập mật khẩu hiện tại');
      return;
    }
    if (matKhauMoi.length < 8) {
      setErrorMsg('Mật khẩu mới phải có tối thiểu 8 ký tự');
      return;
    }
    if (matKhauMoi === matKhauCu) {
      setErrorMsg('Mật khẩu mới không được trùng với mật khẩu cũ');
      return;
    }
    if (matKhauMoi !== xacNhanMatKhauMoi) {
      setErrorMsg('Xác nhận mật khẩu mới không trùng khớp');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      await authUserService.changePassword({
        matKhauCu,
        matKhauMoi,
        xacNhanMatKhauMoi,
      });

      Alert.alert('Thành công', 'Đổi mật khẩu thành công. Vui lòng ghi nhớ mật khẩu mới.', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (err: any) {
      Alert.alert('Thất bại', err.message || 'Mật khẩu hiện tại không chính xác');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 pt-safe bg-slate-50">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-slate-200">
        <Pressable onPress={() => router.back()} className="p-1 active:opacity-70 mr-2">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text className="text-lg font-bold text-slate-900">Đổi mật khẩu</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-4 py-5" showsVerticalScrollIndicator={false}>
          <Card className="p-5 mb-6">
            <Card.Body className="gap-4">
              <Text className="text-xs text-slate-500 leading-relaxed">
                Để bảo vệ tài khoản, hãy đặt mật khẩu mạnh dài ít nhất 8 ký tự, bao gồm
                cả chữ cái và chữ số.
              </Text>

              {/* Mật khẩu cũ */}
              <View>
                <TextField isRequired>
                  <Label>Mật khẩu hiện tại</Label>
                  <Input
                    placeholder="Nhập mật khẩu hiện tại"
                    secureTextEntry
                    value={matKhauCu}
                    onChangeText={setMatKhauCu}
                  />
                </TextField>
                {/* Nút Quên mật khẩu ngay bên dưới ô mật khẩu cũ */}
                <View className="items-end mt-1.5">
                  <Pressable
                    onPress={() => router.push('/(auth)/forgot-password')}
                    className="active:opacity-70 py-0.5"
                  >
                    <Text className="text-xs font-semibold text-teal-600">
                      Quên mật khẩu?
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Mật khẩu mới */}
              <TextField isRequired>
                <Label>Mật khẩu mới</Label>
                <Input
                  placeholder="Tối thiểu 8 ký tự"
                  secureTextEntry
                  value={matKhauMoi}
                  onChangeText={setMatKhauMoi}
                />
              </TextField>

              {/* Xác nhận mật khẩu mới */}
              <TextField isRequired>
                <Label>Xác nhận mật khẩu mới</Label>
                <Input
                  placeholder="Nhập lại mật khẩu mới"
                  secureTextEntry
                  value={xacNhanMatKhauMoi}
                  onChangeText={setXacNhanMatKhauMoi}
                />
              </TextField>

              {/* Thông báo lỗi */}
              {errorMsg ? (
                <View className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
                  <Text className="text-xs font-medium text-rose-600">{errorMsg}</Text>
                </View>
              ) : null}

              {/* Nút hành động */}
              <Button
                variant="primary"
                size="lg"
                isDisabled={loading}
                onPress={handleChangePassword}
                className="mt-3 bg-teal-600 active:bg-teal-700"
              >
                <Button.Label className="font-bold text-white">
                  {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                </Button.Label>
              </Button>
            </Card.Body>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
