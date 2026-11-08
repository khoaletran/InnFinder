import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from 'heroui-native';
import { LandlordTransactionItem } from '../../types/landlord.types';
import { formatVND } from '../../utils/formatVND';

interface Props {
  transaction: LandlordTransactionItem;
}

export const LandlordTransactionCard: React.FC<Props> = ({ transaction }) => {
  const isWithdraw = transaction.loaiGiaoDich === 'RUT_TIEN';
  const isCollected = transaction.loaiGiaoDich === 'DA_THU';

  const getBadgeConfig = () => {
    if (isWithdraw) {
      const isPending = transaction.trangThai === 'CHO_THANH_TOAN';
      return {
        bg: isPending ? 'bg-amber-100' : 'bg-rose-100',
        textColor: isPending ? 'text-amber-800' : 'text-rose-700',
        label: isPending ? 'Rút tiền (Chờ duyệt)' : 'Rút tiền',
      };
    }
    if (isCollected) {
      return {
        bg: 'bg-emerald-100',
        textColor: 'text-emerald-700',
        label: 'Đã thu',
      };
    }
    return {
      bg: 'bg-gray-100',
      textColor: 'text-gray-600',
      label: 'Hoàn cọc',
    };
  };

  const badge = getBadgeConfig();

  return (
    <Card className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm mb-3">
      {/* Mã GD & Badge */}
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xs text-gray-400 font-medium">
          Mã: {transaction.maGiaoDich}
        </Text>
        <View className={`px-2.5 py-0.5 rounded-full ${badge.bg}`}>
          <Text className={`text-[11px] font-bold ${badge.textColor}`}>
            {badge.label}
          </Text>
        </View>
      </View>

      {/* Khách hàng & Phòng / Tài khoản nhận */}
      <View className="flex-row items-center gap-2.5 mb-3">
        <View
          className={`w-9 h-9 rounded-full items-center justify-center ${
            isWithdraw ? 'bg-rose-100' : 'bg-teal-100'
          }`}
        >
          {isWithdraw ? (
            <Ionicons name="card-outline" size={18} color="#be123c" />
          ) : (
            <Text className="text-xs font-bold text-teal-800">
              {transaction.khachHangTen.slice(0, 2).toUpperCase()}
            </Text>
          )}
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
            {transaction.khachHangTen}
          </Text>
          <Text className="text-xs text-gray-400" numberOfLines={1}>
            {transaction.phongTen}
          </Text>
        </View>
        <Text className="text-[11px] text-gray-400 font-medium">
          {transaction.ngayGiaoDich}
        </Text>
      </View>

      {/* Chi tiết tiền đối soát */}
      <View className="bg-gray-50 p-3 rounded-xl gap-y-1.5 border border-gray-100">
        {isWithdraw ? (
          <>
            <View className="flex-row justify-between items-center">
              <Text className="text-xs text-gray-500">Số tiền yêu cầu rút:</Text>
              <Text className="text-xs font-medium text-gray-800">
                {formatVND(transaction.tienCoc)}
              </Text>
            </View>
            <View className="h-[1px] bg-gray-200 my-0.5" />
            <View className="flex-row justify-between items-center">
              <Text className="text-xs font-bold text-gray-700">Trừ số dư:</Text>
              <Text className="text-sm font-bold text-rose-600">
                - {formatVND(transaction.thucNhan)}
              </Text>
            </View>
          </>
        ) : (
          <>
            <View className="flex-row justify-between">
              <Text className="text-xs text-gray-500">Tiền cọc:</Text>
              <Text className="text-xs font-medium text-gray-800">
                {formatVND(transaction.tienCoc)}
              </Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-xs text-gray-500">Phí dịch vụ:</Text>
              <Text className="text-xs font-medium text-gray-800">
                {formatVND(transaction.phiDichVu)}
              </Text>
            </View>

            <View className="h-[1px] bg-gray-200 my-0.5" />

            <View className="flex-row justify-between items-center">
              <Text className="text-xs font-bold text-gray-700">Thực nhận:</Text>
              <Text className="text-sm font-bold text-teal-700">
                {formatVND(transaction.thucNhan)}
              </Text>
            </View>
          </>
        )}
      </View>
    </Card>
  );
};
