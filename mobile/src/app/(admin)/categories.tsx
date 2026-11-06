import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Modal, Switch, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from 'heroui-native';
import { adminService } from '../../services/admin.service';
import { AdminCategoryItem } from '../../types/admin.types';

const TABS: Array<{ label: string; key: 'LOAI_PHONG' | 'TIEN_ICH' | 'KHU_VUC' }> = [
  { label: 'Loại phòng', key: 'LOAI_PHONG' },
  { label: 'Tiện ích', key: 'TIEN_ICH' },
  { label: 'Khu vực', key: 'KHU_VUC' },
];

export default function AdminCategoriesScreen() {
  const [categories, setCategories] = useState<AdminCategoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'LOAI_PHONG' | 'TIEN_ICH' | 'KHU_VUC'>('LOAI_PHONG');
  const [modalVisible, setModalVisible] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatActive, setNewCatActive] = useState(true);

  const loadData = async () => {
    const list = await adminService.getCategories(activeTab);
    setCategories(list);
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleAddCategory = () => {
    if (!newCatName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên danh mục');
      return;
    }
    const newCat: AdminCategoryItem = {
      ma: `CAT${Date.now().toString().slice(-4)}`,
      ten: newCatName.trim(),
      loai: activeTab,
      trangThai: newCatActive,
    };
    setCategories([newCat, ...categories]);
    setNewCatName('');
    setModalVisible(false);
    Alert.alert('Thành công', 'Đã thêm danh mục mới.');
  };

  const handleDelete = (ma: string) => {
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
      {/* Header chuẩn tenant */}
      <View className="px-4 py-3 bg-white border-b border-slate-200/80">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2.5">
            <Pressable
              onPress={() => router.back()}
              className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
            >
              <Ionicons name="chevron-back" size={20} color="#0F172A" />
            </Pressable>
            <View>
              <Text className="text-xl font-bold text-slate-900">Danh mục</Text>
              <Text className="text-xs text-slate-500 mt-0.5">Quản lý các loại phòng, tiện ích & địa bàn</Text>
            </View>
          </View>
          <Pressable
            onPress={() => setModalVisible(true)}
            className="w-9 h-9 rounded-full bg-teal-50 border border-teal-200 items-center justify-center active:bg-teal-100"
          >
            <Ionicons name="add" size={22} color="#0D9488" />
          </Pressable>
        </View>

        {/* Tab filters */}
        <View className="flex-row items-center gap-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
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
                  {tab.label}
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
      >
        <Card className="bg-white rounded-2xl border border-slate-200/90 p-2 divide-y divide-slate-100 shadow-xs">
          {categories.map((item) => (
            <View
              key={item.ma}
              className="flex-row items-center justify-between p-3"
            >
              <View className="flex-1 mr-2">
                <Text className="text-sm font-semibold text-slate-900">{item.ten}</Text>
                {item.moTa ? (
                  <Text className="text-xs text-slate-400 mt-0.5 font-normal">{item.moTa}</Text>
                ) : null}
              </View>

              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => Alert.alert('Chỉnh sửa', `Sửa thông tin cho ${item.ten}`)}
                  className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
                >
                  <Ionicons name="create-outline" size={16} color="#64748B" />
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(item.ma)}
                  className="w-8 h-8 rounded-full bg-rose-50 border border-rose-200 items-center justify-center active:bg-rose-100"
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </Pressable>
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>

      {/* Add Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl p-5 pb-10 border-t border-slate-200">
            <View className="w-12 h-1 rounded-full bg-slate-300 self-center mb-4" />
            <Text className="text-base font-bold text-slate-900 mb-4">
              Thêm {activeTab === 'LOAI_PHONG' ? 'loại phòng' : activeTab === 'TIEN_ICH' ? 'tiện ích' : 'khu vực'}
            </Text>

            <Text className="text-xs font-semibold text-slate-600 mb-1.5">Tên danh mục</Text>
            <TextInput
              placeholder="Nhập tên..."
              placeholderTextColor="#94A3B8"
              value={newCatName}
              onChangeText={setNewCatName}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 mb-4"
            />

            <View className="flex-row items-center justify-between py-2 mb-6">
              <Text className="text-xs font-semibold text-slate-600">Trạng thái hoạt động</Text>
              <Switch
                value={newCatActive}
                onValueChange={setNewCatActive}
                trackColor={{ false: '#CBD5E1', true: '#0D9488' }}
              />
            </View>

            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setModalVisible(false)}
                className="flex-1 py-3.5 rounded-xl items-center justify-center bg-white border border-slate-200 active:bg-slate-50"
              >
                <Text className="text-sm font-semibold text-slate-700">Huỷ</Text>
              </Pressable>
              <Pressable
                onPress={handleAddCategory}
                className="flex-1 py-3.5 rounded-xl items-center justify-center bg-teal-600 active:bg-teal-700"
              >
                <Text className="text-sm font-bold text-white">Lưu danh mục</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
