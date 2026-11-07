import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Chip } from 'heroui-native';
import { adminService } from '../../../services/admin.service';
import {
  AdminLandlordRequestItem,
  AdminPostItem,
  AdminComplaintItem,
} from '../../../types/admin.types';
import { PostApprovalCard } from '../../../components/admin/PostApprovalCard';
import { ComplaintItemCard } from '../../../components/admin/ComplaintItemCard';

type ProcessingSection = 'landlords' | 'posts' | 'complaints';

export default function AdminProcessingScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [section, setSection] = useState<ProcessingSection>(
    (params.tab as ProcessingSection) || 'landlords'
  );

  useEffect(() => {
    if (params.tab && ['landlords', 'posts', 'complaints'].includes(params.tab)) {
      setSection(params.tab as ProcessingSection);
    }
  }, [params.tab]);

  // Data states
  const [landlords, setLandlords] = useState<AdminLandlordRequestItem[]>([]);
  const [posts, setPosts] = useState<AdminPostItem[]>([]);
  const [complaints, setComplaints] = useState<AdminComplaintItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Sub-filter tab for each section
  const [subFilter, setSubFilter] = useState('Chờ duyệt');

  const loadData = async () => {
    const [lList, pList, cList] = await Promise.all([
      adminService.getLandlordRequests(),
      adminService.getPosts(),
      adminService.getComplaints(),
    ]);
    setLandlords(lList);
    setPosts(pList);
    setComplaints(cList);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Quick actions for Landlord Requests
  const handleApproveLandlord = async (id: string, name: string) => {
    Alert.alert('Xác nhận duyệt', `Cấp quyền Chủ trọ cho "${name}"?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Duyệt',
        onPress: async () => {
          await adminService.approveLandlordRequest(id);
          Alert.alert('Thành công', 'Đã nâng cấp tài khoản thành Chủ trọ.');
          loadData();
        },
      },
    ]);
  };

  const handleRejectLandlord = async (id: string) => {
    Alert.alert('Từ chối hồ sơ', 'Bạn có chắc chắn muốn từ chối hồ sơ này?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Từ chối',
        style: 'destructive',
        onPress: async () => {
          await adminService.rejectLandlordRequest(id, 'CCCD hoặc tài khoản ngân hàng không hợp lệ');
          Alert.alert('Đã từ chối', 'Đã từ chối hồ sơ.');
          loadData();
        },
      },
    ]);
  };

  // Filtered lists
  const filteredLandlords = landlords.filter((item) => {
    if (subFilter === 'Chờ duyệt') return item.trangThai === 'CHO_DUYET';
    if (subFilter === 'Đã duyệt') return item.trangThai === 'DA_DUYET';
    return true;
  });

  const filteredPosts = posts.filter((item) => {
    if (subFilter === 'Chờ duyệt') return item.trangThai === 'CHO_DUYET';
    if (subFilter === 'Đã duyệt') return item.trangThai === 'DA_DUYET';
    return true;
  });

  const filteredComplaints = complaints.filter((item) => {
    if (subFilter === 'Chờ duyệt' || subFilter === 'Chờ xử lý')
      return item.trangThai === 'CHO_XU_LY';
    if (subFilter === 'Đang xử lý') return item.trangThai === 'DANG_XU_LY';
    if (subFilter === 'Đã duyệt' || subFilter === 'Đã xử lý')
      return item.trangThai === 'DA_XU_LY';
    return true;
  });

  // Counts for badges
  const pendingLandlordsCount = landlords.filter((l) => l.trangThai === 'CHO_DUYET').length;
  const pendingPostsCount = posts.filter((p) => p.trangThai === 'CHO_DUYET').length;
  const pendingComplaintsCount = complaints.filter((c) => c.trangThai === 'CHO_XU_LY').length;

  return (
    <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-slate-200/80">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-xl font-bold text-slate-900">Trung tâm xử lý</Text>
            <Text className="text-xs text-slate-500 mt-0.5">
              Tiếp nhận & phê duyệt hồ sơ, tin đăng, khiếu nại
            </Text>
          </View>
        </View>

        {/* 3 Main Segmented Tabs */}
        <View className="flex-row p-1 bg-slate-100 rounded-xl mb-3">
          <Pressable
            onPress={() => {
              setSection('landlords');
              setSubFilter('Chờ duyệt');
            }}
            className={`flex-1 py-2 items-center justify-center rounded-lg flex-row gap-1.5 ${
              section === 'landlords' ? 'bg-white shadow-xs' : ''
            }`}
          >
            <Text
              className={`text-xs ${
                section === 'landlords'
                  ? 'font-bold text-slate-900'
                  : 'font-semibold text-slate-500'
              }`}
            >
              Đơn chủ trọ
            </Text>
            {pendingLandlordsCount > 0 ? (
              <View className="px-1.5 py-0.2 rounded-full bg-amber-500 items-center justify-center">
                <Text className="text-[10px] font-bold text-white">
                  {pendingLandlordsCount}
                </Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => {
              setSection('posts');
              setSubFilter('Chờ duyệt');
            }}
            className={`flex-1 py-2 items-center justify-center rounded-lg flex-row gap-1.5 ${
              section === 'posts' ? 'bg-white shadow-xs' : ''
            }`}
          >
            <Text
              className={`text-xs ${
                section === 'posts'
                  ? 'font-bold text-slate-900'
                  : 'font-semibold text-slate-500'
              }`}
            >
              Bài đăng
            </Text>
            {pendingPostsCount > 0 ? (
              <View className="px-1.5 py-0.2 rounded-full bg-rose-500 items-center justify-center">
                <Text className="text-[10px] font-bold text-white">
                  {pendingPostsCount}
                </Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => {
              setSection('complaints');
              setSubFilter('Chờ xử lý');
            }}
            className={`flex-1 py-2 items-center justify-center rounded-lg flex-row gap-1.5 ${
              section === 'complaints' ? 'bg-white shadow-xs' : ''
            }`}
          >
            <Text
              className={`text-xs ${
                section === 'complaints'
                  ? 'font-bold text-slate-900'
                  : 'font-semibold text-slate-500'
              }`}
            >
              Khiếu nại
            </Text>
            {pendingComplaintsCount > 0 ? (
              <View className="px-1.5 py-0.2 rounded-full bg-rose-500 items-center justify-center">
                <Text className="text-[10px] font-bold text-white">
                  {pendingComplaintsCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {/* Sub-tabs filter */}
        <View className="flex-row items-center gap-2">
          {(section === 'complaints'
            ? ['Tất cả', 'Chờ xử lý', 'Đang xử lý', 'Đã xử lý']
            : ['Tất cả', 'Chờ duyệt', 'Đã duyệt']
          ).map((tab) => {
            const isActive = subFilter === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setSubFilter(tab)}
                className={`px-3 py-1 rounded-full border ${
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

      {/* Content ScrollView */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ================= 1. TAB ĐƠN CHỦ TRỌ ================= */}
        {section === 'landlords' && (
          filteredLandlords.length === 0 ? (
            <View className="items-center justify-center py-16">
              <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
                <Ionicons name="shield-checkmark-outline" size={32} color="#94A3B8" />
              </View>
              <Text className="text-sm font-semibold text-slate-600">
                Không có đơn đăng ký nào
              </Text>
              <Text className="text-xs text-slate-400 mt-1">
                Các yêu cầu đăng ký làm chủ trọ mới sẽ hiển thị tại đây
              </Text>
            </View>
          ) : (
            filteredLandlords.map((item) => (
              <Pressable
                key={item.maYeuCau}
                onPress={() => router.push(`/(admin)/landlord-requests/${item.maYeuCau}` as any)}
                className="mb-3 active:opacity-90"
              >
                <Card className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center gap-2">
                      <View className="w-7 h-7 rounded-full bg-teal-50 items-center justify-center">
                        <Ionicons name="business-outline" size={14} color="#0D9488" />
                      </View>
                      <Text className="text-xs font-bold text-slate-800">
                        {item.maYeuCau}
                      </Text>
                    </View>
                    <Chip
                      variant="soft"
                      color={
                        item.trangThai === 'CHO_DUYET'
                          ? 'warning'
                          : item.trangThai === 'DA_DUYET'
                          ? 'success'
                          : 'danger'
                      }
                      size="sm"
                    >
                      <Chip.Label className="font-bold text-[10px]">
                        {item.trangThai === 'CHO_DUYET'
                          ? 'Chờ duyệt'
                          : item.trangThai === 'DA_DUYET'
                          ? 'Đã duyệt'
                          : 'Đã từ chối'}
                      </Chip.Label>
                    </Chip>
                  </View>

                  <Text className="text-base font-bold text-slate-900">
                    {item.hoVaTen}
                  </Text>
                  <Text className="text-xs text-slate-500 mt-0.5">
                    {item.sdt} • {item.email}
                  </Text>

                  <View className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex-row items-center justify-between">
                    <View>
                      <Text className="text-[11px] text-slate-400 font-medium">
                        Số CCCD (12 số)
                      </Text>
                      <Text className="text-xs font-bold text-slate-800 font-mono mt-0.5">
                        {item.cccd}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-[11px] text-slate-400 font-medium">
                        Ngân hàng nhận
                      </Text>
                      <Text className="text-xs font-bold text-teal-700 mt-0.5">
                        {item.tenNganHang} ({item.soTaiKhoan.slice(-4)})
                      </Text>
                    </View>
                  </View>

                  {item.trangThai === 'CHO_DUYET' ? (
                    <View className="flex-row gap-2 mt-3 pt-2.5 border-t border-slate-100">
                      <Pressable
                        onPress={() => handleRejectLandlord(item.maYeuCau)}
                        className="flex-1 py-2 rounded-lg border border-rose-200 bg-rose-50 items-center justify-center active:opacity-80"
                      >
                        <Text className="text-xs font-bold text-rose-600">Từ chối</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleApproveLandlord(item.maYeuCau, item.hoVaTen)}
                        className="flex-1 py-2 rounded-lg bg-teal-600 items-center justify-center active:bg-teal-700"
                      >
                        <Text className="text-xs font-bold text-white">Duyệt chủ trọ</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </Card>
              </Pressable>
            ))
          )
        )}

        {/* ================= 2. TAB BÀI ĐĂNG ================= */}
        {section === 'posts' && (
          filteredPosts.length === 0 ? (
            <View className="items-center justify-center py-16">
              <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
                <Ionicons name="newspaper-outline" size={32} color="#94A3B8" />
              </View>
              <Text className="text-sm font-semibold text-slate-600">
                Không có bài đăng nào
              </Text>
              <Text className="text-xs text-slate-400 mt-1">
                Các bài đăng phòng trọ mới sẽ hiển thị tại đây
              </Text>
            </View>
          ) : (
            filteredPosts.map((post) => (
              <PostApprovalCard
                key={post.maPhongTro}
                post={post}
                onPress={() => router.push(`/(admin)/posts/${post.maPhongTro}` as any)}
              />
            ))
          )
        )}

        {/* ================= 3. TAB KHIẾU NẠI ================= */}
        {section === 'complaints' && (
          filteredComplaints.length === 0 ? (
            <View className="items-center justify-center py-16">
              <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
                <Ionicons name="shield-checkmark-outline" size={32} color="#94A3B8" />
              </View>
              <Text className="text-sm font-semibold text-slate-600">
                Không có khiếu nại nào
              </Text>
              <Text className="text-xs text-slate-400 mt-1">
                Hệ thống đang hoạt động an toàn và ổn định
              </Text>
            </View>
          ) : (
            filteredComplaints.map((item) => (
              <ComplaintItemCard
                key={item.maKhieuNai}
                complaint={item}
                onPress={() => router.push(`/(admin)/complaints/${item.maKhieuNai}` as any)}
              />
            ))
          )
        )}
      </ScrollView>
    </View>
  );
}
