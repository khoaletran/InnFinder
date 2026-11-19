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
  ActivityIndicator,
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
  const [loadingUsers, setLoadingUsers] = useState(false);

  // States for Categories (In-memory cache for 0ms instant tab switching)
  const [catCache, setCatCache] = useState<{
    LOAI_PHONG?: AdminCategoryItem[];
    TIEN_ICH?: AdminCategoryItem[];
    KHU_VUC?: AdminCategoryItem[];
  }>({});
  const [activeCatTab, setActiveCatTab] = useState<'LOAI_PHONG' | 'TIEN_ICH' | 'KHU_VUC'>('LOAI_PHONG');
  const [loadingCat, setLoadingCat] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatActive, setNewCatActive] = useState(true);

  const categories = catCache[activeCatTab] || [];

  // States for Editing Categories
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCat, setEditingCat] = useState<AdminCategoryItem | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatMoTa, setEditCatMoTa] = useState('');
  const [savingEditCat, setSavingEditCat] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  // Tải danh mục song song và lưu vào cache bộ nhớ để chuyển tab tức thời (0ms delay)
  const fetchAllCategories = async () => {
    try {
      setLoadingCat(true);
      const [rooms, amenities] = await Promise.all([
        adminService.getCategories('LOAI_PHONG'),
        adminService.getCategories('TIEN_ICH'),
      ]);
      setCatCache({
        LOAI_PHONG: rooms,
        TIEN_ICH: amenities,
        KHU_VUC: [],
      });
    } catch (e) {
      console.warn('Lỗi tải danh mục:', e);
    } finally {
      setLoadingCat(false);
    }
  };

  const loadData = async () => {
    if (section === 'categories') {
      await fetchAllCategories();
    } else if (searchUser.trim()) {
      handleSearchUser(searchUser.trim());
    }
  };

  useEffect(() => {
    if (section === 'categories') {
      if (!catCache.LOAI_PHONG || !catCache.TIEN_ICH) {
        fetchAllCategories();
      }
    } else if (searchUser.trim()) {
      handleSearchUser(searchUser.trim());
    }
  }, [section]);

  const handleSearchUser = async (keyword: string) => {
    if (!keyword) {
      setUsers([]);
      return;
    }
    try {
      setLoadingUsers(true);
      const list = await adminService.getUsers({ keyword, page: 0, size: 20 });
      setUsers(list);
    } catch (e) {
      console.warn('Lỗi tra cứu người dùng:', e);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Debounce tìm kiếm người dùng (450ms)
  useEffect(() => {
    const trimmed = searchUser.trim();
    if (!trimmed) {
      setUsers([]);
      return;
    }
    const timer = setTimeout(() => {
      handleSearchUser(trimmed);
    }, 450);
    return () => clearTimeout(timer);
  }, [searchUser]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Filter Users by Role Tab
  const hasSearchKeyword = searchUser.trim().length > 0;
  const filteredUsers = users.filter((u) => {
    if (userRoleTab === 'Khách hàng' && (u.chuTro || u.vaiTro === 'QUAN_TRI')) return false;
    if (userRoleTab === 'Chủ trọ' && !u.chuTro) return false;
    if (userRoleTab === 'Admin' && u.vaiTro !== 'QUAN_TRI') return false;
    return true;
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
    setCatCache((prev) => ({
      ...prev,
      [activeCatTab]: [newCat, ...(prev[activeCatTab] || [])],
    }));
    setNewCatName('');
    setModalVisible(false);
    Alert.alert('Thành công', 'Đã thêm danh mục mới.');
  };

  const handleOpenEditCategory = (cat: AdminCategoryItem) => {
    setEditingCat(cat);
    setEditCatName(cat.ten);
    setEditCatMoTa(cat.moTa || '');
    setEditModalVisible(true);
  };

  const handleSaveEditCategory = async () => {
    if (!editingCat || !editCatName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên danh mục');
      return;
    }
    try {
      setSavingEditCat(true);
      if (editingCat.loai === 'LOAI_PHONG') {
        await adminService.updateRoomType(editingCat.ma, {
          ten: editCatName.trim(),
          moTa: editCatMoTa.trim() || undefined,
        });
      } else if (editingCat.loai === 'TIEN_ICH') {
        await adminService.updateAmenity(editingCat.ma, {
          ten: editCatName.trim(),
          moTa: editCatMoTa.trim() || undefined,
        });
      }
      setCatCache((prev) => ({
        ...prev,
        [editingCat.loai]: (prev[editingCat.loai] || []).map((c) =>
          c.ma === editingCat.ma
            ? { ...c, ten: editCatName.trim(), moTa: editCatMoTa.trim() }
            : c
        ),
      }));
      setEditModalVisible(false);
      Alert.alert('Thành công', 'Đã cập nhật danh mục.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể cập nhật danh mục';
      Alert.alert('Lỗi', msg);
    } finally {
      setSavingEditCat(false);
    }
  };

  const handleDeleteCategory = (ma: string) => {
    Alert.alert('Xoá danh mục', 'Bạn có chắc chắn muốn xoá danh mục này?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: () => {
          setCatCache((prev) => ({
            ...prev,
            [activeCatTab]: (prev[activeCatTab] || []).filter((c) => c.ma !== ma),
          }));
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
                placeholder="Nhập Mã ND, Tên đăng nhập, SĐT, Email, CCCD..."
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
          loadingUsers && !refreshing ? (
            <View className="py-16 items-center justify-center">
              <ActivityIndicator size="small" color="#0D9488" />
              <Text className="text-xs text-slate-400 mt-2">Đang tra cứu người dùng...</Text>
            </View>
          ) : !hasSearchKeyword ? (
            /* Khi chưa nhập từ khóa: Không load toàn bộ, hiển thị hướng dẫn tra cứu */
            <View className="items-center justify-center py-16 px-6">
              <View className="w-16 h-16 rounded-full bg-teal-50 items-center justify-center mb-3 border border-teal-100">
                <Ionicons name="search" size={30} color="#0D9488" />
              </View>
              <Text className="text-base font-bold text-slate-800 text-center">
                Tra cứu thông tin người dùng
              </Text>
              <Text className="text-xs text-slate-500 mt-2 text-center leading-5 max-w-[300px]">
                Để bảo vệ quyền riêng tư và tối ưu tốc độ, hệ thống không tải sẵn toàn bộ người dùng. Vui lòng nhập <Text className="font-bold text-slate-700">Mã ND, SĐT, Email, CCCD</Text> hoặc <Text className="font-bold text-slate-700">Tên đăng nhập</Text> vào ô tìm kiếm để tra cứu.
              </Text>
            </View>
          ) : filteredUsers.length === 0 ? (
            <View className="items-center justify-center py-16 px-6">
              <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
                <Ionicons name="person-remove-outline" size={32} color="#94A3B8" />
              </View>
              <Text className="text-sm font-semibold text-slate-700">
                Không tìm thấy người dùng phù hợp
              </Text>
              <Text className="text-xs text-slate-400 mt-1 text-center">
                Không có tài khoản nào khớp với từ khóa "{searchUser}".
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
          <>
            {activeCatTab === 'LOAI_PHONG' && (
              <Pressable
                onPress={() => router.push('/(admin)/deposit-fees' as any)}
                className="mb-3 px-3.5 py-2.5 rounded-xl bg-teal-800 flex-row items-center justify-between active:bg-teal-900"
              >
                <View className="flex-row items-center gap-2">
                  <Ionicons name="pricetags" size={15} color="#2DD4BF" />
                  <Text className="text-xs font-bold text-white">Biểu phí cọc & phí sàn</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#2DD4BF" />
              </Pressable>
            )}
            {loadingCat && !refreshing && categories.length === 0 ? (
              <View className="py-16 items-center justify-center">
                <ActivityIndicator size="small" color="#0D9488" />
                <Text className="text-xs text-slate-400 mt-2">Đang tải danh mục...</Text>
              </View>
            ) : categories.length === 0 ? (
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

                  <View className="flex-row items-center gap-2">
                    <View
                      className={`px-2.5 py-1 rounded-full ${
                        cat.trangThai ? 'bg-emerald-50' : 'bg-slate-100'
                      }`}
                    >
                      <Text
                        className={`text-[11px] font-bold ${
                          cat.trangThai ? 'text-emerald-700' : 'text-slate-500'
                        }`}
                      >
                        {cat.trangThai ? 'Hoạt động' : 'Tạm ẩn'}
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => handleOpenEditCategory(cat)}
                      className="p-1.5 rounded-full bg-teal-50 active:bg-teal-100"
                    >
                      <Ionicons name="create-outline" size={16} color="#0D9488" />
                    </Pressable>

                    <Pressable
                      onPress={() => handleDeleteCategory(cat.ma)}
                      className="p-1.5 rounded-full bg-rose-50 active:bg-rose-100"
                    >
                      <Ionicons name="trash-outline" size={16} color="#E11D48" />
                    </Pressable>
                  </View>
                </Card>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Modal thêm danh mục mới */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/40 items-center justify-center p-4">
          <View className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-xl">
            <Text className="text-base font-bold text-slate-900 mb-1">
              Thêm{' '}
              {activeCatTab === 'LOAI_PHONG'
                ? 'Loại phòng'
                : activeCatTab === 'TIEN_ICH'
                ? 'Tiện ích'
                : 'Khu vực'}
            </Text>
            <Text className="text-xs text-slate-500 mb-4">
              Nhập tên danh mục bạn muốn tạo mới trong hệ thống
            </Text>

            <TextInput
              placeholder="Nhập tên..."
              placeholderTextColor="#94A3B8"
              value={newCatName}
              onChangeText={setNewCatName}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 mb-4"
            />

            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-xs font-semibold text-slate-700">Kích hoạt ngay</Text>
              <Switch
                value={newCatActive}
                onValueChange={setNewCatActive}
                trackColor={{ false: '#E2E8F0', true: '#0D9488' }}
              />
            </View>

            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setModalVisible(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 items-center"
              >
                <Text className="text-xs font-bold text-slate-600">Huỷ</Text>
              </Pressable>
              <Pressable
                onPress={handleAddCategory}
                className="flex-1 py-2.5 rounded-xl bg-teal-600 items-center active:bg-teal-700"
              >
                <Text className="text-xs font-bold text-white">Lưu lại</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      {/* Modal Chỉnh sửa danh mục */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View className="flex-1 bg-black/40 items-center justify-center p-4">
          <View className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-xl">
            <View className="flex-row items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <Text className="text-base font-bold text-slate-900">
                Chỉnh sửa {editingCat?.loai === 'LOAI_PHONG' ? 'Loại phòng' : 'Tiện ích'}
              </Text>
              <Pressable onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <Text className="text-xs font-bold text-slate-700 mb-1">
              Tên {editingCat?.loai === 'LOAI_PHONG' ? 'loại phòng' : 'tiện ích'} <Text className="text-rose-500">*</Text>
            </Text>
            <TextInput
              value={editCatName}
              onChangeText={setEditCatName}
              placeholder="Nhập tên..."
              placeholderTextColor="#94A3B8"
              className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 bg-slate-50 mb-3"
            />

            <Text className="text-xs font-bold text-slate-700 mb-1">Mô tả</Text>
            <TextInput
              value={editCatMoTa}
              onChangeText={setEditCatMoTa}
              placeholder="Nhập mô tả chi tiết..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 bg-slate-50 mb-4 h-20"
              textAlignVertical="top"
            />

            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => setEditModalVisible(false)}
                disabled={savingEditCat}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white items-center justify-center"
              >
                <Text className="text-xs font-bold text-slate-700">Hủy</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveEditCategory}
                disabled={savingEditCat}
                className="flex-1 py-2.5 rounded-xl bg-teal-600 active:bg-teal-700 items-center justify-center"
              >
                {savingEditCat ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-xs font-bold text-white">Lưu thay đổi</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
