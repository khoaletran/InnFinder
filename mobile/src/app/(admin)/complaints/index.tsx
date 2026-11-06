import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../../services/admin.service';
import { AdminComplaintItem } from '../../../types/admin.types';
import { ComplaintItemCard } from '../../../components/admin/ComplaintItemCard';

const TABS = ['Tất cả', 'Chờ xử lý', 'Đang xử lý', 'Đã xử lý'];

export default function AdminComplaintsScreen() {
  const [complaints, setComplaints] = useState<AdminComplaintItem[]>([]);
  const [activeTab, setActiveTab] = useState('Tất cả');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const list = await adminService.getComplaints();
    setComplaints(list);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filtered = complaints.filter((c) => {
    if (activeTab === 'Chờ xử lý') return c.trangThai === 'CHO_XU_LY';
    if (activeTab === 'Đang xử lý') return c.trangThai === 'DANG_XU_LY';
    if (activeTab === 'Đã xử lý') return c.trangThai === 'DA_XU_LY';
    return true;
  });

  return (
    <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-slate-200">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xl font-bold text-slate-900">Khiếu nại & Tố cáo</Text>
          <Ionicons name="search-outline" size={20} color="#64748B" />
        </View>

        {/* Filter chips */}
        <View className="flex-row items-center gap-2 mt-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-full border ${
                  isActive
                    ? 'bg-teal-600 border-teal-600'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    isActive ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  {tab}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filtered.length === 0 ? (
          <View className="items-center justify-center py-12">
            <Ionicons name="shield-checkmark-outline" size={48} color="#CBD5E1" />
            <Text className="text-sm text-slate-400 mt-2">Không có khiếu nại nào</Text>
          </View>
        ) : (
          filtered.map((item) => (
            <ComplaintItemCard
              key={item.maKhieuNai}
              complaint={item}
              onPress={() => router.push(`/(admin)/complaints/${item.maKhieuNai}`)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
