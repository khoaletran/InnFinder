import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../../services/admin.service';
import { AdminUserItem } from '../../../types/admin.types';
import { UserListItem } from '../../../components/admin/UserListItem';

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

  const hasSearchKeyword = search.trim().length > 0;

  // Chỉ tiến hành lọc và hiển thị khi đã có từ khóa tìm kiếm
  const filteredUsers = hasSearchKeyword
    ? users.filter((u) => {
        // Lọc theo Tab vai trò
        if (activeTab === 'Khách hàng' && (u.chuTro || u.vaiTro === 'QUAN_TRI')) return false;
        if (activeTab === 'Chủ trọ' && !u.chuTro) return false;
        if (activeTab === 'Admin' && u.vaiTro !== 'QUAN_TRI') return false;

        // Tìm kiếm đa trường: Mã ND, Tên đăng nhập, Họ tên, Email, SĐT
        const q = search.trim().toLowerCase();
        return (
          u.maNguoiDung.toLowerCase().includes(q) ||
          (u.tenDangNhap && u.tenDangNhap.toLowerCase().includes(q)) ||
          u.hoVaTen.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.sdt.includes(q)
        );
      })
    : [];

  return (
    <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-slate-200/80">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-xl font-bold text-slate-900">Người dùng</Text>
            <Text className="text-xs text-slate-500 mt-0.5">Tra cứu & quản trị tài khoản hệ thống</Text>
          </View>
          {hasSearchKeyword ? (
            <View className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200">
              <Text className="text-xs font-bold text-teal-700">{filteredUsers.length} kết quả</Text>
            </View>
          ) : (
            <View className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">
              <Text className="text-xs font-medium text-slate-600">Chờ tra cứu</Text>
            </View>
          )}
        </View>

        {/* Ô tìm kiếm trung tâm */}
        <View className="flex-row items-center bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-full mb-3">
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            placeholder="Nhập mã ND, họ tên, email, SĐT..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            className="flex-1 ml-2.5 text-sm text-slate-900 py-0"
            autoCapitalize="none"
          />
          {search ? (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </Pressable>
          ) : null}
        </View>

        {/* Tab lọc vai trò */}
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

      {/* Nội dung danh sách */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {!hasSearchKeyword ? (
          // Trạng thái ban đầu: Không hiển thị danh sách người dùng, hiển thị thông điệp hướng dẫn tra cứu
          <View className="items-center justify-center py-20 px-6">
            <View className="w-20 h-20 rounded-full bg-teal-50 items-center justify-center mb-4 border border-teal-100">
              <Ionicons name="search-outline" size={36} color="#0D9488" />
            </View>
            <Text className="text-base font-bold text-slate-800 text-center">Tra cứu thông tin người dùng</Text>
            <Text className="text-xs text-slate-500 text-center mt-1.5 leading-5">
              Nhập mã định danh (ND...), họ tên, email hoặc số điện thoại vào ô tìm kiếm phía trên để hiển thị thông tin chi tiết.
            </Text>
          </View>
        ) : filteredUsers.length === 0 ? (
          // Đã tìm kiếm nhưng không có kết quả phù hợp
          <View className="items-center justify-center py-16 px-6">
            <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
              <Ionicons name="people-outline" size={32} color="#94A3B8" />
            </View>
            <Text className="text-sm font-semibold text-slate-700">Không tìm thấy người dùng phù hợp</Text>
            <Text className="text-xs text-slate-400 mt-1 text-center">
              Không có tài khoản nào khớp với từ khóa "{search}". Hãy kiểm tra lại mã ND, SĐT hoặc Email.
            </Text>
          </View>
        ) : (
          // Hiển thị danh sách các kết quả tìm thấy
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
