import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Card } from 'heroui-native';
import {
  useLandlordNotificationStore,
  LandlordNotificationItem,
  LandlordNotificationType,
} from '../../store/useLandlordNotificationStore';

type FilterTab = 'ALL' | 'APPOINTMENT' | 'ROOM' | 'PAYMENT';

const FILTER_TABS: Array<{ key: FilterTab; label: string }> = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'APPOINTMENT', label: 'Lịch hẹn' },
  { key: 'ROOM', label: 'Bài đăng' },
  { key: 'PAYMENT', label: 'Ví & Cọc' },
];

export default function LandlordNotificationsScreen() {
  const {
    notifications,
    isLoading,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useLandlordNotificationStore();

  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');

  // Nạp dữ liệu khi focus màn hình (có TTL 60s, không spam request)
  useFocusEffect(
    useCallback(() => {
      fetchNotifications(false);
    }, [])
  );

  // Lọc theo tabs
  const filteredList = notifications.filter((item) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'APPOINTMENT') return item.type === 'APPOINTMENT';
    if (activeFilter === 'ROOM') return item.type === 'ROOM_APPROVAL' || item.type === 'ROOM_REJECT';
    if (activeFilter === 'PAYMENT') return item.type === 'PAYMENT';
    return true;
  });

  const getIconConfig = (type: LandlordNotificationType) => {
    switch (type) {
      case 'ROOM_APPROVAL':
        return {
          name: 'checkmark-circle-outline' as const,
          color: '#0D9488',
          bg: 'bg-teal-50',
          border: 'border-teal-200',
          tag: 'Duyệt bài',
        };
      case 'ROOM_REJECT':
        return {
          name: 'alert-circle-outline' as const,
          color: '#E11D48',
          bg: 'bg-rose-50',
          border: 'border-rose-200',
          tag: 'Từ chối bài',
        };
      case 'APPOINTMENT':
        return {
          name: 'calendar-outline' as const,
          color: '#2563EB',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          tag: 'Lịch hẹn',
        };
      case 'PAYMENT':
        return {
          name: 'wallet-outline' as const,
          color: '#16A34A',
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          tag: 'Ví & Tiền cọc',
        };
    }
  };

  const handlePressItem = (item: LandlordNotificationItem) => {
    markAsRead(item.id);
    if (item.targetRoute) {
      router.push(item.targetRoute as any);
    }
  };

  const renderNotificationRow = ({ item }: { item: LandlordNotificationItem }) => {
    const icon = getIconConfig(item.type);

    return (
      <Pressable
        onPress={() => handlePressItem(item)}
        className="mb-2.5 active:opacity-90"
      >
        <Card
          className={`p-3.5 rounded-2xl border transition-all ${
            item.isRead
              ? 'bg-white border-gray-100 shadow-none'
              : 'bg-teal-50/30 border-teal-200/80 shadow-xs'
          }`}
        >
          <View className="flex-row items-start gap-3">
            {/* 1. Icon đại diện phân loại */}
            <View
              className={`w-10 h-10 rounded-xl items-center justify-center border ${icon.bg} ${icon.border}`}
            >
              <Ionicons name={icon.name} size={20} color={icon.color} />
            </View>

            {/* 2. Nội dung thông báo */}
            <View className="flex-1">
              <View className="flex-row items-center justify-between mb-1">
                <Text
                  className={`text-sm ${
                    item.isRead ? 'font-semibold text-gray-800' : 'font-bold text-gray-950'
                  }`}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text className="text-[11px] text-gray-400 ml-2">{item.time}</Text>
              </View>

              <Text
                className={`text-xs leading-4 ${
                  item.isRead ? 'text-gray-500' : 'text-gray-700'
                }`}
                numberOfLines={2}
              >
                {item.message}
              </Text>
            </View>

            {/* 3. Dấu hiệu chưa đọc & mũi tên */}
            <View className="items-center justify-center self-center pl-1">
              {!item.isRead ? (
                <View className="w-2.5 h-2.5 rounded-full bg-teal-600 mb-1" />
              ) : null}
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </View>
          </View>
        </Card>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-slate-50" edges={['top']}>
      {/* 1. Header */}
      <View className="px-4 py-3 bg-white border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-xl font-bold text-gray-900">Thông báo</Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              Cập nhật duyệt phòng, lịch xem & cộng tiền cọc
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            {unreadCount > 0 ? (
              <View className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200">
                <Text className="text-xs font-bold text-rose-600">{unreadCount} mới</Text>
              </View>
            ) : (
              <View className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200">
                <Text className="text-xs font-bold text-teal-700">{filteredList.length} tin</Text>
              </View>
            )}
          </View>
        </View>

        {/* 2. Dải lọc Tab & Nút Đã đọc tất cả */}
        <View className="flex-row items-center justify-between">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {FILTER_TABS.map((tab) => {
              const isSelected = activeFilter === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveFilter(tab.key)}
                  className={`px-3.5 py-1.5 rounded-full border ${
                    isSelected
                      ? 'bg-teal-700 border-teal-700'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Text
                    className={`text-xs ${
                      isSelected ? 'font-bold text-white' : 'font-medium text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {unreadCount > 0 && (
            <Pressable onPress={markAllAsRead} className="ml-2 active:opacity-70">
              <Text className="text-xs font-bold text-teal-700">Đã đọc tất cả</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* 3. Danh sách thông báo */}
      <FlatList
        data={filteredList}
        keyExtractor={(item) => item.id}
        renderItem={renderNotificationRow}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => fetchNotifications(true)}
            colors={['#0D9488']}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <Card className="p-8 bg-white rounded-2xl items-center justify-center my-6 border border-gray-100 shadow-sm">
              <Ionicons name="notifications-off-outline" size={44} color="#94A3B8" />
              <Text className="text-sm font-semibold text-gray-700 mt-3">
                Không có thông báo nào
              </Text>
              <Text className="text-xs text-gray-400 text-center mt-1">
                Các sự kiện về bài đăng, lịch xem phòng và biến động ví sẽ hiển thị tại đây.
              </Text>
            </Card>
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}
