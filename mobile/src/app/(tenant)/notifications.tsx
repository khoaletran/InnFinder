import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from 'heroui-native';
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

export default function TenantNotificationsScreen() {
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  // Danh sách thông báo thực tế (Ban đầu để trống, nạp từ API)
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
    // Khi kết nối API thông báo thật: fetchNotifications()
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  };

  const getIconConfig = (type: NotificationItem['loai']) => {
    switch (type) {
      case 'LICH_HEN':
        return { name: 'calendar-outline' as const, color: '#0D9488', bg: 'bg-teal-50' };
      case 'GIAO_DICH':
        return { name: 'wallet-outline' as const, color: '#16A34A', bg: 'bg-green-50' };
      case 'HE_THONG':
      default:
        return { name: 'notifications-outline' as const, color: '#2563EB', bg: 'bg-blue-50' };
    }
  };

  return (
    <View className="flex-1 pt-safe bg-slate-50">
      {/* Header */}
      <View className="px-5 py-4 bg-white border-b border-slate-200">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2">
            <Text className="text-2xl font-bold text-slate-900">Thông báo</Text>
            {unreadCount > 0 && (
              <View className="bg-rose-500 px-2 py-0.5 rounded-full">
                <Text className="text-xs font-bold text-white">{unreadCount}</Text>
              </View>
            )}
          </View>
          {unreadCount > 0 && (
            <Pressable onPress={handleMarkAllAsRead} className="active:opacity-70">
              <Text className="text-xs font-semibold text-teal-600">
                Đánh dấu đã đọc
              </Text>
            </Pressable>
          )}
        </View>

        {/* Bộ lọc Chips */}
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-full border ${
              filterType === 'ALL'
                ? 'bg-teal-600 border-teal-600'
                : 'bg-slate-100 border-slate-200'
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                filterType === 'ALL' ? 'text-white' : 'text-slate-600'
              }`}
            >
              Tất cả
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setFilterType('LICH_HEN')}
            className={`px-3 py-1.5 rounded-full border ${
              filterType === 'LICH_HEN'
                ? 'bg-teal-600 border-teal-600'
                : 'bg-slate-100 border-slate-200'
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                filterType === 'LICH_HEN' ? 'text-white' : 'text-slate-600'
              }`}
            >
              Lịch xem phòng
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setFilterType('GIAO_DICH')}
            className={`px-3 py-1.5 rounded-full border ${
              filterType === 'GIAO_DICH'
                ? 'bg-teal-600 border-teal-600'
                : 'bg-slate-100 border-slate-200'
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                filterType === 'GIAO_DICH' ? 'text-white' : 'text-slate-600'
              }`}
            >
              Cọc & Giao dịch
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Danh sách thông báo (Hiển thị EmptyState chuẩn khi chưa có dữ liệu) */}
      <FlatList
        data={filteredList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-24">
            <View className="size-16 rounded-full bg-slate-100 items-center justify-center mb-3">
              <Ionicons name="notifications-off-outline" size={32} color={Colors.textMuted} />
            </View>
            <Text className="text-base font-bold text-slate-800">Không có thông báo mới</Text>
            <Text className="text-xs text-slate-500 text-center mt-1 px-8">
              Khi có xác nhận lịch hẹn, hoàn trả tiền cọc hoặc phản hồi từ ban quản trị, thông báo sẽ xuất hiện tại đây.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const icon = getIconConfig(item.loai);
          return (
            <Pressable onPress={() => handleItemPress(item.id)} className="active:opacity-80">
              <Card
                className={`p-4 border ${
                  item.chuaDoc
                    ? 'bg-white border-teal-200 shadow-sm'
                    : 'bg-slate-50/80 border-slate-200'
                }`}
              >
                <View className="flex-row gap-3">
                  <View className={`size-10 rounded-full ${icon.bg} items-center justify-center`}>
                    <Ionicons name={icon.name} size={20} color={icon.color} />
                  </View>

                  <View className="flex-1">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text
                        className={`text-sm ${
                          item.chuaDoc ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                        }`}
                      >
                        {item.tieuDe}
                      </Text>
                      {item.chuaDoc && (
                        <View className="size-2 rounded-full bg-teal-500" />
                      )}
                    </View>
                    <Text className="text-xs text-slate-600 leading-relaxed">
                      {item.noiDung}
                    </Text>
                    <Text className="text-[10px] text-slate-400 mt-2 font-medium">
                      {item.thoiGian}
                    </Text>
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
