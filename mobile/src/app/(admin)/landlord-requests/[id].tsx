import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Card, Chip } from 'heroui-native';
import { adminService } from '../../../services/admin.service';
import { AdminLandlordRequestItem } from '../../../types/admin.types';

export default function AdminLandlordRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [request, setRequest] = useState<AdminLandlordRequestItem | null>(null);

  useEffect(() => {
    if (id) {
      adminService.getLandlordRequestById(id).then((res) => {
        if (res) setRequest(res);
      });
    }
  }, [id]);

  if (!request) {
    return (
      <View style={{ flex: 1 }} className="pt-safe bg-slate-50 items-center justify-center">
        <Text className="text-slate-500">Đang tải hồ sơ...</Text>
      </View>
    );
  }

  const isPending = request.trangThai === 'CHO_DUYET';

  const handleApprove = () => {
    Alert.alert('Xác nhận duyệt', `Cấp quyền Chủ trọ cho người dùng "${request.hoVaTen}"?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Duyệt hồ sơ',
        onPress: async () => {
          if (id) {
            await adminService.approveLandlordRequest(id);
            Alert.alert('Thành công', 'Đã duyệt đơn và nâng cấp tài khoản thành Chủ trọ.');
            router.back();
          }
        },
      },
    ]);
  };

  const handleReject = () => {
    Alert.alert('Từ chối hồ sơ', 'Bạn có chắc muốn từ chối đơn đăng ký làm Chủ trọ này?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Từ chối',
        style: 'destructive',
        onPress: async () => {
          if (id) {
            await adminService.rejectLandlordRequest(id, 'CCCD hoặc tài khoản ngân hàng chưa hợp lệ');
            Alert.alert('Đã từ chối', 'Đã gửi thông báo từ chối tới người dùng.');
            router.back();
          }
        },
      },
    ]);
  };

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
          <Text className="text-base font-bold text-slate-900">Chi tiết đơn đăng ký chủ trọ</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Profile */}
        <View className="items-center py-5 bg-white rounded-2xl border border-slate-200/90 mb-4 shadow-xs">
          <Avatar size="lg" color="default" className="size-20 mb-3 border-2 border-teal-600">
            {request.avatarUrl ? <Avatar.Image source={{ uri: request.avatarUrl }} /> : null}
            <Avatar.Fallback className="bg-teal-50">
              <Text className="text-2xl font-bold text-teal-800">
                {request.hoVaTen.slice(0, 2).toUpperCase()}
              </Text>
            </Avatar.Fallback>
          </Avatar>
          <Text className="text-lg font-bold text-slate-900">{request.hoVaTen}</Text>
          <Text className="text-xs text-slate-500 mt-0.5">{request.email}</Text>
          <View className="mt-2">
            <Chip
              variant="soft"
              color={
                request.trangThai === 'CHO_DUYET'
                  ? 'warning'
                  : request.trangThai === 'DA_DUYET'
                  ? 'success'
                  : 'danger'
              }
              size="sm"
            >
              <Chip.Label className="font-bold text-xs">
                {request.trangThai === 'CHO_DUYET'
                  ? 'Chờ xét duyệt'
                  : request.trangThai === 'DA_DUYET'
                  ? 'Đã duyệt thành công'
                  : 'Đã từ chối'}
              </Chip.Label>
            </Chip>
          </View>
        </View>

        {/* Thông tin định danh & ngân hàng */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Hồ sơ thẩm định</Text>
        <Card className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-4 divide-y divide-slate-100 shadow-xs">
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Mã yêu cầu</Text>
            <Text className="text-xs font-bold text-slate-800">{request.maYeuCau}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Mã người dùng</Text>
            <Text className="text-xs font-semibold text-teal-700">{request.maNguoiDung}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Họ và tên</Text>
            <Text className="text-xs font-semibold text-slate-800">{request.hoVaTen}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Số điện thoại</Text>
            <Text className="text-xs font-semibold text-slate-800">{request.sdt}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Số CCCD (12 chữ số)</Text>
            <Text className="text-xs font-bold text-slate-900 font-mono">{request.cccd}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Ngân hàng thụ hưởng</Text>
            <Text className="text-xs font-bold text-teal-700">{request.tenNganHang}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Số tài khoản ngân hàng</Text>
            <Text className="text-xs font-bold text-slate-900 font-mono">{request.soTaiKhoan}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Thời điểm nộp đơn</Text>
            <Text className="text-xs font-medium text-slate-800">{request.ngayGui}</Text>
          </View>
        </Card>

        {/* Nút hành động */}
        {isPending ? (
          <View className="flex-row gap-3 mt-2">
            <Pressable
              onPress={handleReject}
              className="flex-1 py-3.5 rounded-xl border border-rose-200 bg-rose-50 items-center justify-center active:opacity-80"
            >
              <Text className="text-sm font-bold text-rose-600">Từ chối đơn</Text>
            </Pressable>
            <Pressable
              onPress={handleApprove}
              className="flex-1 py-3.5 rounded-xl bg-teal-600 items-center justify-center active:bg-teal-700"
            >
              <Text className="text-sm font-bold text-white">Duyệt làm Chủ trọ</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
