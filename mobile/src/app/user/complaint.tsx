import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Label, TextArea, TextField } from 'heroui-native';
import { authUserService } from '../../services/authUser.service';
import { landlordService } from '../../services/landlord.service';
import { useAuthStore } from '../../store/useAuthStore';
import { Colors } from '../../constants/theme';

const TENANT_REASONS = [
  'Thông tin phòng trọ sai sự thật',
  'Chủ trọ không đến buổi hẹn xem phòng',
  'Yêu cầu nộp cọc trái quy định ngoài hệ thống',
  'Thái độ phục vụ bất lịch sự / lừa đảo',
  'Phòng thực tế xuống cấp nghiêm trọng',
  'Khác',
];

const LANDLORD_REASONS = [
  'Khách hàng không đến buổi hẹn (Bùng hẹn)',
  'Khách hàng có hành vi bất lịch sự / quấy rối',
  'Khách hàng cố ý phá hoại tài sản khi xem phòng',
  'Cung cấp thông tin liên hệ giả mạo',
  'Khác',
];

interface ViewedRoom {
  maDatLich?: string;
  maPhongTro: string;
  tieuDe: string;
  diaChi: string;
  ngayXem: string;
  giaThue: string;
  doiTuongId: string; // maChuTro nếu là khách, maKhachHang nếu là chủ trọ
  tenDoiTuong: string; // Tên chủ trọ hoặc tên khách
}

export default function ComplaintScreen() {
  const { user, activeMode } = useAuthStore();
  const isLandlord = activeMode === 'LANDLORD' || Boolean(user?.chuTro);

  const reasonPresets = isLandlord ? LANDLORD_REASONS : TENANT_REASONS;

  const [selectedRoom, setSelectedRoom] = useState<ViewedRoom | null>(null);
  const [selectedReason, setSelectedReason] = useState(reasonPresets[0]);
  const [noiDung, setNoiDung] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Danh sách các phòng / lịch hẹn lấy từ API thực tế
  const [viewedRooms, setViewedRooms] = useState<ViewedRoom[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, [isLandlord]);

  const fetchRooms = async () => {
    try {
      setLoadingRooms(true);
      let mapped: ViewedRoom[] = [];

      if (isLandlord) {
        // Chủ trọ: Lấy danh sách khách đã hẹn xem phòng của chủ trọ
        const apts = await landlordService.getAppointments();
        if (Array.isArray(apts) && apts.length > 0) {
          mapped = apts.map((apt: any) => ({
            maDatLich: apt.id,
            maPhongTro: apt.maPhongTro || 'PT_UNKNOWN',
            tieuDe: apt.phongTen || apt.diaChiPhong || 'Lịch hẹn xem phòng',
            diaChi: apt.diaChiPhong || 'Địa chỉ phòng trọ',
            ngayXem: apt.ngayHen || 'Gần đây',
            giaThue: apt.giaThue ? `${Number(apt.giaThue).toLocaleString('vi-VN')} đ/tháng` : 'Thương lượng',
            doiTuongId: apt.maKhachHang,
            tenDoiTuong: apt.khachHangTen || 'Khách xem phòng',
          }));
        }
      } else {
        // Khách hàng: Lấy danh sách các phòng khách đã đặt lịch hẹn xem
        const res: any = await authUserService.getMyAppointments();
        const data = Array.isArray(res) ? res : res?.data;
        if (Array.isArray(data) && data.length > 0) {
          mapped = data.map((apt: any) => ({
            maDatLich: apt.maDatLich,
            maPhongTro: apt.maPhongTro || 'PT_UNKNOWN',
            tieuDe: apt.tieuDePhong || apt.diaChiPhong || 'Phòng trọ đã hẹn xem',
            diaChi: apt.diaChiPhong || 'Địa chỉ phòng trọ',
            ngayXem: apt.ngayHen ? new Date(apt.ngayHen).toLocaleDateString('vi-VN') : 'Gần đây',
            giaThue: apt.giaThue ? `${Number(apt.giaThue).toLocaleString('vi-VN')} đ/tháng` : 'Thương lượng',
            doiTuongId: apt.maChuTro,
            tenDoiTuong: apt.tenChuTro || 'Chủ trọ',
          }));
        }
      }

      setViewedRooms(mapped);
      if (mapped.length > 0) {
        setSelectedRoom(mapped[0]);
      }
    } catch (err) {
      console.log('Lỗi tải lịch hẹn xem phòng:', err);
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleSubmitComplaint = async () => {
    if (!user?.maNguoiDung) {
      Alert.alert('Chưa đăng nhập', 'Vui lòng đăng nhập lại để gửi khiếu nại.');
      return;
    }
    if (!selectedRoom) {
      Alert.alert(
        'Chưa chọn cuộc hẹn',
        isLandlord
          ? 'Vui lòng chọn khách hàng và phòng có lịch hẹn để gửi khiếu nại.'
          : 'Vui lòng chọn phòng trọ bạn đã hẹn xem để gửi khiếu nại.'
      );
      return;
    }
    if (!selectedRoom.doiTuongId) {
      Alert.alert('Lỗi dữ liệu', 'Không xác định được mã đối tượng của cuộc hẹn này.');
      return;
    }
    if (!noiDung.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng mô tả chi tiết sự việc để Ban quản trị hỗ trợ giải quyết.');
      return;
    }

    try {
      setLoading(true);
      await authUserService.createComplaint({
        maNguoiGui: user.maNguoiDung,
        doiTuongKhieuNai: selectedRoom.doiTuongId,
        vanDe: `[${selectedReason}] (Phòng: ${selectedRoom.diaChi}${
          isLandlord ? ` • Khách bị khiếu nại: ${selectedRoom.tenDoiTuong}` : ` • Chủ trọ: ${selectedRoom.tenDoiTuong}`
        }) - ${noiDung.trim()}`,
      });

      Alert.alert(
        'Đã gửi khiếu nại thành công',
        'Ban quản trị InnFinder đã tiếp nhận phản ánh của bạn. Chúng tôi sẽ xác minh và phản hồi trong thời gian sớm nhất.',
        [
          {
            text: 'Đóng',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Thất bại', err.message || 'Không thể gửi khiếu nại vào lúc này');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 pt-safe bg-slate-50">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-slate-200">
        <Pressable onPress={() => router.back()} className="p-1 active:opacity-70 mr-2">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text className="text-lg font-bold text-slate-900">
          {isLandlord ? 'Gửi khiếu nại khách vi phạm' : 'Gửi khiếu nại & Tố cáo'}
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
          <Card className="p-5 mb-8">
            <Card.Body className="gap-5">
              {/* BƯỚC 1: Chọn cuộc hẹn / phòng trọ cần khiếu nại */}
              <View>
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className="text-base font-bold text-slate-900">
                    1. Chọn {isLandlord ? 'khách hàng & phòng liên quan' : 'phòng trọ cần khiếu nại'}
                  </Text>
                  {loadingRooms && <ActivityIndicator size="small" color={Colors.primary} />}
                </View>
                <Text className="text-xs text-slate-500 mb-2.5">
                  {isLandlord
                    ? 'Chọn lịch hẹn của khách bạn muốn phản ánh tới Ban quản trị:'
                    : 'Chỉ những phòng bạn đã đặt lịch hẹn và đến xem thực tế mới có thể khiếu nại:'}
                </Text>

                {selectedRoom ? (
                  <View className="p-3.5 rounded-xl border border-teal-300 bg-teal-50/60">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-sm font-bold text-teal-900 flex-1 mr-2" numberOfLines={1}>
                        {selectedRoom.tieuDe}
                      </Text>
                      <Pressable
                        onPress={() => setIsModalOpen(true)}
                        className="py-1 px-2.5 bg-teal-600 rounded-lg active:opacity-80"
                      >
                        <Text className="text-xs font-bold text-white">Đổi lịch</Text>
                      </Pressable>
                    </View>
                    <Text className="text-xs text-slate-600 mb-1">{selectedRoom.diaChi}</Text>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[11px] text-teal-700 font-medium">
                        {isLandlord ? `Khách: ${selectedRoom.tenDoiTuong}` : `Chủ trọ: ${selectedRoom.tenDoiTuong}`}
                      </Text>
                      <Text className="text-[11px] text-slate-500">
                        Ngày hẹn: {selectedRoom.ngayXem}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => {
                      if (viewedRooms.length === 0) {
                        Alert.alert(
                          'Chưa có dữ liệu',
                          isLandlord
                            ? 'Bạn chưa có lịch hẹn xem phòng nào từ khách thuê.'
                            : 'Bạn chưa có lịch hẹn xem phòng nào được ghi nhận trên hệ thống.'
                        );
                        return;
                      }
                      setIsModalOpen(true);
                    }}
                    className="flex-row items-center justify-between p-4 border border-dashed border-teal-400 rounded-xl bg-teal-50/40 active:opacity-80"
                  >
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                      <Text className="text-sm font-semibold text-teal-800">
                        {loadingRooms
                          ? 'Đang tải lịch hẹn...'
                          : viewedRooms.length === 0
                          ? 'Chưa có lịch sử cuộc hẹn nào'
                          : isLandlord
                          ? 'Bấm để chọn khách hẹn xem'
                          : 'Bấm để chọn phòng trọ đã đi xem'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
                  </Pressable>
                )}
              </View>

              {/* BƯỚC 2: Vấn đề bạn gặp phải */}
              <View>
                <Text className="text-base font-bold text-slate-900 mb-2.5">
                  2. Vấn đề bạn gặp phải
                </Text>
                <View className="gap-2">
                  {reasonPresets.map((reason) => {
                    const isSelected = selectedReason === reason;
                    return (
                      <Pressable
                        key={reason}
                        onPress={() => setSelectedReason(reason)}
                        className={`flex-row items-center justify-between p-3 rounded-xl border active:opacity-80 ${
                          isSelected
                            ? 'bg-rose-50/80 border-rose-400'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <Text
                          className={`text-sm ${
                            isSelected ? 'font-bold text-rose-800' : 'font-medium text-slate-700'
                          }`}
                        >
                          {reason}
                        </Text>
                        <View
                          className={`size-4 rounded-full border items-center justify-center ${
                            isSelected ? 'border-rose-600 bg-rose-600' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <View className="size-1.5 rounded-full bg-white" />}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* BƯỚC 3: Mô tả chi tiết sự việc */}
              <TextField isRequired>
                <Label className="text-base font-bold text-slate-900 mb-1">
                  3. Mô tả chi tiết sự việc
                </Label>
                <TextArea
                  placeholder={
                    isLandlord
                      ? 'Mô tả cụ thể thời gian, hành vi bùng hẹn hoặc vi phạm của khách...'
                      : 'Mô tả cụ thể thời gian, hành vi hoặc nội dung sai sự thật của chủ trọ...'
                  }
                  numberOfLines={4}
                  value={noiDung}
                  onChangeText={setNoiDung}
                  className="min-h-24 bg-white"
                />
              </TextField>

              {/* BƯỚC 4: Đính kèm bằng chứng */}
              <View>
                <Label className="text-sm font-semibold text-slate-800 mb-1.5">
                  Hình ảnh bằng chứng (nếu có)
                </Label>
                <Pressable
                  onPress={() =>
                    Alert.alert('Đính kèm ảnh', 'Chức năng chọn ảnh từ thư viện thiết bị.')
                  }
                  className="flex-row items-center justify-center gap-2 p-4 border border-dashed border-slate-300 rounded-xl bg-slate-50 active:bg-slate-100"
                >
                  <Ionicons name="camera-outline" size={20} color={Colors.textMuted} />
                  <Text className="text-xs font-semibold text-slate-600">
                    Tải lên ảnh chụp màn hình / bằng chứng
                  </Text>
                </Pressable>
              </View>

              {/* Nút gửi khiếu nại */}
              <Button
                variant="danger"
                size="lg"
                isDisabled={loading || !selectedRoom}
                onPress={handleSubmitComplaint}
                className="mt-2 active:opacity-80"
              >
                <Button.Label className="font-bold text-white">
                  {loading ? 'Đang gửi phản ánh...' : 'Gửi khiếu nại cho Admin'}
                </Button.Label>
              </Button>
            </Card.Body>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal Chọn Cuộc Hẹn */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl max-h-[80%] pt-4 pb-8 px-5">
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <View>
                <Text className="text-lg font-bold text-slate-900">
                  {isLandlord ? 'Chọn lịch hẹn của khách' : 'Chọn phòng trọ đã đi xem'}
                </Text>
                <Text className="text-xs text-slate-500">
                  {isLandlord
                    ? 'Hiển thị các khách hàng đã đặt lịch hẹn xem phòng của bạn'
                    : 'Hiển thị lịch sử các phòng bạn đã đặt lịch hẹn xem thực tế'}
                </Text>
              </View>
              <Pressable
                onPress={() => setIsModalOpen(false)}
                className="p-1 rounded-full bg-slate-100 active:bg-slate-200"
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <FlatList
              data={viewedRooms}
              keyExtractor={(item, index) => `${item.maPhongTro}_${item.doiTuongId}_${index}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
              ListEmptyComponent={
                <View className="py-8 items-center justify-center">
                  <Text className="text-sm text-slate-500">
                    {isLandlord
                      ? 'Bạn chưa có lịch hẹn xem phòng nào từ khách thuê.'
                      : 'Bạn chưa có lịch hẹn xem phòng nào trên hệ thống.'}
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isCurrent =
                  selectedRoom?.maPhongTro === item.maPhongTro &&
                  selectedRoom?.doiTuongId === item.doiTuongId;
                return (
                  <Pressable
                    onPress={() => {
                      setSelectedRoom(item);
                      setIsModalOpen(false);
                    }}
                    className={`p-3.5 rounded-xl border active:opacity-80 ${
                      isCurrent
                        ? 'bg-teal-50 border-teal-500'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <View className="flex-row items-center justify-between mb-1">
                      <Text
                        className={`text-sm ${
                          isCurrent ? 'font-bold text-teal-900' : 'font-semibold text-slate-800'
                        }`}
                      >
                        {item.tieuDe}
                      </Text>
                      {isCurrent && (
                        <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                      )}
                    </View>
                    <Text className="text-xs text-slate-600 mb-1.5">{item.diaChi}</Text>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-xs font-semibold text-teal-800">
                        {isLandlord ? `Khách: ${item.tenDoiTuong}` : `Chủ trọ: ${item.tenDoiTuong}`}
                      </Text>
                      <Text className="text-[11px] text-slate-400">
                        Ngày hẹn: {item.ngayXem}
                      </Text>
                    </View>
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
