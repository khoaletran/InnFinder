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
          isAlert ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200/90'
        } shadow-xs`}
      >
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xs font-semibold text-slate-500" numberOfLines={1}>{label}</Text>
          {iconName ? (
            <View
              className={`w-7 h-7 rounded-full items-center justify-center ${
                isAlert ? 'bg-rose-100' : 'bg-teal-50'
              }`}
            >
              <Ionicons
                name={iconName}
                size={15}
                color={isAlert ? '#EF4444' : iconColor}
              />
            </View>
          ) : null}
        </View>

        <Text
          className={`text-xl font-black tracking-tight ${
            isAlert ? 'text-rose-600' : 'text-slate-900'
          }`}
        >
          {typeof value === 'number' ? value.toLocaleString('vi-VN') : value}
        </Text>

        {subValue ? (
          <View className="flex-row items-center mt-1">
            <Text
              className={`text-[11px] font-semibold ${
                isAlert
                  ? 'text-rose-600'
                  : subValue.startsWith('+')
                  ? 'text-teal-600'
                  : 'text-slate-400'
              }`}
            >
              {subValue}
            </Text>
          </View>
        ) : null}
      </Card>
    </View>
  );
};
