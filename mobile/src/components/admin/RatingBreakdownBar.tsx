import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RatingBreakdownBarProps {
  star: number;
  count: number;
  total: number;
}

export const RatingBreakdownBar: React.FC<RatingBreakdownBarProps> = ({ star, count, total }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <View className="flex-row items-center gap-2 my-1">
      <View className="flex-row items-center w-8">
        <Text className="text-xs font-semibold text-slate-700">{star}</Text>
        <Ionicons name="star" size={12} color="#F59E0B" style={{ marginLeft: 2 }} />
      </View>

      <View className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <View
          style={{ width: `${percentage}%` }}
          className="h-full bg-amber-400 rounded-full"
        />
      </View>

      <Text className="text-xs text-slate-400 w-8 text-right">{count}</Text>
    </View>
  );
};
