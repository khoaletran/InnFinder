import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Avatar } from 'heroui-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminUserItem } from '../../types/admin.types';

interface UserListItemProps {
  user: AdminUserItem;
  onPress: () => void;
}

export const UserListItem: React.FC<UserListItemProps> = ({ user, onPress }) => {
  const isLocked = user.trangThai === 'KHOA';
  const roleLabel = user.vaiTro === 'QUAN_TRI' ? 'Quản trị' : user.chuTro ? 'Chủ trọ' : 'Khách hàng';

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200/90 mb-2.5 active:bg-slate-50 shadow-xs"
    >
      <View className="flex-row items-center gap-3 flex-1">
        <Avatar size="md" color="default" className="size-11 border border-slate-100">
          {user.avatarUrl ? (
            <Avatar.Image source={{ uri: user.avatarUrl }} />
          ) : null}
          <Avatar.Fallback className={user.vaiTro === 'QUAN_TRI' ? 'bg-purple-50' : user.chuTro ? 'bg-teal-50' : 'bg-slate-100'}>
            <Text className={`text-sm font-bold ${user.vaiTro === 'QUAN_TRI' ? 'text-purple-700' : user.chuTro ? 'text-teal-700' : 'text-slate-700'}`}>
              {user.hoVaTen.slice(0, 2).toUpperCase()}
            </Text>
          </Avatar.Fallback>
        </Avatar>

        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>
              {user.hoVaTen}
            </Text>
            <View
              className={`px-2 py-0.5 rounded-full ${
                user.vaiTro === 'QUAN_TRI'
                  ? 'bg-purple-50 border border-purple-200'
                  : user.chuTro
                  ? 'bg-teal-50 border border-teal-200'
                  : 'bg-slate-100 border border-slate-200'
              }`}
            >
              <Text
                className={`text-[10px] font-bold ${
                  user.vaiTro === 'QUAN_TRI'
                    ? 'text-purple-700'
                    : user.chuTro
                    ? 'text-teal-700'
                    : 'text-slate-600'
                }`}
              >
                {roleLabel}
              </Text>
            </View>
          </View>

          <Text className="text-xs text-slate-500 mt-1 font-normal" numberOfLines={1}>
            {user.email} • {user.sdt}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-2 ml-2">
        <View
          className={`px-2 py-0.5 rounded-full ${
            isLocked ? 'bg-rose-50 border border-rose-200' : 'bg-emerald-50 border border-emerald-200'
          }`}
        >
          <Text
            className={`text-[10px] font-bold ${
              isLocked ? 'text-rose-600' : 'text-emerald-700'
            }`}
          >
            {isLocked ? 'Đã khóa' : 'Hoạt động'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
      </View>
    </Pressable>
  );
};
