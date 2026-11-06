import React from 'react';
import { View, Text } from 'react-native';
import { Card } from 'heroui-native';
import { LandlordTransactionItem } from '../../types/landlord.types';

interface Props {
  transaction: LandlordTransactionItem;
}

export const LandlordTransactionCard: React.FC<Props> = ({ transaction }) => {
  const isCollected = transaction.loaiGiaoDich === 'DA_THU';

  return (
    <Card className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm mb-3">
      {/* Mã GD & Badge */}
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xs text-gray-400 font-medium">
          Mã: {transaction.maGiaoDich}
        </Text>
        <View
          className={`px-2 py-0.5 rounded-full ${
            isCollected ? 'bg-emerald-100' : 'bg-gray-100'
          }`}
        >
          <Text
            className={`text-[11px] font-bold ${
              isCollected ? 'text-emerald-700' : 'text-gray-600'
            }`}
          >
            {isCollected ? 'Đã thu' : 'Hoàn cọc'}
          </Text>
        </View>
      </View>

      {/* Khách hàng & Phòng */}
      <View className="flex-row items-center gap-2 mb-3">
        <View className="w-8 h-8 rounded-full bg-teal-100 items-center justify-center">
          <Text className="text-[11px] font-bold text-teal-800">
            {transaction.khachHangTen.slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View>
          <Text className="text-sm font-bold text-gray-900">{transaction.khachHangTen}</Text>
          <Text className="text-xs text-gray-400">{transaction.phongTen}</Text>
        </View>
      </View>

      {/* Đối soát tiền */}
      <View className="bg-gray-50 p-3 rounded-xl gap-y-1.5 border border-gray-100">
        <View className="flex-row justify-between">
          <Text className="text-xs text-gray-500">Tiền cọc:</Text>
          <Text className="text-xs font-medium text-gray-800">
            {transaction.tienCoc.toLocaleString('vi-VN')} đ
          </Text>
        </View>

        <View className="flex-row justify-between">
          <Text className="text-xs text-gray-500">Phí dịch vụ:</Text>
          <Text className="text-xs font-medium text-gray-800">
            {transaction.phiDichVu.toLocaleString('vi-VN')} đ
          </Text>
        </View>

        <View className="h-[1px] bg-gray-200 my-0.5" />

        <View className="flex-row justify-between items-center">
          <Text className="text-xs font-bold text-gray-700">Thực nhận:</Text>
          <Text className="text-sm font-bold text-teal-700">
            {transaction.thucNhan.toLocaleString('vi-VN')} đ
          </Text>
        </View>
      </View>
    </Card>
  );
};
