import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../../services/admin.service';
import { AdminTransactionItem } from '../../../types/admin.types';
import { TransactionItemCard } from '../../../components/admin/TransactionItemCard';

const TABS = ['Tất cả', 'Thành công', 'Đang xử lý', 'Thất bại'];

export default function AdminTransactionsScreen() {
  const [transactions, setTransactions] = useState<AdminTransactionItem[]>([]);
  const [activeTab, setActiveTab] = useState('Tất cả');
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
    if (activeTab === 'Thành công') return t.trangThai === 'THANH_CONG';
    if (activeTab === 'Đang xử lý') return t.trangThai === 'DANG_XU_LY';
    if (activeTab === 'Thất bại') return t.trangThai === 'THAT_BAI';
    return true;
  });

  return (
    <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-slate-200">
        <View className="flex-row items-center justify-between mb-2">
          <Pressable onPress={() => router.back()} className="flex-row items-center gap-1">
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
            <Text className="text-xl font-bold text-slate-900">Giao dịch</Text>
          </Pressable>
          <Ionicons name="search-outline" size={20} color="#64748B" />
        </View>

        {/* Tab filters */}
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
            <Ionicons name="receipt-outline" size={48} color="#CBD5E1" />
            <Text className="text-sm text-slate-400 mt-2">Không có giao dịch nào</Text>
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
