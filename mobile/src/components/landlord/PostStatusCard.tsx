import React from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { Card } from 'heroui-native';
import { useRouter } from 'expo-router';
import { LandlordPostItem } from '../../types/landlord.types';

interface Props {
  post: LandlordPostItem;
}

export const PostStatusCard: React.FC<Props> = ({ post }) => {
  const router = useRouter();
  const getBadgeConfig = () => {
    switch (post.trangThai) {
      case 'HOAN_THANH':
        return { label: 'Đã cho thuê', bg: 'bg-emerald-100', text: 'text-emerald-700' };
      case 'DA_DUYET':
        return { label: 'Đã đăng bài', bg: 'bg-teal-100', text: 'text-teal-700' };
      case 'CHO_DUYET':
        return { label: 'Chờ duyệt', bg: 'bg-amber-100', text: 'text-amber-700' };
      case 'HUY':
        return { label: 'Bị từ chối', bg: 'bg-red-100', text: 'text-red-700' };
      default:
        return { label: 'Khác', bg: 'bg-gray-100', text: 'text-gray-700' };
    }
  };

  const badge = getBadgeConfig();

  return (
    <Pressable
      onPress={() => router.push(`/room/${post.id}` as any)}
      className="active:opacity-90"
    >
      <Card className="p-3 bg-white rounded-2xl border border-gray-100 mb-3 shadow-sm">
      <View className="flex-row items-center gap-3">
        {/* Thumbnail */}
        <Image
          source={{
            uri:
              post.hinhAnhUrl ||
              'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600',
          }}
          className="w-16 h-16 rounded-xl"
          resizeMode="cover"
        />

        {/* Thông tin */}
        <View className="flex-1">
          <Text className="text-sm font-bold text-gray-900 mb-1" numberOfLines={1}>
            {post.tenPhong}
          </Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-teal-700">
              {(post.giaThue / 1000000).toFixed(1)} triệu/tháng
            </Text>
            <View className={`px-2 py-0.5 rounded-full ${badge.bg}`}>
              <Text className={`text-[11px] font-bold ${badge.text}`}>{badge.label}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Thông báo lý do bị từ chối (Màu đỏ/hồng nhạt) */}
      {post.trangThai === 'HUY' && post.lyDoTuChoi && (
        <View className="mt-3 bg-red-50 border border-red-200 rounded-xl p-2.5">
          <Text className="text-xs text-red-600 leading-4">
            <Text className="font-bold">Lý do bị từ chối: </Text>
            {post.lyDoTuChoi}
          </Text>
        </View>
      )}
    </Card>
    </Pressable>
  );
};
