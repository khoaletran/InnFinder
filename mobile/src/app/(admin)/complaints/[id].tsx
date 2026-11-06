import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from 'heroui-native';
import { adminService } from '../../../services/admin.service';
import { AdminComplaintItem } from '../../../types/admin.types';

export default function AdminComplaintDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [complaint, setComplaint] = useState<AdminComplaintItem | null>(null);

  useEffect(() => {
    if (id) {
      adminService.getComplaintById(id).then((res) => {
        if (res) setComplaint(res);
      });
    }
  }, [id]);

  const handleResolve = (action: 'DANG_XU_LY' | 'DA_XU_LY' | 'TU_CHOI') => {
    const title =
      action === 'DA_XU_LY'
        ? 'Hoàn tất xử lý khiếu nại'
        : action === 'DANG_XU_LY'
        ? 'Tiếp nhận xử lý'
        : 'Từ chối khiếu nại';

    Alert.alert(title, `Bạn có chắc muốn thực hiện thao tác này?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xác nhận',
        onPress: async () => {
          if (id) {
            await adminService.resolveComplaint(id, action);
            Alert.alert('Thành công', 'Đã cập nhật trạng thái khiếu nại.');
            router.back();
          }
        },
      },
    ]);
  };

  if (!complaint) {
    return (
      <View style={{ flex: 1 }} className="pt-safe bg-slate-50 items-center justify-center">
        <Text className="text-slate-500">Đang tải chi tiết...</Text>
      </View>
    );
  }

  const isPending = complaint.trangThai === 'CHO_XU_LY';
  const isProcessing = complaint.trangThai === 'DANG_XU_LY';

  return (
    <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
      {/* Header chuẩn tenant */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200/80">
        <View className="flex-row items-center gap-2.5">
          <Pressable
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
          >
            <Ionicons name="chevron-back" size={20} color="#0F172A" />
          </Pressable>
          <Text className="text-base font-bold text-slate-900">Chi tiết khiếu nại</Text>
        </View>
        <View className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
          <Ionicons name="flag-outline" size={18} color="#EF4444" />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Info card */}
        <Card className="p-4 bg-white rounded-2xl border border-slate-200/90 mb-4 shadow-xs">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <View className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              <Text className="text-sm font-black text-slate-800">Mã: {complaint.maKhieuNai}</Text>
            </View>
            <View
              className={`px-2.5 py-0.5 rounded-full ${
                isPending
                  ? 'bg-amber-50 border border-amber-200'
                  : isProcessing
                  ? 'bg-sky-50 border border-sky-200'
                  : 'bg-emerald-50 border border-emerald-200'
              }`}
            >
              <Text
                className={`text-[11px] font-bold ${
                  isPending
                    ? 'text-amber-700'
                    : isProcessing
                    ? 'text-sky-700'
                    : 'text-emerald-700'
                }`}
              >
                {isPending ? 'Chờ xử lý' : isProcessing ? 'Đang xử lý' : 'Đã xử lý'}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between py-2.5 border-t border-slate-100">
            <Text className="text-xs text-slate-500 font-medium">Người gửi khiếu nại</Text>
            <Text className="text-xs font-bold text-slate-800">{complaint.nguoiKhieuNai}</Text>
          </View>
          <View className="flex-row items-center justify-between py-2.5 border-t border-slate-100">
            <Text className="text-xs text-slate-500 font-medium">Đối tượng bị phản ánh</Text>
            <Text className="text-xs font-bold text-slate-800">{complaint.doiTuongBiKhieuNai}</Text>
          </View>
          <View className="flex-row items-center justify-between py-2.5 border-t border-slate-100">
            <Text className="text-xs text-slate-500 font-medium">Thời gian gửi</Text>
            <Text className="text-xs font-medium text-slate-600">{complaint.thoiGian}</Text>
          </View>
        </Card>

        {/* Nội dung khiếu nại */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Nội dung phản ánh</Text>
        <Card className="p-4 bg-white rounded-2xl border border-slate-200/90 mb-4 shadow-xs">
          <Text className="text-xs text-slate-700 leading-relaxed font-normal">{complaint.vanDe}</Text>
        </Card>

        {/* Minh chứng */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Hình ảnh minh chứng</Text>
        {complaint.hinhAnh.length > 0 ? (
          <View className="flex-row gap-3 mb-4">
            {complaint.hinhAnh.map((img, idx) => (
              <Image
                key={idx}
                source={{ uri: img }}
                className="w-28 h-28 rounded-xl bg-slate-200 border border-slate-100"
                resizeMode="cover"
              />
            ))}
          </View>
        ) : (
          <Card className="p-4 bg-white rounded-2xl border border-slate-200/90 mb-4 items-center shadow-xs">
            <Text className="text-xs text-slate-400">Không có hình ảnh đính kèm</Text>
          </Card>
        )}

        {/* Phòng liên quan */}
        {complaint.phongLienQuan ? (
          <>
            <Text className="text-sm font-bold text-slate-900 mb-2">Phòng trọ liên quan</Text>
            <Card className="p-3.5 bg-white rounded-2xl border border-slate-200/90 mb-6 shadow-xs">
              <Text className="text-sm font-bold text-slate-900">
                {complaint.phongLienQuan.tieuDe}
              </Text>
              <Text className="text-xs text-slate-500 mt-1 font-medium">
                Chủ trọ: {complaint.phongLienQuan.chuTro}
              </Text>
              <Text className="text-xs text-slate-400 mt-0.5">
                {complaint.phongLienQuan.diaChi}
              </Text>
            </Card>
          </>
        ) : null}

        {/* Nút hành động */}
        <View className="flex-row gap-3">
          <Pressable
            onPress={() => handleResolve('TU_CHOI')}
            className="flex-1 py-3.5 rounded-xl items-center justify-center bg-rose-50 border border-rose-200 active:opacity-80"
          >
            <Text className="text-sm font-bold text-rose-600">Bác khiếu nại</Text>
          </Pressable>

          <Pressable
            onPress={() => handleResolve(isProcessing ? 'DA_XU_LY' : 'DANG_XU_LY')}
            className="flex-1 py-3.5 rounded-xl items-center justify-center bg-teal-600 active:bg-teal-700"
          >
            <Text className="text-sm font-bold text-white">
              {isProcessing ? 'Đánh dấu đã xử lý' : 'Tiếp nhận xử lý'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
