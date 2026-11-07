import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, ScrollView, Pressable, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card } from 'heroui-native';
import { landlordService } from '../../services/landlord.service';
import { LandlordRoomItem } from '../../types/landlord.types';

const PAGE_SIZE = 5;

type RoomFilterKey = 'ALL' | 'DA_DUYET' | 'CHO_DUYET' | 'HUY' | 'HOAN_THANH';

const FILTER_TABS: Array<{ key: RoomFilterKey; label: string }> = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'DA_DUYET', label: 'Đã đăng bài' },
  { key: 'CHO_DUYET', label: 'Chờ duyệt' },
  { key: 'HUY', label: 'Bị từ chối' },
  { key: 'HOAN_THANH', label: 'Đã cho thuê' },
];

export default function MyRoomsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<RoomFilterKey>('ALL');
  const [rooms, setRooms] = useState<LandlordRoomItem[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    setCurrentPage(1);
    loadRooms();
  }, [filter]);

  const loadRooms = async () => {
    const list = await landlordService.getMyRooms(filter);
    setRooms(list);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRooms();
    setRefreshing(false);
  };

  // Tính toán phân trang
  const totalRooms = rooms.length;
  const totalPages = Math.max(1, Math.ceil(totalRooms / PAGE_SIZE));

  const paginatedRooms = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return rooms.slice(start, start + PAGE_SIZE);
  }, [rooms, currentPage]);

  // Render 1 phòng trọ
  const renderRoomItem = ({ item: room }: { item: LandlordRoomItem }) => (
    <Pressable
      key={room.id}
      onPress={() => router.push(`/room/${room.id}` as any)}
      className="active:opacity-90"
    >
      <Card className="mb-4 bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        {/* Ảnh phòng & Badge */}
        <View className="relative w-full h-44">
          <Image
            source={{
              uri:
                room.hinhAnhUrl ||
                'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600',
            }}
            className="w-full h-full"
            resizeMode="cover"
          />
          <View
            className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full ${
              room.trangThai === 'HOAN_THANH'
                ? 'bg-emerald-600'
                : room.trangThai === 'DA_DUYET'
                ? 'bg-teal-600'
                : room.trangThai === 'CHO_DUYET'
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
          >
            <Text className="text-[10px] font-bold text-white uppercase tracking-wider">
              {room.trangThai === 'HOAN_THANH'
                ? 'Đã cho thuê'
                : room.trangThai === 'DA_DUYET'
                ? 'Đã đăng bài'
                : room.trangThai === 'CHO_DUYET'
                ? 'Chờ duyệt'
                : 'Bị từ chối'}
            </Text>
          </View>
        </View>

        {/* Thông tin phòng */}
        <View className="p-3.5">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-bold text-gray-900 flex-1 mr-2" numberOfLines={1}>
              {room.tenPhong}
            </Text>
            <Pressable className="p-1" onPress={(e) => e.stopPropagation()}>
              <Ionicons name="ellipsis-vertical" size={16} color="#6b7280" />
            </Pressable>
          </View>

          <View className="flex-row items-center justify-between mt-2">
            <Text className="text-sm font-bold text-teal-700">
              {(room.giaThue / 1000000).toFixed(1)} triệu/tháng
            </Text>
            <Text className="text-xs font-medium text-gray-400">{room.dienTich} m²</Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-slate-50" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3.5 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-gray-900">Phòng của tôi</Text>
        <View className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200">
          <Text className="text-xs font-bold text-teal-700">{totalRooms} phòng</Text>
        </View>
      </View>

      {/* Tabs Filter ngang có thể cuộn */}
      <View className="bg-white border-b border-gray-100 py-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {FILTER_TABS.map((tab) => {
            const isActive = filter === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setFilter(tab.key)}
                className={`px-3.5 py-1.5 rounded-full ${
                  isActive ? 'bg-teal-700' : 'bg-gray-100 active:bg-gray-200'
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

      {/* Danh sách phòng dạng FlatList */}
      <FlatList
        data={paginatedRooms}
        keyExtractor={(item) => item.id}
        renderItem={renderRoomItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Card className="p-8 bg-white rounded-2xl items-center justify-center my-6 border border-gray-100 shadow-sm">
            <Ionicons name="business-outline" size={44} color="#94A3B8" />
            <Text className="text-sm font-semibold text-gray-700 mt-3">
              Không tìm thấy phòng trọ nào
            </Text>
            <Text className="text-xs text-gray-400 text-center mt-1">
              {filter === 'DA_DUYET'
                ? 'Bạn hiện không có phòng nào ở trạng thái Đã đăng bài.'
                : filter === 'CHO_DUYET'
                ? 'Không có phòng nào đang chờ duyệt.'
                : filter === 'HUY'
                ? 'Không có phòng nào bị từ chối.'
                : filter === 'HOAN_THANH'
                ? 'Chưa có phòng nào ở trạng thái Đã cho thuê.'
                : 'Bạn chưa đăng phòng trọ nào. Hãy bấm nút (+) bên dưới để tạo bài đăng mới.'}
            </Text>
          </Card>
        }
        ListFooterComponent={
          totalPages > 1 ? (
            <View className="mt-2 pt-3 border-t border-gray-200">
              <View className="flex-row items-center justify-center gap-2">
                {/* Nút Trước */}
                <Pressable
                  onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1.5 rounded-xl border flex-row items-center gap-1 ${
                    currentPage === 1
                      ? 'bg-gray-100 border-gray-200 opacity-50'
                      : 'bg-white border-gray-300 active:bg-gray-50'
                  }`}
                >
                  <Ionicons name="chevron-back" size={14} color="#374151" />
                  <Text className="text-xs font-semibold text-gray-700">Trước</Text>
                </Pressable>

                {/* Các nút số trang */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  const isActive = pageNum === currentPage;
                  return (
                    <Pressable
                      key={pageNum}
                      onPress={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-xl items-center justify-center border ${
                        isActive
                          ? 'bg-teal-700 border-teal-700'
                          : 'bg-white border-gray-200 active:bg-gray-50'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isActive ? 'text-white' : 'text-gray-700'
                        }`}
                      >
                        {pageNum}
                      </Text>
                    </Pressable>
                  );
                })}

                {/* Nút Sau */}
                <Pressable
                  onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1.5 rounded-xl border flex-row items-center gap-1 ${
                    currentPage === totalPages
                      ? 'bg-gray-100 border-gray-200 opacity-50'
                      : 'bg-white border-gray-300 active:bg-gray-50'
                  }`}
                >
                  <Text className="text-xs font-semibold text-gray-700">Sau</Text>
                  <Ionicons name="chevron-forward" size={14} color="#374151" />
                </Pressable>
              </View>
            </View>
          ) : undefined
        }
      />

      {/* Nút Floating Action Button (+) */}
      <Pressable
        onPress={() => router.push('/(landlord)/create-room')}
        className="absolute bottom-6 right-5 w-14 h-14 rounded-full bg-teal-700 items-center justify-center shadow-lg active:bg-teal-800"
      >
        <Ionicons name="add" size={30} color="#ffffff" />
      </Pressable>
    </SafeAreaView>
  );
}
