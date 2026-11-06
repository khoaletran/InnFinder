import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Card } from 'heroui-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminComplaintItem } from '../../types/admin.types';

interface ComplaintItemCardProps {
  complaint: AdminComplaintItem;
  onPress: () => void;
}

export const ComplaintItemCard: React.FC<ComplaintItemCardProps> = ({ complaint, onPress }) => {
  const isPending = complaint.trangThai === 'CHO_XU_LY';
  const isProcessing = complaint.trangThai === 'DANG_XU_LY';

  return (
    <Pressable onPress={onPress} className="mb-3 active:opacity-90">
      <Card className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xs font-bold text-slate-800">{complaint.maKhieuNai}</Text>
          <View
            className={`px-2 py-0.5 rounded-full ${
              isPending
                ? 'bg-amber-100'
                : isProcessing
                ? 'bg-blue-100'
                : 'bg-emerald-100'
            }`}
          >
            <Text
              className={`text-[10px] font-bold ${
                isPending
                  ? 'text-amber-700'
                  : isProcessing
                  ? 'text-blue-700'
                  : 'text-emerald-700'
              }`}
            >
              {isPending ? 'Chờ xử lý' : isProcessing ? 'Đang xử lý' : 'Đã xử lý'}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-1.5 mb-1.5">
          <Text className="text-xs font-bold text-slate-900">{complaint.nguoiKhieuNai}</Text>
          <Ionicons name="arrow-forward" size={12} color="#94A3B8" />
          <Text className="text-xs font-medium text-slate-600">{complaint.doiTuongBiKhieuNai}</Text>
        </View>

        <Text className="text-xs text-slate-500 line-clamp-2 leading-relaxed" numberOfLines={2}>
          {complaint.vanDe}
        </Text>

        <View className="flex-row items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
          <Text className="text-[11px] text-slate-400">{complaint.thoiGian}</Text>
          <View className="flex-row items-center gap-1">
            <Text className="text-xs font-semibold text-teal-700">Xem chi tiết</Text>
            <Ionicons name="chevron-forward" size={14} color="#0D9488" />
          </View>
        </View>
      </Card>
    </Pressable>
  );
};
