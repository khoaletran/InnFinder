import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Card, Chip } from 'heroui-native';
import { adminService } from '../../../services/admin.service';
import { AdminLandlordRequestItem } from '../../../types/admin.types';
import { VIETNAM_BANKS } from '../../../constants/banks';

export default function AdminLandlordRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [request, setRequest] = useState<AdminLandlordRequestItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal từ chối hồ sơ
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      setLoading(true);
      adminService
        .getLandlordRequestById(id)
        .then((res) => {
          setRequest(res || null);
        })
        .catch(() => {
          setRequest(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <View style={{ flex: 1 }} className="pt-safe bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0D9488" />
        <Text className="text-slate-500 mt-3 font-medium text-sm">Đang tải hồ sơ thẩm định...</Text>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-slate-200/80">
          <Pressable
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
          >
            <Ionicons name="chevron-back" size={20} color="#0F172A" />
          </Pressable>
          <Text className="text-base font-bold text-slate-900 ml-2.5">Hồ sơ đăng ký chủ trọ</Text>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
            <Ionicons name="document-text-outline" size={32} color="#94A3B8" />
          </View>
          <Text className="text-slate-700 font-bold text-base mb-1">Không tìm thấy hồ sơ</Text>
          <Text className="text-slate-400 text-xs text-center mb-4">
            Đơn đăng ký không tồn tại hoặc đã được xử lý xong.
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="px-5 py-2.5 bg-teal-600 rounded-xl active:bg-teal-700"
          >
            <Text className="text-white font-semibold text-xs">Quay lại danh sách</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isPending = request.trangThai === 'CHO_DUYET';
  const isCccdValid = request.cccd && /^\d{12}$/.test(request.cccd);

  const handleApprove = () => {
    Alert.alert('Xác nhận duyệt', `Cấp quyền Chủ trọ cho người dùng "${request.hoVaTen}"?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Duyệt làm Chủ trọ',
        onPress: async () => {
          if (id) {
            setIsSubmitting(true);
            const success = await adminService.approveLandlordRequest(id);
            setIsSubmitting(false);
            if (success) {
              Alert.alert('Thành công', 'Đã duyệt đơn và nâng cấp tài khoản thành Chủ trọ.');
              router.back();
            } else {
              Alert.alert('Lỗi', 'Không thể duyệt đơn. Vui lòng thử lại sau.');
            }
          }
        },
      },
    ]);
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập lý do từ chối để thông báo cho người nộp đơn.');
      return;
    }
    if (id) {
      setIsSubmitting(true);
      const success = await adminService.rejectLandlordRequest(id, rejectReason.trim());
      setIsSubmitting(false);
      setRejectModalVisible(false);
      if (success) {
        Alert.alert('Đã từ chối', 'Đã từ chối đơn đăng ký chủ trọ.');
        router.back();
      } else {
        Alert.alert('Lỗi', 'Không thể từ chối đơn. Vui lòng thử lại sau.');
      }
    }
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
          <Text className="text-base font-bold text-slate-900">Chi tiết đơn đăng ký</Text>
        </View>

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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 130 }}
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
          <View className="px-3 py-0.5 rounded-full bg-teal-50 border border-teal-200 mt-2">
            <Text className="text-xs font-bold text-teal-700">Yêu cầu nâng cấp Chủ trọ</Text>
          </View>
        </View>

        {/* Thông tin định danh & Thẩm định pháp lý */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Hồ sơ thẩm định cá nhân</Text>
        <Card className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-4 divide-y divide-slate-100 shadow-xs">
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Mã yêu cầu xét duyệt</Text>
            <Text className="text-xs font-bold text-slate-800 font-mono">{request.maYeuCau}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Mã tài khoản người dùng</Text>
            <Text className="text-xs font-bold text-teal-700 font-mono">{request.maNguoiDung}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Họ và tên trên CCCD</Text>
            <Text className="text-xs font-semibold text-slate-800">{request.hoVaTen}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Số điện thoại liên hệ</Text>
            <Text className="text-xs font-semibold text-slate-800">{request.sdt}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Số CCCD (12 chữ số chuẩn)</Text>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-xs font-bold text-slate-900 font-mono">{request.cccd}</Text>
              {isCccdValid ? (
                <View className="px-1.5 py-0.2 rounded bg-emerald-50 border border-emerald-200">
                  <Text className="text-[10px] font-bold text-emerald-700">Hợp lệ</Text>
                </View>
              ) : (
                <View className="px-1.5 py-0.2 rounded bg-rose-50 border border-rose-200">
                  <Text className="text-[10px] font-bold text-rose-600">Sai định dạng</Text>
                </View>
              )}
            </View>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Thời điểm nộp đơn</Text>
            <Text className="text-xs font-medium text-slate-800">{request.ngayGui}</Text>
          </View>
        </Card>

        {/* Ảnh chụp CCCD 2 mặt phục vụ thẩm định danh tính */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Ảnh CCCD 2 mặt (Thẩm định định danh)</Text>
        <Card className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-4 shadow-xs">
          <View className="flex-row gap-3">
            {/* Mặt trước */}
            <View className="flex-1">
              <Text className="text-xs font-bold text-slate-700 mb-1.5 text-center">Mặt trước CCCD</Text>
              <Pressable
                onPress={() => setPreviewImage(request.anhCccdTruoc || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600')}
                className="h-28 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 items-center justify-center active:opacity-80"
              >
                <Image
                  source={{ uri: request.anhCccdTruoc || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600' }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
                <View className="absolute bottom-1 right-1 bg-black/60 px-1.5 py-0.5 rounded flex-row items-center gap-1">
                  <Ionicons name="expand-outline" size={12} color="#fff" />
                  <Text className="text-[10px] text-white font-medium">Phóng to</Text>
                </View>
              </Pressable>
            </View>

            {/* Mặt sau */}
            <View className="flex-1">
              <Text className="text-xs font-bold text-slate-700 mb-1.5 text-center">Mặt sau CCCD</Text>
              <Pressable
                onPress={() => setPreviewImage(request.anhCccdSau || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600')}
                className="h-28 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 items-center justify-center active:opacity-80"
              >
                <Image
                  source={{ uri: request.anhCccdSau || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600' }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
                <View className="absolute bottom-1 right-1 bg-black/60 px-1.5 py-0.5 rounded flex-row items-center gap-1">
                  <Ionicons name="expand-outline" size={12} color="#fff" />
                  <Text className="text-[10px] text-white font-medium">Phóng to</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </Card>

        {/* Thông tin tài khoản ngân hàng thụ hưởng (AGENTS.md mục 3.3) */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Tài khoản ngân hàng thụ hưởng</Text>
        <Card className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-4 divide-y divide-slate-100 shadow-xs">
          <View className="flex-row justify-between items-center py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Ngân hàng thụ hưởng</Text>
            <View className="flex-row items-center gap-2">
              {(() => {
                const matchedBank = VIETNAM_BANKS.find(
                  (b) =>
                    b.shortName.toLowerCase() === (request.tenNganHang || '').toLowerCase() ||
                    b.code.toLowerCase() === (request.tenNganHang || '').toLowerCase()
                );
                return matchedBank?.logoUrl ? (
                  <View className="w-10 h-6 rounded bg-white border border-slate-200 overflow-hidden items-center justify-center p-0.5">
                    <Image source={{ uri: matchedBank.logoUrl }} className="w-full h-full" resizeMode="contain" />
                  </View>
                ) : null;
              })()}
              <Text className="text-xs font-bold text-teal-700">{request.tenNganHang}</Text>
            </View>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Số tài khoản ngân hàng</Text>
            <Text className="text-xs font-bold text-slate-900 font-mono">{request.soTaiKhoan}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Chủ tài khoản (Khai báo)</Text>
            <Text className="text-xs font-bold text-slate-900 uppercase">
              {request.tenChuTaiKhoan || request.hoVaTen}
            </Text>
          </View>
          <View className="flex-row justify-between items-center py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Đối chiếu tên với CCCD</Text>
            {request.tenChuTaiKhoan && request.hoVaTen &&
            request.tenChuTaiKhoan.trim().toLowerCase() === request.hoVaTen.trim().toLowerCase() ? (
              <View className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 flex-row items-center gap-1">
                <Ionicons name="checkmark-circle" size={12} color="#059669" />
                <Text className="text-[10px] font-bold text-emerald-700">Trùng khớp 100%</Text>
              </View>
            ) : (
              <View className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 flex-row items-center gap-1">
                <Ionicons name="alert-circle" size={12} color="#D97706" />
                <Text className="text-[10px] font-bold text-amber-700">Tên chưa khớp hoàn toàn</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Khối hiển thị lý do nếu bị từ chối */}
        {request.trangThai === 'TU_CHOI' && request.lyDoTuChoi ? (
          <Card className="bg-rose-50 rounded-2xl border border-rose-200 p-4 mb-4 shadow-xs">
            <View className="flex-row items-center gap-2 mb-1.5">
              <Ionicons name="close-circle" size={18} color="#E11D48" />
              <Text className="text-xs font-bold text-rose-800">Lý do từ chối hồ sơ</Text>
            </View>
            <Text className="text-xs text-rose-700 leading-relaxed font-medium">
              {request.lyDoTuChoi}
            </Text>
          </Card>
        ) : null}

        {/* Khởi tạo Chủ trọ theo quy chuẩn AGENTS.md mục 3.2 */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Quy chuẩn kích hoạt Chủ trọ</Text>
        <Card className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-4 divide-y divide-slate-100 shadow-xs">
          <View className="flex-row justify-between py-2">
            <Text className="text-xs text-slate-500 font-medium">Điểm uy tín ban đầu</Text>
            <Text className="text-xs font-bold text-teal-700">100 điểm (Mặc định)</Text>
          </View>
          <View className="flex-row justify-between py-2">
            <Text className="text-xs text-slate-500 font-medium">Số dư ví ban đầu</Text>
            <Text className="text-xs font-bold text-slate-800">0 VNĐ</Text>
          </View>
          <View className="py-2.5">
            <View className="p-2.5 bg-amber-50/80 rounded-xl border border-amber-200 flex-row gap-2">
              <Ionicons name="information-circle" size={16} color="#D97706" style={{ marginTop: 1 }} />
              <Text className="text-[11px] text-amber-900 flex-1 leading-relaxed">
                Sau khi được phê duyệt, tài khoản sẽ được gắn cờ chuTro = true và mở quyền đăng tin phòng trọ, quản lý ví và nhận cọc xem phòng.
              </Text>
            </View>
          </View>
        </Card>

        {/* Nút hành động */}
        {isPending ? (
          <View className="flex-row gap-3 pt-2">
            <Pressable
              onPress={() => setRejectModalVisible(true)}
              disabled={isSubmitting}
              className="flex-1 py-3.5 rounded-xl border border-rose-200 bg-rose-50 items-center justify-center active:opacity-80"
            >
              <Text className="text-sm font-bold text-rose-600">Từ chối đơn</Text>
            </Pressable>
            <Pressable
              onPress={handleApprove}
              disabled={isSubmitting}
              className="flex-1 py-3.5 rounded-xl bg-teal-600 items-center justify-center active:bg-teal-700"
            >
              <Text className="text-sm font-bold text-white">
                {isSubmitting ? 'Đang duyệt...' : 'Duyệt làm Chủ trọ'}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      {/* Modal phóng to ảnh CCCD để soi chi tiết */}
      <Modal visible={Boolean(previewImage)} transparent animationType="fade">
        <View className="flex-1 bg-black/90 items-center justify-center p-4">
          <Pressable
            onPress={() => setPreviewImage(null)}
            className="absolute top-12 right-6 w-10 h-10 rounded-full bg-white/20 items-center justify-center z-50 active:bg-white/40"
          >
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
          {previewImage ? (
            <Image
              source={{ uri: previewImage }}
              className="w-full h-80 rounded-2xl"
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>

      {/* Modal từ chối đơn đăng ký chủ trọ */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/50 items-center justify-center p-4">
          <View className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-xl">
            <View className="flex-row items-center gap-2 mb-3">
              <Ionicons name="alert-circle" size={22} color="#E11D48" />
              <Text className="text-base font-bold text-slate-900">Từ chối đơn làm Chủ trọ</Text>
            </View>
            <Text className="text-xs text-slate-500 mb-2">
              Nhập lý do từ chối để thông báo cho người dùng bổ sung hồ sơ:
            </Text>
            <TextInput
              placeholder="Ví dụ: Số CCCD không hợp lệ, thông tin tài khoản ngân hàng không chính chủ..."
              placeholderTextColor="#94A3B8"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
              className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs mb-4 min-h-[80px] text-slate-800"
              textAlignVertical="top"
            />
            <View className="flex-row gap-2.5">
              <Pressable
                onPress={() => setRejectModalVisible(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 bg-slate-50 items-center justify-center active:bg-slate-100"
              >
                <Text className="text-xs font-bold text-slate-700">Hủy</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmReject}
                className="flex-1 py-3 rounded-xl bg-rose-600 items-center justify-center active:bg-rose-700"
              >
                <Text className="text-xs font-bold text-white">Xác nhận từ chối</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
