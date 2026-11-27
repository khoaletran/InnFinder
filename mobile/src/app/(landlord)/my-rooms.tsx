import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, ScrollView, Pressable, Image, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Card } from 'heroui-native';
import { landlordService } from '../../services/landlord.service';
import { useCreateRoomStore } from '../../store/useCreateRoomStore';
import { LandlordRoomItem } from '../../types/landlord.types';
import { formatVNDShort } from '../../utils/formatVND';

const PAGE_SIZE = 8;

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
  const [visibleLimit, setVisibleLimit] = useState<number>(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const { drafts, loadDrafts, loadDraftIntoWizard, deleteDraft, resetWizard } = useCreateRoomStore();

  useFocusEffect(
    useCallback(() => {
      loadDrafts();
    }, [loadDrafts])
  );

  useEffect(() => {
    setVisibleLimit(PAGE_SIZE);
    loadRooms();
  }, [filter]);

  const loadRooms = async () => {
    const list = await landlordService.getMyRooms(filter);
    setRooms(list);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadRooms(), loadDrafts()]);
    setRefreshing(false);
  };

  const handleResumeDraft = (draftId: string) => {
    if (loadDraftIntoWizard(draftId)) {
      router.push('/(landlord)/create-room');
    }
  };

  const handleDeleteDraft = (draftId: string) => {
    Alert.alert('Xóa bản nháp?', 'Bản nháp này sẽ bị xóa vĩnh viễn khỏi thiết bị.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => deleteDraft(draftId),
      },
    ]);
  };

  const handleToggleRoomStatus = (room: LandlordRoomItem) => {
    if (room.trangThai === 'DA_DUYET') {
      Alert.alert(
        'Đánh dấu đã cho thuê',
        'Xác nhận phòng này đã có người thuê? Phòng sẽ chuyển sang trạng thái "Đã cho thuê" và tạm ẩn khỏi danh sách tìm kiếm của khách hàng.',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xác nhận đã thuê',
            style: 'default',
            onPress: async () => {
              try {
                await landlordService.updateRoomStatus(room.id, 'HOAN_THANH');
                Alert.alert('Thành công', 'Đã chuyển phòng sang trạng thái Đã cho thuê.');
                loadRooms();
              } catch (err: any) {
                Alert.alert('Thất bại', err?.message || 'Không thể đổi trạng thái phòng lúc này.');
              }
            },
          },
        ]
      );
    } else if (room.trangThai === 'HOAN_THANH') {
      Alert.alert(
        'Mở cho thuê lại',
        'Xác nhận mở cho thuê lại phòng này? Phòng sẽ được hiển thị công khai trên ứng dụng để khách hàng tìm kiếm và đặt lịch xem.',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Mở cho thuê',
            style: 'default',
            onPress: async () => {
              try {
                await landlordService.updateRoomStatus(room.id, 'DA_DUYET');
                Alert.alert('Thành công', 'Đã mở phòng hiển thị công khai trên ứng dụng.');
                loadRooms();
              } catch (err: any) {
                Alert.alert('Thất bại', err?.message || 'Không thể đổi trạng thái phòng lúc này.');
              }
            },
          },
        ]
      );
    }
  };

  // Lướt cuộn vô tận (Infinite Scroll)
  const visibleRooms = useMemo(() => {
    return rooms.slice(0, visibleLimit);
  }, [rooms, visibleLimit]);

  const handleLoadMore = () => {
    if (visibleLimit < rooms.length && !loadingMore) {
      setLoadingMore(true);
      setTimeout(() => {
        setVisibleLimit((prev) => Math.min(prev + PAGE_SIZE, rooms.length));
        setLoadingMore(false);
      }, 250);
    }
  };

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
          <Text className="text-sm font-bold text-gray-900 mb-1" numberOfLines={1}>
            {room.tenPhong}
          </Text>

          <View className="flex-row items-center justify-between mt-1 pt-2 border-t border-gray-100">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-sm font-bold text-teal-700">
                {formatVNDShort(room.giaThue)}
              </Text>
              <Text className="text-xs font-medium text-gray-400">• {room.dienTich} m²</Text>
            </View>

            <View className="flex-row items-center gap-1.5">
              {room.trangThai === 'DA_DUYET' && (
                <Pressable
                  className="flex-row items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 active:bg-emerald-100"
                  onPress={(e) => {
                    e.stopPropagation();
                    handleToggleRoomStatus(room);
                  }}
                >
                  <Ionicons name="checkmark-done" size={13} color="#059669" />
                  <Text className="text-[11px] font-bold text-emerald-800">Đã thuê</Text>
                </Pressable>
              )}

              {room.trangThai === 'HOAN_THANH' && (
                <Pressable
                  className="flex-row items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 active:bg-sky-100"
                  onPress={(e) => {
                    e.stopPropagation();
                    handleToggleRoomStatus(room);
                  }}
                >
                  <Ionicons name="refresh" size={13} color="#0284c7" />
                  <Text className="text-[11px] font-bold text-sky-800">Cho thuê lại</Text>
                </Pressable>
              )}

              <Pressable
                className="flex-row items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 active:bg-teal-100"
                onPress={(e) => {
                  e.stopPropagation();
                  router.push(`/(landlord)/edit-room?id=${room.id}` as any);
                }}
              >
                <Ionicons name="create-outline" size={13} color="#0f766e" />
                <Text className="text-[11px] font-bold text-teal-800">Sửa</Text>
              </Pressable>
            </View>
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
          <Text className="text-xs font-bold text-teal-700">{rooms.length} phòng</Text>
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
        data={visibleRooms}
        keyExtractor={(item) => item.id}
        renderItem={renderRoomItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          filter === 'ALL' && drafts.length > 0 ? (
            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="document-text-outline" size={14} color="#b45309" />
                  <Text className="text-xs font-bold text-amber-900">
                    Bản nháp ({drafts.length})
                  </Text>
                </View>
                <Text className="text-[11px] text-gray-400">Tự động lưu khi đang nhập</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10 }}
              >
                {drafts.map((draft) => {
                  const thumb =
                    draft.images.find((img) => img.isCover)?.uri || draft.images[0]?.uri;
                  return (
                    <Pressable
                      key={draft.id}
                      onPress={() => handleResumeDraft(draft.id)}
                      className="w-60 bg-white rounded-xl border border-amber-200 p-2.5 flex-row items-center gap-2.5 active:bg-amber-50/50"
                    >
                      <View className="w-12 h-12 rounded-lg overflow-hidden bg-amber-50 items-center justify-center">
                        {thumb ? (
                          <Image source={{ uri: thumb }} className="w-full h-full" resizeMode="cover" />
                        ) : (
                          <Ionicons name="document-text-outline" size={20} color="#d97706" />
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className="text-xs font-bold text-gray-900" numberOfLines={1}>
                          {draft.step1.tenPhong?.trim() || 'Phòng chưa đặt tên'}
                        </Text>
                        <Text className="text-[11px] text-amber-700 font-medium mt-0.5">
                          Bước {draft.currentStep || 1}/3 • {formatVNDShort(draft.step1.giaThue)}
                        </Text>
                      </View>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteDraft(draft.id);
                        }}
                        hitSlop={8}
                        className="p-1"
                      >
                        <Ionicons name="close-circle" size={16} color="#9ca3af" />
                      </Pressable>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : undefined
        }
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
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? (
            <View className="py-4 items-center flex-row justify-center gap-2">
              <ActivityIndicator size="small" color="#0f766e" />
              <Text className="text-xs text-gray-500 font-medium">Đang tải thêm phòng...</Text>
            </View>
          ) : rooms.length > PAGE_SIZE && visibleLimit >= rooms.length ? (
            <View className="py-4 items-center">
              <Text className="text-xs text-gray-400 font-medium">Đã hiển thị tất cả {rooms.length} phòng</Text>
            </View>
          ) : (
            <View className="h-10" />
          )
        }
      />

      {/* Nút Floating Action Button (+) */}
      <Pressable
        onPress={() => {
          resetWizard();
          router.push('/(landlord)/create-room');
        }}
        className="absolute bottom-6 right-5 w-14 h-14 rounded-full bg-teal-700 items-center justify-center shadow-lg active:bg-teal-800"
      >
        <Ionicons name="add" size={30} color="#ffffff" />
      </Pressable>
    </SafeAreaView>
  );
}
