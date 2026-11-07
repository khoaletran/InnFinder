import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card, Avatar } from 'heroui-native';
import { landlordService } from '../../services/landlord.service';
import { ReviewResponseDTO } from '../../types/room.types';

type StarFilter = 'ALL' | '5' | '4' | '3' | '1-2';

export default function LandlordReviewsScreen() {
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewResponseDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [starFilter, setStarFilter] = useState<StarFilter>('ALL');

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const data = await landlordService.getLandlordReviews();
      setReviews(data);
    } catch (e) {
      console.log('Lỗi tải đánh giá:', e);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await landlordService.getLandlordReviews();
      setReviews(data);
    } catch (e) {
      console.log('Lỗi refresh đánh giá:', e);
    } finally {
      setRefreshing(false);
    }
  };

  // Thống kê số sao
  const stats = useMemo(() => {
    const total = reviews.length;
    if (total === 0) return { avg: 5.0, count: 0, c5: 0, c4: 0, c3: 0, c12: 0 };

    const sum = reviews.reduce((acc, r) => acc + (r.diem || 5), 0);
    const avg = Number((sum / total).toFixed(1));
    const c5 = reviews.filter((r) => r.diem === 5).length;
    const c4 = reviews.filter((r) => r.diem === 4).length;
    const c3 = reviews.filter((r) => r.diem === 3).length;
    const c12 = reviews.filter((r) => r.diem <= 2).length;

    return { avg, count: total, c5, c4, c3, c12 };
  }, [reviews]);

  // Lọc theo số sao
  const filteredReviews = useMemo(() => {
    if (starFilter === 'ALL') return reviews;
    if (starFilter === '5') return reviews.filter((r) => r.diem === 5);
    if (starFilter === '4') return reviews.filter((r) => r.diem === 4);
    if (starFilter === '3') return reviews.filter((r) => r.diem === 3);
    if (starFilter === '1-2') return reviews.filter((r) => r.diem <= 2);
    return reviews;
  }, [reviews, starFilter]);

  const renderStars = (diem: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= diem ? 'star' : 'star-outline'}
          size={14}
          color={i <= diem ? '#F59E0B' : '#D1D5DB'}
        />
      );
    }
    return <View className="flex-row items-center gap-0.5">{stars}</View>;
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-slate-50" edges={['top']}>
      {/* 1. Header */}
      <View className="px-4 py-3.5 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Pressable onPress={() => router.back()} className="p-1 -ml-1 active:opacity-60">
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <Text className="text-lg font-bold text-gray-900">Đánh giá phòng của tôi</Text>
        </View>

        <View className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 flex-row items-center gap-1">
          <Ionicons name="star" size={13} color="#D97706" />
          <Text className="text-xs font-bold text-amber-700">{stats.avg} / 5.0</Text>
        </View>
      </View>

      {/* 2. Thẻ Tổng quan Đánh giá */}
      <View className="p-4 bg-white border-b border-gray-100">
        <View className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex-row items-center justify-between">
          <View>
            <Text className="text-xs font-semibold text-amber-900 uppercase tracking-wider">
              Chất lượng phục vụ
            </Text>
            <View className="flex-row items-baseline gap-1 mt-1">
              <Text className="text-3xl font-extrabold text-amber-700">{stats.avg}</Text>
              <Text className="text-sm font-bold text-amber-600">/ 5 sao</Text>
            </View>
            <Text className="text-[11px] text-amber-800/80 mt-0.5">
              Dựa trên {stats.count} lượt đánh giá từ khách thuê
            </Text>
          </View>

          <View className="items-center bg-white px-3.5 py-2.5 rounded-xl border border-amber-200 shadow-xs">
            <Ionicons name="shield-checkmark" size={26} color="#0f766e" />
            <Text className="text-[10px] font-bold text-teal-800 mt-1 uppercase">Uy tín cao</Text>
          </View>
        </View>

        {/* Thanh lọc sao */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingTop: 12 }}
        >
          {[
            { key: 'ALL', label: `Tất cả (${stats.count})` },
            { key: '5', label: `5 sao (${stats.c5})` },
            { key: '4', label: `4 sao (${stats.c4})` },
            { key: '3', label: `3 sao (${stats.c3})` },
            { key: '1-2', label: `1-2 sao (${stats.c12})` },
          ].map((tab) => {
            const isActive = starFilter === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setStarFilter(tab.key as any)}
                className={`px-3.5 py-1.5 rounded-full border ${
                  isActive
                    ? 'bg-teal-700 border-teal-700'
                    : 'bg-gray-50 border-gray-200 active:bg-gray-100'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    isActive ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. Danh sách đánh giá */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0f766e" />
          <Text className="text-xs text-gray-500 mt-2">Đang tải danh sách nhận xét...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          className="px-4 py-4"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0f766e']} />
          }
        >
          {filteredReviews.length === 0 ? (
            <View className="flex-1 items-center justify-center py-20">
              <View className="size-16 rounded-full bg-amber-50 items-center justify-center mb-3">
                <Ionicons name="chatbubbles-outline" size={32} color="#D97706" />
              </View>
              <Text className="text-base font-bold text-gray-800">Chưa có đánh giá nào</Text>
              <Text className="text-xs text-gray-400 text-center mt-1 px-8">
                {starFilter === 'ALL'
                  ? 'Khi khách hàng hoàn thành xem phòng hoặc kết thúc hợp đồng thuê, nhận xét của họ sẽ hiển thị tại đây.'
                  : `Không có đánh giá nào thuộc nhóm ${starFilter} sao.`}
              </Text>
            </View>
          ) : (
            filteredReviews.map((item) => {
              const dateStr = item.ngayDanhGia
                ? new Date(item.ngayDanhGia).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : 'Mới đây';

              return (
                <Card
                  key={item.maDanhGia}
                  className="mb-3.5 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
                >
                  {/* Header nhận xét: Người dùng + Sao + Ngày */}
                  <View className="flex-row items-center justify-between pb-2.5 border-b border-gray-100">
                    <View className="flex-row items-center gap-2.5">
                      <Avatar size="sm" color="accent" className="size-9 bg-teal-100">
                        {item.hinhDaiDien ? (
                          <Avatar.Image source={{ uri: item.hinhDaiDien }} />
                        ) : null}
                        <Avatar.Fallback>
                          <Text className="text-xs font-bold text-teal-800">
                            {(item.tenDangNhap || 'KH').slice(0, 2).toUpperCase()}
                          </Text>
                        </Avatar.Fallback>
                      </Avatar>

                      <View>
                        <Text className="text-xs font-bold text-gray-900">
                          {item.tenDangNhap || 'Khách xem phòng'}
                        </Text>
                        <View className="mt-0.5">{renderStars(item.diem || 5)}</View>
                      </View>
                    </View>

                    <Text className="text-[11px] text-gray-400">{dateStr}</Text>
                  </View>

                  {/* Phòng trọ được đánh giá */}
                  <Pressable
                    onPress={() => {
                      if (item.maPhongTro) {
                        router.push(`/room/${item.maPhongTro}` as any);
                      }
                    }}
                    className="my-2.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 flex-row items-center justify-between active:opacity-70"
                  >
                    <View className="flex-row items-center gap-2 flex-1 mr-2">
                      <Ionicons name="home-outline" size={15} color="#0f766e" />
                      <Text className="text-xs text-gray-700 font-medium" numberOfLines={1}>
                        {item.diaChiPhong || item.tieuDePhong || `Phòng #${item.maPhongTro}`}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color="#9ca3af" />
                  </Pressable>

                  {/* Nội dung nhận xét */}
                  <Text className="text-xs text-gray-700 leading-relaxed">
                    {item.noiDung && item.noiDung.trim().length > 0
                      ? item.noiDung
                      : 'Khách hàng không để lại nhận xét bằng chữ.'}
                  </Text>
                </Card>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
