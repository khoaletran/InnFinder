import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Avatar } from 'heroui-native';
import { adminService } from '../../../services/admin.service';
import { AdminReviewItem } from '../../../types/admin.types';

export default function AdminReviewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [review, setReview] = useState<AdminReviewItem | null>(null);

  useEffect(() => {
    adminService.getReviews().then((list) => {
      const found = list.find((r) => r.maDanhGia === id) || list[0];
      setReview(found);
    });
  }, [id]);

  const handleDelete = () => {
    Alert.alert('Xoá đánh giá', 'Bạn có chắc chắn muốn xoá vĩnh viễn đánh giá này?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          if (id) {
            await adminService.deleteReview(id);
            Alert.alert('Thành công', 'Đã xoá đánh giá khỏi hệ thống.');
            router.back();
          }
        },
      },
    ]);
  };

  const handleHide = () => {
    Alert.alert('Ẩn đánh giá', 'Đánh giá này sẽ bị ẩn khỏi trang chi tiết phòng.', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xác nhận ẩn',
        onPress: () => {
          Alert.alert('Thành công', 'Đã ẩn đánh giá.');
          router.back();
        },
      },
    ]);
  };

  if (!review) {
    return (
      <View style={{ flex: 1 }} className="pt-safe bg-slate-50 items-center justify-center">
        <Text className="text-slate-500">Đang tải chi tiết...</Text>
      </View>
    );
  }

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
          <Text className="text-base font-bold text-slate-900">Chi tiết đánh giá</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* User Card */}
        <Card className="p-4 bg-white rounded-2xl border border-slate-200/90 mb-4 shadow-xs">
          <View className="flex-row items-center gap-3 mb-3">
            <Avatar size="md" color="default" className="size-11">
              <Avatar.Fallback className="bg-teal-50">
                <Text className="text-sm font-bold text-teal-800">
                  {review.nguoiDanhGia.slice(0, 2).toUpperCase()}
                </Text>
              </Avatar.Fallback>
            </Avatar>
            <View>
              <Text className="text-sm font-bold text-slate-900">{review.nguoiDanhGia}</Text>
              <Text className="text-xs text-slate-400 mt-0.5 font-medium">{review.thoiGian}</Text>
            </View>
          </View>

          <View className="flex-row items-center gap-1 mb-2.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Ionicons
                key={s}
                name={s <= review.diem ? 'star' : 'star-outline'}
                size={16}
                color="#F59E0B"
              />
            ))}
          </View>

          <Text className="text-xs text-slate-700 leading-relaxed font-normal">{review.noiDung}</Text>
        </Card>

        {/* Room Info */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Phòng được đánh giá</Text>
        <Card className="flex-row p-3.5 bg-white rounded-2xl border border-slate-200/90 mb-6 shadow-xs">
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=300',
            }}
            className="w-16 h-16 rounded-xl bg-slate-100"
            resizeMode="cover"
          />
          <View className="flex-1 ml-3 justify-center">
            <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
              {review.tenPhongTro}
            </Text>
            <Text className="text-xs text-slate-500 mt-1" numberOfLines={2}>
              {review.diaChiPhong || '124/6 An Dương Vương, P.4, Q.5'}
            </Text>
          </View>
        </Card>

        {/* Action Buttons */}
        <View className="flex-row gap-3">
          <Pressable
            onPress={handleHide}
            className="flex-1 py-3.5 rounded-xl items-center justify-center bg-white border border-slate-200 active:bg-slate-50"
          >
            <Text className="text-sm font-semibold text-slate-700">Ẩn đánh giá</Text>
          </Pressable>

          <Pressable
            onPress={handleDelete}
            className="flex-1 py-3.5 rounded-xl items-center justify-center bg-rose-50 border border-rose-200 active:opacity-80"
          >
            <Text className="text-sm font-bold text-rose-600">Xoá vĩnh viễn</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
