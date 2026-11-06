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
      <Card className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
        <View className="flex-row items-center justify-between mb-2.5">
          <View className="flex-row items-center gap-1.5">
            <View className="w-2 h-2 rounded-full bg-teal-500" />
            <Text className="text-xs font-bold text-slate-700">{complaint.maKhieuNai}</Text>
          </View>
          <View
            className={`px-2.5 py-0.5 rounded-full ${
              isPending
                ? 'bg-amber-50 border border-amber-200'
                : isProcessing
                ? 'bg-sky-50 border border-sky-200'
                : 'bg-emerald-50 border border-emerald-200'
            }`}
          >
            <Text
              className={`text-[10px] font-bold ${
                isPending
                  ? 'text-amber-700'
                  : isProcessing
                  ? 'text-sky-700'
                  : 'text-emerald-700'
              }`}
            >
              {isPending ? 'Chờ xử lý' : isProcessing ? 'Đang xử lý' : 'Đã xử lý'}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2 mb-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <Text className="text-xs font-bold text-slate-800">{complaint.nguoiKhieuNai}</Text>
          <Ionicons name="arrow-forward" size={12} color="#94A3B8" />
          <Text className="text-xs font-medium text-slate-600">{complaint.doiTuongBiKhieuNai}</Text>
        </View>

        <Text className="text-xs text-slate-600 leading-relaxed font-normal" numberOfLines={2}>
          {complaint.vanDe}
        </Text>

        <View className="flex-row items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
          <View className="flex-row items-center gap-1">
            <Ionicons name="calendar-outline" size={13} color="#94A3B8" />
            <Text className="text-[11px] text-slate-400 font-medium">{complaint.thoiGian}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Text className="text-xs font-semibold text-teal-600">Xem chi tiết</Text>
            <Ionicons name="chevron-forward" size={14} color="#0D9488" />
          </View>
        </View>
      </Card>
    </Pressable>
  );
};
