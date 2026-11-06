import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Avatar } from 'heroui-native';
import { adminService } from '../../../services/admin.service';
import { AdminPostItem } from '../../../types/admin.types';

export default function AdminPostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<AdminPostItem | null>(null);
  const [activeImgIdx, setActiveImgIdx] = useState(0);

  useEffect(() => {
    if (id) {
      adminService.getPostById(id).then((res) => {
        if (res) setPost(res);
      });
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

  if (!post) {
    return (
      <View style={{ flex: 1 }} className="pt-safe bg-slate-50 items-center justify-center">
        <Text className="text-slate-500">Đang tải chi tiết...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-1">
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
          <Text className="text-base font-bold text-slate-900">Kiểm duyệt bài đăng</Text>
        </Pressable>
        <Ionicons name="share-social-outline" size={20} color="#64748B" />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Image banner */}
        <View className="relative w-full h-64 bg-slate-200">
          <Image
            source={{ uri: post.hinhAnh[activeImgIdx] || post.hinhAnh[0] }}
            className="w-full h-full"
            resizeMode="cover"
          />
          <View className="absolute bottom-3 right-3 bg-black/60 px-2.5 py-1 rounded-full">
            <Text className="text-xs font-bold text-white">
              {activeImgIdx + 1}/{post.hinhAnh.length}
            </Text>
          </View>
        </View>

        <View className="p-4">
          {/* Post Title & Price */}
          <Text className="text-lg font-bold text-slate-900">{post.tieuDe}</Text>
          <Text className="text-xl font-extrabold text-teal-700 mt-1">
            {post.giaThue.toLocaleString('vi-VN')} đ/tháng
          </Text>

          {/* Quick specs */}
          <View className="flex-row items-center justify-between bg-white rounded-2xl border border-slate-200 p-3.5 my-4 shadow-sm">
            <View className="items-center flex-1">
              <Text className="text-[11px] text-slate-400">Diện tích</Text>
              <Text className="text-sm font-bold text-slate-800 mt-0.5">{post.dienTich} m²</Text>
            </View>
            <View className="w-[1px] h-8 bg-slate-200" />
            <View className="items-center flex-1">
              <Text className="text-[11px] text-slate-400">Tiền cọc</Text>
              <Text className="text-sm font-bold text-slate-800 mt-0.5">
                {post.cocPhong ? `${(post.cocPhong / 1000000).toFixed(1)} tr` : '1 tháng'}
              </Text>
            </View>
            <View className="w-[1px] h-8 bg-slate-200" />
            <View className="items-center flex-1">
              <Text className="text-[11px] text-slate-400">Sức chứa</Text>
              <Text className="text-sm font-bold text-slate-800 mt-0.5">Tối đa {post.soNguoi} người</Text>
            </View>
          </View>

          {/* Chủ trọ */}
          <Text className="text-sm font-bold text-slate-900 mb-2">Thông tin chủ nhà</Text>
          <Card className="flex-row items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200 mb-4 shadow-sm">
            <View className="flex-row items-center gap-3">
              <Avatar size="md" color="default" className="size-11">
                <Avatar.Fallback className="bg-teal-100">
                  <Text className="text-sm font-bold text-teal-700">
                    {post.tenChuTro.slice(0, 2).toUpperCase()}
                  </Text>
                </Avatar.Fallback>
              </Avatar>
              <View>
                <Text className="text-sm font-bold text-slate-900">{post.tenChuTro}</Text>
                <Text className="text-xs text-slate-400 mt-0.5">SĐT: {post.sdtChuTro}</Text>
              </View>
            </View>
            <View className="w-9 h-9 rounded-full bg-teal-50 items-center justify-center">
              <Ionicons name="call-outline" size={18} color="#0D9488" />
            </View>
          </Card>

          {/* Địa chỉ */}
          <Text className="text-sm font-bold text-slate-900 mb-2">Địa chỉ</Text>
          <Card className="p-3.5 bg-white rounded-2xl border border-slate-200 mb-4 shadow-sm">
            <View className="flex-row items-center gap-2">
              <Ionicons name="location-outline" size={18} color="#0D9488" />
              <Text className="text-xs font-medium text-slate-800 flex-1">{post.diaChi}</Text>
            </View>
          </Card>

          {/* Tiện ích */}
          <Text className="text-sm font-bold text-slate-900 mb-2">Tiện ích phòng</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {post.tienIch.map((item, idx) => (
              <View
                key={idx}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm"
              >
                <Text className="text-xs font-semibold text-slate-700">{item}</Text>
              </View>
            ))}
          </View>

          {/* Mô tả */}
          <Text className="text-sm font-bold text-slate-900 mb-2">Mô tả chi tiết</Text>
          <Card className="p-3.5 bg-white rounded-2xl border border-slate-200 mb-6 shadow-sm">
            <Text className="text-xs text-slate-600 leading-relaxed">{post.moTa}</Text>
          </Card>

          {/* Nút hành động kiểm duyệt */}
          <View className="flex-row gap-3">
            <Pressable
              onPress={handleReject}
              className="flex-1 py-3.5 rounded-xl items-center justify-center bg-rose-50 border border-rose-300 active:opacity-70"
            >
              <Text className="text-sm font-bold text-rose-700">Từ chối</Text>
            </Pressable>

            <Pressable
              onPress={handleApprove}
              className="flex-1 py-3.5 rounded-xl items-center justify-center bg-teal-600 active:bg-teal-700"
            >
              <Text className="text-sm font-bold text-white">Duyệt bài</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
