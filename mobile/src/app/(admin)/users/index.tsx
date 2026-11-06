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
      {/* Header đồng bộ phong cách InnFinder */}
      <View className="px-4 py-3 bg-white border-b border-slate-200/80">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-xl font-bold text-slate-900">Người dùng</Text>
            <Text className="text-xs text-slate-500 mt-0.5">Quản lý thành viên & phân quyền hệ thống</Text>
          </View>
          <View className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200">
            <Text className="text-xs font-bold text-teal-700">{filteredUsers.length} tài khoản</Text>
          </View>
        </View>

        {/* Thanh tìm kiếm phong cách bo tròn giống Khách hàng */}
        <View className="flex-row items-center bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-full mb-3">
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            placeholder="Tìm kiếm theo tên, email, SĐT..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            className="flex-1 ml-2.5 text-sm text-slate-900 py-0"
          />
          {search ? (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </Pressable>
          ) : null}
        </View>

        {/* Filter pills chuẩn tenant */}
        <View className="flex-row items-center gap-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`px-3.5 py-1.5 rounded-full border ${
                  isActive
                    ? 'bg-teal-700 border-teal-700'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text
                  className={`text-xs ${
                    isActive ? 'font-semibold text-white' : 'font-medium text-slate-700'
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
          <View className="items-center justify-center py-16">
            <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
              <Ionicons name="people-outline" size={32} color="#94A3B8" />
            </View>
            <Text className="text-sm font-semibold text-slate-600">Không tìm thấy người dùng phù hợp</Text>
            <Text className="text-xs text-slate-400 mt-1">Hãy thử tìm kiếm với từ khóa khác</Text>
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
