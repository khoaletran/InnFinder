import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
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
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransactions = async (keyword: string) => {
    try {
      setLoading(true);
      const list = await adminService.getTransactions(keyword);
      setTransactions(list);
    } catch (e) {
      console.warn('Lỗi tải danh sách giao dịch:', e);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    adminService.getTreasuryStats().then(setTreasury);
  }, []);

  // Debounce 400ms khi gõ tìm kiếm thông tin người dùng / mã giao dịch
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransactions(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      adminService.getTreasuryStats().then(setTreasury),
      fetchTransactions(search),
    ]);
    setRefreshing(false);
  };

  const isSearching = Boolean(search.trim());

  const filtered = transactions.filter((t) => {
    const loai = (t.loaiGiaoDich || '').toUpperCase();
    if (activeTab === 'Rút tiền' && !loai.includes('RUT_TIEN')) return false;
    if (activeTab === 'Cọc giữ chỗ' && !loai.includes('COC_') && !loai.includes('GIU_CHO')) return false;
    if (activeTab === 'Hoàn cọc' && !loai.includes('HOAN_COC') && !loai.includes('HOAN_TIEN')) return false;
    return true;
  });

  return (
    <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-slate-200/80">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-1 mr-2">
            <Text className="text-xl font-bold text-slate-900">Quản lý giao dịch</Text>
            <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
              {isSearching
                ? `Tra cứu lịch sử của: "${search.trim()}"`
                : 'Danh sách giao dịch hệ thống'}
            </Text>
          </View>

          {isSearching ? (
            <View className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200">
              <Text className="text-xs font-bold text-teal-700">{filtered.length} kết quả</Text>
            </View>
          ) : treasury.soLenhRutChoDuyet > 0 ? (
            <View className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200">
              <Text className="text-xs font-bold text-amber-700">
                {treasury.soLenhRutChoDuyet} lệnh rút chờ duyệt
              </Text>
            </View>
          ) : (
            <View className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">
              <Text className="text-xs font-bold text-slate-600">{filtered.length} chờ xử lý</Text>
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

        {/* Ô tìm kiếm thông tin người dùng */}
        <View className="flex-row items-center bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-full mb-2">
          <Ionicons name="search" size={16} color="#94A3B8" />
          <TextInput
            placeholder="Tra cứu: SĐT, Email, Tên, CCCD, Mã ND, Mã GD…"
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            className="flex-1 ml-2 text-xs text-slate-900 py-0"
            autoComplete="off"
            spellCheck={false}
          />
          {search ? (
            <Pressable
              onPress={() => setSearch('')}
              accessibilityLabel="Xóa nội dung tìm kiếm"
            >
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </Pressable>
          ) : null}
        </View>

        {/* Banner kết quả tìm kiếm (chỉ hiện khi đang tra cứu) */}
        {isSearching && (
          <View className="flex-row items-center justify-between px-3 py-1.5 bg-teal-50 border border-teal-200/80 rounded-xl mb-2">
            <View className="flex-row items-center gap-1.5 flex-1 mr-2">
              <Ionicons name="search-outline" size={14} color="#0D9488" />
              <Text className="text-[11px] text-teal-800" numberOfLines={1}>
                Đang hiển thị toàn bộ giao dịch của: <Text className="font-bold">{search.trim()}</Text>
              </Text>
            </View>
            <Pressable onPress={() => setSearch('')} accessibilityLabel="Quay lại danh sách chờ xử lý">
              <Text className="text-[11px] font-semibold text-teal-700 underline">Quay lại</Text>
            </Pressable>
          </View>
        )}

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
        {loading && !refreshing ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="small" color="#0D9488" />
            <Text className="text-xs text-slate-400 mt-2">Đang tải dữ liệu giao dịch…</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View className="items-center justify-center py-16">
            <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
              <Ionicons name="receipt-outline" size={32} color="#94A3B8" />
            </View>
            <Text className="text-sm font-semibold text-slate-600">
              {isSearching ? 'Không tìm thấy giao dịch nào' : 'Không có giao dịch chờ xử lý'}
            </Text>
            <Text className="text-xs text-slate-400 mt-1 text-center px-6 leading-5">
              {isSearching
                ? `Không có giao dịch nào khớp với thông tin "${search.trim()}". Bạn có thể thử tìm bằng Số điện thoại, Email, Tên đăng nhập, CCCD hoặc Mã GD.`
                : 'Hiện tại hệ thống không có giao dịch nào đang ở trạng thái chờ duyệt hoặc cần can thiệp.'}
            </Text>
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
