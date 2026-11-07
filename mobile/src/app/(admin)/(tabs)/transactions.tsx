import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../../services/admin.service';
import { AdminTransactionItem } from '../../../types/admin.types';
import { TransactionItemCard } from '../../../components/admin/TransactionItemCard';

const TABS = ['Tất cả', 'Rút tiền', 'Cọc giữ chỗ', 'Hoàn cọc'];

export default function AdminTransactionsTabScreen() {
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
    if (activeTab === 'Rút tiền' && t.loaiGiaoDich !== 'YEU_CAU_RUT_TIEN') return false;
    if (activeTab === 'Cọc giữ chỗ' && t.loaiGiaoDich !== 'COC_GIU_CHO') return false;
    if (activeTab === 'Hoàn cọc' && t.loaiGiaoDich !== 'HOAN_COC') return false;

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

  const pendingWithdrawalCount = transactions.filter(
    (t) => t.loaiGiaoDich === 'YEU_CAU_RUT_TIEN' && t.trangThai === 'DANG_XU_LY'
  ).length;

  return (
    <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-slate-200/80">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-xl font-bold text-slate-900">Quản lý giao dịch</Text>
            <Text className="text-xs text-slate-500 mt-0.5">
              Yêu cầu rút tiền, tiền cọc & biến động dòng tiền
            </Text>
          </View>
          {pendingWithdrawalCount > 0 ? (
            <View className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200">
              <Text className="text-xs font-bold text-amber-700">
                {pendingWithdrawalCount} lệnh rút chờ duyệt
              </Text>
            </View>
          ) : (
            <View className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200">
              <Text className="text-xs font-bold text-teal-700">{filtered.length} giao dịch</Text>
            </View>
          )}
        </View>

        {/* Ô tìm kiếm */}
        <View className="flex-row items-center bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-full mb-3">
          <Ionicons name="search" size={17} color="#94A3B8" />
          <TextInput
            placeholder="Tìm theo mã GD, tên phòng, người thực hiện..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            className="flex-1 ml-2 text-xs text-slate-900 py-0"
          />
          {search ? (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </Pressable>
          ) : null}
        </View>

        {/* Tab lọc loại giao dịch */}
        <View className="flex-row items-center gap-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-full border ${
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
              onPress={() => router.push(`/(admin)/transactions/${item.maGiaoDich}` as any)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
