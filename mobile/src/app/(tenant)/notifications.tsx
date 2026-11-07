import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card } from 'heroui-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/theme';
import { useNotificationStore } from '../../store/useNotificationStore';

export interface NotificationItem {
  id: string;
  tieuDe: string;
  noiDung: string;
  thoiGian: string;
  loai: 'LICH_HEN' | 'GIAO_DICH' | 'HE_THONG';
  chuaDoc: boolean;
}

const FILTER_TABS: Array<{ key: 'ALL' | 'LICH_HEN' | 'GIAO_DICH'; label: string }> = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'LICH_HEN', label: 'Lịch xem phòng' },
  { key: 'GIAO_DICH', label: 'Cọc & Giao dịch' },
];

export default function TenantNotificationsScreen() {
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filterType, setFilterType] = useState<'ALL' | 'LICH_HEN' | 'GIAO_DICH'>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const unreadCount = notifications.filter((item) => item.chuaDoc).length;

  const filteredList = notifications.filter((item) => {
    if (filterType === 'ALL') return true;
    return item.loai === filterType;
  });

  const handleMarkAllAsRead = () => {
    setUnreadCount(0);
    setNotifications((prev) =>
      prev.map((item) => ({ ...item, chuaDoc: false }))
    );
  };

  const handleItemPress = (id: string) => {
    const remaining = notifications.filter((item) => item.id !== id && item.chuaDoc).length;
    setUnreadCount(remaining);
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, chuaDoc: false } : item))
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  };

  const getIconConfig = (type: NotificationItem['loai']) => {
    switch (type) {
      case 'LICH_HEN':
        return {
          name: 'calendar-outline' as const,
          color: '#0D9488',
          bg: 'bg-teal-50',
          border: 'border-teal-200',
          tag: 'Lịch hẹn',
        };
      case 'GIAO_DICH':
        return {
          name: 'wallet-outline' as const,
          color: '#16A34A',
          bg: 'bg-green-50',
          border: 'border-green-200',
          tag: 'Giao dịch',
        };
      case 'HE_THONG':
      default:
        return {
          name: 'notifications-outline' as const,
          color: '#2563EB',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          tag: 'Hệ thống',
        };
    }
  };

  return (
    <View className="flex-1 pt-safe bg-slate-50">
      {/* 1. Header chuẩn InnFinder đồng bộ 100% */}
      <View className="px-4 py-3 bg-white border-b border-slate-200/80">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-xl font-bold text-slate-900">Thông báo</Text>
            <Text className="text-xs text-slate-500 mt-0.5">
              Cập nhật tin tức lịch hẹn & biến động giao dịch
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            {unreadCount > 0 ? (
              <View className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200">
                <Text className="text-xs font-bold text-rose-600">{unreadCount} mới</Text>
              </View>
            ) : (
              <View className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200">
                <Text className="text-xs font-bold text-teal-700">{filteredList.length} thông báo</Text>
              </View>
            )}
          </View>
        </View>

        {/* 2. Dải Pills lọc trạng thái bo tròn + Nút Đánh dấu đã đọc */}
        <View className="flex-row items-center justify-between">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {FILTER_TABS.map((tab) => {
              const isSelected = filterType === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setFilterType(tab.key)}
                  className={`px-3.5 py-1.5 rounded-full border ${
                    isSelected
                      ? 'bg-teal-700 border-teal-700'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <Text
                    className={`text-xs ${
                      isSelected
                        ? 'font-semibold text-white'
                        : 'font-medium text-slate-700'
                    }`}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {unreadCount > 0 && (
            <Pressable onPress={handleMarkAllAsRead} className="ml-2 active:opacity-70">
              <Text className="text-xs font-semibold text-teal-700">Đã đọc tất cả</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* 3. Danh sách thông báo (Hiển thị EmptyState chuẩn khi chưa có dữ liệu) */}
      <FlatList
        data={filteredList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-24 px-6">
            <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
              <Ionicons name="notifications-outline" size={32} color="#94A3B8" />
            </View>
            <Text className="text-sm font-semibold text-slate-700">
              Chưa có thông báo mới
            </Text>
            <Text className="text-xs text-slate-400 mt-1 text-center leading-5">
              Khi có xác nhận lịch hẹn xem phòng, biến động số dư hoặc tin tức hệ thống, thông báo sẽ hiển thị tại đây.
            </Text>
            <Button
              variant="primary"
              size="md"
              onPress={() => router.push('/(tenant)/index')}
              className="mt-4 rounded-full bg-teal-600 active:bg-teal-700"
            >
              <Button.Label className="text-white font-bold text-xs">
                Khám phá phòng ngay
              </Button.Label>
            </Button>
          </View>
        }
        renderItem={({ item }) => {
          const icon = getIconConfig(item.loai);
          return (
            <Pressable
              onPress={() => handleItemPress(item.id)}
              className="mb-3 active:opacity-95"
            >
              <Card
                className={`p-3.5 rounded-2xl border ${
                  item.chuaDoc
                    ? 'bg-white border-teal-200 shadow-xs'
                    : 'bg-white border-slate-200/90 shadow-2xs'
                }`}
              >
                <View className="flex-row">
                  <View
                    className={`w-11 h-11 rounded-xl ${icon.bg} border ${icon.border} items-center justify-center mr-3`}
                  >
                    <Ionicons name={icon.name} size={20} color={icon.color} />
                  </View>

                  <View className="flex-1 justify-between">
                    <View>
                      <View className="flex-row items-center justify-between gap-1 mb-1">
                        <Text
                          numberOfLines={1}
                          className={`text-sm flex-1 mr-1.5 ${
                            item.chuaDoc
                              ? 'font-bold text-slate-900'
                              : 'font-semibold text-slate-700'
                          }`}
                        >
                          {item.tieuDe}
                        </Text>
                        {item.chuaDoc && (
                          <View className="w-2 h-2 rounded-full bg-teal-600" />
                        )}
                      </View>

                      <Text
                        className="text-xs text-slate-600 leading-relaxed"
                        numberOfLines={2}
                      >
                        {item.noiDung}
                      </Text>
                    </View>

                    <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-slate-100">
                      <Text className="text-[10px] text-slate-400 font-medium">
                        {item.thoiGian}
                      </Text>
                      <View className="px-2 py-0.5 rounded-full bg-slate-100">
                        <Text className="text-[9px] font-bold text-slate-500">
                          {icon.tag}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
