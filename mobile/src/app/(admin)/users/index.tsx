import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../../services/admin.service';
import { AdminUserItem } from '../../../types/admin.types';
import { UserListItem } from '../../../components/admin/UserListItem';
import { Colors } from '../../../constants/theme';

const TABS = ['Tất cả', 'Khách hàng', 'Chủ trọ', 'Admin'];

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [activeTab, setActiveTab] = useState('Tất cả');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadUsers = async () => {
    const list = await adminService.getUsers();
    setUsers(list);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const filteredUsers = users.filter((u) => {
    // Filter tab
    if (activeTab === 'Khách hàng' && (u.chuTro || u.vaiTro === 'QUAN_TRI')) return false;
    if (activeTab === 'Chủ trọ' && !u.chuTro) return false;
    if (activeTab === 'Admin' && u.vaiTro !== 'QUAN_TRI') return false;

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        u.hoVaTen.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.sdt.includes(q)
      );
    }
    return true;
  });

  return (
    <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-slate-200">
        <Text className="text-xl font-bold text-slate-900 mb-2">Người dùng</Text>

        {/* Search input */}
        <View className="flex-row items-center bg-slate-100 rounded-xl px-3 py-2">
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
          <TextInput
            placeholder="Tìm kiếm tên, email, SĐT..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            className="flex-1 ml-2 text-sm text-slate-900"
          />
          {search ? (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </Pressable>
          ) : null}
        </View>

        {/* Filter chips */}
        <View className="flex-row items-center gap-2 mt-3">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-full border ${
                  isActive
                    ? 'bg-teal-600 border-teal-600'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    isActive ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  {tab}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredUsers.length === 0 ? (
          <View className="items-center justify-center py-12">
            <Ionicons name="people-outline" size={48} color="#CBD5E1" />
            <Text className="text-sm text-slate-400 mt-2">Không tìm thấy người dùng phù hợp</Text>
          </View>
        ) : (
          filteredUsers.map((user) => (
            <UserListItem
              key={user.maNguoiDung}
              user={user}
              onPress={() => router.push(`/(admin)/users/${user.maNguoiDung}`)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
