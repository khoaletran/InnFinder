import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Avatar } from 'heroui-native';
import { adminService } from '../../../services/admin.service';
import { AdminReviewItem } from '../../../types/admin.types';
import { RatingBreakdownBar } from '../../../components/admin/RatingBreakdownBar';

export default function AdminRoomReviewsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reviews, setReviews] = useState<AdminReviewItem[]>([]);

  useEffect(() => {
    adminService.getReviewsByRoom(id || 'PT20261106001').then((res) => {
      setReviews(res);
    });
  }, [id]);

  const current = reviews[0];

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
          <Text className="text-base font-bold text-slate-900">Chi tiết đánh giá phòng</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Room Header Card */}
        <Card className="flex-row p-3.5 bg-white rounded-2xl border border-slate-200/90 mb-4 shadow-xs">
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=300',
            }}
            className="w-16 h-16 rounded-xl bg-slate-100"
            resizeMode="cover"
          />
          <View className="flex-1 ml-3 justify-center">
            <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
              {current?.tenPhongTro || 'Phòng trọ ban công gần ĐH Sư Phạm'}
            </Text>
            <Text className="text-xs text-slate-500 mt-1">124/6 An Dương Vương, P.4, Q.5</Text>
          </View>
        </Card>

        {/* Rating Breakdown Card */}
        <Card className="p-4 bg-white rounded-2xl border border-slate-200/90 mb-4 shadow-xs">
          <View className="flex-row items-center justify-between mb-3 pb-3 border-b border-slate-100">
            <View>
              <Text className="text-3xl font-black text-slate-900">4.8 / 5</Text>
              <View className="flex-row items-center gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Ionicons key={s} name="star" size={14} color="#F59E0B" />
                ))}
              </View>
            </View>
            <View className="px-2.5 py-1 rounded-full bg-slate-100">
              <Text className="text-xs font-semibold text-slate-600">128 đánh giá</Text>
            </View>
          </View>

          {/* Star progress bars */}
          <RatingBreakdownBar star={5} count={80} total={128} />
          <RatingBreakdownBar star={4} count={35} total={128} />
          <RatingBreakdownBar star={3} count={8} total={128} />
          <RatingBreakdownBar star={2} count={3} total={128} />
          <RatingBreakdownBar star={1} count={2} total={128} />
        </Card>

        {/* Recent Reviews */}
        <Text className="text-base font-bold text-slate-900 mb-2">Đánh giá gần đây</Text>
        {reviews.map((r) => (
          <Pressable
            key={r.maDanhGia}
            onPress={() => router.push(`/(admin)/reviews/${r.maDanhGia}`)}
            className="mb-3 active:opacity-90"
          >
            <Card className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                  <Avatar size="sm" color="default" className="size-8">
                    <Avatar.Fallback className="bg-teal-50">
                      <Text className="text-xs font-bold text-teal-700">
                        {r.nguoiDanhGia.slice(0, 2).toUpperCase()}
                      </Text>
                    </Avatar.Fallback>
                  </Avatar>
                  <View>
                    <Text className="text-xs font-bold text-slate-800">{r.nguoiDanhGia}</Text>
                    <View className="flex-row items-center gap-0.5 mt-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Ionicons
                          key={s}
                          name={s <= r.diem ? 'star' : 'star-outline'}
                          size={11}
                          color="#F59E0B"
                        />
                      ))}
                    </View>
                  </View>
                </View>
                <Text className="text-[11px] text-slate-400 font-medium">{r.thoiGian}</Text>
              </View>

              <Text className="text-xs text-slate-600 leading-relaxed font-normal" numberOfLines={2}>
                {r.noiDung}
              </Text>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
