import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RentalRequestCard } from '../../components/landlord/RentalRequestCard';
import { landlordService } from '../../services/landlord.service';
import { LandlordRentalRequestItem } from '../../types/landlord.types';

export default function RentalRequestsScreen() {
  const [tab, setTab] = useState<'PENDING' | 'CONFIRMED'>('PENDING');
  const [requests, setRequests] = useState<LandlordRentalRequestItem[]>([]);

  useEffect(() => {
    loadRequests();
  }, [tab]);

  const loadRequests = async () => {
    const list = await landlordService.getRentalRequests();
    setRequests(list);
  };

  const handleConfirm = async (id: string) => {
    await landlordService.completeRentalRequest(id);
    alert('Đã xác nhận hợp đồng thuê! Phòng chuyển sang trạng thái HOÀN THÀNH, hệ thống đã ghi nhận hoa hồng.');
    loadRequests();
  };

  const handleReject = async (id: string) => {
    alert('Đã từ chối yêu cầu thuê phòng.');
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-slate-50" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3.5 bg-white border-b border-gray-100">
        <Text className="text-lg font-bold text-gray-900">Thông báo</Text>
      </View>

      {/* Tabs */}
      <View className="flex-row px-4 py-3 bg-white gap-2 border-b border-gray-100">
        {[
          { key: 'PENDING', label: 'Chờ xác nhận' },
          { key: 'CONFIRMED', label: 'Đã xác nhận' },
        ].map((t) => {
          const isActive = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key as any)}
              className={`px-4 py-1.5 rounded-full ${
                isActive ? 'bg-teal-700' : 'bg-gray-100'
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
      <ScrollView
        style={{ flex: 1 }}
        className="px-4 py-4"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {requests.map((req) => (
          <RentalRequestCard
            key={req.id}
            request={req}
            onConfirm={handleConfirm}
            onReject={handleReject}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
