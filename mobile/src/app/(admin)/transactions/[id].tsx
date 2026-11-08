import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from 'heroui-native';
import { adminService } from '../../../services/admin.service';
import { AdminTransactionItem } from '../../../types/admin.types';

export default function AdminTransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [transaction, setTransaction] = useState<AdminTransactionItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      setLoading(true);
      adminService
        .getTransactionById(id)
        .then((res) => {
          setTransaction(res || null);
        })
        .catch(() => {
          setTransaction(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
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
  const isPending = transaction.trangThai === 'DANG_XU_LY';
  const isWithdraw = transaction.loaiGiaoDich === 'YEU_CAU_RUT_TIEN';

  const handleApprove = () => {
    Alert.alert('Xác nhận duyệt giao dịch', 'Bạn có chắc chắn muốn duyệt yêu cầu rút tiền này?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Duyệt chuyển tiền',
        onPress: async () => {
          if (id) {
            await adminService.approveTransaction(id);
            Alert.alert('Thành công', 'Đã duyệt yêu cầu rút tiền thành công.');
            router.back();
          }
        },
      },
    ]);
  };

  const handleReject = () => {
    Alert.alert('Từ chối giao dịch', 'Bạn có chắc chắn muốn từ chối yêu cầu giao dịch này?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Từ chối',
        style: 'destructive',
        onPress: async () => {
          if (id) {
            await adminService.rejectTransaction(id, 'Thông tin tài khoản không hợp lệ');
            Alert.alert('Đã từ chối', 'Đã từ chối yêu cầu rút tiền và hoàn lại số dư cho người dùng.');
            router.back();
          }
        },
      },
    ]);
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
            {isSuccess ? 'Thành công' : isFailed ? 'Thất bại' : 'Chờ xử lý'}
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
          <Text className="text-[11px] text-slate-400 mt-2">
            Mã tham chiếu: {transaction.maGiaoDich}
          </Text>
        </View>

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
          {transaction.phongTro ? (
            <View className="flex-row justify-between py-2.5">
              <Text className="text-xs text-slate-500 font-medium">Phòng trọ áp dụng</Text>
              <Text className="text-xs font-semibold text-slate-800 flex-1 text-right ml-4" numberOfLines={1}>
                {transaction.phongTro}
              </Text>
            </View>
          ) : null}
        </Card>

        {/* Chi tiết khấu trừ & Doanh thu sàn (Mục 2.3 AGENTS.md) */}
        {!isWithdraw ? (
          <>
            <Text className="text-sm font-bold text-slate-900 mb-2">Bản chất kinh tế & Hoa hồng hệ thống</Text>
            <Card className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-4 divide-y divide-slate-100 shadow-xs">
              <View className="flex-row justify-between py-2">
                <Text className="text-xs text-slate-500 font-medium">Tiền cọc giữ chân xem phòng (coc)</Text>
                <Text className="text-xs font-bold text-slate-800">
                  {transaction.tienCoc.toLocaleString('vi-VN')} đ
                </Text>
              </View>
              <View className="flex-row justify-between py-2">
                <Text className="text-xs text-slate-500 font-medium">Phí dịch vụ trích lại cho InnFinder (phiThu)</Text>
                <Text className="text-xs font-bold text-rose-600">
                  - {transaction.phiDichVu.toLocaleString('vi-VN')} đ
                </Text>
              </View>
              <View className="flex-row justify-between py-2.5 border-t border-slate-200">
                <Text className="text-xs font-bold text-slate-900">Chủ trọ thực nhận vào ví (coc - phiThu)</Text>
                <Text className="text-base font-black text-teal-600">
                  {transaction.thucNhan.toLocaleString('vi-VN')} đ
                </Text>
              </View>
              <View className="py-2.5">
                <View className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex-row gap-2">
                  <Ionicons name="information-circle" size={16} color="#64748B" style={{ marginTop: 1 }} />
                  <Text className="text-[11px] text-slate-600 flex-1 leading-relaxed">
                    Quy tắc bất khả xâm phạm: Doanh thu của sàn InnFinder được tính từ tổng phiThu của các phiếu đặt lịch đã HOÀN THÀNH, bảng GiaoDich chỉ đóng vai trò sổ cái dòng tiền.
                  </Text>
                </View>
              </View>
            </Card>
          </>
        ) : null}

        {/* Thông tin ngân hàng nhận tiền (nếu là rút tiền) */}
        {isWithdraw ? (
          <>
            <Text className="text-sm font-bold text-slate-900 mb-2">Thông tin tài khoản nhận tiền</Text>
            <Card className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-4 divide-y divide-slate-100 shadow-xs">
              <View className="flex-row justify-between py-2.5">
                <Text className="text-xs text-slate-500 font-medium">Người yêu cầu rút</Text>
                <Text className="text-xs font-bold text-slate-800">{transaction.nguoiThucHien}</Text>
              </View>
              <View className="flex-row justify-between py-2.5">
                <Text className="text-xs text-slate-500 font-medium">Ngân hàng thụ hưởng</Text>
                <Text className="text-xs font-bold text-teal-700">{transaction.tenNganHang || 'Vietcombank'}</Text>
              </View>
              <View className="flex-row justify-between py-2.5">
                <Text className="text-xs text-slate-500 font-medium">Số tài khoản ngân hàng</Text>
                <Text className="text-xs font-bold text-slate-800 font-mono">{transaction.soTaiKhoan || 'Chưa cung cấp'}</Text>
              </View>
              {transaction.ghiChu ? (
                <View className="py-2.5">
                  <Text className="text-xs text-slate-500 font-medium mb-1">Nội dung ghi chú chuyển khoản</Text>
                  <Text className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg font-mono">
                    {transaction.ghiChu}
                  </Text>
                </View>
              ) : null}
            </Card>

            {isPending ? (
              <View className="flex-row gap-3 pt-2">
                <Pressable
                  onPress={handleReject}
                  className="flex-1 py-3.5 rounded-xl border border-rose-200 bg-rose-50 items-center justify-center active:opacity-80"
                >
                  <Text className="text-sm font-bold text-rose-600">Từ chối rút tiền</Text>
                </Pressable>
                <Pressable
                  onPress={handleApprove}
                  className="flex-1 py-3.5 rounded-xl bg-teal-600 items-center justify-center active:bg-teal-700"
                >
                  <Text className="text-sm font-bold text-white">Duyệt chuyển tiền</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
