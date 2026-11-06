import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from 'heroui-native';

interface MetricItemProps {
  label: string;
  value: string;
}

function MetricCard({ label, value }: MetricItemProps) {
  return (
    <View style={{ width: '48%' }} className="mb-3">
      <Card style={{ width: '100%' }} className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <Text className="text-[11px] text-slate-400 mb-1">{label}</Text>
        <Text className="text-lg font-extrabold text-slate-900">{value}</Text>
      </Card>
    </View>
  );
}

export default function AdminStatisticsScreen() {
  const [selectedFilter, setSelectedFilter] = useState('Tháng này');

  return (
    <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-1">
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
          <Text className="text-xl font-bold text-slate-900">Thống kê</Text>
        </Pressable>
        <View className="px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 flex-row items-center gap-1">
          <Text className="text-xs font-semibold text-slate-700">{selectedFilter}</Text>
          <Ionicons name="chevron-down" size={14} color="#64748B" />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 6 Metric cards */}
        <View className="flex-row flex-wrap justify-between mb-2">
          <MetricCard label="Lượt xem" value="1.234" />
          <MetricCard label="Đăng ký" value="856" />
          <MetricCard label="Tin mới" value="342" />
          <MetricCard label="Giao dịch" value="189" />
          <MetricCard label="Doanh thu" value="2.450 tr" />
          <MetricCard label="Tỷ lệ duyệt" value="98%" />
        </View>

        {/* Người dùng mới graph card */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Người dùng mới</Text>
        <Card className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 shadow-sm">
          <View className="h-32 justify-end">
            <View className="flex-row items-end justify-between px-2">
              {[30, 45, 60, 80, 55, 90, 110].map((h, i) => (
                <View key={i} className="items-center flex-1">
                  <View
                    style={{ height: h }}
                    className="w-4 bg-teal-500 rounded-t-md"
                  />
                  <Text className="text-[10px] text-slate-400 mt-2">T{i + 1}</Text>
                </View>
              ))}
            </View>
          </View>
        </Card>

        {/* Giao dịch theo khu vực */}
        <Text className="text-sm font-bold text-slate-900 mb-2">Giao dịch theo khu vực</Text>
        <Card className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          {[
            { district: 'Quận 1', percent: 45, count: '85 giao dịch' },
            { district: 'Quận 5', percent: 28, count: '53 giao dịch' },
            { district: 'Bình Thạnh', percent: 15, count: '28 giao dịch' },
            { district: 'Thủ Đức', percent: 12, count: '23 giao dịch' },
          ].map((item, idx) => (
            <View key={idx} className="my-2">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-xs font-semibold text-slate-800">{item.district}</Text>
                <Text className="text-xs font-bold text-teal-700">{item.percent}%</Text>
              </View>
              <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <View
                  style={{ width: `${item.percent}%` }}
                  className="h-full bg-teal-600 rounded-full"
                />
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}
