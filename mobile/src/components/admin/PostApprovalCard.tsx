import React from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { Card } from 'heroui-native';
import { AdminPostItem } from '../../types/admin.types';

interface PostApprovalCardProps {
  post: AdminPostItem;
  onPress: () => void;
}

export const PostApprovalCard: React.FC<PostApprovalCardProps> = ({ post, onPress }) => {
  const isPending = post.trangThai === 'CHO_DUYET';
  const isApproved = post.trangThai === 'DA_DUYET';

  return (
    <Pressable onPress={onPress} className="mb-3 active:opacity-90">
      <Card className="flex-row p-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <Image
          source={{ uri: post.hinhAnh[0] }}
          className="w-24 h-24 rounded-xl bg-slate-100"
          resizeMode="cover"
        />

        <View className="flex-1 ml-3 justify-between">
          <View>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold text-slate-900 flex-1 mr-2" numberOfLines={1}>
                {post.tieuDe}
              </Text>
              <View
                className={`px-2 py-0.5 rounded-full ${
                  isPending
                    ? 'bg-amber-100'
                    : isApproved
                    ? 'bg-emerald-100'
                    : 'bg-rose-100'
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

            <Text className="text-xs text-slate-500 mt-1" numberOfLines={1}>
              Chủ trọ: {post.tenChuTro}
            </Text>
          </View>

          <View className="flex-row items-center justify-between mt-2">
            <Text className="text-sm font-extrabold text-teal-700">
              {post.giaThue.toLocaleString('vi-VN')} đ/tháng
            </Text>
            <Text className="text-[11px] text-slate-400">{post.thoiGianDang}</Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
};
