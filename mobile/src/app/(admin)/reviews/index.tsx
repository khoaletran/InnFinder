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
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-slate-200">
        <View className="flex-row items-center justify-between mb-2">
          <Pressable onPress={() => router.back()} className="flex-row items-center gap-1">
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
            <Text className="text-xl font-bold text-slate-900">Đánh giá phòng</Text>
          </Pressable>
          <Ionicons name="filter-outline" size={20} color="#64748B" />
        </View>

        {/* Tab filters */}
        <View className="flex-row items-center gap-2 mt-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-full border ${
                  isActive
                    ? 'bg-teal-600 border-teal-600'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    isActive ? 'text-white' : 'text-slate-600'
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
          <View className="items-center justify-center py-12">
            <Ionicons name="star-outline" size={48} color="#CBD5E1" />
            <Text className="text-sm text-slate-400 mt-2">Không tìm thấy đánh giá</Text>
          </View>
        ) : (
          filtered.map((item) => (
            <Pressable
              key={item.maDanhGia}
              onPress={() => router.push(`/(admin)/reviews/room-${item.phongTroId}`)}
              className="mb-3 active:opacity-90"
            >
              <Card className="flex-row p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <Image
                  source={{
                    uri: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=300',
                  }}
                  className="w-20 h-20 rounded-xl bg-slate-100"
                  resizeMode="cover"
                />

                <View className="flex-1 ml-3 justify-between">
                  <View>
                    <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
                      {item.tenPhongTro}
                    </Text>
                    <Text className="text-xs text-slate-500 mt-0.5">
                      {item.diaChiPhong || 'TP. Hồ Chí Minh'}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between mt-2">
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="star" size={14} color="#F59E0B" />
                      <Text className="text-xs font-bold text-slate-900">{item.diem}</Text>
                    </View>
                    <Text className="text-[11px] text-slate-400">
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
