import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Button, Card, Input, Label, TextField } from 'heroui-native';
import { useAuthStore } from '../../store/useAuthStore';
import { authUserService } from '../../services/authUser.service';
import { Colors } from '../../constants/theme';

export default function RegisterLandlordScreen() {
  const { user, switchMode } = useAuthStore();

  const [cccd, setCccd] = useState('');
  const [tenNganHang, setTenNganHang] = useState('');
  const [soTaiKhoan, setSoTaiKhoan] = useState('');
  const [tenChuTaiKhoan, setTenChuTaiKhoan] = useState(user?.hoVaTen || '');
  const [anhCccdTruoc, setAnhCccdTruoc] = useState('');
  const [anhCccdSau, setAnhCccdSau] = useState('');

  const [currentRequest, setCurrentRequest] = useState<any>(null);
  const [checkingRequest, setCheckingRequest] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadExistingRequest();
  }, []);

  const loadExistingRequest = async () => {
    try {
      setCheckingRequest(true);
      const res = await authUserService.getMyLandlordRequest();
      const data = res?.data || res;
      if (data && data.maYeuCau) {
        setCurrentRequest(data);
        // Điền trước thông tin nếu có
        setCccd(data.cccd || '');
        setTenNganHang(data.tenNganHang || '');
        setSoTaiKhoan(data.soTaiKhoan || '');
        setTenChuTaiKhoan(data.tenChuTaiKhoan || user?.hoVaTen || '');
        setAnhCccdTruoc(data.anhCccdTruoc || '');
        setAnhCccdSau(data.anhCccdSau || '');
      }
    } catch {
      // Chưa có đơn hoặc lỗi mạng nhẹ
    } finally {
      setCheckingRequest(false);
    }
  };

  const pickImage = async (type: 'TRUOC' | 'SAU') => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện ảnh để tải ảnh CCCD.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      if (type === 'TRUOC') {
        setAnhCccdTruoc(result.assets[0].uri);
      } else {
        setAnhCccdSau(result.assets[0].uri);
      }
    }
  };

  const handleSubmit = async () => {
    const cccdRegex = /^\d{12}$/;
    if (!cccdRegex.test(cccd.trim())) {
      Alert.alert('CCCD không hợp lệ', 'Số Căn cước công dân phải gồm đúng 12 chữ số.');
      return;
    }

    if (!anhCccdTruoc.trim() || !anhCccdSau.trim()) {
      Alert.alert('Thiếu ảnh CCCD', 'Vui lòng tải lên cả 2 mặt trước và mặt sau của thẻ CCCD để thẩm định.');
      return;
    }

    if (!tenNganHang.trim() || !soTaiKhoan.trim() || !tenChuTaiKhoan.trim()) {
      Alert.alert('Thiếu thông tin ngân hàng', 'Vui lòng điền đầy đủ ngân hàng, số tài khoản và tên chủ sở hữu tài khoản.');
      return;
    }

    try {
      setLoading(true);
      await authUserService.upgradeToLandlord({
        cccd: cccd.trim(),
        anhCccdTruoc: anhCccdTruoc.trim(),
        anhCccdSau: anhCccdSau.trim(),
        tenNganHang: tenNganHang.trim(),
        soTaiKhoan: soTaiKhoan.trim(),
        tenChuTaiKhoan: tenChuTaiKhoan.trim().toUpperCase(),
      });

      Alert.alert(
        'Đã gửi hồ sơ xét duyệt',
        'Hồ sơ đăng ký làm Chủ trọ của bạn đã được chuyển tới Ban quản trị InnFinder. Chúng tôi sẽ thẩm định và phản hồi trong thời gian sớm nhất.',
        [
          {
            text: 'Đã hiểu',
            onPress: () => {
              loadExistingRequest();
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Gửi đơn thất bại', err.message || 'Có lỗi xảy ra, vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingRequest) {
    return (
      <View className="flex-1 pt-safe bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0D9488" />
        <Text className="text-xs text-slate-500 mt-2 font-medium">Đang kiểm tra trạng thái hồ sơ...</Text>
      </View>
    );
  }

  // 1. Nếu đã là chủ trọ hoặc đơn đã được duyệt
  if (user?.chuTro || currentRequest?.trangThai === 'DA_DUYET') {
    return (
      <View className="flex-1 pt-safe bg-slate-50">
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-slate-200">
          <Pressable onPress={() => router.back()} className="p-1 active:opacity-70 mr-2">
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </Pressable>
          <Text className="text-lg font-bold text-slate-900">Trạng thái Chủ trọ</Text>
        </View>

        <View className="flex-1 p-6 items-center justify-center">
          <View className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-200 items-center justify-center mb-4">
            <Ionicons name="checkmark-circle" size={48} color="#059669" />
          </View>
          <Text className="text-xl font-bold text-slate-900 text-center mb-2">
            Tài khoản đã là Chủ trọ
          </Text>
          <Text className="text-xs text-slate-500 text-center leading-relaxed mb-6 px-4">
            Hồ sơ của bạn đã được Admin phê duyệt. Bạn có đầy đủ quyền đăng tin phòng trọ, quản lý danh sách phòng và theo dõi ví tiền cọc.
          </Text>

          <Button
            variant="primary"
            size="lg"
            onPress={() => {
              switchMode();
              router.replace('/(landlord)' as any);
            }}
            className="w-full bg-teal-600 active:bg-teal-700"
          >
            <Button.Label className="font-bold text-white">Chuyển sang giao diện Chủ trọ</Button.Label>
          </Button>
        </View>
      </View>
    );
  }

  // 2. Nếu đang có đơn chờ duyệt (CHO_DUYET)
  if (currentRequest?.trangThai === 'CHO_DUYET') {
    return (
      <View className="flex-1 pt-safe bg-slate-50">
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-slate-200">
          <Pressable onPress={() => router.back()} className="p-1 active:opacity-70 mr-2">
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </Pressable>
          <Text className="text-lg font-bold text-slate-900">Hồ sơ chờ xét duyệt</Text>
        </View>

        <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
          <View className="p-5 bg-amber-50 border border-amber-200 rounded-3xl mb-5 items-center">
            <View className="w-16 h-16 rounded-full bg-amber-100 items-center justify-center mb-3">
              <Ionicons name="time" size={32} color="#D97706" />
            </View>
            <Text className="text-base font-bold text-amber-950 mb-1">Đang chờ Ban quản trị duyệt</Text>
            <Text className="text-xs text-amber-800 text-center leading-relaxed">
              Hồ sơ đăng ký Chủ trọ của bạn (Mã: {currentRequest.maYeuCau}) đang được Admin kiểm tra thông tin CCCD và tài khoản ngân hàng thụ hưởng.
            </Text>
          </View>

          <Card className="p-4 mb-5">
            <Text className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Thông tin đã nộp</Text>
            <View className="divide-y divide-slate-100">
              <View className="flex-row justify-between py-2">
                <Text className="text-xs text-slate-500">Số CCCD</Text>
                <Text className="text-xs font-bold text-slate-800 font-mono">{currentRequest.cccd}</Text>
              </View>
              <View className="flex-row justify-between py-2">
                <Text className="text-xs text-slate-500">Ngân hàng</Text>
                <Text className="text-xs font-bold text-teal-700">{currentRequest.tenNganHang}</Text>
              </View>
              <View className="flex-row justify-between py-2">
                <Text className="text-xs text-slate-500">Số tài khoản</Text>
                <Text className="text-xs font-bold text-slate-800 font-mono">{currentRequest.soTaiKhoan}</Text>
              </View>
              <View className="flex-row justify-between py-2">
                <Text className="text-xs text-slate-500">Chủ tài khoản</Text>
                <Text className="text-xs font-semibold text-slate-800">{currentRequest.tenChuTaiKhoan}</Text>
              </View>
            </View>
          </Card>

          <Button
            variant="outline"
            size="md"
            onPress={() => router.back()}
            className="w-full"
          >
            <Button.Label className="font-semibold text-slate-700">Quay lại trang cá nhân</Button.Label>
          </Button>
        </ScrollView>
      </View>
    );
  }

  // 3. Form nộp đơn (Mới hoặc Nộp lại sau khi bị từ chối)
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
          {/* Thông báo nếu đơn trước đó bị từ chối */}
          {currentRequest?.trangThai === 'TU_CHOI' ? (
            <View className="p-4 bg-rose-50 border border-rose-200 rounded-2xl mb-5">
              <View className="flex-row items-center gap-2 mb-1.5">
                <Ionicons name="alert-circle" size={20} color="#E11D48" />
                <Text className="text-sm font-bold text-rose-900">
                  Hồ sơ trước đó bị từ chối
                </Text>
              </View>
              <Text className="text-xs text-rose-800 leading-relaxed font-medium mb-1">
                Lý do: {currentRequest.lyDoTuChoi || 'Thông tin CCCD hoặc tài khoản ngân hàng chưa hợp lệ.'}
              </Text>
              <Text className="text-[11px] text-rose-600">
                Vui lòng cập nhật lại thông tin chính xác bên dưới và nộp lại hồ sơ xét duyệt.
              </Text>
            </View>
          ) : (
            /* Banner Giới thiệu & Lợi ích */
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
          )}

          {/* Form Thông tin */}
          <Card className="p-5 mb-6">
            <Card.Body className="gap-4">
              <Text className="text-sm font-bold text-slate-800 mb-1">
                1. Thông tin Căn cước công dân (CCCD)
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

              {/* Upload ảnh CCCD 2 mặt */}
              <View className="pt-1">
                <Text className="text-xs font-semibold text-slate-700 mb-2">
                  Ảnh chụp CCCD 2 mặt <Text className="text-rose-500">*</Text>
                </Text>
                <View className="flex-row gap-3">
                  {/* Mặt trước */}
                  <View className="flex-1">
                    <Pressable
                      onPress={() => pickImage('TRUOC')}
                      className="h-28 rounded-xl border border-dashed border-slate-300 bg-slate-50 items-center justify-center overflow-hidden active:bg-slate-100"
                    >
                      {anhCccdTruoc ? (
                        <Image source={{ uri: anhCccdTruoc }} className="w-full h-full" resizeMode="cover" />
                      ) : (
                        <View className="items-center p-2">
                          <Ionicons name="camera" size={24} color="#0D9488" />
                          <Text className="text-[11px] font-bold text-slate-700 mt-1">Mặt trước CCCD</Text>
                          <Text className="text-[10px] text-slate-400">Bấm để chọn ảnh</Text>
                        </View>
                      )}
                    </Pressable>
                  </View>

                  {/* Mặt sau */}
                  <View className="flex-1">
                    <Pressable
                      onPress={() => pickImage('SAU')}
                      className="h-28 rounded-xl border border-dashed border-slate-300 bg-slate-50 items-center justify-center overflow-hidden active:bg-slate-100"
                    >
                      {anhCccdSau ? (
                        <Image source={{ uri: anhCccdSau }} className="w-full h-full" resizeMode="cover" />
                      ) : (
                        <View className="items-center p-2">
                          <Ionicons name="camera" size={24} color="#0D9488" />
                          <Text className="text-[11px] font-bold text-slate-700 mt-1">Mặt sau CCCD</Text>
                          <Text className="text-[10px] text-slate-400">Bấm để chọn ảnh</Text>
                        </View>
                      )}
                    </Pressable>
                  </View>
                </View>
              </View>

              <Text className="text-sm font-bold text-slate-800 mt-3 mb-1">
                2. Tài khoản ngân hàng thụ hưởng
              </Text>

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

              {/* Tên chủ tài khoản */}
              <TextField isRequired>
                <Label>Tên chủ tài khoản (Viết hoa không dấu)</Label>
                <Input
                  placeholder="Ví dụ: NGUYEN VAN A"
                  autoCapitalize="characters"
                  value={tenChuTaiKhoan}
                  onChangeText={(val) => setTenChuTaiKhoan(val.toUpperCase())}
                />
              </TextField>

              {/* Ghi chú bảo mật */}
              <View className="flex-row items-center gap-1.5 pt-1">
                <Ionicons name="lock-closed-outline" size={14} color="#64748B" />
                <Text className="text-[11px] text-slate-500">
                  Thông tin của bạn được bảo mật an toàn theo tiêu chuẩn InnFinder.
                </Text>
              </View>

              {/* Nút gửi đơn */}
              <Button
                variant="primary"
                size="lg"
                isDisabled={loading}
                onPress={handleSubmit}
                className="mt-3 bg-teal-600 active:bg-teal-700"
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
