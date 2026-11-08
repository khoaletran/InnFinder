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
import { Card, Avatar } from 'heroui-native';
import { adminService } from '../../../services/admin.service';
import { AdminPostItem } from '../../../types/admin.types';

const DEFAULT_ROOM_IMAGE = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800';

export default function AdminPostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<AdminPostItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImgIdx, setActiveImgIdx] = useState(0);

  // Modal từ chối bài đăng
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPost = () => {
    if (id) {
      setLoading(true);
      adminService
        .getPostById(id)
        .then((res) => {
          setPost(res);
        })
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    fetchPost();
  }, [id]);

  const handleApprove = () => {
    Alert.alert('Xác nhận duyệt', 'Bạn có chắc chắn muốn phê duyệt bài đăng này lên hệ thống?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Duyệt bài ngay',
        onPress: async () => {
          if (id) {
            setIsSubmitting(true);
            const success = await adminService.approvePost(id);
            setIsSubmitting(false);
            if (success) {
              Alert.alert('Thành công', 'Bài đăng đã được duyệt và hiển thị công khai.');
              router.back();
            } else {
              Alert.alert('Lỗi', 'Không thể duyệt bài đăng. Vui lòng thử lại sau.');
            }
          }
        },
      },
    ]);
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập lý do từ chối để chủ trọ chỉnh sửa lại.');
      return;
    }
    if (id) {
      setIsSubmitting(true);
      const success = await adminService.rejectPost(id, rejectReason.trim());
      setIsSubmitting(false);
      setRejectModalVisible(false);
      if (success) {
        Alert.alert('Đã từ chối', 'Đã từ chối duyệt bài đăng và lưu lý do vào hệ thống.');
        router.back();
      } else {
        Alert.alert('Lỗi', 'Không thể từ chối bài đăng. Vui lòng thử lại sau.');
      }
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1 }} className="pt-safe bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0D9488" />
        <Text className="text-sm font-medium text-slate-500 mt-3">Đang tải chi tiết bài đăng...</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-slate-200/80">
          <Pressable
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
          >
            <Ionicons name="chevron-back" size={20} color="#0F172A" />
          </Pressable>
          <Text className="text-base font-bold text-slate-900 ml-2.5">Kiểm duyệt bài đăng</Text>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
            <Ionicons name="newspaper-outline" size={32} color="#94A3B8" />
          </View>
          <Text className="text-base font-bold text-slate-800 mb-1">Không tìm thấy bài đăng</Text>
          <Text className="text-xs text-slate-400 text-center mb-5">
            Bài đăng này có thể không tồn tại hoặc đã được xử lý trước đó.
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

  const isPending = post.trangThai === 'CHO_DUYET';
  const isApproved = post.trangThai === 'DA_DUYET';
  const isRejected = post.trangThai === 'TU_CHOI' || post.trangThai === 'HUY';

  const images = post.hinhAnh && post.hinhAnh.length > 0 ? post.hinhAnh : [DEFAULT_ROOM_IMAGE];

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
          <Text className="text-base font-bold text-slate-900">Chi tiết bài đăng</Text>
        </View>

        <View
          className={`px-3 py-1 rounded-full ${
            isPending
              ? 'bg-amber-50 border border-amber-200'
              : isApproved
              ? 'bg-emerald-50 border border-emerald-200'
              : 'bg-rose-50 border border-rose-200'
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              isPending
                ? 'text-amber-700'
                : isApproved
                ? 'text-emerald-700'
                : 'text-rose-700'
            }`}
          >
            {isPending ? 'Chờ kiểm duyệt' : isApproved ? 'Đã phê duyệt' : 'Đã từ chối'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Carousel hình ảnh */}
        <View className="relative w-full h-64 bg-slate-900">
          <Image
            source={{ uri: images[activeImgIdx] || images[0] }}
            className="w-full h-full"
            resizeMode="cover"
          />
          {images.length > 1 ? (
            <View className="absolute bottom-3 right-3 bg-black/60 px-3 py-1 rounded-full">
              <Text className="text-xs font-bold text-white">
                {activeImgIdx + 1} / {images.length}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Thumbnail selector */}
        {images.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="px-4 py-3 bg-white border-b border-slate-100"
          >
            {images.map((img, idx) => (
              <Pressable
                key={idx}
                onPress={() => setActiveImgIdx(idx)}
                className={`w-14 h-14 rounded-lg overflow-hidden mr-2 border-2 ${
                  activeImgIdx === idx ? 'border-teal-600' : 'border-transparent'
                }`}
              >
                <Image source={{ uri: img }} className="w-full h-full" resizeMode="cover" />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <View className="p-4">
          {/* Card Thông tin cơ bản & Giá thuê */}
          <Card className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-4 shadow-xs">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                <Ionicons name="pricetag-outline" size={12} color="#0D9488" />
                <Text className="text-[11px] font-mono font-bold text-slate-700">
                  {post.maPhongTro}
                </Text>
              </View>
              <Text className="text-[11px] text-slate-400 font-medium">
                {post.thoiGianDang}
              </Text>
            </View>

            <Text className="text-lg font-bold text-slate-900 mb-1">{post.tieuDe}</Text>
            <View className="flex-row items-start gap-1 mb-3">
              <Ionicons name="location-outline" size={14} color="#64748B" style={{ marginTop: 2 }} />
              <Text className="text-xs text-slate-600 flex-1 leading-relaxed">{post.diaChi}</Text>
            </View>

            {/* Giá thuê và Tiền cọc hợp đồng */}
            <View className="flex-row items-center justify-between pt-3 border-t border-slate-100">
              <View>
                <Text className="text-[11px] text-slate-400 font-medium">Giá thuê mỗi tháng</Text>
                <Text className="text-xl font-black text-teal-600">
                  {post.giaThue.toLocaleString('vi-VN')} đ
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-[11px] text-slate-400 font-medium">Cọc hợp đồng thuê</Text>
                <Text className="text-base font-bold text-amber-700">
                  {post.cocPhong ? `${post.cocPhong.toLocaleString('vi-VN')} đ` : 'Không yêu cầu'}
                </Text>
              </View>
            </View>
          </Card>

          {/* 3 Chỉ số phòng */}
          <View className="flex-row gap-2.5 mb-4">
            <View className="flex-1 p-3 bg-white rounded-2xl border border-slate-200/90 items-center shadow-xs">
              <Ionicons name="cube-outline" size={18} color="#0D9488" />
              <Text className="text-[10px] text-slate-400 font-medium mt-1">Diện tích</Text>
              <Text className="text-sm font-bold text-slate-800 mt-0.5">{post.dienTich} m²</Text>
            </View>
            <View className="flex-1 p-3 bg-white rounded-2xl border border-slate-200/90 items-center shadow-xs">
              <Ionicons name="people-outline" size={18} color="#0D9488" />
              <Text className="text-[10px] text-slate-400 font-medium mt-1">Sức chứa tối đa</Text>
              <Text className="text-sm font-bold text-slate-800 mt-0.5">{post.soNguoi} người</Text>
            </View>
            <View className="flex-1 p-3 bg-white rounded-2xl border border-slate-200/90 items-center shadow-xs">
              <Ionicons name="home-outline" size={18} color="#0D9488" />
              <Text className="text-[10px] text-slate-400 font-medium mt-1">Loại hình</Text>
              <Text className="text-xs font-bold text-slate-800 mt-0.5" numberOfLines={1}>
                {post.loaiPhong}
              </Text>
            </View>
          </View>

          {/* Chính sách Cọc giữ chân & Phí hoa hồng sàn (Mục 2.3 AGENTS.md) */}
          <Text className="text-sm font-bold text-slate-900 mb-2">Chính sách cọc xem phòng & phí sàn</Text>
          <Card className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-4 divide-y divide-slate-100 shadow-xs">
            <View className="flex-row justify-between py-2">
              <Text className="text-xs text-slate-500 font-medium">Mức cọc xem phòng (theo loại phòng)</Text>
              <Text className="text-xs font-bold text-slate-800">
                {(post.mucCocXemPhong || 200000).toLocaleString('vi-VN')} đ
              </Text>
            </View>
            <View className="flex-row justify-between py-2">
              <Text className="text-xs text-slate-500 font-medium">Phí hoa hồng sàn trích lại (phiThu)</Text>
              <Text className="text-xs font-bold text-teal-700">
                {(post.phiHoaHong || 20000).toLocaleString('vi-VN')} đ
              </Text>
            </View>
            <View className="py-2.5">
              <View className="p-2.5 bg-teal-50/70 rounded-xl border border-teal-100 flex-row gap-2">
                <Ionicons name="shield-checkmark" size={16} color="#0D9488" style={{ marginTop: 1 }} />
                <Text className="text-[11px] text-teal-800 flex-1 leading-relaxed">
                  Quy định sàn: Khách hàng sau khi đến xem phòng thực tế sẽ được hoàn 100% cọc giữ chân. Nếu 2 bên cùng chốt thuê, phí hoa hồng sẽ được trích lại cho InnFinder.
                </Text>
              </View>
            </View>
          </Card>

          {/* Vị trí & Tọa độ GPS */}
          <Text className="text-sm font-bold text-slate-900 mb-2">Vị trí & Tọa độ bản đồ</Text>
          <Card className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-4 divide-y divide-slate-100 shadow-xs">
            <View className="flex-row justify-between py-2">
              <Text className="text-xs text-slate-500 font-medium">Địa chỉ chi tiết</Text>
              <Text className="text-xs font-semibold text-slate-800 flex-1 text-right ml-4">
                {post.diaChi}
              </Text>
            </View>
            <View className="flex-row justify-between py-2">
              <Text className="text-xs text-slate-500 font-medium">Tọa độ GPS (Kinh độ / Vĩ độ)</Text>
              <Text className="text-xs font-mono font-bold text-teal-700">
                {post.kinhDo && post.viDo ? `${post.kinhDo}, ${post.viDo}` : 'Chưa định vị GPS'}
              </Text>
            </View>
          </Card>

          {/* Thông tin chủ sở hữu phòng */}
          <Text className="text-sm font-bold text-slate-900 mb-2">Chủ sở hữu phòng</Text>
          <Card className="flex-row items-center p-3.5 bg-white rounded-2xl border border-slate-200/90 mb-4 shadow-xs">
            <Avatar size="md" color="default" className="size-12 border border-teal-200">
              {post.avatarChuTro ? <Avatar.Image source={{ uri: post.avatarChuTro }} /> : null}
              <Avatar.Fallback className="bg-teal-50">
                <Text className="text-sm font-bold text-teal-700">
                  {post.tenChuTro.slice(0, 2).toUpperCase()}
                </Text>
              </Avatar.Fallback>
            </Avatar>
            <View className="flex-1 ml-3">
              <Text className="text-sm font-bold text-slate-900">{post.tenChuTro}</Text>
              <Text className="text-xs text-slate-500 mt-0.5">Số ĐT: {post.sdtChuTro}</Text>
              {post.maChuTro ? (
                <Text className="text-[11px] font-mono text-teal-700 mt-0.5">
                  Mã CT: {post.maChuTro}
                </Text>
              ) : null}
            </View>
            <View className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200">
              <Text className="text-[11px] font-bold text-teal-700">Chủ phòng</Text>
            </View>
          </Card>

          {/* Tiện ích phòng trọ */}
          {post.tienIch && post.tienIch.length > 0 ? (
            <>
              <Text className="text-sm font-bold text-slate-900 mb-2">Tiện ích đi kèm</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {post.tienIch.map((t, idx) => (
                  <View
                    key={idx}
                    className="flex-row items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-2xs"
                  >
                    <Ionicons name="checkmark-circle" size={14} color="#0D9488" />
                    <Text className="text-xs font-semibold text-slate-800">{t}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {/* Mô tả phòng trọ */}
          {post.moTa ? (
            <>
              <Text className="text-sm font-bold text-slate-900 mb-2">Mô tả chi tiết phòng trọ</Text>
              <Card className="p-4 bg-white rounded-2xl border border-slate-200/90 mb-4 shadow-xs">
                <Text className="text-xs text-slate-700 leading-relaxed">{post.moTa}</Text>
              </Card>
            </>
          ) : null}

          {/* Hộp cảnh báo lý do từ chối (nếu có) */}
          {post.lyDoTuChoi || isRejected ? (
            <Card className="p-4 bg-rose-50 border border-rose-200 rounded-2xl mb-4">
              <View className="flex-row items-center gap-2 mb-1">
                <Ionicons name="alert-circle" size={18} color="#E11D48" />
                <Text className="text-xs font-bold text-rose-800">Lý do từ chối duyệt bài</Text>
              </View>
              <Text className="text-xs text-rose-700 leading-relaxed">
                {post.lyDoTuChoi || 'Hình ảnh hoặc nội dung tin đăng chưa đáp ứng tiêu chuẩn cộng đồng InnFinder.'}
              </Text>
            </Card>
          ) : null}

          {/* Nút hành động Duyệt / Từ chối bài đăng */}
          {isPending ? (
            <View className="flex-row gap-3 pt-2">
              <Pressable
                onPress={() => setRejectModalVisible(true)}
                disabled={isSubmitting}
                className="flex-1 py-3.5 rounded-xl border border-rose-200 bg-rose-50 items-center justify-center active:opacity-80"
              >
                <Text className="text-sm font-bold text-rose-600">Từ chối duyệt</Text>
              </Pressable>
              <Pressable
                onPress={handleApprove}
                disabled={isSubmitting}
                className="flex-1 py-3.5 rounded-xl bg-teal-600 items-center justify-center active:bg-teal-700"
              >
                <Text className="text-sm font-bold text-white">
                  {isSubmitting ? 'Đang xử lý...' : 'Phê duyệt bài'}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Modal nhập lý do từ chối bài đăng */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/50 items-center justify-center p-4">
          <View className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-xl">
            <View className="flex-row items-center gap-2 mb-3">
              <Ionicons name="alert-circle" size={22} color="#E11D48" />
              <Text className="text-base font-bold text-slate-900">Từ chối bài đăng</Text>
            </View>
            <Text className="text-xs text-slate-500 mb-2">
              Nhập lý do từ chối để thông báo cho chủ trọ điều chỉnh thông tin:
            </Text>
            <TextInput
              placeholder="Ví dụ: Hình ảnh mờ, địa chỉ không rõ ràng, giá thuê sai thực tế..."
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
