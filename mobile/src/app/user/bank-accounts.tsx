import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card, Button } from 'heroui-native';
import { landlordService } from '../../services/landlord.service';
import { BankAccountItem } from '../../types/landlord.types';

const POPULAR_BANKS = [
  'Vietcombank',
  'MBBank',
  'Techcombank',
  'BIDV',
  'VietinBank',
  'ACB',
  'TPBank',
  'VPBank',
  'Agribank',
  'Sacombank',
];

export default function BankAccountsScreen() {
  const router = useRouter();
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Modal thêm ngân hàng
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedBank, setSelectedBank] = useState<string>(POPULAR_BANKS[0]);
  const [customBankName, setCustomBankName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const loadBankAccounts = useCallback(async () => {
    try {
      const list = await landlordService.getMyBankAccounts();
      setBankAccounts(list);
    } catch (e: any) {
      console.log('Lỗi tải danh sách ngân hàng:', e);
      setBankAccounts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBankAccounts();
  }, [loadBankAccounts]);

  const onRefresh = () => {
    setRefreshing(true);
    loadBankAccounts();
  };

  const handleAddAccount = async () => {
    const bankName = customBankName.trim() || selectedBank;
    const accNum = accountNumber.trim();

    if (!bankName) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn hoặc nhập tên ngân hàng.');
      return;
    }
    if (!accNum || !/^\d{6,20}$/.test(accNum)) {
      Alert.alert('Số tài khoản không hợp lệ', 'Số tài khoản ngân hàng phải gồm từ 6 đến 20 chữ số.');
      return;
    }

    setSubmitting(true);
    try {
      await landlordService.addBankAccount({
        tenNganHang: bankName,
        soTaiKhoan: accNum,
      });

      Alert.alert('Thành công', 'Đã liên kết tài khoản ngân hàng thành công!');
      setModalVisible(false);
      setAccountNumber('');
      setCustomBankName('');
      loadBankAccounts();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể liên kết tài khoản này.';
      Alert.alert('Thất bại', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAccount = (acc: BankAccountItem) => {
    if (!acc.id) {
      Alert.alert('Thông báo', 'Không thể xóa tài khoản này lúc này.');
      return;
    }

    Alert.alert(
      'Hủy liên kết tài khoản',
      `Bạn có chắc chắn muốn hủy liên kết tài khoản ${acc.tenNganHang} (${acc.soTaiKhoan})?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa liên kết',
          style: 'destructive',
          onPress: async () => {
            try {
              await landlordService.deleteBankAccount(acc.id!);
              Alert.alert('Thành công', 'Đã xóa tài khoản ngân hàng.');
              loadBankAccounts();
            } catch (err: any) {
              Alert.alert('Lỗi', err?.response?.data?.message || err?.message || 'Không thể xóa lúc này.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-slate-50" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3.5 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Pressable onPress={() => router.back()} className="p-1 -ml-1 active:opacity-70">
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <Text className="text-lg font-bold text-gray-900">Tài khoản ngân hàng</Text>
        </View>

        <Pressable
          onPress={() => setModalVisible(true)}
          className="flex-row items-center gap-1 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-full active:opacity-70"
        >
          <Ionicons name="add" size={16} color="#0f766e" />
          <Text className="text-xs font-bold text-teal-800">Thêm thẻ</Text>
        </Pressable>
      </View>

      {/* Danh sách thẻ */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0f766e" />
          <Text className="text-xs text-gray-400 mt-2">Đang tải danh sách ngân hàng...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          className="px-4 py-4"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0f766e']} />
          }
        >
          {bankAccounts.length === 0 ? (
            <View className="flex-1 items-center justify-center py-20">
              <View className="w-16 h-16 rounded-full bg-teal-50 items-center justify-center mb-3">
                <Ionicons name="card-outline" size={32} color="#0f766e" />
              </View>
              <Text className="text-sm font-bold text-gray-800">Chưa liên kết tài khoản ngân hàng</Text>
              <Text className="text-xs text-gray-400 text-center mt-1 mb-4 max-w-xs">
                Liên kết tài khoản ngân hàng chính chủ giúp bạn rút số dư ví về tài khoản nhanh chóng và an toàn.
              </Text>
              <Button
                variant="primary"
                onPress={() => setModalVisible(true)}
                className="bg-teal-700 px-5 py-2.5 rounded-xl"
              >
                <Button.Label className="text-white font-bold text-xs">
                  Thêm tài khoản ngay
                </Button.Label>
              </Button>
            </View>
          ) : (
            <View className="gap-3">
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Tài khoản đã liên kết ({bankAccounts.length})
              </Text>

              {bankAccounts.map((acc, index) => (
                <Card
                  key={acc.id || index}
                  className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3 flex-1 pr-2">
                      <View className="w-11 h-11 rounded-2xl bg-teal-700 items-center justify-center shadow-xs">
                        <Ionicons name="card" size={20} color="#FFFFFF" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-gray-900">{acc.tenNganHang}</Text>
                        <Text className="text-sm font-bold text-teal-800 tracking-wider font-mono mt-0.5">
                          {acc.soTaiKhoan}
                        </Text>
                        <Text className="text-[10px] text-gray-400 mt-0.5">Tài khoản nhận tiền rút</Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => handleDeleteAccount(acc)}
                      className="p-2 rounded-xl bg-rose-50 border border-rose-100 active:bg-rose-100"
                    >
                      <Ionicons name="trash-outline" size={16} color="#e11d48" />
                    </Pressable>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Modal Thêm Tài Khoản Ngân Hàng Mới */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl p-5 shadow-2xl max-h-[85%]">
            {/* Header Modal */}
            <View className="flex-row items-center justify-between pb-3 border-b border-gray-100">
              <View>
                <Text className="text-base font-bold text-gray-900">Liên kết tài khoản ngân hàng</Text>
                <Text className="text-xs text-gray-400">Dùng để nhận tiền rút từ ví hệ thống</Text>
              </View>
              <Pressable onPress={() => setModalVisible(false)} className="p-1">
                <Ionicons name="close" size={22} color="#64748b" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="py-3">
              {/* Chọn ngân hàng phổ biến */}
              <Text className="text-xs font-bold text-gray-800 mb-2">Chọn ngân hàng thụ hưởng *</Text>
              <View className="flex-row flex-wrap gap-2 mb-3">
                {POPULAR_BANKS.map((b) => {
                  const isSelected = selectedBank === b && !customBankName;
                  return (
                    <Pressable
                      key={b}
                      onPress={() => {
                        setSelectedBank(b);
                        setCustomBankName('');
                      }}
                      className={`px-3 py-1.5 rounded-xl border ${
                        isSelected
                          ? 'bg-teal-700 border-teal-700'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          isSelected ? 'text-white' : 'text-gray-700'
                        }`}
                      >
                        {b}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Nhập ngân hàng khác */}
              <Text className="text-xs font-bold text-gray-800 mb-1">Hoặc tên ngân hàng khác</Text>
              <TextInput
                value={customBankName}
                onChangeText={(text) => {
                  setCustomBankName(text);
                  if (text) setSelectedBank('');
                }}
                placeholder="VD: OCB, Shinhan Bank, KienlongBank..."
                placeholderTextColor="#9ca3af"
                className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 bg-gray-50 mb-3"
              />

              {/* Số tài khoản */}
              <Text className="text-xs font-bold text-gray-800 mb-1">Số tài khoản ngân hàng *</Text>
              <TextInput
                value={accountNumber}
                onChangeText={setAccountNumber}
                keyboardType="number-pad"
                placeholder="Nhập dãy từ 6 đến 20 chữ số..."
                placeholderTextColor="#9ca3af"
                className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 font-mono bg-gray-50 mb-4"
              />
            </ScrollView>

            {/* Nút lưu */}
            <View className="pt-2 border-t border-gray-100 flex-row gap-2.5">
              <View className="flex-1">
                <Button
                  variant="outline"
                  onPress={() => setModalVisible(false)}
                  className="w-full border-gray-200 py-2.5 rounded-xl"
                >
                  <Button.Label className="text-gray-700 font-semibold text-xs">Hủy</Button.Label>
                </Button>
              </View>

              <View className="flex-1">
                <Button
                  variant="primary"
                  onPress={handleAddAccount}
                  isDisabled={submitting}
                  className="w-full bg-teal-700 py-2.5 rounded-xl"
                >
                  <Button.Label className="text-white font-bold text-xs">
                    {submitting ? 'Đang liên kết...' : 'Xác nhận liên kết'}
                  </Button.Label>
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
