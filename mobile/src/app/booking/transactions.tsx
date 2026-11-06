import React, { useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { TransactionCard } from "../../components/booking/TransactionCard";
import {
  useTransactionStore,
  TransactionFilterTab,
} from "../../store/useTransactionStore";
import { TransactionResponse } from "../../types/booking.types";

// Danh sách Tabs lọc khớp TrangThaiGD trong Java
const TABS: { key: TransactionFilterTab; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "THANH_CONG", label: "Thành công" },
  { key: "CHO_THANH_TOAN", label: "Đang xử lý" },
  { key: "HOAN_TIEN", label: "Hoàn tiền" },
  { key: "THAT_BAI", label: "Thất bại" },
];

export default function TransactionsScreen() {
  const {
    transactions,
    isLoading,
    activeTab,
    setActiveTab,
    fetchTransactions,
  } = useTransactionStore();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const filteredList: TransactionResponse[] =
    activeTab === "ALL"
      ? transactions
      : transactions.filter((item) => item.trangThai === activeTab);

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-slate-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900">Giao dịch</Text>
      </View>

      {/* Tabs Filter */}
      <View className="px-4 py-3 bg-white">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row"
        >
          <View className="flex-row gap-2.5">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.7}
                  className={`px-4 py-1.5 rounded-full border ${
                    isActive
                      ? "border-teal-600 bg-teal-50/50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      isActive
                        ? "text-teal-700 font-semibold"
                        : "text-slate-600 font-medium"
                    }`}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Danh sách */}
      {isLoading && transactions.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0D9488" />
          <Text className="mt-3 text-xs text-slate-400">
            Đang tải giao dịch...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item) => item.maGiaoDich}
          renderItem={({ item }) => <TransactionCard item={item} />}
          contentContainerClassName="px-4 pt-1 pb-6"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={fetchTransactions}
              colors={["#0D9488"]}
              tintColor="#0D9488"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
