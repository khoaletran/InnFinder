import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

const DAYS_OF_WEEK = [
  { dayName: 'T2', dayNum: '25', fullDate: '2026-08-25' },
  { dayName: 'T3', dayNum: '26', fullDate: '2026-08-26' },
  { dayName: 'T4', dayNum: '27', fullDate: '2026-08-27' },
  { dayName: 'T5', dayNum: '28', fullDate: '2026-08-28' },
  { dayName: 'T6', dayNum: '29', fullDate: '2026-08-29' },
  { dayName: 'T7', dayNum: '30', fullDate: '2026-08-30' },
  { dayName: 'CN', dayNum: '31', fullDate: '2026-08-31' },
];

export const WeekCalendarStrip: React.FC<Props> = ({ selectedDate, onSelectDate }) => {
  return (
    <View className="bg-white px-4 py-3 border-b border-gray-100">
      {/* Tháng & Nút chuyển */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-sm font-bold text-gray-900">Tháng 8, 2026</Text>
        <View className="flex-row gap-x-2">
          <Pressable className="w-7 h-7 rounded-full bg-gray-100 items-center justify-center">
            <Ionicons name="chevron-back" size={16} color="#4b5563" />
          </Pressable>
          <Pressable className="w-7 h-7 rounded-full bg-gray-100 items-center justify-center">
            <Ionicons name="chevron-forward" size={16} color="#4b5563" />
          </Pressable>
        </View>
      </View>

      {/* Dải 7 ngày trong tuần */}
      <View className="flex-row justify-between">
        {DAYS_OF_WEEK.map((item) => {
          const isSelected = item.fullDate === selectedDate;
          return (
            <Pressable
              key={item.fullDate}
              onPress={() => onSelectDate(item.fullDate)}
              className="items-center"
            >
              <Text className="text-[11px] font-medium text-gray-400 mb-1">{item.dayName}</Text>
              <View
                className={`w-9 h-9 rounded-full items-center justify-center ${
                  isSelected ? 'bg-teal-700' : 'bg-transparent'
                }`}
              >
                <Text
                  className={`text-sm font-bold ${
                    isSelected ? 'text-white' : 'text-gray-800'
                  }`}
                >
                  {item.dayNum}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};
