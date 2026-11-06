import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../../services/admin.service';
import { AdminPostItem } from '../../../types/admin.types';
import { PostApprovalCard } from '../../../components/admin/PostApprovalCard';

const TABS = ['Tất cả', 'Chờ duyệt', 'Đã duyệt', 'Từ chối'];

export default function AdminPostsScreen() {
  const [posts, setPosts] = useState<AdminPostItem[]>([]);
  const [activeTab, setActiveTab] = useState('Tất cả');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadPosts = async () => {
    const list = await adminService.getPosts();
    setPosts(list);
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const filteredPosts = posts.filter((p) => {
    if (activeTab === 'Chờ duyệt' && p.trangThai !== 'CHO_DUYET') return false;
    if (activeTab === 'Đã duyệt' && p.trangThai !== 'DA_DUYET') return false;
    if (activeTab === 'Từ chối' && p.trangThai !== 'TU_CHOI') return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.tieuDe.toLowerCase().includes(q) ||
        p.tenChuTro.toLowerCase().includes(q) ||
        p.diaChi.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingCount = posts.filter((p) => p.trangThai === 'CHO_DUYET').length;

  return (
    <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
      {/* Header đồng bộ phong cách InnFinder */}
      <View className="px-4 py-3 bg-white border-b border-slate-200/80">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-xl font-bold text-slate-900">Bài đăng</Text>
            <Text className="text-xs text-slate-500 mt-0.5">Kiểm duyệt & quản lý tin phòng trọ</Text>
          </View>
          {pendingCount > 0 ? (
            <View className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200">
              <Text className="text-xs font-bold text-amber-700">{pendingCount} chờ duyệt</Text>
            </View>
          ) : null}
        </View>

        {/* Thanh tìm kiếm phong cách khách hàng */}
        <View className="flex-row items-center bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-full mb-3">
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            placeholder="Tìm kiếm tiêu đề, chủ trọ, địa chỉ..."
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

        {/* Filter pills */}
        <View className="flex-row items-center gap-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`flex-row items-center gap-1.5 px-3.5 py-1.5 rounded-full border ${
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
                {tab === 'Chờ duyệt' && pendingCount > 0 ? (
                  <View
                    className={`px-1.5 rounded-full ${
                      isActive ? 'bg-white/20' : 'bg-amber-100'
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold ${
                        isActive ? 'text-white' : 'text-amber-800'
                      }`}
                    >
                      {pendingCount}
                    </Text>
                  </View>
                ) : null}
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
        {filteredPosts.length === 0 ? (
          <View className="items-center justify-center py-16">
            <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
              <Ionicons name="newspaper-outline" size={32} color="#94A3B8" />
            </View>
            <Text className="text-sm font-semibold text-slate-600">Không có bài đăng nào</Text>
            <Text className="text-xs text-slate-400 mt-1">Các bài đăng mới sẽ hiển thị tại đây</Text>
          </View>
        ) : (
          filteredPosts.map((post) => (
            <PostApprovalCard
              key={post.maPhongTro}
              post={post}
              onPress={() => router.push(`/(admin)/posts/${post.maPhongTro}`)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
