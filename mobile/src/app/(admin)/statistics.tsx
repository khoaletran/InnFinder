import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from 'heroui-native';

interface MetricItemProps {
  label: string;
  value: string;
  subValue?: string;
}

function MetricCard({ label, value, subValue }: MetricItemProps) {
  return (
    <View style={{ width: '48%' }} className="mb-3">
      <Card style={{ width: '100%' }} className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
        <Text className="text-xs font-semibold text-slate-500 mb-1">{label}</Text>
        <Text className="text-xl font-black text-slate-900">{value}</Text>
        {subValue ? (
          <Text className="text-[11px] font-medium text-teal-600 mt-1">{subValue}</Text>
        ) : null}
      </Card>
    </View>
  );
}

export default function AdminStatisticsScreen() {
  const [selectedFilter, setSelectedFilter] = useState('Tháng này');

  return (
    <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
      {/* Header chuẩn tenant */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200/80">
        <View className="flex-row items-center gap-2.5">
          <Pressable
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
          >
            <Ionicons name="chevron-back" size={20} color="#0F172A" />
          </Pressable>
          <View>
            <Text className="text-xl font-bold text-slate-900">Thống kê</Text>
            <Text className="text-xs text-slate-500 mt-0.5">Báo cáo hiệu suất hệ thống</Text>
          </View>
        </View>

        <View className="px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-200 flex-row items-center gap-1.5">
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
        <Text className="text-base font-bold text-slate-900 mb-3">Hiệu suất vận hành</Text>
        <View className="flex-row flex-wrap justify-between mb-2">
          <MetricCard label="Lượt xem phòng" value="1.234" subValue="+18% tháng" />
          <MetricCard label="Tài khoản mới" value="856" subValue="+12% tháng" />
          <MetricCard label="Tin đăng mới" value="342" subValue="+5% tháng" />
          <MetricCard label="Giao dịch cọc" value="189" subValue="+22% tháng" />
          <MetricCard label="Doanh thu phí" value="2.450 tr" subValue="+15% tháng" />
          <MetricCard label="Tỷ lệ duyệt bài" value="98%" subValue="Ổn định" />
        </View>

        {/* Người dùng mới graph card */}
        <View className="flex-row items-center justify-between mt-2 mb-2">
          <Text className="text-base font-bold text-slate-900">Người dùng mới theo tháng</Text>
          <Text className="text-xs font-semibold text-teal-600">Năm 2026</Text>
        </View>
        <Card className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-4 shadow-xs">
          <View className="h-36 justify-end">
            <View className="flex-row items-end justify-between px-2">
              {[30, 45, 60, 80, 55, 90, 110].map((h, i) => (
                <View key={i} className="items-center flex-1">
                  <View
                    style={{ height: h }}
                    className="w-5 bg-teal-600 rounded-t-lg"
                  />
                  <Text className="text-[10px] font-semibold text-slate-400 mt-2">T{i + 1}</Text>
                </View>
              ))}
            </View>
          </View>
        </Card>

        {/* Giao dịch theo khu vực */}
        <Text className="text-base font-bold text-slate-900 mb-2">Giao dịch theo khu vực</Text>
        <Card className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          {[
            { district: 'Quận 1', percent: 45, count: '85 giao dịch' },
            { district: 'Quận 5', percent: 28, count: '53 giao dịch' },
            { district: 'Bình Thạnh', percent: 15, count: '28 giao dịch' },
            { district: 'Thủ Đức', percent: 12, count: '23 giao dịch' },
          ].map((item, idx) => (
            <View key={idx} className="my-2.5">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-xs font-semibold text-slate-800">{item.district}</Text>
                <View className="flex-row items-center gap-2">
                  <Text className="text-[11px] text-slate-400">{item.count}</Text>
                  <Text className="text-xs font-bold text-teal-600">{item.percent}%</Text>
                </View>
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
