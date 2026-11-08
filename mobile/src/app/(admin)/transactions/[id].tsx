import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from 'heroui-native';
import { adminService } from '../../../services/admin.service';
import { AdminTransactionItem, AdminTreasuryStats } from '../../../types/admin.types';

export default function AdminTransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [transaction, setTransaction] = useState<AdminTransactionItem | null>(null);
  const [treasury, setTreasury] = useState<AdminTreasuryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [tx, stats] = await Promise.all([
        adminService.getTransactionById(id),
        adminService.getTreasuryStats(),
      ]);
      setTransaction(tx || null);
      setTreasury(stats);
    } catch {
      setTransaction(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) {
    return (
      <View style={{ flex: 1 }} className="pt-safe bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0D9488" />
        <Text className="text-slate-500 mt-3 font-medium text-sm">Đang tải chi tiết giao dịch...</Text>
      </View>
    );
  }

  if (!transaction) {
    return (
      <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-slate-200/80">
          <Pressable
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
          >
            <Ionicons name="chevron-back" size={20} color="#0F172A" />
          </Pressable>
          <Text className="text-base font-bold text-slate-900 ml-2.5">Chi tiết giao dịch</Text>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
            <Ionicons name="receipt-outline" size={32} color="#94A3B8" />
          </View>
          <Text className="text-slate-700 font-bold text-base mb-1">Không tìm thấy giao dịch</Text>
          <Text className="text-slate-400 text-xs text-center mb-4">
            Giao dịch không tồn tại hoặc đã được xử lý.
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="px-5 py-2.5 bg-teal-600 rounded-xl active:bg-teal-700"
          >
            <Text className="text-white font-semibold text-xs">Quay lại danh sách</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isSuccess = transaction.trangThai === 'THANH_CONG';
  const isFailed = transaction.trangThai === 'THAT_BAI';
  const isPending =
    transaction.trangThai === 'CHO_THANH_TOAN' || transaction.trangThai === 'DANG_XU_LY';
  const isWithdraw = (transaction.loaiGiaoDich || '').toUpperCase().includes('RUT_TIEN');

  const tongQuyHienTai = treasury?.tongQuyHeThong || 0;
  const soTienRut = transaction.soTien || 0;
  const quyConLai = tongQuyHienTai - soTienRut;
  const isTreasurySufficient = tongQuyHienTai >= soTienRut;

  const handleApprove = () => {
    if (!isTreasurySufficient) {
      Alert.alert(
        'Không đủ ngân khố',
        'Kho tiền hệ thống hiện tại không đủ số dư để giải ngân yêu cầu rút tiền này!'
      );
      return;
    }

    Alert.alert(
      'Xác nhận duyệt chuyển tiền',
      `Bạn xác nhận giải ngân ${soTienRut.toLocaleString('vi-VN')} đ cho người dùng?\nQuỹ sàn còn lại: ${quyConLai.toLocaleString('vi-VN')} đ.`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Duyệt chuyển tiền',
          onPress: async () => {
            if (!id) return;
            setActionLoading(true);
            const res = await adminService.approveTransaction(id);
            setActionLoading(false);
            if (res.success) {
              Alert.alert('Thành công', 'Đã duyệt yêu cầu rút tiền thành công.');
              router.back();
            } else {
              Alert.alert('Không thể duyệt', res.message || 'Lỗi xử lý giao dịch');
              loadData();
            }
          },
        },
      ]
    );
  };

  const handleReject = () => {
    Alert.alert(
      'Từ chối yêu cầu rút tiền',
      'Số tiền này sẽ được hoàn trả lại đầy đủ vào ví của Chủ trọ. Bạn có chắc chắn muốn từ chối?',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Từ chối rút tiền',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            setActionLoading(true);
            const res = await adminService.rejectTransaction(
              id,
              'Thông tin tài khoản nhận tiền không chính xác'
            );
            setActionLoading(false);
            if (res.success) {
              Alert.alert('Đã từ chối', 'Đã từ chối yêu cầu và hoàn lại số dư vào ví cho người dùng.');
              router.back();
            } else {
              Alert.alert('Lỗi', res.message || 'Không thể từ chối giao dịch');
              loadData();
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
      {/* Header chuẩn stack */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200/80">
        <View className="flex-row items-center gap-2.5">
          <Pressable
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
          >
            <Ionicons name="chevron-back" size={20} color="#0F172A" />
          </Pressable>
          <Text className="text-base font-bold text-slate-900">Chi tiết giao dịch</Text>
        </View>

        <View
          className={`px-3 py-1 rounded-full ${
            isSuccess
              ? 'bg-emerald-50 border border-emerald-200'
              : isFailed
              ? 'bg-rose-50 border border-rose-200'
              : 'bg-amber-50 border border-amber-200'
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              isSuccess
                ? 'text-emerald-700'
                : isFailed
                ? 'text-rose-700'
                : 'text-amber-700'
            }`}
          >
            {isSuccess ? 'Thành công' : isFailed ? 'Đã từ chối' : 'Chờ phê duyệt'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Số tiền lớn */}
        <View className="items-center py-6 bg-white rounded-2xl border border-slate-200/90 mb-4 shadow-xs">
          <Text className="text-xs font-semibold text-slate-400 mb-1">
            {isWithdraw ? 'Số tiền yêu cầu rút về ngân hàng' : 'Số tiền biến động giao dịch'}
          </Text>
          <Text className="text-3xl font-black text-teal-600">
            {transaction.soTien.toLocaleString('vi-VN')} đ
          </Text>
          <Text className="text-[11px] text-slate-400 mt-2 font-mono">
            Mã tham chiếu: {transaction.maGiaoDich}
          </Text>
        </View>

        {/* THẺ ĐỐI SOÁT NGÂN KHỐ (KHI LÀ LỆNH RÚT ĐANG CHỜ DUYỆT) */}
        {isWithdraw && isPending && (
          <Card className="bg-slate-900 rounded-2xl p-4 mb-4 border border-slate-800 shadow-sm">
            <View className="flex-row items-center justify-between pb-2.5 border-b border-slate-800">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="calculator" size={16} color="#2DD4BF" />
                <Text className="text-xs font-bold text-teal-300 uppercase">
                  Kiểm soát ngân khố giải ngân
                </Text>
              </View>
              <Text className="text-[10px] text-slate-400">Chống giải ngân vượt quỹ</Text>
            </View>

            <View className="py-2.5 space-y-1.5">
              <View className="flex-row justify-between py-1">
                <Text className="text-xs text-slate-400">Kho tiền hiện tại của Sàn:</Text>
                <Text className="text-xs font-bold text-white">
                  {tongQuyHienTai.toLocaleString('vi-VN')} đ
                </Text>
              </View>

              <View className="flex-row justify-between py-1">
                <Text className="text-xs text-rose-400">Số tiền duyệt rút:</Text>
                <Text className="text-xs font-bold text-rose-400">
                  - {soTienRut.toLocaleString('vi-VN')} đ
                </Text>
              </View>

              <View className="flex-row justify-between py-2 border-t border-slate-800">
                <Text className="text-xs font-bold text-teal-300">Quỹ Sàn còn lại sau duyệt:</Text>
                <Text
                  className={`text-sm font-black ${
                    isTreasurySufficient ? 'text-teal-400' : 'text-rose-500'
                  }`}
                >
                  {quyConLai.toLocaleString('vi-VN')} đ
                </Text>
              </View>
            </View>

            {!isTreasurySufficient && (
              <View className="bg-rose-950/80 p-2.5 rounded-xl border border-rose-800 flex-row gap-2 mt-1">
                <Ionicons name="warning" size={16} color="#FB7185" />
                <Text className="text-[11px] text-rose-300 flex-1 leading-4">
                  Cảnh báo: Kho tiền không đủ để giải ngân! Không thể phê duyệt giao dịch này.
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Thông tin giao dịch */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Thông tin chứng từ & Thời gian</Text>
        <Card className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-4 divide-y divide-slate-100 shadow-xs">
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Mã giao dịch</Text>
            <Text className="text-xs font-bold text-slate-800 font-mono">{transaction.maGiaoDich}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Thời điểm giao dịch</Text>
            <Text className="text-xs font-medium text-slate-800">{transaction.thoiGian}</Text>
          </View>
          <View className="flex-row justify-between py-2.5">
            <Text className="text-xs text-slate-500 font-medium">Loại hình giao dịch</Text>
            <Text className="text-xs font-semibold text-teal-700">
              {isWithdraw ? 'Yêu cầu rút tiền về ngân hàng' : transaction.loaiGiaoDich}
            </Text>
          </View>
          {transaction.ghiChu ? (
            <View className="py-2.5">
              <Text className="text-xs text-slate-500 font-medium mb-1">Chi tiết / Diễn giải</Text>
              <Text className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg leading-relaxed">
                {transaction.ghiChu}
              </Text>
            </View>
          ) : null}
        </Card>

        {/* Thông tin ngân hàng nhận tiền (nếu là rút tiền) */}
        {isWithdraw && (
          <>
            <Text className="text-sm font-bold text-slate-900 mb-2">Thông tin tài khoản nhận tiền</Text>
            <Card className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-4 divide-y divide-slate-100 shadow-xs">
              <View className="flex-row justify-between py-2.5">
                <Text className="text-xs text-slate-500 font-medium">Người yêu cầu rút</Text>
                <Text className="text-xs font-bold text-slate-800">{transaction.nguoiThucHien}</Text>
              </View>
              {transaction.sdtNguoiThucHien ? (
                <View className="flex-row justify-between py-2.5">
                  <Text className="text-xs text-slate-500 font-medium">Số điện thoại liên hệ</Text>
                  <Text className="text-xs font-semibold text-teal-700">{transaction.sdtNguoiThucHien}</Text>
                </View>
              ) : null}
              <View className="flex-row justify-between py-2.5">
                <Text className="text-xs text-slate-500 font-medium">Ngân hàng thụ hưởng</Text>
                <Text className="text-xs font-bold text-teal-700">
                  {transaction.tenNganHang || 'Ngân hàng thụ hưởng'}
                </Text>
              </View>
              <View className="flex-row justify-between py-2.5">
                <Text className="text-xs text-slate-500 font-medium">Số tài khoản ngân hàng</Text>
                <Text className="text-xs font-bold text-slate-800 font-mono">
                  {transaction.soTaiKhoan || 'Chưa cung cấp'}
                </Text>
              </View>
            </Card>

            {isPending && (
              <View className="flex-row gap-3 pt-2">
                <Pressable
                  disabled={actionLoading}
                  onPress={handleReject}
                  className="flex-1 py-3.5 rounded-xl border border-rose-200 bg-rose-50 items-center justify-center active:opacity-80"
                >
                  <Text className="text-sm font-bold text-rose-600">
                    {actionLoading ? 'Đang xử lý...' : 'Từ chối rút tiền'}
                  </Text>
                </Pressable>
                <Pressable
                  disabled={actionLoading || !isTreasurySufficient}
                  onPress={handleApprove}
                  className={`flex-1 py-3.5 rounded-xl items-center justify-center ${
                    isTreasurySufficient ? 'bg-teal-600 active:bg-teal-700' : 'bg-slate-300'
                  }`}
                >
                  <Text className="text-sm font-bold text-white">
                    {actionLoading ? 'Đang duyệt...' : 'Duyệt chuyển tiền'}
                  </Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
