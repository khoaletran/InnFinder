import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LandlordTransactionCard } from '../../components/landlord/LandlordTransactionCard';
import { landlordService } from '../../services/landlord.service';
import { LandlordTransactionItem } from '../../types/landlord.types';

export default function TransactionsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'DA_THU' | 'HOAN_COC'>('DA_THU');
  const [transactions, setTransactions] = useState<LandlordTransactionItem[]>([]);

  useEffect(() => {
    loadTransactions();
  }, [tab]);

  const loadTransactions = async () => {
    const list = await landlordService.getTransactions(tab);
    setTransactions(list);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-slate-50" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3.5 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Pressable onPress={() => router.back()} className="p-1 -ml-1">
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </Pressable>
          <Text className="text-lg font-bold text-gray-900">Giao dịch</Text>
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row px-4 py-3 bg-white gap-2 border-b border-gray-100">
        {[
          { key: 'DA_THU', label: 'Đã thu' },
          { key: 'HOAN_COC', label: 'Không thu' },
        ].map((t) => {
          const isActive = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key as any)}
              className={`px-4 py-1.5 rounded-full ${
                isActive ? 'bg-teal-700' : 'bg-gray-100'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  isActive ? 'text-white' : 'text-gray-600'
                }`}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Danh sách giao dịch */}
      <ScrollView
        style={{ flex: 1 }}
        className="px-4 py-4"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {transactions.map((tx) => (
          <LandlordTransactionCard key={tx.id} transaction={tx} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
