import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from 'heroui-native';
import { WeekCalendarStrip, formatDateKey } from '../../components/landlord/WeekCalendarStrip';
import { LandlordAppointmentCard } from '../../components/landlord/LandlordAppointmentCard';
import { landlordService } from '../../services/landlord.service';
import { LandlordAppointmentItem } from '../../types/landlord.types';

const PAGE_SIZE = 5;
const DAY_NAMES = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

export default function AppointmentsScreen() {
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateKey(new Date()));
  const [viewMode, setViewMode] = useState<'BY_DATE' | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CHO_XAC_NHAN' | 'XAC_NHAN' | 'HOAN_THANH' | 'HUY'>('ALL');
  
  const [allAppointments, setAllAppointments] = useState<LandlordAppointmentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal từ chối / không thuê kèm lý do
  const [reasonModalVisible, setReasonModalVisible] = useState<boolean>(false);
  const [reasonText, setReasonText] = useState<string>('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [reasonActionType, setReasonActionType] = useState<'REJECT' | 'CANCEL_RENTAL'>('REJECT');
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);

  useEffect(() => {
    loadAppointments();
  }, []);

  // Reset trang khi đổi bộ lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, viewMode, statusFilter]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const list = await landlordService.getAppointments();
      setAllAppointments(list);
    } catch {
      setAllAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  // Xác nhận lịch hẹn xem phòng
  const handleConfirm = (id: string) => {
    Alert.alert(
      'Xác nhận lịch hẹn',
      'Bạn có chắc chắn muốn xác nhận lịch hẹn xem phòng này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            try {
              await landlordService.confirmAppointment(id);
              Alert.alert('Thành công', 'Đã xác nhận lịch xem phòng của khách!');
              loadAppointments();
            } catch (err: any) {
              Alert.alert('Lỗi', err.message || 'Không thể xác nhận lịch hẹn');
            }
          },
        },
      ]
    );
  };

  // Mở modal từ chối lịch xem
  const handleOpenReject = (id: string) => {
    setSelectedAppointmentId(id);
    setReasonActionType('REJECT');
    setReasonText('Chủ trọ bận lịch vào khung giờ này');
    setReasonModalVisible(true);
  };

  // Mở modal báo không thuê sau khi xem
  const handleOpenCancelRental = (id: string) => {
    setSelectedAppointmentId(id);
    setReasonActionType('CANCEL_RENTAL');
    setReasonText('Khách xem phòng xong quyết định không thuê');
    setReasonModalVisible(true);
  };

  // Gửi lý do hủy / từ chối
  const handleSubmitReason = async () => {
    if (!selectedAppointmentId) return;
    if (!reasonText.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập lý do cụ thể');
      return;
    }

    setSubmittingAction(true);
    try {
      if (reasonActionType === 'REJECT') {
        await landlordService.rejectAppointment(selectedAppointmentId, reasonText.trim());
        Alert.alert('Thành công', 'Đã từ chối lịch hẹn và hoàn trả cọc cho khách.');
      } else {
        await landlordService.cancelAppointmentByLandlord(selectedAppointmentId, reasonText.trim());
        Alert.alert('Thành công', 'Đã ghi nhận không thuê và hoàn cọc cho khách hàng.');
      }
      setReasonModalVisible(false);
      setSelectedAppointmentId(null);
      loadAppointments();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Xử lý thất bại, vui lòng thử lại.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Xác nhận chốt hợp đồng thuê phòng thành công
  const handleComplete = (id: string) => {
    Alert.alert(
      'Xác nhận thuê phòng',
      'Xác nhận khách đã đồng ý thuê phòng này? Tiền cọc (sau khi trừ phí hoa hồng sàn) sẽ được chuyển vào số dư ví của bạn và phòng sẽ được đóng.',
      [
        { text: 'Để sau', style: 'cancel' },
        {
          text: 'Đồng ý chốt thuê',
          style: 'default',
          onPress: async () => {
            try {
              await landlordService.completeAppointment(id);
              Alert.alert('Chúc mừng!', 'Đã chốt hợp đồng thuê thành công và cộng tiền cọc vào ví!');
              loadAppointments();
            } catch (err: any) {
              Alert.alert('Lỗi', err.message || 'Không thể hoàn tất thuê phòng.');
            }
          },
        },
      ]
    );
  };

  // Lọc danh sách theo Chế độ xem & Trạng thái
  const filteredAppointments = useMemo(() => {
    return allAppointments.filter((item) => {
      // 1. Lọc theo ngày nếu ở chế độ BY_DATE
      if (viewMode === 'BY_DATE' && item.ngayHen !== selectedDate) {
        return false;
      }
      // 2. Lọc theo trạng thái
      if (statusFilter !== 'ALL' && item.trangThai !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [allAppointments, viewMode, selectedDate, statusFilter]);

  // Phân trang
  const totalAppointments = filteredAppointments.length;
  const totalPages = Math.max(1, Math.ceil(totalAppointments / PAGE_SIZE));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAppointments.slice(start, start + PAGE_SIZE);
  }, [filteredAppointments, currentPage]);

  const formattedDateTitle = useMemo(() => {
    if (!selectedDate) return '';
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayName = DAY_NAMES[dateObj.getDay()];
    const dayStr = String(d).padStart(2, '0');
    const monthStr = String(m).padStart(2, '0');
    return `${dayName}, ${dayStr}/${monthStr}/${y}`;
  }, [selectedDate]);

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-slate-50" edges={['top']}>
      {/* 1. Header */}
      <View className="px-4 py-3.5 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <View>
          <Text className="text-lg font-bold text-gray-900">Lịch xem phòng</Text>
          <Text className="text-xs text-gray-500">Quản lý lịch hẹn & xác nhận đặt phòng</Text>
        </View>
        <View className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200">
          <Text className="text-xs font-bold text-teal-700">{allAppointments.length} cuộc hẹn</Text>
        </View>
      </View>

      {/* 2. Toggle Chế độ xem: Tất cả vs Theo ngày */}
      <View className="flex-row px-4 py-2 bg-white gap-2 border-b border-gray-100">
        <Pressable
          onPress={() => setViewMode('ALL')}
          className={`flex-1 py-1.5 rounded-xl items-center border ${
            viewMode === 'ALL'
              ? 'bg-teal-700 border-teal-700'
              : 'bg-gray-50 border-gray-200'
          }`}
        >
          <Text className={`text-xs font-bold ${viewMode === 'ALL' ? 'text-white' : 'text-gray-600'}`}>
            Tất cả ({allAppointments.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setViewMode('BY_DATE')}
          className={`flex-1 py-1.5 rounded-xl items-center border ${
            viewMode === 'BY_DATE'
              ? 'bg-teal-700 border-teal-700'
              : 'bg-gray-50 border-gray-200'
          }`}
        >
          <Text className={`text-xs font-bold ${viewMode === 'BY_DATE' ? 'text-white' : 'text-gray-600'}`}>
            Xem theo ngày
          </Text>
        </Pressable>
      </View>

      {/* 3. Dải lịch tuần nếu chọn xem theo ngày */}
      {viewMode === 'BY_DATE' && (
        <WeekCalendarStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      )}

      {/* 4. Bộ lọc trạng thái (Tabs ngang) */}
      <View className="bg-white border-b border-gray-100 py-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'CHO_XAC_NHAN', label: 'Chờ xác nhận' },
            { key: 'XAC_NHAN', label: 'Đã xác nhận xem' },
            { key: 'HOAN_THANH', label: 'Đã thuê' },
            { key: 'HUY', label: 'Đã hủy' },
          ].map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setStatusFilter(tab.key as any)}
                className={`px-3 py-1.5 rounded-full border ${
                  isActive
                    ? 'bg-teal-700 border-teal-700'
                    : 'bg-gray-50 border-gray-200 active:bg-gray-100'
                }`}
              >
                <Text className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-gray-600'}`}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 5. Danh sách lịch hẹn */}
      <ScrollView
        style={{ flex: 1 }}
        className="px-4 py-4"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Tiêu đề thông tin */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            {viewMode === 'BY_DATE' ? formattedDateTitle : `Danh sách (${totalAppointments})`}
          </Text>
          {totalAppointments > 0 && (
            <Text className="text-xs text-gray-400">
              Trang {currentPage} / {totalPages}
            </Text>
          )}
        </View>

        {loading ? (
          <View className="py-16 items-center justify-center">
            <ActivityIndicator size="large" color="#0D9488" />
            <Text className="text-xs text-gray-400 mt-3 font-medium">Đang tải lịch hẹn...</Text>
          </View>
        ) : totalAppointments === 0 ? (
          <Card className="p-8 bg-white rounded-2xl items-center justify-center my-4 border border-gray-100 shadow-sm">
            <Ionicons name="calendar-outline" size={44} color="#94A3B8" />
            <Text className="text-sm font-semibold text-gray-700 mt-3">
              Không có lịch xem phòng nào
            </Text>
            <Text className="text-xs text-gray-400 text-center mt-1">
              Chưa có cuộc hẹn nào phù hợp với bộ lọc hiện tại.
            </Text>
          </Card>
        ) : (
          paginatedList.map((apt) => (
            <LandlordAppointmentCard
              key={apt.id}
              appointment={apt}
              onConfirm={handleConfirm}
              onReject={handleOpenReject}
              onComplete={handleComplete}
              onCancelRental={handleOpenCancelRental}
            />
          ))
        )}

        {/* Phân trang */}
        {totalPages > 1 && (
          <View className="mt-4 pt-3 border-t border-gray-200">
            <View className="flex-row items-center justify-center gap-2">
              <Pressable
                onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1.5 rounded-xl border flex-row items-center gap-1 ${
                  currentPage === 1
                    ? 'bg-gray-100 border-gray-200 opacity-50'
                    : 'bg-white border-gray-300 active:bg-gray-50'
                }`}
              >
                <Ionicons name="chevron-back" size={14} color="#374151" />
                <Text className="text-xs font-semibold text-gray-700">Trước</Text>
              </Pressable>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                const isActive = pageNum === currentPage;
                return (
                  <Pressable
                    key={pageNum}
                    onPress={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-xl items-center justify-center border ${
                      isActive
                        ? 'bg-teal-700 border-teal-700'
                        : 'bg-white border-gray-200 active:bg-gray-50'
                    }`}
                  >
                    <Text className={`text-xs font-bold ${isActive ? 'text-white' : 'text-gray-700'}`}>
                      {pageNum}
                    </Text>
                  </Pressable>
                );
              })}

              <Pressable
                onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1.5 rounded-xl border flex-row items-center gap-1 ${
                  currentPage === totalPages
                    ? 'bg-gray-100 border-gray-200 opacity-50'
                    : 'bg-white border-gray-300 active:bg-gray-50'
                }`}
              >
                <Text className="text-xs font-semibold text-gray-700">Sau</Text>
                <Ionicons name="chevron-forward" size={14} color="#374151" />
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      {/* 6. Modal Nhập Lý Do Từ Chối / Không Thuê */}
      <Modal
        visible={reasonModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setReasonModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-5">
          <View className="w-full bg-white rounded-2xl p-5 shadow-xl max-w-sm">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-base font-bold text-gray-900">
                {reasonActionType === 'REJECT' ? 'Từ chối lịch hẹn' : 'Xác nhận không thuê'}
              </Text>
              <Pressable onPress={() => setReasonModalVisible(false)} className="p-1">
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <Text className="text-xs text-gray-500 mb-3 leading-4">
              {reasonActionType === 'REJECT'
                ? 'Vui lòng nhập lý do từ chối. Hệ thống sẽ gửi thông báo và hoàn trả 100% tiền cọc cho khách.'
                : 'Xác nhận khách không thuê sau khi xem phòng. Tiền cọc sẽ được hoàn trả cho khách.'}
            </Text>

            <TextInput
              value={reasonText}
              onChangeText={setReasonText}
              placeholder="Nhập lý do chi tiết..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-800 mb-4 h-24"
            />

            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  variant="outline"
                  size="md"
                  onPress={() => setReasonModalVisible(false)}
                  className="w-full border-gray-200"
                >
                  <Button.Label className="text-gray-600 text-xs">Hủy bỏ</Button.Label>
                </Button>
              </View>

              <View className="flex-1">
                <Button
                  variant="primary"
                  size="md"
                  isDisabled={submittingAction}
                  onPress={handleSubmitReason}
                  className="w-full bg-rose-600"
                >
                  <Button.Label className="text-white text-xs font-bold">
                    {submittingAction ? 'Đang gửi...' : 'Gửi xác nhận'}
                  </Button.Label>
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
