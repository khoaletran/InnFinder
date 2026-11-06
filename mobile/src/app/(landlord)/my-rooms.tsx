import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card } from 'heroui-native';
import { landlordService } from '../../services/landlord.service';
import { LandlordRoomItem } from '../../types/landlord.types';

export default function MyRoomsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<'ALL' | 'AVAILABLE' | 'RENTED'>('ALL');
  const [rooms, setRooms] = useState<LandlordRoomItem[]>([]);

  useEffect(() => {
    loadRooms();
  }, [filter]);

  const loadRooms = async () => {
    const list = await landlordService.getMyRooms(filter);
    setRooms(list);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-slate-50" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3.5 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-gray-900">Phòng của tôi</Text>
      </View>

      {/* Tabs Filter */}
      <View className="flex-row px-4 py-3 bg-white gap-2 border-b border-gray-100">
        {[
          { key: 'ALL', label: 'Tất cả' },
          { key: 'AVAILABLE', label: 'Đang trống' },
          { key: 'RENTED', label: 'Đang thuê' },
        ].map((tab) => {
          const isActive = filter === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setFilter(tab.key as any)}
              className={`px-4 py-1.5 rounded-full ${
                isActive ? 'bg-teal-700' : 'bg-gray-100'
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
      </View>

      {/* Danh sách phòng */}
      <ScrollView
        style={{ flex: 1 }}
        className="px-4 py-3"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {rooms.map((room) => (
          <Card
            key={room.id}
            className="mb-4 bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm"
          >
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
                  room.isRented ? 'bg-emerald-600' : 'bg-amber-500'
                }`}
              >
                <Text className="text-[10px] font-bold text-white uppercase tracking-wider">
                  {room.isRented ? 'Đang thuê' : 'Đang trống'}
                </Text>
              </View>
            </View>

            {/* Thông tin phòng */}
            <View className="p-3.5">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-bold text-gray-900 flex-1 mr-2" numberOfLines={1}>
                  {room.tenPhong}
                </Text>
                <Pressable className="p-1">
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
        ))}
      </ScrollView>

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
