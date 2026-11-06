import React from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { Card } from 'heroui-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminPostItem } from '../../types/admin.types';

interface PostApprovalCardProps {
  post: AdminPostItem;
  onPress: () => void;
}

export const PostApprovalCard: React.FC<PostApprovalCardProps> = ({ post, onPress }) => {
  const isPending = post.trangThai === 'CHO_DUYET';
  const isApproved = post.trangThai === 'DA_DUYET';

  const formatPrice = (price: number) => {
    if (!price) return '0 đ/tháng';
    if (price >= 1_000_000) {
      const million = price / 1_000_000;
      return `${million % 1 === 0 ? million : million.toFixed(1)} tr/tháng`;
    }
    return `${price.toLocaleString('vi-VN')} đ/tháng`;
  };

  return (
    <Pressable onPress={onPress} className="mb-3 active:opacity-90">
      <Card className="flex-row p-3 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <Image
          source={{ uri: post.hinhAnh[0] }}
          className="w-24 h-24 rounded-xl bg-slate-100"
          resizeMode="cover"
        />

        <View className="flex-1 ml-3 justify-between py-0.5">
          <View>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold text-slate-800 flex-1 mr-2" numberOfLines={1}>
                {post.tieuDe}
              </Text>
              <View
                className={`px-2.5 py-0.5 rounded-full ${
                  isPending
                    ? 'bg-amber-50 border border-amber-200'
                    : isApproved
                    ? 'bg-emerald-50 border border-emerald-200'
                    : 'bg-rose-50 border border-rose-200'
                }`}
              >
                <Text
                  className={`text-[10px] font-bold ${
                    isPending
                      ? 'text-amber-700'
                      : isApproved
                      ? 'text-emerald-700'
                      : 'text-rose-700'
                  }`}
                >
                  {isPending ? 'Chờ duyệt' : isApproved ? 'Đã duyệt' : 'Từ chối'}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-1 mt-1">
              <Ionicons name="person-circle-outline" size={13} color="#94A3B8" />
              <Text className="text-xs text-slate-500 font-medium" numberOfLines={1}>
                Chủ trọ: {post.tenChuTro}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
            <Text className="text-sm font-extrabold text-teal-600">
              {formatPrice(post.giaThue)}
            </Text>
            <View className="flex-row items-center gap-1">
              <Ionicons name="time-outline" size={12} color="#94A3B8" />
              <Text className="text-[11px] text-slate-400 font-medium">{post.thoiGianDang}</Text>
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
};
