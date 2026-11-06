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
import { Colors } from '../../constants/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'ENTER_EMAIL' | 'OTP_SENT'>('ENTER_EMAIL');

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // 1. Gửi mã OTP xác nhận về Email
  const handleSendOtp = async () => {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Email không hợp lệ', 'Vui lòng nhập địa chỉ email đã đăng ký tài khoản.');
      return;
    }

    try {
      setLoading(true);
      // Giả lập gọi API gửi OTP
      setTimeout(() => {
        setLoading(false);
        setStep('OTP_SENT');
        Alert.alert(
          'Đã gửi mã xác nhận',
          `Mã OTP gồm 6 chữ số đã được gửi đến hộp thư ${email.trim()}. Vui lòng kiểm tra email.`
        );
      }, 1000);
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Thất bại', err.message || 'Không thể gửi email khôi phục');
    }
  };

  // 2. Xác thực OTP & Đặt mật khẩu mới
  const handleResetPassword = async () => {
    if (otp.length < 6) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đủ 6 chữ số mã OTP xác nhận.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Mật khẩu yếu', 'Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Không khớp', 'Xác nhận mật khẩu mới không trùng khớp.');
      return;
    }

    try {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        Alert.alert(
          'Khôi phục thành công',
          'Mật khẩu của bạn đã được làm mới thành công. Hãy đăng nhập lại bằng mật khẩu mới.',
          [
            {
              text: 'Đăng nhập ngay',
              onPress: () => router.replace('/(auth)/login'),
            },
          ]
        );
      }, 1000);
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Lỗi', err.message || 'Không thể đặt lại mật khẩu');
    }
  };

  return (
    <View className="flex-1 pt-safe bg-slate-50">
      {/* Header bar */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-slate-200">
        <Pressable onPress={() => router.back()} className="p-1 active:opacity-70 mr-2">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text className="text-lg font-bold text-slate-900">Quên mật khẩu</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-5 py-6" showsVerticalScrollIndicator={false}>
          {/* Icon minh họa */}
          <View className="items-center mb-6">
            <View className="size-16 rounded-full bg-teal-50 border border-teal-200 items-center justify-center mb-3">
              <Ionicons name="key-outline" size={30} color={Colors.primary} />
            </View>
            <Text className="text-xl font-bold text-slate-900">
              {step === 'ENTER_EMAIL' ? 'Khôi phục mật khẩu' : 'Nhập mã xác thực OTP'}
            </Text>
            <Text className="text-xs text-slate-500 text-center mt-1 px-4 leading-relaxed">
              {step === 'ENTER_EMAIL'
                ? 'Nhập email đã đăng ký với tài khoản InnFinder. Chúng tôi sẽ gửi mã OTP để bạn đặt lại mật khẩu.'
                : `Mã OTP xác thực đã được gửi tới ${email}. Vui lòng nhập mã và đặt mật khẩu mới.`}
            </Text>
          </View>

          <Card className="p-5 mb-6">
            <Card.Body className="gap-4">
              {step === 'ENTER_EMAIL' ? (
                <>
                  {/* Nhập Email */}
                  <TextField isRequired>
                    <Label>Email đăng ký</Label>
                    <Input
                      placeholder="name@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </TextField>

                  <Button
                    variant="primary"
                    size="lg"
                    isDisabled={loading}
                    onPress={handleSendOtp}
                    className="mt-2 bg-teal-600 active:bg-teal-700"
                  >
                    <Button.Label className="font-bold text-white">
                      {loading ? 'Đang gửi mã...' : 'Nhận mã OTP'}
                    </Button.Label>
                  </Button>
                </>
              ) : (
                <>
                  {/* Nhập OTP */}
                  <TextField isRequired>
                    <Label>Mã OTP (6 chữ số)</Label>
                    <Input
                      placeholder="123456"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={otp}
                      onChangeText={setOtp}
                      className="text-center tracking-widest text-lg font-bold"
                    />
                  </TextField>

                  {/* Mật khẩu mới */}
                  <TextField isRequired>
                    <Label>Mật khẩu mới</Label>
                    <Input
                      placeholder="Tối thiểu 8 ký tự"
                      secureTextEntry
                      value={newPassword}
                      onChangeText={setNewPassword}
                    />
                  </TextField>

                  {/* Xác nhận mật khẩu mới */}
                  <TextField isRequired>
                    <Label>Xác nhận mật khẩu mới</Label>
                    <Input
                      placeholder="Nhập lại mật khẩu mới"
                      secureTextEntry
                      value={confirmNewPassword}
                      onChangeText={setConfirmNewPassword}
                    />
                  </TextField>

                  <Button
                    variant="primary"
                    size="lg"
                    isDisabled={loading}
                    onPress={handleResetPassword}
                    className="mt-2 bg-teal-600 active:bg-teal-700"
                  >
                    <Button.Label className="font-bold text-white">
                      {loading ? 'Đang xác thực...' : 'Đổi mật khẩu'}
                    </Button.Label>
                  </Button>

                  <Pressable
                    onPress={() => setStep('ENTER_EMAIL')}
                    className="py-1 items-center active:opacity-70"
                  >
                    <Text className="text-xs text-slate-500">
                      Gửi lại mã OTP tới email khác?
                    </Text>
                  </Pressable>
                </>
              )}
            </Card.Body>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
