import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../../services/admin.service';
import { AdminTransactionItem } from '../../../types/admin.types';
import { TransactionItemCard } from '../../../components/admin/TransactionItemCard';

const TABS = ['Tất cả', 'Thành công', 'Đang xử lý', 'Thất bại'];

export default function AdminTransactionsScreen() {
  const [transactions, setTransactions] = useState<AdminTransactionItem[]>([]);
  const [activeTab, setActiveTab] = useState('Tất cả');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const list = await adminService.getTransactions();
    setTransactions(list);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filtered = transactions.filter((t) => {
    if (activeTab === 'Thành công' && t.trangThai !== 'THANH_CONG') return false;
    if (activeTab === 'Đang xử lý' && t.trangThai !== 'DANG_XU_LY') return false;
    if (activeTab === 'Thất bại' && t.trangThai !== 'THAT_BAI') return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        t.maGiaoDich.toLowerCase().includes(q) ||
        t.phongTro.toLowerCase().includes(q) ||
        t.nguoiThucHien.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
      {/* Header đồng bộ phong cách InnFinder */}
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
              <Text className="text-xl font-bold text-slate-900">Giao dịch</Text>
              <Text className="text-xs text-slate-500 mt-0.5">Lịch sử nạp, cọc & đối soát doanh thu</Text>
            </View>
          </View>
        </View>

        {/* Search input bo tròn */}
        <View className="flex-row items-center bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-full mb-3">
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            placeholder="Tìm theo mã giao dịch, phòng, người gửi..."
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
              <Ionicons name="receipt-outline" size={32} color="#94A3B8" />
            </View>
            <Text className="text-sm font-semibold text-slate-600">Không có giao dịch nào</Text>
            <Text className="text-xs text-slate-400 mt-1">Dữ liệu giao dịch mới sẽ hiển thị tại đây</Text>
          </View>
        ) : (
          filtered.map((item) => (
            <TransactionItemCard
              key={item.maGiaoDich}
              transaction={item}
              onPress={() => router.push(`/(admin)/transactions/${item.maGiaoDich}`)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
