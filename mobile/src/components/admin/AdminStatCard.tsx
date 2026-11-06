import React from 'react';
import { View, Text } from 'react-native';
import { Card } from 'heroui-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

interface AdminStatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  isAlert?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}

export const AdminStatCard: React.FC<AdminStatCardProps> = ({
  label,
  value,
  subValue,
  isAlert,
  iconName,
  iconColor = Colors.primary,
}) => {
  return (
    <View style={{ width: '48%' }} className="mb-3">
      <Card
        style={{ width: '100%' }}
        className={`p-3.5 bg-white rounded-2xl border ${
          isAlert ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
        } shadow-sm`}
      >
        <View className="flex-row items-center justify-between mb-1.5">
          <Text className="text-xs font-medium text-slate-500">{label}</Text>
          {iconName ? (
            <Ionicons name={iconName} size={18} color={isAlert ? '#EF4444' : iconColor} />
          ) : null}
        </View>

        <Text
          className={`text-xl font-extrabold ${
            isAlert ? 'text-rose-600' : 'text-slate-900'
          }`}
        >
          {typeof value === 'number' ? value.toLocaleString('vi-VN') : value}
        </Text>

        {subValue ? (
          <Text className="text-[11px] text-slate-400 mt-1">{subValue}</Text>
        ) : null}
      </Card>
    </View>
  );
};
