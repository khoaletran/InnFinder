import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from 'heroui-native';
import { adminService } from '../../../services/admin.service';
import { AdminComplaintItem } from '../../../types/admin.types';

export default function AdminComplaintDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [complaint, setComplaint] = useState<AdminComplaintItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal xử lý khiếu nại
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [selectedViolationLevel, setSelectedViolationLevel] = useState<'NHE' | 'TRUNG_BINH' | 'NANG'>('NHE');
  const [resolveNote, setResolveNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleStartProcessing = async () => {
    Alert.alert('Tiếp nhận khiếu nại', 'Chuyển trạng thái khiếu nại sang "Đang xử lý" để xác minh hai bên?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Tiếp nhận',
        onPress: async () => {
          if (id) {
            setIsSubmitting(true);
            await adminService.resolveComplaint(id, 'DANG_XU_LY');
            setIsSubmitting(false);
            Alert.alert('Thành công', 'Đã chuyển trạng thái khiếu nại sang Đang xử lý.');
            router.back();
          }
        },
      },
    ]);
  };

  const handleRejectComplaint = () => {
    Alert.alert('Bác đơn khiếu nại', 'Xác nhận nội dung khiếu nại không hợp lệ hoặc không đủ bằng chứng?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Bác đơn',
        style: 'destructive',
        onPress: async () => {
          if (id) {
            setIsSubmitting(true);
            await adminService.resolveComplaint(id, 'TU_CHOI');
            setIsSubmitting(false);
            Alert.alert('Đã từ chối', 'Đã đóng và từ chối khiếu nại này.');
            router.back();
          }
        },
      },
    ]);
  };

  const handleConfirmResolve = async () => {
    if (id) {
      setIsSubmitting(true);
      await adminService.resolveComplaint(id, 'DA_XU_LY', resolveNote.trim() || undefined);
      setIsSubmitting(false);
      setResolveModalVisible(false);
      Alert.alert(
        'Đã xử lý xong',
        `Đã hoàn tất xử lý khiếu nại với mức độ vi phạm: ${
          selectedViolationLevel === 'NHE'
            ? 'Nhẹ (Cảnh cáo)'
            : selectedViolationLevel === 'TRUNG_BINH'
            ? 'Trung bình (Trừ điểm uy tín)'
            : 'Nặng (Khóa tài khoản)'
        }.`
      );
      router.back();
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1 }} className="pt-safe bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0D9488" />
        <Text className="text-sm font-medium text-slate-500 mt-3">Đang tải chi tiết khiếu nại...</Text>
      </View>
    );
  }

  if (!complaint) {
    return (
      <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-slate-200/80">
          <Pressable
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
          >
            <Ionicons name="chevron-back" size={20} color="#0F172A" />
          </Pressable>
          <Text className="text-base font-bold text-slate-900 ml-2.5">Chi tiết khiếu nại</Text>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
            <Ionicons name="shield-checkmark-outline" size={32} color="#94A3B8" />
          </View>
          <Text className="text-base font-bold text-slate-800 mb-1">Không tìm thấy khiếu nại</Text>
          <Text className="text-xs text-slate-400 text-center mb-5">
            Khiếu nại này không tồn tại hoặc đã được xử lý xong.
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="px-5 py-2.5 bg-teal-600 rounded-xl active:bg-teal-700"
          >
            <Text className="text-xs font-bold text-white">Quay lại danh sách</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isPending = complaint.trangThai === 'CHO_XU_LY';
  const isProcessing = complaint.trangThai === 'DANG_XU_LY';
  const isResolved = complaint.trangThai === 'DA_XU_LY';

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
            {isPending ? 'Chờ xử lý' : isProcessing ? 'Đang xác minh' : 'Đã giải quyết'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card Header */}
        <View className="p-4 bg-white rounded-2xl border border-slate-200/90 mb-4 shadow-xs">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200">
              <Ionicons name="flag-outline" size={13} color="#E11D48" />
              <Text className="text-xs font-bold text-slate-800 font-mono">
                {complaint.maKhieuNai}
              </Text>
            </View>
            <Text className="text-xs text-slate-400 font-medium">{complaint.thoiGian}</Text>
          </View>
          <Text className="text-sm text-slate-500 font-medium">
            Phiếu tố cáo tranh chấp & phản ánh vi phạm quy chế sàn InnFinder
          </Text>
        </View>

        {/* Hai bên liên quan */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Các bên liên quan trong vụ việc</Text>
        <Card className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-4 divide-y divide-slate-100 shadow-xs">
          <View className="flex-row items-center justify-between py-2.5">
            <View>
              <Text className="text-xs text-slate-400 font-medium">Người gửi khiếu nại</Text>
              <Text className="text-sm font-bold text-slate-800 mt-0.5">
                {complaint.nguoiKhieuNai}
              </Text>
            </View>
            <View className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center">
              <Ionicons name="person-outline" size={16} color="#475569" />
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
              <Ionicons name="alert-circle-outline" size={17} color="#E11D48" />
            </View>
          </View>

          {complaint.phongLienQuan ? (
            <View className="py-2.5">
              <Text className="text-xs text-slate-400 font-medium">Phòng trọ liên quan</Text>
              <Text className="text-xs font-bold text-slate-800 mt-0.5">
                {complaint.phongLienQuan.tieuDe}
              </Text>
              <Text className="text-[11px] text-slate-500 mt-0.5">
                {complaint.phongLienQuan.diaChi}
              </Text>
            </View>
          ) : null}
        </Card>

        {/* Nội dung vấn đề tranh chấp */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Nội dung phản ánh chi tiết</Text>
        <Card className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-4 shadow-xs">
          <Text className="text-xs text-slate-700 leading-relaxed font-normal">
            {complaint.vanDe}
          </Text>
        </Card>

        {/* Bằng chứng vi phạm (hinhAnh) */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Bằng chứng hình ảnh đính kèm</Text>
        {complaint.hinhAnh && complaint.hinhAnh.length > 0 ? (
          <Card className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-4 shadow-xs">
            <View className="flex-row flex-wrap gap-2.5">
              {complaint.hinhAnh.map((img, idx) => (
                <View key={idx} className="w-24 h-24 rounded-xl overflow-hidden border border-slate-200">
                  <Image source={{ uri: img }} className="w-full h-full" resizeMode="cover" />
                </View>
              ))}
            </View>
          </Card>
        ) : (
          <Card className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-4 items-center shadow-xs">
            <Text className="text-xs text-slate-400">Không có ảnh bằng chứng đính kèm</Text>
          </Card>
        )}

        {/* Khung chế tài xử lý (Mục 2.7 AGENTS.md) */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Quy chuẩn chế tài vi phạm (Mục 2.7 AGENTS.md)</Text>
        <Card className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-4 divide-y divide-slate-100 shadow-xs">
          <View className="py-2">
            <Text className="text-xs font-bold text-slate-800">Mức 1 - NHE (Vi phạm nhẹ):</Text>
            <Text className="text-[11px] text-slate-500 mt-0.5">
              Cảnh cáo nhắc nhở qua email & hệ thống thông báo.
            </Text>
          </View>
          <View className="py-2">
            <Text className="text-xs font-bold text-amber-700">Mức 2 - TRUNG_BINH (Vi phạm trung bình):</Text>
            <Text className="text-[11px] text-slate-500 mt-0.5">
              Trừ điểm uy tín (diemUyTin) của chủ trọ, tạm ẩn bài đăng phòng 7 ngày.
            </Text>
          </View>
          <View className="py-2">
            <Text className="text-xs font-bold text-rose-600">Mức 3 - NANG (Vi phạm nghiêm trọng / Gian lận):</Text>
            <Text className="text-[11px] text-slate-500 mt-0.5">
              Khóa tài khoản vĩnh viễn, tịch thu tiền cọc và hỗ trợ người bị hại.
            </Text>
          </View>
        </Card>

        {/* Nút hành động */}
        {!isResolved ? (
          <View className="gap-2.5 pt-2">
            {isPending ? (
              <View className="flex-row gap-3">
                <Pressable
                  onPress={handleRejectComplaint}
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 rounded-xl border border-rose-200 bg-rose-50 items-center justify-center active:opacity-80"
                >
                  <Text className="text-sm font-bold text-rose-600">Bác đơn tố cáo</Text>
                </Pressable>
                <Pressable
                  onPress={handleStartProcessing}
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 rounded-xl bg-amber-500 items-center justify-center active:bg-amber-600"
                >
                  <Text className="text-sm font-bold text-white">Tiếp nhận xác minh</Text>
                </Pressable>
              </View>
            ) : null}

            <Pressable
              onPress={() => setResolveModalVisible(true)}
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-teal-600 items-center justify-center active:bg-teal-700"
            >
              <Text className="text-sm font-bold text-white">Kết luận & Xử lý vi phạm</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      {/* Modal Xử lý vi phạm */}
      <Modal visible={resolveModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/50 items-center justify-center p-4">
          <View className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-xl">
            <Text className="text-base font-bold text-slate-900 mb-3">Kết luận xử lý khiếu nại</Text>
            <Text className="text-xs text-slate-500 mb-2 font-medium">Mức độ vi phạm:</Text>

            <View className="flex-row gap-2 mb-4">
              {(['NHE', 'TRUNG_BINH', 'NANG'] as const).map((lvl) => {
                const isSelected = selectedViolationLevel === lvl;
                const label = lvl === 'NHE' ? 'Nhẹ' : lvl === 'TRUNG_BINH' ? 'Trung bình' : 'Nghiêm trọng';
                return (
                  <Pressable
                    key={lvl}
                    onPress={() => setSelectedViolationLevel(lvl)}
                    className={`flex-1 py-2 rounded-xl items-center border ${
                      isSelected
                        ? 'bg-teal-700 border-teal-700'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-xs ${
                        isSelected ? 'font-bold text-white' : 'font-medium text-slate-700'
                      }`}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text className="text-xs text-slate-500 mb-1.5 font-medium">Ghi chú kết luận xử lý:</Text>
            <TextInput
              placeholder="Nhập nội dung kết luận xử lý vụ việc..."
              placeholderTextColor="#94A3B8"
              value={resolveNote}
              onChangeText={setResolveNote}
              multiline
              numberOfLines={3}
              className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs mb-4 min-h-[70px] text-slate-800"
              textAlignVertical="top"
            />

            <View className="flex-row gap-2.5">
              <Pressable
                onPress={() => setResolveModalVisible(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 bg-slate-50 items-center justify-center active:bg-slate-100"
              >
                <Text className="text-xs font-bold text-slate-700">Hủy</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmResolve}
                className="flex-1 py-3 rounded-xl bg-teal-600 items-center justify-center active:bg-teal-700"
              >
                <Text className="text-xs font-bold text-white">Hoàn tất xử lý</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
