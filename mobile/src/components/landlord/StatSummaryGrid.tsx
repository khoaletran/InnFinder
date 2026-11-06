import React from 'react';
import { View, Text } from 'react-native';
import { Card } from 'heroui-native';
import { LandlordDashboardStats } from '../../types/landlord.types';

interface Props {
  stats: LandlordDashboardStats;
}

export const StatSummaryGrid: React.FC<Props> = ({ stats }) => {
  return (
    <View className="flex-row flex-wrap justify-between gap-y-3">
      {/* 1. Tổng phòng */}
      <View style={{ width: '48%' }}>
        <Card
          className="w-full p-4 bg-white rounded-2xl shadow-sm border border-gray-100"
          style={{ width: '100%' }}
        >
          <Text className="text-xs text-gray-500 font-medium mb-1">Tổng phòng</Text>
          <Text className="text-2xl font-bold text-gray-900 mb-1">{stats.tongPhong}</Text>
          <Text className="text-xs font-semibold text-emerald-600">+{stats.tongPhongMoi} phòng mới</Text>
        </Card>
      </View>

      {/* 2. Đang trống */}
      <View style={{ width: '48%' }}>
        <Card
          className="w-full p-4 bg-white rounded-2xl shadow-sm border border-gray-100"
          style={{ width: '100%' }}
        >
          <Text className="text-xs text-gray-500 font-medium mb-1">Đang trống</Text>
          <Text className="text-2xl font-bold text-gray-900 mb-1">{stats.dangTrong}</Text>
          <Text className="text-xs text-amber-500 font-medium">Chờ cho thuê</Text>
        </Card>
      </View>

      {/* 3. Yêu cầu mới */}
      <View style={{ width: '48%' }}>
        <Card
          className="w-full p-4 bg-white rounded-2xl shadow-sm border border-gray-100"
          style={{ width: '100%' }}
        >
          <Text className="text-xs text-gray-500 font-medium mb-1">Yêu cầu mới</Text>
          <Text className="text-2xl font-bold text-gray-900 mb-1">
            {stats.yeuCauMoi < 10 ? `0${stats.yeuCauMoi}` : stats.yeuCauMoi}
          </Text>
          <Text className="text-xs text-amber-500 font-medium">Cần xác nhận</Text>
        </Card>
      </View>

      {/* 4. Đang thuê */}
      <View style={{ width: '48%' }}>
        <Card
          className="w-full p-4 bg-white rounded-2xl shadow-sm border border-gray-100"
          style={{ width: '100%' }}
        >
          <Text className="text-xs text-gray-500 font-medium mb-1">Đang thuê</Text>
          <Text className="text-2xl font-bold text-gray-900 mb-1">{stats.dangThue}</Text>
          <Text className="text-xs text-emerald-600 font-medium">Hợp đồng active</Text>
        </Card>
      </View>
    </View>
  );
};
