import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../../services/admin.service';
import { AdminComplaintItem } from '../../../types/admin.types';
import { ComplaintItemCard } from '../../../components/admin/ComplaintItemCard';

const TABS = ['Tất cả', 'Chờ xử lý', 'Đang xử lý', 'Đã xử lý'];

export default function AdminComplaintsScreen() {
  const [complaints, setComplaints] = useState<AdminComplaintItem[]>([]);
  const [activeTab, setActiveTab] = useState('Tất cả');
  const [search, setSearch] = useState('');
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
    if (activeTab === 'Chờ xử lý' && c.trangThai !== 'CHO_XU_LY') return false;
    if (activeTab === 'Đang xử lý' && c.trangThai !== 'DANG_XU_LY') return false;
    if (activeTab === 'Đã xử lý' && c.trangThai !== 'DA_XU_LY') return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.maKhieuNai.toLowerCase().includes(q) ||
        c.nguoiKhieuNai.toLowerCase().includes(q) ||
        c.doiTuongBiKhieuNai.toLowerCase().includes(q) ||
        c.vanDe.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingCount = complaints.filter((c) => c.trangThai === 'CHO_XU_LY').length;

  return (
    <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
      {/* Header đồng bộ phong cách InnFinder */}
      <View className="px-4 py-3 bg-white border-b border-slate-200/80">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-xl font-bold text-slate-900">Khiếu nại & Tố cáo</Text>
            <Text className="text-xs text-slate-500 mt-0.5">Tiếp nhận & xử lý tranh chấp người dùng</Text>
          </View>
          {pendingCount > 0 ? (
            <View className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200">
              <Text className="text-xs font-bold text-rose-600">{pendingCount} cần xử lý</Text>
            </View>
          ) : null}
        </View>

        {/* Thanh tìm kiếm phong cách khách hàng */}
        <View className="flex-row items-center bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-full mb-3">
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            placeholder="Tìm mã khiếu nại, người gửi, vấn đề..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            className="flex-1 ml-2.5 text-sm text-slate-900 py-0"
          />
          {search ? (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </Pressable>
          ) : null}
        </View>

        {/* Filter pills */}
        <View className="flex-row items-center gap-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`px-3.5 py-1.5 rounded-full border ${
                  isActive
                    ? 'bg-teal-700 border-teal-700'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text
                  className={`text-xs ${
                    isActive ? 'font-semibold text-white' : 'font-medium text-slate-700'
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
          <View className="items-center justify-center py-16">
            <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
              <Ionicons name="shield-checkmark-outline" size={32} color="#94A3B8" />
            </View>
            <Text className="text-sm font-semibold text-slate-600">Không có khiếu nại nào</Text>
            <Text className="text-xs text-slate-400 mt-1">Hệ thống đang hoạt động an toàn và ổn định</Text>
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
