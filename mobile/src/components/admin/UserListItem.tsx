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
  const roleLabel = user.vaiTro === 'QUAN_TRI' ? 'Admin' : user.chuTro ? 'Chủ trọ' : 'Khách';

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200 mb-2.5 active:bg-slate-50 shadow-sm"
    >
      <View className="flex-row items-center gap-3 flex-1">
        <Avatar size="md" color="default" className="size-11">
          {user.avatarUrl ? (
            <Avatar.Image source={{ uri: user.avatarUrl }} />
          ) : null}
          <Avatar.Fallback className={user.chuTro ? 'bg-teal-100' : 'bg-slate-100'}>
            <Text className={`text-sm font-bold ${user.chuTro ? 'text-teal-700' : 'text-slate-700'}`}>
              {user.hoVaTen.slice(0, 2).toUpperCase()}
            </Text>
          </Avatar.Fallback>
        </Avatar>

        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
              {user.hoVaTen}
            </Text>
            <View
              className={`px-1.5 py-0.5 rounded-md ${
                user.vaiTro === 'QUAN_TRI'
                  ? 'bg-purple-100'
                  : user.chuTro
                  ? 'bg-teal-100'
                  : 'bg-slate-100'
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

          <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
            {user.email} • {user.sdt}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-2">
        <View
          className={`w-2 h-2 rounded-full ${
            isLocked ? 'bg-rose-500' : 'bg-emerald-500'
          }`}
        />
        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
      </View>
    </Pressable>
  );
};
