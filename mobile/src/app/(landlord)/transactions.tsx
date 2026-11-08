import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Card, Button } from 'heroui-native';
import { LandlordTransactionCard } from '../../components/landlord/LandlordTransactionCard';
import { landlordService } from '../../services/landlord.service';
import {
  LandlordTransactionItem,
  LandlordWalletInfo,
  BankAccountItem,
} from '../../types/landlord.types';
import { formatVND } from '../../utils/formatVND';

type TabType = 'ALL' | 'DA_THU' | 'RUT_TIEN' | 'HOAN_COC';

export default function TransactionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: TabType; transactionId?: string }>();
  const [tab, setTab] = useState<TabType>((params.tab as any) || 'ALL');
  const [wallet, setWallet] = useState<LandlordWalletInfo | null>(null);
  const [transactions, setTransactions] = useState<LandlordTransactionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    if (params.tab) {
      setTab(params.tab as any);
    }
  }, [params.tab]);

  // State Modal Rút tiền
  const [withdrawModalVisible, setWithdrawModalVisible] = useState<boolean>(false);
  const [selectedBankIndex, setSelectedBankIndex] = useState<number>(0);
  const [useCustomBank, setUseCustomBank] = useState<boolean>(false);
  const [tenNganHang, setTenNganHang] = useState<string>('');
  const [soTaiKhoan, setSoTaiKhoan] = useState<string>('');
  const [soTienRut, setSoTienRut] = useState<string>('');
  const [ghiChuRut, setGhiChuRut] = useState<string>('');
  const [submittingWithdraw, setSubmittingWithdraw] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      const [walletRes, txList] = await Promise.all([
        landlordService.getWalletInfo(),
        landlordService.getTransactions(),
      ]);
      setWallet(walletRes);
      setTransactions(txList);

      // Nếu có tài khoản ngân hàng liên kết, tự động chọn tài khoản đầu tiên
      if (walletRes?.dsTaiKhoanNganHang && walletRes.dsTaiKhoanNganHang.length > 0) {
        setUseCustomBank(false);
        setSelectedBankIndex(0);
      } else {
        setUseCustomBank(true);
      }
    } catch (error) {
      console.error('Lỗi tải dữ liệu ví & giao dịch:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Lọc danh sách giao dịch theo Tab & Ưu tiên TransactionId nếu có
  const filteredTransactions = transactions.filter((tx) => {
    if (params.transactionId && tx.id === params.transactionId) return true;
    if (tab === 'ALL') return true;
    return tx.loaiGiaoDich === tab;
  });

  // Mở modal rút tiền
  const handleOpenWithdrawModal = () => {
    const currentBalance = wallet?.soDu ?? 0;
    if (currentBalance < 50000) {
      Alert.alert(
        'Số dư không đủ',
        `Số dư khả dụng hiện tại (${formatVND(currentBalance)}) nhỏ hơn hạn mức rút tối thiểu (${formatVND(50000)}).`
      );
      return;
    }

    setSoTienRut('');
    setGhiChuRut('');
    if (wallet?.dsTaiKhoanNganHang && wallet.dsTaiKhoanNganHang.length > 0) {
      setUseCustomBank(false);
      setSelectedBankIndex(0);
    } else {
      setUseCustomBank(true);
    }
    setWithdrawModalVisible(true);
  };

  // Chọn nhanh số tiền rút
  const handleSelectQuickAmount = (amount: number) => {
    setSoTienRut(String(amount));
  };

  // Rút toàn bộ số dư
  const handleWithdrawAll = () => {
    if (wallet?.soDu) {
      setSoTienRut(String(wallet.soDu));
    }
  };

  // Gửi yêu cầu rút tiền
  const handleSubmitWithdraw = async () => {
    const amountNum = Number(soTienRut.replace(/\D/g, ''));
    const currentBalance = wallet?.soDu ?? 0;

    if (!amountNum || amountNum < 50000) {
      Alert.alert('Lỗi nhập liệu', 'Số tiền rút tối thiểu là 50.000 đ.');
      return;
    }

    if (amountNum > currentBalance) {
      Alert.alert(
        'Vượt quá số dư',
        `Số tiền yêu cầu (${formatVND(amountNum)}) vượt quá số dư khả dụng (${formatVND(currentBalance)}).`
      );
      return;
    }

    let finalBankName = '';
    let finalAccountNumber = '';

    if (!useCustomBank && wallet?.dsTaiKhoanNganHang && wallet.dsTaiKhoanNganHang.length > 0) {
      const selected = wallet.dsTaiKhoanNganHang[selectedBankIndex];
      finalBankName = selected.tenNganHang;
      finalAccountNumber = selected.soTaiKhoan;
    } else {
      finalBankName = tenNganHang.trim();
      finalAccountNumber = soTaiKhoan.trim();
    }

    if (!finalBankName) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên ngân hàng nhận tiền.');
      return;
    }

    if (!finalAccountNumber || !/^\d{6,20}$/.test(finalAccountNumber)) {
      Alert.alert('Số tài khoản không hợp lệ', 'Số tài khoản ngân hàng phải gồm từ 6 đến 20 chữ số.');
      return;
    }

    try {
      setSubmittingWithdraw(true);
      await landlordService.withdrawMoney({
        soTien: amountNum,
        tenNganHang: finalBankName,
        soTaiKhoan: finalAccountNumber,
        ghiChu: ghiChuRut.trim() || undefined,
      });

      Alert.alert(
        'Tạo yêu cầu thành công',
        `Yêu cầu rút ${formatVND(amountNum)} về ngân hàng ${finalBankName} đã được ghi nhận. Ban quản trị sẽ xử lý trong vòng 24 giờ làm việc.`,
        [
          {
            text: 'Đồng ý',
            onPress: () => {
              setWithdrawModalVisible(false);
              loadData();
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Rút tiền thất bại', err?.message || 'Có lỗi xảy ra, vui lòng thử lại sau.');
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'DA_THU', label: 'Đã thu' },
    { key: 'RUT_TIEN', label: 'Rút tiền' },
    { key: 'HOAN_COC', label: 'Hoàn cọc' },
  ];

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-slate-50" edges={['top']}>
      {/* 1. Header */}
      <View className="px-4 py-3.5 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Pressable onPress={() => router.back()} className="p-1 -ml-1">
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </Pressable>
          <Text className="text-lg font-bold text-gray-900">Ví & Giao dịch</Text>
        </View>
        <Pressable onPress={onRefresh} className="p-1">
          <Ionicons name="refresh-outline" size={20} color="#475569" />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0f766e']} />
        }
      >
        {/* 2. Thẻ Quản Lý Ví Chủ Trọ */}
        <View className="p-4">
          <View className="bg-teal-900 rounded-3xl p-5 shadow-lg border border-teal-800">
            {/* Hàng trên: Tiêu đề ví & Điểm uy tín */}
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-full bg-teal-800/80 items-center justify-center">
                  <Ionicons name="wallet-outline" size={17} color="#2dd4bf" />
                </View>
                <Text className="text-xs font-medium text-teal-200">Ví chủ trọ</Text>
              </View>

              <View className="flex-row items-center gap-1 bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
                <Ionicons name="shield-checkmark" size={13} color="#facc15" />
                <Text className="text-[11px] font-bold text-yellow-300">
                  {wallet?.diemUyTin ?? 100}/100 uy tín
                </Text>
              </View>
            </View>

            {/* Số dư khả dụng */}
            <View className="mb-4">
              <Text className="text-xs text-teal-300 mb-1">Số dư khả dụng</Text>
              <Text className="text-3xl font-extrabold text-white tracking-tight">
                {formatVND(wallet?.soDu, false)}{' '}
                <Text className="text-lg font-bold text-teal-300">đ</Text>
              </Text>
            </View>

            {/* Thống kê dòng tiền phụ */}
            <View className="flex-row items-center justify-between pt-3 border-t border-teal-800/70 mb-4">
              <View>
                <Text className="text-[11px] text-teal-300">Tổng đã thu</Text>
                <Text className="text-xs font-bold text-white mt-0.5">
                  +{formatVND(wallet?.tongDaThu)}
                </Text>
              </View>
              <View className="h-6 w-[1px] bg-teal-800" />
              <View>
                <Text className="text-[11px] text-teal-300">Đã rút về NH</Text>
                <Text className="text-xs font-bold text-rose-300 mt-0.5">
                  -{formatVND(wallet?.tongDaRut)}
                </Text>
              </View>
            </View>

            {/* Nút hành động Rút tiền */}
            <Pressable
              onPress={handleOpenWithdrawModal}
              className="w-full bg-emerald-500 active:bg-emerald-600 rounded-2xl py-3 flex-row items-center justify-center gap-2 shadow-sm"
            >
              <Ionicons name="arrow-up-circle-outline" size={18} color="white" />
              <Text className="text-sm font-bold text-white">Yêu cầu rút tiền</Text>
            </Pressable>
          </View>
        </View>

        {/* 3. Thanh Lọc Tabs */}
        <View className="px-4 mb-2">
          <View className="flex-row bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
            {tabs.map((t) => {
              const isActive = tab === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  className={`flex-1 py-2 rounded-xl items-center justify-center ${
                    isActive ? 'bg-teal-700 shadow-sm' : ''
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      isActive ? 'text-white' : 'text-gray-500'
                    }`}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 4. Danh Sách Giao Dịch */}
        <View className="px-4 pt-2">
          {loading ? (
            <View className="py-12 items-center justify-center">
              <ActivityIndicator size="small" color="#0f766e" />
              <Text className="text-xs text-gray-400 mt-2">Đang tải lịch sử giao dịch...</Text>
            </View>
          ) : filteredTransactions.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center justify-center border border-gray-100 my-2">
              <View className="w-14 h-14 rounded-full bg-gray-50 items-center justify-center mb-3">
                <Ionicons name="receipt-outline" size={28} color="#94a3b8" />
              </View>
              <Text className="text-sm font-bold text-gray-700 mb-1">Chưa có giao dịch</Text>
              <Text className="text-xs text-gray-400 text-center">
                Hiện chưa phát sinh giao dịch nào trong danh mục này.
              </Text>
            </View>
          ) : (
            filteredTransactions.map((tx) => (
              <LandlordTransactionCard key={tx.id} transaction={tx} />
            ))
          )}
        </View>
      </ScrollView>

      {/* 5. Modal Yêu Cầu Rút Tiền */}
      <Modal
        visible={withdrawModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setWithdrawModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl p-5 shadow-2xl max-h-[90%]">
            {/* Header Modal */}
            <View className="flex-row items-center justify-between pb-3 border-b border-gray-100">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-full bg-teal-100 items-center justify-center">
                  <Ionicons name="cash-outline" size={18} color="#0f766e" />
                </View>
                <Text className="text-base font-bold text-gray-900">Rút tiền về ngân hàng</Text>
              </View>
              <Pressable
                onPress={() => setWithdrawModalVisible(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#64748b" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="pt-3">
              {/* Số dư khả dụng hiện tại */}
              <View className="bg-teal-50 border border-teal-100 rounded-2xl p-3.5 mb-4 flex-row items-center justify-between">
                <View>
                  <Text className="text-[11px] text-teal-700 font-medium">Số dư khả dụng</Text>
                  <Text className="text-base font-extrabold text-teal-900 mt-0.5">
                    {formatVND(wallet?.soDu)}
                  </Text>
                </View>
                <Pressable
                  onPress={handleWithdrawAll}
                  className="bg-teal-700 px-3 py-1.5 rounded-xl"
                >
                  <Text className="text-xs font-bold text-white">Rút tất cả</Text>
                </Pressable>
              </View>

              {/* Lựa chọn tài khoản nhận tiền */}
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-bold text-gray-800">Tài khoản ngân hàng nhận</Text>
                <Pressable
                  onPress={() => {
                    setWithdrawModalVisible(false);
                    router.push('/user/bank-accounts' as any);
                  }}
                  className="flex-row items-center gap-1 active:opacity-70"
                >
                  <Ionicons name="settings-outline" size={12} color="#0f766e" />
                  <Text className="text-xs font-bold text-teal-700">Quản lý thẻ</Text>
                </Pressable>
              </View>

              {wallet?.dsTaiKhoanNganHang && wallet.dsTaiKhoanNganHang.length > 0 ? (
                <View className="mb-4 gap-2">
                  {wallet.dsTaiKhoanNganHang.map((bank: BankAccountItem, idx: number) => {
                    const isSelected = !useCustomBank && selectedBankIndex === idx;
                    return (
                      <Pressable
                        key={idx}
                        onPress={() => {
                          setUseCustomBank(false);
                          setSelectedBankIndex(idx);
                        }}
                        className={`p-3 rounded-2xl border flex-row items-center justify-between ${
                          isSelected
                            ? 'bg-teal-50 border-teal-600'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <View className="flex-row items-center gap-3">
                          <Ionicons
                            name="card"
                            size={20}
                            color={isSelected ? '#0f766e' : '#64748b'}
                          />
                          <View>
                            <Text
                              className={`text-xs font-bold ${
                                isSelected ? 'text-teal-900' : 'text-gray-800'
                              }`}
                            >
                              {bank.tenNganHang}
                            </Text>
                            <Text className="text-xs text-gray-500 font-mono">
                              {bank.soTaiKhoan}
                            </Text>
                          </View>
                        </View>
                        <Ionicons
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                          size={18}
                          color={isSelected ? '#0f766e' : '#94a3b8'}
                        />
                      </Pressable>
                    );
                  })}

                  <Pressable
                    onPress={() => setUseCustomBank(true)}
                    className={`p-3 rounded-2xl border flex-row items-center justify-between ${
                      useCustomBank
                        ? 'bg-teal-50 border-teal-600'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <View className="flex-row items-center gap-3">
                      <Ionicons
                        name="add-circle-outline"
                        size={20}
                        color={useCustomBank ? '#0f766e' : '#64748b'}
                      />
                      <Text
                        className={`text-xs font-bold ${
                          useCustomBank ? 'text-teal-900' : 'text-gray-700'
                        }`}
                      >
                        Nhập tài khoản ngân hàng khác
                      </Text>
                    </View>
                    <Ionicons
                      name={useCustomBank ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={useCustomBank ? '#0f766e' : '#94a3b8'}
                    />
                  </Pressable>
                </View>
              ) : null}

              {/* Form nhập tài khoản ngân hàng thủ công */}
              {useCustomBank && (
                <View className="mb-4 bg-gray-50 p-3.5 rounded-2xl border border-gray-200 gap-3">
                  <View>
                    <Text className="text-[11px] font-semibold text-gray-600 mb-1">
                      Tên ngân hàng (VD: Vietcombank, MBBank)
                    </Text>
                    <TextInput
                      value={tenNganHang}
                      onChangeText={setTenNganHang}
                      placeholder="Nhập tên ngân hàng..."
                      className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800"
                    />
                  </View>
                  <View>
                    <Text className="text-[11px] font-semibold text-gray-600 mb-1">
                      Số tài khoản thụ hưởng
                    </Text>
                    <TextInput
                      value={soTaiKhoan}
                      onChangeText={setSoTaiKhoan}
                      keyboardType="number-pad"
                      placeholder="Nhập số tài khoản..."
                      className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 font-mono"
                    />
                  </View>
                </View>
              )}

              {/* Nhập số tiền rút */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-gray-800 mb-1">
                  Số tiền muốn rút (VNĐ) <Text className="text-rose-500">*</Text>
                </Text>
                <TextInput
                  value={soTienRut}
                  onChangeText={(val) => setSoTienRut(val.replace(/\D/g, ''))}
                  placeholder="Tối thiểu 50.000 đ"
                  keyboardType="numeric"
                  className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 text-base font-bold text-gray-900 mb-2"
                />

                {/* Phím bấm chọn nhanh số tiền */}
                <View className="flex-row gap-2">
                  {[100000, 200000, 500000].map((amt) => (
                    <Pressable
                      key={amt}
                      onPress={() => handleSelectQuickAmount(amt)}
                      className="flex-1 py-1.5 bg-gray-100 rounded-xl items-center border border-gray-200 active:bg-gray-200"
                    >
                      <Text className="text-[11px] font-semibold text-gray-700">
                        {formatVND(amt, false)}
                      </Text>
                    </Pressable>
                  ))}
                  <Pressable
                    onPress={handleWithdrawAll}
                    className="flex-1 py-1.5 bg-teal-50 rounded-xl items-center border border-teal-200 active:bg-teal-100"
                  >
                    <Text className="text-[11px] font-bold text-teal-700">Tất cả</Text>
                  </Pressable>
                </View>
              </View>

              {/* Ghi chú */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-gray-800 mb-1">Ghi chú (Tùy chọn)</Text>
                <TextInput
                  value={ghiChuRut}
                  onChangeText={setGhiChuRut}
                  placeholder="Ghi chú thêm cho quản trị viên..."
                  className="bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2.5 text-xs text-gray-800"
                />
              </View>

              {/* Thông báo điều khoản */}
              <View className="bg-amber-50 p-3 rounded-2xl border border-amber-200 mb-5 flex-row gap-2">
                <Ionicons name="information-circle" size={18} color="#d97706" />
                <Text className="text-[11px] text-amber-900 flex-1 leading-4">
                  Hạn mức rút tối thiểu là 50.000 đ. Sau khi tạo yêu cầu, hệ thống sẽ tạm khóa số dư tương ứng và ban quản trị sẽ giải ngân về tài khoản của bạn trong vòng 24 giờ làm việc.
                </Text>
              </View>

              {/* Nút gửi yêu cầu */}
              <View className="flex-row gap-3 pb-6">
                <View className="flex-1">
                  <Button
                    variant="outline"
                    size="md"
                    onPress={() => setWithdrawModalVisible(false)}
                    className="w-full border-gray-200 py-3 rounded-2xl"
                  >
                    <Button.Label className="text-gray-600 text-xs font-bold">Hủy bỏ</Button.Label>
                  </Button>
                </View>

                <View className="flex-1">
                  <Button
                    variant="primary"
                    size="md"
                    isDisabled={submittingWithdraw}
                    onPress={handleSubmitWithdraw}
                    className="w-full bg-teal-700 py-3 rounded-2xl"
                  >
                    <Button.Label className="text-white text-xs font-bold">
                      {submittingWithdraw ? 'Đang gửi...' : 'Xác nhận rút tiền'}
                    </Button.Label>
                  </Button>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
