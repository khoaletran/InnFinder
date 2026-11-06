import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from 'heroui-native';
import { adminService } from '../../../services/admin.service';
import { AdminAppointmentItem } from '../../../types/admin.types';

const TABS = ['Tất cả', 'Chờ xác nhận', 'Xác nhận', 'Hoàn thành', 'Huỷ'];

export default function AdminAppointmentsScreen() {
  const [appointments, setAppointments] = useState<AdminAppointmentItem[]>([]);
  const [activeTab, setActiveTab] = useState('Tất cả');
  const [search, setSearch] = useState('');
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
    if (activeTab === 'Chờ xác nhận' && a.trangThai !== 'CHO_XAC_NHAN') return false;
    if (activeTab === 'Xác nhận' && a.trangThai !== 'XAC_NHAN') return false;
    if (activeTab === 'Hoàn thành' && a.trangThai !== 'HOAN_THANH') return false;
    if (activeTab === 'Huỷ' && a.trangThai !== 'HUY') return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        a.maDatLich.toLowerCase().includes(q) ||
        a.tenKhachHang.toLowerCase().includes(q) ||
        a.tenPhongTro.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'HOAN_THANH':
        return { label: 'Hoàn thành', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' };
      case 'XAC_NHAN':
        return { label: 'Đã xác nhận', bg: 'bg-sky-50 border-sky-200', text: 'text-sky-700' };
      case 'CHO_XAC_NHAN':
        return { label: 'Chờ xác nhận', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' };
      default:
        return { label: 'Đã hủy', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700' };
    }
  };

  return (
    <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
      {/* Header chuẩn InnFinder */}
      <View className="px-4 py-3 bg-white border-b border-slate-200/80">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2.5">
            <Pressable
              onPress={() => router.back()}
              className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
            >
              <Ionicons name="chevron-back" size={20} color="#0F172A" />
            </Pressable>
            <View>
              <Text className="text-xl font-bold text-slate-900">Lịch xem phòng</Text>
              <Text className="text-xs text-slate-500 mt-0.5">Giám sát các cuộc hẹn xem phòng trực tiếp</Text>
            </View>
          </View>
        </View>

        {/* Thanh tìm kiếm phong cách khách hàng */}
        <View className="flex-row items-center bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-full mb-3">
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            placeholder="Tìm theo mã lịch, khách hàng, tên phòng..."
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

        {/* Tab filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`px-3.5 py-1.5 rounded-full border mr-2 ${
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
          <View className="items-center justify-center py-16">
            <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
              <Ionicons name="calendar-outline" size={32} color="#94A3B8" />
            </View>
            <Text className="text-sm font-semibold text-slate-600">Không có lịch hẹn nào</Text>
            <Text className="text-xs text-slate-400 mt-1">Các lịch hẹn mới sẽ hiển thị tại đây</Text>
          </View>
        ) : (
          filtered.map((item) => {
            const badge = getStatusBadge(item.trangThai);
            return (
              <Pressable
                key={item.maDatLich}
                onPress={() => router.push(`/(admin)/appointments/${item.maDatLich}`)}
                className="mb-3 active:opacity-90"
              >
                <Card className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-xs font-bold text-slate-700">{item.maDatLich}</Text>
                    <View className={`px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                      <Text className={`text-[10px] font-bold ${badge.text}`}>
                        {badge.label}
                      </Text>
                    </View>
                  </View>

                  <Text className="text-sm font-bold text-slate-900">{item.tenKhachHang}</Text>
                  <Text className="text-xs text-slate-500 mt-0.5 font-medium">Phòng: {item.tenPhongTro}</Text>

                  <View className="flex-row items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                    <View className="flex-row items-center gap-1.5">
                      <Ionicons name="time-outline" size={14} color="#0D9488" />
                      <Text className="text-xs text-slate-600 font-medium">{item.ngayHen}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                  </View>
                </Card>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
