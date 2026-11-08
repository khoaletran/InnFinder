import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from 'heroui-native';
import { adminService } from '../../../services/admin.service';
import { AdminTransactionItem, AdminTreasuryStats } from '../../../types/admin.types';
import { TransactionItemCard } from '../../../components/admin/TransactionItemCard';

const TABS = ['Tất cả', 'Rút tiền', 'Cọc giữ chỗ', 'Hoàn cọc'];

export default function AdminTransactionsTabScreen() {
  const [transactions, setTransactions] = useState<AdminTransactionItem[]>([]);
  const [treasury, setTreasury] = useState<AdminTreasuryStats>({
    tongQuyHeThong: 0,
    quyTamGiuCoc: 0,
    tongSoDuViChuTro: 0,
    quyChoRut: 0,
    soLenhRutChoDuyet: 0,
    tongDoanhThu: 0,
  });
  const [activeTab, setActiveTab] = useState('Tất cả');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const [list, stats] = await Promise.all([
      adminService.getTransactions(),
      adminService.getTreasuryStats(),
    ]);
    setTransactions(list);
    setTreasury(stats);
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
    const loai = (t.loaiGiaoDich || '').toUpperCase();
    if (activeTab === 'Rút tiền' && !loai.includes('RUT_TIEN')) return false;
    if (activeTab === 'Cọc giữ chỗ' && !loai.includes('COC_') && !loai.includes('GIU_CHO')) return false;
    if (activeTab === 'Hoàn cọc' && !loai.includes('HOAN_COC')) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        t.maGiaoDich.toLowerCase().includes(q) ||
        (t.phongTro && t.phongTro.toLowerCase().includes(q)) ||
        (t.nguoiThucHien && t.nguoiThucHien.toLowerCase().includes(q)) ||
        (t.sdtNguoiThucHien && t.sdtNguoiThucHien.includes(q))
      );
    }
    return true;
  });

  return (
    <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-slate-200/80">
        <View className="flex-row items-center justify-between mb-2">
          <View>
            <Text className="text-xl font-bold text-slate-900">Quản lý giao dịch</Text>
            <Text className="text-xs text-slate-500 mt-0.5">
              Ngân khố hệ thống, yêu cầu rút tiền & biến động cọc
            </Text>
          </View>
          {treasury.soLenhRutChoDuyet > 0 ? (
            <View className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200">
              <Text className="text-xs font-bold text-amber-700">
                {treasury.soLenhRutChoDuyet} lệnh rút chờ duyệt
              </Text>
            </View>
          ) : (
            <View className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200">
              <Text className="text-xs font-bold text-teal-700">{filtered.length} giao dịch</Text>
            </View>
          )}
        </View>

        {/* THẺ NGÂN KHỐ TRUNG TÂM / KHO TIỀN HỆ THỐNG */}
        <Card className="bg-teal-900 rounded-2xl p-3.5 mb-3 border border-teal-800 shadow-sm">
          <View className="flex-row items-center justify-between pb-2 border-b border-teal-800/80">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="wallet" size={16} color="#2DD4BF" />
              <Text className="text-xs font-bold text-teal-200 uppercase tracking-wider">
                Kho tiền hệ thống dùng chung
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <View className="w-2 h-2 rounded-full bg-emerald-400" />
              <Text className="text-[10px] font-semibold text-teal-300">Thời gian thực</Text>
            </View>
          </View>

          <View className="py-2.5">
            <Text className="text-[11px] text-teal-300 font-medium">Tổng quỹ khả dụng trong két Sàn</Text>
            <Text className="text-2xl font-black text-white mt-0.5">
              {treasury.tongQuyHeThong.toLocaleString('vi-VN')} đ
            </Text>
          </View>

          {/* 3 ngăn quỹ chi tiết */}
          <View className="flex-row items-center justify-between pt-2 border-t border-teal-800/80 gap-1">
            <View className="flex-1">
              <Text className="text-[10px] text-teal-300">Đang giữ cọc</Text>
              <Text className="text-xs font-bold text-white mt-0.5" numberOfLines={1}>
                {treasury.quyTamGiuCoc.toLocaleString('vi-VN')} đ
              </Text>
            </View>
            <View className="w-px h-6 bg-teal-800" />
            <View className="flex-1 px-1">
              <Text className="text-[10px] text-amber-300">Chờ duyệt rút</Text>
              <Text className="text-xs font-bold text-amber-200 mt-0.5" numberOfLines={1}>
                {treasury.quyChoRut.toLocaleString('vi-VN')} đ
              </Text>
            </View>
            <View className="w-px h-6 bg-teal-800" />
            <View className="flex-1 items-end">
              <Text className="text-[10px] text-emerald-300">Doanh thu sàn</Text>
              <Text className="text-xs font-bold text-emerald-200 mt-0.5" numberOfLines={1}>
                {treasury.tongDoanhThu.toLocaleString('vi-VN')} đ
              </Text>
            </View>
          </View>
        </Card>

        {/* Ô tìm kiếm */}
        <View className="flex-row items-center bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-full mb-2.5">
          <Ionicons name="search" size={16} color="#94A3B8" />
          <TextInput
            placeholder="Tìm theo mã GD, tên người dùng, SĐT, nội dung..."
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
