import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { RentalRequestCard } from '../../components/landlord/RentalRequestCard';
import { landlordService } from '../../services/landlord.service';
import { LandlordRentalRequestItem } from '../../types/landlord.types';

export default function RentalRequestsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'PENDING' | 'CONFIRMED'>('PENDING');
  const [requests, setRequests] = useState<LandlordRentalRequestItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadRequests = useCallback(async () => {
    try {
      const list = await landlordService.getRentalRequests();
      setRequests(list);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadRequests();
  }, [loadRequests, tab]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const handleConfirm = (id: string) => {
    Alert.alert(
      'Xác nhận cho thuê',
      'Xác nhận đồng ý cho khách hàng thuê phòng này? Sau khi cả 2 bên cùng xác nhận, phòng sẽ chuyển sang ĐÃ CHO THUÊ và tiền cọc (sau khi trừ phí sàn) sẽ chuyển vào ví của bạn.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận cho thuê',
          style: 'default',
          onPress: async () => {
            try {
              await landlordService.submitLandlordDecision(id, true);
              Alert.alert('Thành công', 'Đã gửi quyết định đồng ý cho thuê phòng!');
              loadRequests();
            } catch (err: any) {
              Alert.alert('Lỗi', err?.response?.data?.message || err?.message || 'Không thể xử lý yêu cầu.');
            }
          },
        },
      ]
    );
  };

  const handleReject = (id: string) => {
    Alert.alert(
      'Từ chối yêu cầu thuê',
      'Xác nhận từ chối yêu cầu thuê phòng này? Tiền cọc sẽ được hoàn trả lại cho bạn.',
      [
        { text: 'Quay lại', style: 'cancel' },
        {
          text: 'Từ chối',
          style: 'destructive',
          onPress: async () => {
            try {
              await landlordService.submitLandlordDecision(id, false, 'Chủ trọ từ chối yêu cầu thuê');
              Alert.alert('Thành công', 'Đã từ chối yêu cầu thuê phòng.');
              loadRequests();
            } catch (err: any) {
              Alert.alert('Lỗi', err?.response?.data?.message || err?.message || 'Không thể từ chối lúc này.');
            }
          },
        },
      ]
    );
  };

  const filteredRequests = requests.filter((r) =>
    tab === 'PENDING' ? r.trangThai === 'CHO_DUYET' : r.trangThai === 'DA_DUYET'
  );

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-slate-50" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3.5 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Pressable onPress={() => router.back()} className="p-1 -ml-1 active:opacity-70">
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <Text className="text-lg font-bold text-gray-900">Yêu cầu thuê phòng</Text>
        </View>
        <View className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200">
          <Text className="text-xs font-bold text-teal-700">{filteredRequests.length} yêu cầu</Text>
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row px-4 py-3 bg-white gap-2 border-b border-gray-100">
        {[
          { key: 'PENDING', label: 'Chờ quyết định' },
          { key: 'CONFIRMED', label: 'Đã chấp thuận' },
        ].map((t) => {
          const isActive = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key as any)}
              className={`px-4 py-1.5 rounded-full ${
                isActive ? 'bg-teal-700' : 'bg-gray-100 active:bg-gray-200'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  isActive ? 'text-white' : 'text-gray-600'
                }`}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Danh sách yêu cầu */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0f766e" />
          <Text className="text-xs text-gray-500 mt-2 font-medium">Đang tải danh sách...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          className="px-4 py-4"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0f766e']} />
          }
        >
          {filteredRequests.length === 0 ? (
            <View className="flex-1 items-center justify-center py-20">
              <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-3">
                <Ionicons name="document-text-outline" size={32} color="#9ca3af" />
              </View>
              <Text className="text-sm font-bold text-gray-800">Không có yêu cầu thuê nào</Text>
              <Text className="text-xs text-gray-400 text-center mt-1 max-w-xs">
                Khi khách hàng gửi yêu cầu thuê phòng sau khi xem, thông tin sẽ xuất hiện tại đây.
              </Text>
            </View>
          ) : (
            filteredRequests.map((req) => (
              <RentalRequestCard
                key={req.id}
                request={req}
                onConfirm={handleConfirm}
                onReject={handleReject}
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
