import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from 'heroui-native';
import { adminService } from '../../../services/admin.service';
import { AdminComplaintItem } from '../../../types/admin.types';

export default function AdminComplaintDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [complaint, setComplaint] = useState<AdminComplaintItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      setLoading(true);
      adminService
        .getComplaintById(id)
        .then((res) => {
          if (res) setComplaint(res);
        })
        .finally(() => setLoading(false));
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

  if (loading) {
    return (
      <View style={{ flex: 1 }} className="pt-safe bg-slate-50 items-center justify-center">
        <ActivityIndicator size="small" color="#0D9488" />
        <Text className="text-xs text-slate-500 mt-2">Đang tải chi tiết khiếu nại...</Text>
      </View>
    );
  }

  if (!complaint) {
    return (
      <View style={{ flex: 1 }} className="pt-safe bg-slate-50 items-center justify-center px-6">
        <Ionicons name="shield-checkmark-outline" size={48} color="#94A3B8" />
        <Text className="text-base font-bold text-slate-800 mt-3">Không tìm thấy khiếu nại</Text>
        <Text className="text-xs text-slate-500 text-center mt-1">
          Khiếu nại này không tồn tại hoặc đã được xử lý xong.
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-5 px-5 py-2.5 bg-teal-600 rounded-xl active:bg-teal-700"
        >
          <Text className="text-xs font-bold text-white">Quay lại</Text>
        </Pressable>
      </View>
    );
  }

  const isPending = complaint.trangThai === 'CHO_XU_LY';
  const isProcessing = complaint.trangThai === 'DANG_XU_LY';

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
        {/* Status Card */}
        <View className="p-4 bg-white rounded-2xl border border-slate-200/90 mb-4 shadow-xs">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-bold text-slate-800">{complaint.maKhieuNai}</Text>
            <View
              className={`px-3 py-1 rounded-full ${
                isPending
                  ? 'bg-rose-50 border border-rose-200'
                  : isProcessing
                  ? 'bg-amber-50 border border-amber-200'
                  : 'bg-emerald-50 border border-emerald-200'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  isPending
                    ? 'text-rose-700'
                    : isProcessing
                    ? 'text-amber-700'
                    : 'text-emerald-700'
                }`}
              >
                {isPending
                  ? 'Chờ xử lý'
                  : isProcessing
                  ? 'Đang xác minh'
                  : 'Đã hoàn tất'}
              </Text>
            </View>
          </View>
          <Text className="text-xs text-slate-400">Gửi lúc: {complaint.thoiGian}</Text>
        </View>

        {/* Hai bên đương sự */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Đối tượng liên quan</Text>
        <Card className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-4 divide-y divide-slate-100 shadow-xs">
          <View className="flex-row items-center justify-between py-2.5">
            <View>
              <Text className="text-xs text-slate-400 font-medium">Người gửi khiếu nại</Text>
              <Text className="text-sm font-bold text-slate-800 mt-0.5">
                {complaint.nguoiKhieuNai}
              </Text>
            </View>
            <View className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center">
              <Ionicons name="person-outline" size={16} color="#64748B" />
            </View>
          </View>
          <View className="flex-row items-center justify-between py-2.5">
            <View>
              <Text className="text-xs text-slate-400 font-medium">Đối tượng bị phản ánh</Text>
              <Text className="text-sm font-bold text-rose-600 mt-0.5">
                {complaint.doiTuongBiKhieuNai}
              </Text>
            </View>
            <View className="w-8 h-8 rounded-full bg-rose-50 items-center justify-center">
              <Ionicons name="warning-outline" size={16} color="#E11D48" />
            </View>
          </View>
        </Card>

        {/* Nội dung vấn đề */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Nội dung khiếu nại</Text>
        <Card className="p-4 bg-white rounded-2xl border border-slate-200/90 mb-4 shadow-xs">
          <Text className="text-xs text-slate-700 leading-relaxed font-normal">
            {complaint.vanDe}
          </Text>
        </Card>

        {/* Bằng chứng hình ảnh */}
        {complaint.hinhAnh && complaint.hinhAnh.length > 0 ? (
          <>
            <Text className="text-sm font-bold text-slate-900 mb-2">Hình ảnh bằng chứng</Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              {complaint.hinhAnh.map((img, idx) => (
                <Image
                  key={idx}
                  source={{ uri: img }}
                  className="w-28 h-28 rounded-xl bg-slate-100"
                  resizeMode="cover"
                />
              ))}
            </View>
          </>
        ) : null}

        {/* Action Buttons */}
        {isPending ? (
          <View className="flex-row gap-3 pt-2">
            <Pressable
              onPress={() => handleResolve('TU_CHOI')}
              className="flex-1 py-3.5 rounded-xl border border-slate-200 bg-white items-center justify-center active:bg-slate-50"
            >
              <Text className="text-sm font-bold text-slate-700">Bác bỏ đơn</Text>
            </Pressable>
            <Pressable
              onPress={() => handleResolve('DANG_XU_LY')}
              className="flex-1 py-3.5 rounded-xl bg-teal-600 items-center justify-center active:bg-teal-700"
            >
              <Text className="text-sm font-bold text-white">Tiếp nhận xử lý</Text>
            </Pressable>
          </View>
        ) : isProcessing ? (
          <View className="flex-row gap-3 pt-2">
            <Pressable
              onPress={() => handleResolve('TU_CHOI')}
              className="flex-1 py-3.5 rounded-xl border border-rose-200 bg-rose-50 items-center justify-center active:opacity-80"
            >
              <Text className="text-sm font-bold text-rose-600">Từ chối</Text>
            </Pressable>
            <Pressable
              onPress={() => handleResolve('DA_XU_LY')}
              className="flex-1 py-3.5 rounded-xl bg-emerald-600 items-center justify-center active:bg-emerald-700"
            >
              <Text className="text-sm font-bold text-white">Hoàn tất xử lý</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
