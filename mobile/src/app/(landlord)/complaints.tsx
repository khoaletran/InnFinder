import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card } from 'heroui-native';
import { landlordService } from '../../services/landlord.service';

interface ComplaintItem {
  maKhieuNai: string;
  maNguoiGui: string;
  tenNguoiGui: string;
  doiTuongKhieuNai: string;
  tenDoiTuongKhieuNai: string;
  nguoiDuyet?: string;
  tenNguoiDuyet?: string;
  vanDe: string;
  hinhAnh?: string;
  ngayGui: string;
  trangThai: 'CHO_DUYET' | 'DANG_XU_LY' | 'DA_XU_LI';
  mucDoUuTien: number;
  mucDoViPham: 'NHE' | 'TRUNG_BINH' | 'NANG';
}

export default function LandlordComplaintsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'RECEIVED' | 'SENT'>('RECEIVED');
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    loadComplaints();
  }, [tab]);

  const loadComplaints = async () => {
    try {
      setLoading(true);
      const data = await landlordService.getMyComplaints(tab);
      setComplaints(data);
    } catch (e) {
      console.log('Lỗi tải khiếu nại:', e);
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await landlordService.getMyComplaints(tab);
      setComplaints(data);
    } catch (e) {
      console.log('Lỗi refresh khiếu nại:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CHO_DUYET':
        return { label: 'Chờ duyệt', bg: 'bg-amber-100', text: 'text-amber-700' };
      case 'DANG_XU_LY':
        return { label: 'Đang xử lý', bg: 'bg-sky-100', text: 'text-sky-700' };
      case 'DA_XU_LI':
        return { label: 'Đã giải quyết', bg: 'bg-emerald-100', text: 'text-emerald-700' };
      default:
        return { label: status, bg: 'bg-gray-100', text: 'text-gray-700' };
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'NHE':
        return { label: 'Cảnh cáo', bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700' };
      case 'TRUNG_BINH':
        return { label: 'Trừ điểm uy tín', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700' };
      case 'NANG':
        return { label: 'Khóa tài khoản', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700' };
      default:
        return { label: severity, bg: 'bg-gray-50 border-gray-200', text: 'text-gray-700' };
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-slate-50" edges={['top']}>
      {/* 1. Header */}
      <View className="px-4 py-3.5 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Pressable onPress={() => router.back()} className="p-1 -ml-1 active:opacity-60">
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <Text className="text-lg font-bold text-gray-900">Khiếu nại & Phản ánh</Text>
        </View>

        <Pressable
          onPress={() => router.push('/user/complaint' as any)}
          className="flex-row items-center gap-1 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-full active:opacity-70"
        >
          <Ionicons name="add" size={16} color="#0f766e" />
          <Text className="text-xs font-bold text-teal-700">Tạo khiếu nại</Text>
        </Pressable>
      </View>

      {/* 2. Tabs */}
      <View className="flex-row px-4 py-3 bg-white gap-2 border-b border-gray-100">
        {[
          { key: 'RECEIVED', label: 'Gửi đến tôi' },
          { key: 'SENT', label: 'Tôi đã gửi' },
        ].map((t) => {
          const isActive = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key as any)}
              className={`px-4 py-1.5 rounded-full ${
                isActive ? 'bg-teal-700' : 'bg-gray-100 active:bg-gray-200'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  isActive ? 'text-white' : 'text-gray-600'
                }`}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 3. Danh sách Khiếu nại */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0f766e" />
          <Text className="text-xs text-gray-500 mt-2">Đang tải danh sách khiếu nại...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          className="px-4 py-4"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0f766e']} />
          }
        >
          {complaints.length === 0 ? (
            <View className="flex-1 items-center justify-center py-20">
              <View className="size-16 rounded-full bg-teal-50 items-center justify-center mb-3">
                <Ionicons name="checkmark-circle-outline" size={32} color="#0f766e" />
              </View>
              <Text className="text-base font-bold text-gray-800">
                {tab === 'RECEIVED' ? 'Không có phản ánh nào gửi đến bạn' : 'Bạn chưa gửi khiếu nại nào'}
              </Text>
              <Text className="text-xs text-gray-400 text-center mt-1 px-8">
                {tab === 'RECEIVED'
                  ? 'Tuyệt vời! Phòng trọ và dịch vụ của bạn đang nhận được sự hài lòng từ khách thuê.'
                  : 'Nếu gặp sự cố với khách xem phòng hoặc vi phạm hợp đồng, bạn có thể bấm "+ Tạo khiếu nại".'}
              </Text>
            </View>
          ) : (
            complaints.map((item) => {
              const statusBadge = getStatusBadge(item.trangThai);
              const severityBadge = getSeverityBadge(item.mucDoViPham);
              const dateStr = item.ngayGui
                ? new Date(item.ngayGui).toLocaleString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : 'Mới đây';

              return (
                <Card
                  key={item.maKhieuNai}
                  className="mb-3.5 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
                >
                  {/* Mã & Trạng thái */}
                  <View className="flex-row items-center justify-between pb-2.5 border-b border-gray-100">
                    <View>
                      <Text className="text-xs font-bold text-gray-900 tracking-wide">
                        #{item.maKhieuNai}
                      </Text>
                      <Text className="text-[11px] text-gray-400 mt-0.5">{dateStr}</Text>
                    </View>

                    <View className="flex-row items-center gap-1.5">
                      <View className={`px-2.5 py-1 rounded-full ${statusBadge.bg}`}>
                        <Text className={`text-[10px] font-bold ${statusBadge.text}`}>
                          {statusBadge.label}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Thông tin đối tác */}
                  <View className="py-2.5 border-b border-gray-100 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Ionicons
                        name={tab === 'RECEIVED' ? 'person-circle-outline' : 'shield-checkmark-outline'}
                        size={18}
                        color="#6b7280"
                      />
                      <Text className="text-xs text-gray-500">
                        {tab === 'RECEIVED' ? 'Người gửi: ' : 'Đối tượng: '}
                        <Text className="font-semibold text-gray-800">
                          {tab === 'RECEIVED'
                            ? item.tenNguoiGui || item.maNguoiGui
                            : item.tenDoiTuongKhieuNai || item.doiTuongKhieuNai}
                        </Text>
                      </Text>
                    </View>

                    {item.trangThai === 'DA_XU_LI' && (
                      <View className={`px-2 py-0.5 rounded border ${severityBadge.bg}`}>
                        <Text className={`text-[10px] font-semibold ${severityBadge.text}`}>
                          {severityBadge.label}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Nội dung vấn đề */}
                  <View className="pt-2.5">
                    <Text className="text-xs font-semibold text-gray-700 mb-1">
                      Nội dung phản ánh:
                    </Text>
                    <Text className="text-xs text-gray-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {item.vanDe}
                    </Text>
                  </View>

                  {/* Ảnh bằng chứng nếu có */}
                  {item.hinhAnh ? (
                    <View className="mt-2.5">
                      <Text className="text-[11px] font-medium text-gray-500 mb-1">
                        Hình ảnh bằng chứng đính kèm:
                      </Text>
                      <Image
                        source={{ uri: item.hinhAnh }}
                        className="w-full h-36 rounded-xl bg-slate-100"
                        resizeMode="cover"
                      />
                    </View>
                  ) : null}

                  {/* Người duyệt / Kết luận */}
                  {item.tenNguoiDuyet && (
                    <View className="mt-2.5 pt-2 border-t border-gray-50 flex-row items-center justify-between">
                      <Text className="text-[11px] text-gray-400">
                        Xử lý bởi Quản trị viên: <Text className="font-medium text-gray-600">{item.tenNguoiDuyet}</Text>
                      </Text>
                    </View>
                  )}
                </Card>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
