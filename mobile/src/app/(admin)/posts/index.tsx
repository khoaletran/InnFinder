import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../../services/admin.service';
import { AdminPostItem } from '../../../types/admin.types';
import { PostApprovalCard } from '../../../components/admin/PostApprovalCard';

const TABS = ['Tất cả', 'Chờ duyệt', 'Đã duyệt', 'Từ chối'];

export default function AdminPostsScreen() {
  const [posts, setPosts] = useState<AdminPostItem[]>([]);
  const [activeTab, setActiveTab] = useState('Tất cả');
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
    if (activeTab === 'Chờ duyệt') return p.trangThai === 'CHO_DUYET';
    if (activeTab === 'Đã duyệt') return p.trangThai === 'DA_DUYET';
    if (activeTab === 'Từ chối') return p.trangThai === 'TU_CHOI';
    return true;
  });

  const pendingCount = posts.filter((p) => p.trangThai === 'CHO_DUYET').length;

  return (
    <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-slate-200">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xl font-bold text-slate-900">Quản lý bài đăng</Text>
          <Ionicons name="search-outline" size={20} color="#64748B" />
        </View>

        {/* Tab filters */}
        <View className="flex-row items-center gap-2 mt-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border ${
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
                {tab === 'Chờ duyệt' && pendingCount > 0 ? (
                  <View
                    className={`px-1.5 rounded-full ${
                      isActive ? 'bg-white/30' : 'bg-rose-100'
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold ${
                        isActive ? 'text-white' : 'text-rose-600'
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
          <View className="items-center justify-center py-12">
            <Ionicons name="newspaper-outline" size={48} color="#CBD5E1" />
            <Text className="text-sm text-slate-400 mt-2">Không có bài đăng nào</Text>
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
