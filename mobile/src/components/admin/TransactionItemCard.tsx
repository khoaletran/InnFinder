import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Card } from 'heroui-native';
import { AdminTransactionItem } from '../../types/admin.types';

interface TransactionItemCardProps {
  transaction: AdminTransactionItem;
  onPress: () => void;
}

export const TransactionItemCard: React.FC<TransactionItemCardProps> = ({ transaction, onPress }) => {
  const isSuccess = transaction.trangThai === 'THANH_CONG';

  return (
    <Pressable onPress={onPress} className="mb-3 active:opacity-90">
      <Card className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <View className="flex-row items-center justify-between mb-1.5">
          <Text className="text-xs font-bold text-slate-800">{transaction.maGiaoDich}</Text>
          <View
            className={`px-2 py-0.5 rounded-full ${
              isSuccess ? 'bg-emerald-100' : 'bg-amber-100'
            }`}
          >
            <Text
              className={`text-[10px] font-bold ${
                isSuccess ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {isSuccess ? 'Thành công' : 'Đang xử lý'}
            </Text>
          </View>
        </View>

        <Text className="text-sm font-semibold text-slate-900" numberOfLines={1}>
          {transaction.phongTro}
        </Text>

        <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-slate-100">
          <Text className="text-sm font-extrabold text-teal-700">
            {transaction.soTien.toLocaleString('vi-VN')} đ
          </Text>
          <Text className="text-[11px] text-slate-400">{transaction.thoiGian}</Text>
        </View>
      </Card>
    </Pressable>
  );
};
