import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  RefreshControl,
  Modal,
  Switch,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from 'heroui-native';
import { adminService } from '../../../services/admin.service';
import { AdminUserItem, AdminCategoryItem } from '../../../types/admin.types';
import { UserListItem } from '../../../components/admin/UserListItem';

type ManagementSection = 'users' | 'categories';

const USER_ROLE_TABS = ['Tất cả', 'Khách hàng', 'Chủ trọ', 'Admin'];
const CATEGORY_TABS: Array<{ label: string; key: 'LOAI_PHONG' | 'TIEN_ICH' | 'KHU_VUC' }> = [
  { label: 'Loại phòng', key: 'LOAI_PHONG' },
  { label: 'Tiện ích', key: 'TIEN_ICH' },
  { label: 'Khu vực', key: 'KHU_VUC' },
];

export default function AdminManagementScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [section, setSection] = useState<ManagementSection>(
    (params.tab as ManagementSection) || 'users'
  );

  useEffect(() => {
    if (params.tab && ['users', 'categories'].includes(params.tab)) {
      setSection(params.tab as ManagementSection);
    }
  }, [params.tab]);

  // States for Users
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [userRoleTab, setUserRoleTab] = useState('Tất cả');
  const [searchUser, setSearchUser] = useState('');

  // States for Categories
  const [categories, setCategories] = useState<AdminCategoryItem[]>([]);
  const [activeCatTab, setActiveCatTab] = useState<'LOAI_PHONG' | 'TIEN_ICH' | 'KHU_VUC'>('LOAI_PHONG');
  const [modalVisible, setModalVisible] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatActive, setNewCatActive] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const [uList, cList] = await Promise.all([
      adminService.getUsers(),
      adminService.getCategories(activeCatTab),
    ]);
    setUsers(uList);
    setCategories(cList);
  };

  useEffect(() => {
    loadData();
  }, [activeCatTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Filter Users
  const hasSearchKeyword = searchUser.trim().length > 0;
  const filteredUsers = users.filter((u) => {
    if (userRoleTab === 'Khách hàng' && (u.chuTro || u.vaiTro === 'QUAN_TRI')) return false;
    if (userRoleTab === 'Chủ trọ' && !u.chuTro) return false;
    if (userRoleTab === 'Admin' && u.vaiTro !== 'QUAN_TRI') return false;

    if (!hasSearchKeyword) return true;

    const q = searchUser.trim().toLowerCase();
    return (
      u.maNguoiDung.toLowerCase().includes(q) ||
      (u.tenDangNhap && u.tenDangNhap.toLowerCase().includes(q)) ||
      u.hoVaTen.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.sdt.includes(q)
    );
  });

  // Handle Categories
  const handleAddCategory = () => {
    if (!newCatName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên danh mục');
      return;
    }
    const newCat: AdminCategoryItem = {
      ma: `CAT${Date.now().toString().slice(-4)}`,
      ten: newCatName.trim(),
      loai: activeCatTab,
      trangThai: newCatActive,
    };
    setCategories([newCat, ...categories]);
    setNewCatName('');
    setModalVisible(false);
    Alert.alert('Thành công', 'Đã thêm danh mục mới.');
  };

  const handleDeleteCategory = (ma: string) => {
    Alert.alert('Xoá danh mục', 'Bạn có chắc chắn muốn xoá danh mục này?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: () => {
          setCategories(categories.filter((c) => c.ma !== ma));
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-slate-200/80">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-xl font-bold text-slate-900">Quản trị hệ thống</Text>
            <Text className="text-xs text-slate-500 mt-0.5">
              Tìm kiếm người dùng & cấu hình danh mục
            </Text>
          </View>
        </View>

        {/* 2 Main Segmented Tabs */}
        <View className="flex-row p-1 bg-slate-100 rounded-xl mb-3">
          <Pressable
            onPress={() => setSection('users')}
            className={`flex-1 py-2 items-center justify-center rounded-lg ${
              section === 'users' ? 'bg-white shadow-xs' : ''
            }`}
          >
            <Text
              className={`text-xs ${
                section === 'users'
                  ? 'font-bold text-slate-900'
                  : 'font-semibold text-slate-500'
              }`}
            >
              Người dùng
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSection('categories')}
            className={`flex-1 py-2 items-center justify-center rounded-lg ${
              section === 'categories' ? 'bg-white shadow-xs' : ''
            }`}
          >
            <Text
              className={`text-xs ${
                section === 'categories'
                  ? 'font-bold text-slate-900'
                  : 'font-semibold text-slate-500'
              }`}
            >
              Quản lý danh mục
            </Text>
          </Pressable>
        </View>

        {/* Sub-bar for Users */}
        {section === 'users' ? (
          <>
            {/* Search Input */}
            <View className="flex-row items-center bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-full mb-3">
              <Ionicons name="search" size={17} color="#94A3B8" />
              <TextInput
                placeholder="Nhập mã ND, họ tên, email, SĐT..."
                placeholderTextColor="#94A3B8"
                value={searchUser}
                onChangeText={setSearchUser}
                className="flex-1 ml-2 text-xs text-slate-900 py-0"
                autoCapitalize="none"
              />
              {searchUser ? (
                <Pressable onPress={() => setSearchUser('')}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </Pressable>
              ) : null}
            </View>

            {/* Role Filter Tabs */}
            <View className="flex-row items-center gap-2">
              {USER_ROLE_TABS.map((tab) => {
                const isActive = userRoleTab === tab;
                return (
                  <Pressable
                    key={tab}
                    onPress={() => setUserRoleTab(tab)}
                    className={`px-3 py-1.5 rounded-full border ${
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
          </>
        ) : (
          /* Sub-bar for Categories */
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              {CATEGORY_TABS.map((tab) => {
                const isActive = activeCatTab === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setActiveCatTab(tab.key)}
                    className={`px-3 py-1.5 rounded-full border ${
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
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => setModalVisible(true)}
              className="flex-row items-center gap-1 px-3 py-1.5 bg-teal-600 rounded-full active:bg-teal-700"
            >
              <Ionicons name="add" size={15} color="#FFFFFF" />
              <Text className="text-xs font-bold text-white">Thêm mới</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Content ScrollView */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ================= 1. TAB NGƯỜI DÙNG ================= */}
        {section === 'users' && (
          filteredUsers.length === 0 ? (
            <View className="items-center justify-center py-16 px-6">
              <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
                <Ionicons name="people-outline" size={32} color="#94A3B8" />
              </View>
              <Text className="text-sm font-semibold text-slate-700">
                Không tìm thấy người dùng phù hợp
              </Text>
              <Text className="text-xs text-slate-400 mt-1 text-center">
                {hasSearchKeyword
                  ? `Không có tài khoản nào khớp với từ khóa "${searchUser}".`
                  : 'Chưa có tài khoản nào trong danh mục này.'}
              </Text>
            </View>
          ) : (
            filteredUsers.map((u) => (
              <UserListItem
                key={u.maNguoiDung}
                user={u}
                onPress={() => router.push(`/(admin)/users/${u.maNguoiDung}` as any)}
              />
            ))
          )
        )}

        {/* ================= 2. TAB DANH MỤC ================= */}
        {section === 'categories' && (
          categories.length === 0 ? (
            <View className="items-center justify-center py-16">
              <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
                <Ionicons name="list-outline" size={32} color="#94A3B8" />
              </View>
              <Text className="text-sm font-semibold text-slate-600">Chưa có danh mục nào</Text>
            </View>
          ) : (
            categories.map((cat) => (
              <Card
                key={cat.ma}
                className="flex-row items-center justify-between p-4 bg-white rounded-2xl border border-slate-200/90 mb-3 shadow-xs"
              >
                <View className="flex-1 mr-3">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-bold text-slate-900">{cat.ten}</Text>
                    <View className="px-2 py-0.2 rounded bg-slate-100">
                      <Text className="text-[10px] font-mono text-slate-500">{cat.ma}</Text>
                    </View>
                  </View>
                  {cat.moTa ? (
                    <Text className="text-xs text-slate-500 mt-1" numberOfLines={1}>
                      {cat.moTa}
                    </Text>
                  ) : null}
                </View>

                <View className="flex-row items-center gap-3">
                  <Switch
                    value={cat.trangThai}
                    onValueChange={(val) => {
                      setCategories(
                        categories.map((c) => (c.ma === cat.ma ? { ...c, trangThai: val } : c))
                      );
                    }}
                    trackColor={{ false: '#E2E8F0', true: '#0D9488' }}
                  />
                  <Pressable
                    onPress={() => handleDeleteCategory(cat.ma)}
                    className="w-8 h-8 rounded-full bg-rose-50 items-center justify-center active:bg-rose-100"
                  >
                    <Ionicons name="trash-outline" size={16} color="#E11D48" />
                  </Pressable>
                </View>
              </Card>
            ))
          )
        )}
      </ScrollView>

      {/* Modal thêm danh mục mới */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/50 items-center justify-center p-4">
          <View className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-xl">
            <Text className="text-base font-bold text-slate-900 mb-3">Thêm danh mục mới</Text>
            <Text className="text-xs text-slate-500 mb-1.5">Tên danh mục</Text>
            <TextInput
              placeholder="Ví dụ: Phòng gác lửng, Bình nước nóng..."
              value={newCatName}
              onChangeText={setNewCatName}
              className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-4"
            />
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-xs font-semibold text-slate-700">Kích hoạt sử dụng ngay</Text>
              <Switch
                value={newCatActive}
                onValueChange={setNewCatActive}
                trackColor={{ false: '#E2E8F0', true: '#0D9488' }}
              />
            </View>
            <View className="flex-row gap-2.5">
              <Pressable
                onPress={() => setModalVisible(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 bg-slate-50 items-center justify-center active:bg-slate-100"
              >
                <Text className="text-xs font-bold text-slate-700">Hủy</Text>
              </Pressable>
              <Pressable
                onPress={handleAddCategory}
                className="flex-1 py-3 rounded-xl bg-teal-600 items-center justify-center active:bg-teal-700"
              >
                <Text className="text-xs font-bold text-white">Thêm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
