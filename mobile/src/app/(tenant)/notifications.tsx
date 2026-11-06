import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Chip } from 'heroui-native';
import { Colors } from '../../constants/theme';

interface NotificationItem {
  id: string;
  tieuDe: string;
  noiDung: string;
  thoiGian: string;
  loai: 'LICH_HEN' | 'GIAO_DICH' | 'HE_THONG';
  chuaDoc: boolean;
}

// Dữ liệu mẫu chuẩn nghiệp vụ InnFinder (Swimlane Cọc giữ chân & Lịch hẹn)
const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    tieuDe: 'Chủ trọ đã xác nhận lịch hẹn',
    noiDung: 'Chủ phòng trọ Ký túc xá Cầu Giấy đã xác nhận lịch xem phòng lúc 14:00 ngày mai. Vui lòng nộp cọc giữ chân để giữ phòng.',
    thoiGian: '10 phút trước',
    loai: 'LICH_HEN',
    chuaDoc: true,
  },
  {
    id: '2',
    tieuDe: 'Hoàn trả 100% cọc giữ chân',
    noiDung: 'Bạn đã hoàn tất buổi xem phòng thực tế. Hệ thống đã hoàn trả 200.000 VNĐ tiền cọc vào số dư ví của bạn.',
    thoiGian: '2 giờ trước',
    loai: 'GIAO_DICH',
    chuaDoc: true,
  },
  {
    id: '3',
    tieuDe: 'Yêu cầu thuê phòng đã được chấp thuận',
    noiDung: 'Chúc mừng bạn! Chủ trọ đã đồng ý hợp đồng thuê phòng trọ Mini Khâm Thiên. Hạn hoàn tất thủ tục là 3 ngày.',
    thoiGian: 'Hôm qua',
    loai: 'LICH_HEN',
    chuaDoc: false,
  },
  {
    id: '4',
    tieuDe: 'Khiếu nại đang được xử lý',
    noiDung: 'Quản trị viên InnFinder đã tiếp nhận phản ánh của bạn về thông tin giá phòng sai lệch và đang liên hệ xác minh.',
    thoiGian: '3 ngày trước',
    loai: 'HE_THONG',
    chuaDoc: false,
  },
];

export default function TenantNotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [filterType, setFilterType] = useState<'ALL' | 'LICH_HEN' | 'GIAO_DICH'>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  // Đếm số thông báo chưa đọc
  const unreadCount = notifications.filter((item) => item.chuaDoc).length;

  // Lọc theo chip
  const filteredList = notifications.filter((item) => {
    if (filterType === 'ALL') return true;
    return item.loai === filterType;
  });

  // Đánh dấu tất cả đã đọc
  const handleMarkAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((item) => ({ ...item, chuaDoc: false }))
    );
  };

  // Đánh dấu 1 thông báo là đã đọc khi click
  const handleItemPress = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, chuaDoc: false } : item))
    );
  };

  // Giả lập làm mới kéo thả
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  // Icon và màu sắc tương ứng với từng loại thông báo
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

      {/* Danh sách thông báo */}
      <FlatList
        data={filteredList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Ionicons name="notifications-off-outline" size={48} color={Colors.textMuted} />
            <Text className="text-sm text-slate-500 mt-3">Không có thông báo nào</Text>
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
                  {/* Icon */}
                  <View className={`size-10 rounded-full ${icon.bg} items-center justify-center`}>
                    <Ionicons name={icon.name} size={20} color={icon.color} />
                  </View>

                  {/* Nội dung */}
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