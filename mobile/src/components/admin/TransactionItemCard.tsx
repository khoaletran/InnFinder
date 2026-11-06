import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Card } from 'heroui-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminTransactionItem } from '../../types/admin.types';

interface TransactionItemCardProps {
  transaction: AdminTransactionItem;
  onPress: () => void;
}

export const TransactionItemCard: React.FC<TransactionItemCardProps> = ({ transaction, onPress }) => {
  const isSuccess = transaction.trangThai === 'THANH_CONG';
  const isFailed = transaction.trangThai === 'THAT_BAI';

  return (
    <Pressable onPress={onPress} className="mb-3 active:opacity-90">
      <Card className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="receipt-outline" size={14} color="#64748B" />
            <Text className="text-xs font-bold text-slate-700">{transaction.maGiaoDich}</Text>
          </View>
          <View
            className={`px-2.5 py-0.5 rounded-full ${
              isSuccess
                ? 'bg-emerald-50 border border-emerald-200'
                : isFailed
                ? 'bg-rose-50 border border-rose-200'
                : 'bg-amber-50 border border-amber-200'
            }`}
          >
            <Text
              className={`text-[10px] font-bold ${
                isSuccess
                  ? 'text-emerald-700'
                  : isFailed
                  ? 'text-rose-700'
                  : 'text-amber-700'
              }`}
            >
              {isSuccess ? 'Thành công' : isFailed ? 'Thất bại' : 'Đang xử lý'}
            </Text>
          </View>
        </View>

        <Text className="text-sm font-semibold text-slate-800" numberOfLines={1}>
          {transaction.phongTro}
        </Text>

        <View className="flex-row items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
          <Text className="text-base font-extrabold text-teal-600">
            {transaction.soTien.toLocaleString('vi-VN')} đ
          </Text>
          <View className="flex-row items-center gap-1">
            <Ionicons name="time-outline" size={12} color="#94A3B8" />
            <Text className="text-[11px] text-slate-400 font-medium">{transaction.thoiGian}</Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
};
