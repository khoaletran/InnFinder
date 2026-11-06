import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from 'heroui-native';
import { adminService } from '../../../services/admin.service';
import { AdminReviewItem } from '../../../types/admin.types';

const TABS = ['Tất cả', 'Rating cao', 'Rating thấp'];

export default function AdminReviewsScreen() {
  const [reviews, setReviews] = useState<AdminReviewItem[]>([]);
  const [activeTab, setActiveTab] = useState('Tất cả');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const list = await adminService.getReviews();
    setReviews(list);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filtered = reviews.filter((r) => {
    if (activeTab === 'Rating cao') return r.diem >= 4.5;
    if (activeTab === 'Rating thấp') return r.diem < 4.0;
    return true;
  });

  return (
    <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
      {/* Header chuẩn tenant */}
      <View className="px-4 py-3 bg-white border-b border-slate-200/80">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2.5">
            <Pressable
              onPress={() => router.back()}
              className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
            >
              <Ionicons name="chevron-back" size={20} color="#0F172A" />
            </Pressable>
            <View>
              <Text className="text-xl font-bold text-slate-900">Đánh giá phòng</Text>
              <Text className="text-xs text-slate-500 mt-0.5">Kiểm soát phản hồi & trải nghiệm khách thuê</Text>
            </View>
          </View>
        </View>

        {/* Tab filters */}
        <View className="flex-row items-center gap-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`px-3.5 py-1.5 rounded-full border ${
                  isActive
                    ? 'bg-teal-700 border-teal-700'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text
                  className={`text-xs ${
                    isActive ? 'font-semibold text-white' : 'font-medium text-slate-700'
                  }`}
                >
                  {tab}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filtered.length === 0 ? (
          <View className="items-center justify-center py-16">
            <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
              <Ionicons name="star-outline" size={32} color="#94A3B8" />
            </View>
            <Text className="text-sm font-semibold text-slate-600">Không tìm thấy đánh giá</Text>
            <Text className="text-xs text-slate-400 mt-1">Các đánh giá mới sẽ hiển thị tại đây</Text>
          </View>
        ) : (
          filtered.map((item) => (
            <Pressable
              key={item.maDanhGia}
              onPress={() => router.push(`/(admin)/reviews/room-${item.phongTroId}`)}
              className="mb-3 active:opacity-90"
            >
              <Card className="flex-row p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
                <Image
                  source={{
                    uri: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=300',
                  }}
                  className="w-20 h-20 rounded-xl bg-slate-100"
                  resizeMode="cover"
                />

                <View className="flex-1 ml-3 justify-between py-0.5">
                  <View>
                    <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>
                      {item.tenPhongTro}
                    </Text>
                    <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
                      {item.diaChiPhong || 'TP. Hồ Chí Minh'}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="star" size={14} color="#F59E0B" />
                      <Text className="text-xs font-bold text-slate-800">{item.diem}</Text>
                    </View>
                    <Text className="text-[11px] text-slate-400 font-medium">
                      {item.tongDanhGiaPhong || 128} đánh giá
                    </Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}
