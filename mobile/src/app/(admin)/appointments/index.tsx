import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from 'heroui-native';
import { adminService } from '../../../services/admin.service';
import { AdminAppointmentItem } from '../../../types/admin.types';

const TABS = ['Tất cả', 'Chờ xác nhận', 'Xác nhận', 'Hoàn thành', 'Huỷ'];

export default function AdminAppointmentsScreen() {
  const [appointments, setAppointments] = useState<AdminAppointmentItem[]>([]);
  const [activeTab, setActiveTab] = useState('Tất cả');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const list = await adminService.getAppointments();
    setAppointments(list);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filtered = appointments.filter((a) => {
    if (activeTab === 'Chờ xác nhận') return a.trangThai === 'CHO_XAC_NHAN';
    if (activeTab === 'Xác nhận') return a.trangThai === 'XAC_NHAN';
    if (activeTab === 'Hoàn thành') return a.trangThai === 'HOAN_THANH';
    if (activeTab === 'Huỷ') return a.trangThai === 'HUY';
    return true;
  });

  return (
    <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-slate-200">
        <View className="flex-row items-center justify-between mb-2">
          <Pressable onPress={() => router.back()} className="flex-row items-center gap-1">
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
            <Text className="text-xl font-bold text-slate-900">Lịch xem phòng</Text>
          </Pressable>
          <Ionicons name="search-outline" size={20} color="#64748B" />
        </View>

        {/* Tab filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 mt-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-full border mr-2 ${
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
        </ScrollView>
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
            <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
            <Text className="text-sm text-slate-400 mt-2">Không có lịch hẹn nào</Text>
          </View>
        ) : (
          filtered.map((item) => (
            <Pressable
              key={item.maDatLich}
              onPress={() => router.push(`/(admin)/appointments/${item.maDatLich}`)}
              className="mb-3 active:opacity-90"
            >
              <Card className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xs font-bold text-slate-800">{item.maDatLich}</Text>
                  <View
                    className={`px-2 py-0.5 rounded-full ${
                      item.trangThai === 'HOAN_THANH'
                        ? 'bg-emerald-100'
                        : item.trangThai === 'XAC_NHAN'
                        ? 'bg-blue-100'
                        : item.trangThai === 'CHO_XAC_NHAN'
                        ? 'bg-amber-100'
                        : 'bg-rose-100'
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold ${
                        item.trangThai === 'HOAN_THANH'
                          ? 'text-emerald-700'
                          : item.trangThai === 'XAC_NHAN'
                          ? 'text-blue-700'
                          : item.trangThai === 'CHO_XAC_NHAN'
                          ? 'text-amber-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {item.trangThai}
                    </Text>
                  </View>
                </View>

                <Text className="text-sm font-bold text-slate-900">{item.tenKhachHang}</Text>
                <Text className="text-xs text-slate-500 mt-0.5">Phòng: {item.tenPhongTro}</Text>

                <View className="flex-row items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name="time-outline" size={14} color="#64748B" />
                    <Text className="text-xs text-slate-500">{item.ngayHen}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                </View>
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}
