import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PostStatusCard } from '../../components/landlord/PostStatusCard';
import { landlordService } from '../../services/landlord.service';
import { LandlordPostItem } from '../../types/landlord.types';

export default function MyPostsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'PENDING' | 'REJECTED'>('ALL');
  const [posts, setPosts] = useState<LandlordPostItem[]>([]);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    const list = await landlordService.getMyPosts();
    setPosts(list);
  };

  const filteredPosts = posts.filter((p) => {
    if (activeTab === 'ACTIVE') return p.trangThai === 'DA_DUYET';
    if (activeTab === 'PENDING') return p.trangThai === 'CHO_DUYET';
    if (activeTab === 'REJECTED') return p.trangThai === 'HUY';
    return true;
  });

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-slate-50" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3.5 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Pressable onPress={() => router.back()} className="p-1 -ml-1">
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </Pressable>
          <Text className="text-lg font-bold text-gray-900">Bài đăng của tôi</Text>
        </View>
      </View>

      {/* Tabs Bộ lọc */}
      <View className="flex-row px-4 py-3 bg-white gap-2 border-b border-gray-100">
        {[
          { key: 'ALL', label: 'Tất cả' },
          { key: 'ACTIVE', label: 'Đã đăng bài' },
          { key: 'PENDING', label: 'Chờ duyệt' },
          { key: 'REJECTED', label: 'Bị từ chối' },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key as any)}
              className={`px-3.5 py-1.5 rounded-full ${
                isActive ? 'bg-teal-700' : 'bg-gray-100'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  isActive ? 'text-white' : 'text-gray-600'
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Danh sách bài đăng */}
      <ScrollView
        style={{ flex: 1 }}
        className="px-4 py-4"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {filteredPosts.map((post) => (
          <PostStatusCard key={post.id} post={post} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
