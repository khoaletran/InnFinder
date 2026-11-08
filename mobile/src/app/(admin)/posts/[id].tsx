import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Avatar } from 'heroui-native';
import { adminService } from '../../../services/admin.service';
import { AdminPostItem } from '../../../types/admin.types';

export default function AdminPostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<AdminPostItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImgIdx, setActiveImgIdx] = useState(0);

  useEffect(() => {
    if (id) {
      setLoading(true);
      adminService
        .getPostById(id)
        .then((res) => {
          setPost(res);
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleApprove = () => {
    Alert.alert('Xác nhận duyệt', 'Bạn có chắc chắn duyệt bài đăng này lên hệ thống?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Duyệt bài',
        onPress: async () => {
          if (id) {
            await adminService.approvePost(id);
            Alert.alert('Thành công', 'Bài đăng đã được duyệt công khai.');
            router.back();
          }
        },
      },
    ]);
  };

  const handleReject = () => {
    Alert.prompt
      ? Alert.prompt(
          'Từ chối bài đăng',
          'Vui lòng nhập lý do từ chối để thông báo cho chủ trọ:',
          [
            { text: 'Huỷ', style: 'cancel' },
            {
              text: 'Từ chối',
              style: 'destructive',
              onPress: async (reason?: string) => {
                if (id) {
                  await adminService.rejectPost(id, reason || 'Hình ảnh hoặc thông tin chưa phù hợp');
                  Alert.alert('Đã từ chối', 'Đã gửi lý do từ chối tới chủ trọ.');
                  router.back();
                }
              },
            },
          ]
        )
      : Alert.alert('Từ chối bài đăng', 'Bạn có chắc muốn từ chối bài đăng này?', [
          { text: 'Huỷ', style: 'cancel' },
          {
            text: 'Từ chối',
            style: 'destructive',
            onPress: async () => {
              if (id) {
                await adminService.rejectPost(id, 'Thông tin chưa đạt yêu cầu');
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
        <Text className="text-xs text-slate-500 mt-2">Đang tải chi tiết bài đăng...</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={{ flex: 1 }} className="pt-safe bg-slate-50 items-center justify-center px-6">
        <Ionicons name="newspaper-outline" size={48} color="#94A3B8" />
        <Text className="text-base font-bold text-slate-800 mt-3">Không tìm thấy bài đăng</Text>
        <Text className="text-xs text-slate-500 text-center mt-1">
          Bài đăng này có thể đã bị xóa hoặc không tồn tại trên hệ thống.
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

  const isPending = post.trangThai === 'CHO_DUYET';

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
          <Text className="text-base font-bold text-slate-900">Kiểm duyệt bài đăng</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Image banner */}
        <View className="relative w-full h-64 bg-slate-200">
          <Image
            source={{
              uri:
                post.hinhAnh && post.hinhAnh.length > 0
                  ? post.hinhAnh[activeImgIdx] || post.hinhAnh[0]
                  : 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
            }}
            className="w-full h-full"
            resizeMode="cover"
          />
          {post.hinhAnh && post.hinhAnh.length > 1 ? (
            <View className="absolute bottom-3 right-3 bg-black/60 px-3 py-1 rounded-full">
              <Text className="text-xs font-bold text-white">
                {activeImgIdx + 1}/{post.hinhAnh.length}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Thumbnail selector */}
        {post.hinhAnh && post.hinhAnh.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="px-4 py-3 bg-white border-b border-slate-100"
          >
            {post.hinhAnh.map((img, idx) => (
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

        {/* Nội dung chi tiết */}
        <View className="p-4">
          {/* Badge trạng thái */}
          <View className="flex-row items-center justify-between mb-2">
            <View
              className={`px-3 py-1 rounded-full border ${
                isPending
                  ? 'bg-amber-50 border-amber-200'
                  : post.trangThai === 'DA_DUYET'
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-rose-50 border-rose-200'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  isPending
                    ? 'text-amber-700'
                    : post.trangThai === 'DA_DUYET'
                    ? 'text-emerald-700'
                    : 'text-rose-700'
                }`}
              >
                {isPending
                  ? 'Chờ duyệt'
                  : post.trangThai === 'DA_DUYET'
                  ? 'Đã duyệt'
                  : 'Đã từ chối'}
              </Text>
            </View>
            <Text className="text-xs text-slate-400 font-medium">Đăng: {post.thoiGianDang}</Text>
          </View>

          {/* Tiêu đề & Giá */}
          <Text className="text-lg font-bold text-slate-900 leading-snug mb-1">{post.tieuDe}</Text>
          <Text className="text-xs text-slate-500 mb-3">{post.diaChi}</Text>

          <View className="flex-row items-baseline gap-1 mb-4 pb-3 border-b border-slate-100">
            <Text className="text-2xl font-black text-teal-600">
              {post.giaThue.toLocaleString('vi-VN')}
            </Text>
            <Text className="text-sm font-semibold text-slate-500">đ/tháng</Text>
          </View>

          {/* Quick info badges */}
          <View className="flex-row gap-2 mb-4">
            <View className="flex-1 p-2.5 bg-white rounded-xl border border-slate-200/90 items-center">
              <Text className="text-[10px] text-slate-400 font-medium">Diện tích</Text>
              <Text className="text-sm font-bold text-slate-800 mt-0.5">{post.dienTich} m²</Text>
            </View>
            <View className="flex-1 p-2.5 bg-white rounded-xl border border-slate-200/90 items-center">
              <Text className="text-[10px] text-slate-400 font-medium">Sức chứa</Text>
              <Text className="text-sm font-bold text-slate-800 mt-0.5">{post.soNguoi} người</Text>
            </View>
            <View className="flex-1 p-2.5 bg-white rounded-xl border border-slate-200/90 items-center">
              <Text className="text-[10px] text-slate-400 font-medium">Loại phòng</Text>
              <Text className="text-sm font-bold text-slate-800 mt-0.5" numberOfLines={1}>
                {post.loaiPhong}
              </Text>
            </View>
          </View>

          {/* Thông tin chủ trọ */}
          <Text className="text-sm font-bold text-slate-900 mb-2">Chủ sở hữu</Text>
          <Card className="flex-row items-center p-3.5 bg-white rounded-2xl border border-slate-200/90 mb-4 shadow-xs">
            <Avatar size="md" color="default" className="size-11">
              <Avatar.Fallback className="bg-teal-50">
                <Text className="text-sm font-bold text-teal-700">
                  {post.tenChuTro.slice(0, 2).toUpperCase()}
                </Text>
              </Avatar.Fallback>
            </Avatar>
            <View className="flex-1 ml-3">
              <Text className="text-sm font-bold text-slate-900">{post.tenChuTro}</Text>
              <Text className="text-xs text-slate-500 mt-0.5">SĐT: {post.sdtChuTro}</Text>
            </View>
            <View className="px-2.5 py-1 rounded-full bg-slate-100">
              <Text className="text-[11px] font-semibold text-slate-600">Chủ phòng</Text>
            </View>
          </Card>

          {/* Mô tả */}
          {post.moTa ? (
            <>
              <Text className="text-sm font-bold text-slate-900 mb-2">Mô tả phòng</Text>
              <Card className="p-4 bg-white rounded-2xl border border-slate-200/90 mb-4 shadow-xs">
                <Text className="text-xs text-slate-600 leading-relaxed">{post.moTa}</Text>
              </Card>
            </>
          ) : null}

          {/* Tiện ích */}
          {post.tienIch && post.tienIch.length > 0 ? (
            <>
              <Text className="text-sm font-bold text-slate-900 mb-2">Tiện ích phòng</Text>
              <View className="flex-row flex-wrap gap-2 mb-6">
                {post.tienIch.map((t, idx) => (
                  <View
                    key={idx}
                    className="flex-row items-center gap-1.5 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-full"
                  >
                    <Ionicons name="checkmark-circle" size={14} color="#0D9488" />
                    <Text className="text-xs font-semibold text-teal-800">{t}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {/* Nút Duyệt / Từ chối (Chỉ hiển thị khi bài đang chờ duyệt) */}
          {isPending ? (
            <View className="flex-row gap-3 pt-2">
              <Pressable
                onPress={handleReject}
                className="flex-1 py-3.5 rounded-xl border border-rose-200 bg-rose-50 items-center justify-center active:opacity-80"
              >
                <Text className="text-sm font-bold text-rose-600">Từ chối bài</Text>
              </Pressable>
              <Pressable
                onPress={handleApprove}
                className="flex-1 py-3.5 rounded-xl bg-teal-600 items-center justify-center active:bg-teal-700"
              >
                <Text className="text-sm font-bold text-white">Duyệt bài đăng</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
