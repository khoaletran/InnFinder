import React, { useState } from 'react';
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
import { Button, Card, CloseButton, Label, TextArea, TextField } from 'heroui-native';
import { authUserService } from '../../services/authUser.service';
import { Colors } from '../../constants/theme';

const REASON_PRESETS = [
  'Thông tin phòng trọ sai sự thật',
  'Chủ trọ không đến buổi hẹn xem phòng',
  'Yêu cầu nộp cọc trái quy định ngoài hệ thống',
  'Thái độ phục vụ bất lịch sự / lừa đảo',
  'Phòng thực tế xuống cấp nghiêm trọng',
  'Khác',
];

interface ViewedRoom {
  maPhongTro: string;
  tieuDe: string;
  diaChi: string;
  ngayXem: string;
  giaThue: string;
}

// Danh sách dữ liệu mẫu mô phỏng phân trang (Mỗi lần load thêm)
const ALL_VIEWED_ROOMS: ViewedRoom[] = [
  {
    maPhongTro: 'PT011126143000',
    tieuDe: 'Ký túc xá cao cấp Cầu Giấy',
    diaChi: 'Số 15, Ngõ 68 Cầu Giấy, Hà Nội',
    ngayXem: '14:00 - 05/11/2026',
    giaThue: '1.800.000 đ/tháng',
  },
  {
    maPhongTro: 'PT281026091520',
    tieuDe: 'Phòng trọ khép kín Khâm Thiên',
    diaChi: 'Ngõ 222 Khâm Thiên, Đống Đa, Hà Nội',
    ngayXem: '09:30 - 28/10/2026',
    giaThue: '3.500.000 đ/tháng',
  },
  {
    maPhongTro: 'PT201026160000',
    tieuDe: 'Căn hộ Studio Full đồ Mễ Trì',
    diaChi: 'Số 42 Mễ Trì Thượng, Nam Từ Liêm, Hà Nội',
    ngayXem: '16:00 - 20/10/2026',
    giaThue: '4.800.000 đ/tháng',
  },
  {
    maPhongTro: 'PT151026100000',
    tieuDe: 'Phòng ban công thoáng Nguyễn Trãi',
    diaChi: 'Ngõ 129 Nguyễn Trãi, Thanh Xuân, Hà Nội',
    ngayXem: '10:00 - 15/10/2026',
    giaThue: '3.200.000 đ/tháng',
  },
  {
    maPhongTro: 'PT051026153000',
    tieuDe: 'Chung cư mini Chùa Láng',
    diaChi: 'Số 18 Ngõ 185 Chùa Láng, Đống Đa, Hà Nội',
    ngayXem: '15:30 - 05/10/2026',
    giaThue: '4.200.000 đ/tháng',
  },
];

export default function ComplaintScreen() {
  const [selectedReason, setSelectedReason] = useState(REASON_PRESETS[0]);
  const [selectedRoom, setSelectedRoom] = useState<ViewedRoom | null>(ALL_VIEWED_ROOMS[0]);
  const [noiDung, setNoiDung] = useState('');
  const [loading, setLoading] = useState(false);

  // State Modal chọn phòng & Phân trang (Load 3 phòng ban đầu)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayedRooms, setDisplayedRooms] = useState<ViewedRoom[]>(ALL_VIEWED_ROOMS.slice(0, 3));
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Kéo xuống đáy modal -> load tiếp các phòng tiếp theo
  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    if (displayedRooms.length >= ALL_VIEWED_ROOMS.length) {
      setHasMore(false);
      return;
    }

    setLoadingMore(true);
    setTimeout(() => {
      const nextCount = displayedRooms.length + 2;
      setDisplayedRooms(ALL_VIEWED_ROOMS.slice(0, nextCount));
      setLoadingMore(false);
      if (nextCount >= ALL_VIEWED_ROOMS.length) {
        setHasMore(false);
      }
    }, 600);
  };

  const handleSubmitComplaint = async () => {
    if (!selectedRoom) {
      Alert.alert('Chưa chọn phòng', 'Vui lòng chọn phòng trọ bạn đã đi xem để gửi khiếu nại.');
      return;
    }
    if (!noiDung.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng mô tả chi tiết sự việc để Ban quản trị hỗ trợ giải quyết.');
      return;
    }

    try {
      setLoading(true);
      await authUserService.createComplaint({
        vanDe: `[${selectedReason}] ${noiDung.trim()}`,
        doiTuongKhieuNaiId: 'ND000000000000',
        phongTroId: selectedRoom.maPhongTro,
      });

      Alert.alert(
        'Đã gửi khiếu nại thành công',
        'Ban quản trị InnFinder đã tiếp nhận phản ánh của bạn. Chúng tôi sẽ xử lý và phản hồi trong mục Thông báo trong thời gian sớm nhất.',
        [
          {
            text: 'Về trang cá nhân',
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
        <Text className="text-lg font-bold text-slate-900">Gửi khiếu nại & Tố cáo</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
          <Card className="p-5 mb-8">
            <Card.Body className="gap-5">
              {/* Vấn đề bạn gặp phải (To rõ ràng) */}
              <View>
                <Text className="text-base font-bold text-slate-900 mb-2.5">
                  Vấn đề bạn gặp phải
                </Text>
                <View className="gap-2">
                  {REASON_PRESETS.map((reason) => {
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

              {/* Chọn phòng trọ cần khiếu nại (Nút bấm mở Modal) */}
              <View>
                <Text className="text-base font-bold text-slate-900 mb-1.5">
                  Chọn phòng trọ cần khiếu nại
                </Text>
                <Text className="text-xs text-slate-500 mb-2.5">
                  Chỉ cho phép khiếu nại phòng bạn đã đặt lịch hẹn và đi xem thực tế.
                </Text>

                {selectedRoom ? (
                  /* Thẻ hiển thị phòng đã chọn kèm nút đổi phòng */
                  <View className="p-3.5 rounded-xl border border-teal-300 bg-teal-50/60">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-sm font-bold text-teal-900">
                        {selectedRoom.tieuDe}
                      </Text>
                      <Pressable
                        onPress={() => setIsModalOpen(true)}
                        className="py-1 px-2.5 bg-teal-600 rounded-lg active:opacity-80"
                      >
                        <Text className="text-xs font-bold text-white">Đổi phòng</Text>
                      </Pressable>
                    </View>
                    <Text className="text-xs text-slate-600 mb-1">{selectedRoom.diaChi}</Text>
                    <Text className="text-[11px] text-teal-700 font-medium">
                      Đã xem lúc: {selectedRoom.ngayXem} • Giá: {selectedRoom.giaThue}
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setIsModalOpen(true)}
                    className="flex-row items-center justify-between p-4 border border-dashed border-teal-400 rounded-xl bg-teal-50/40 active:opacity-80"
                  >
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="home-outline" size={20} color={Colors.primary} />
                      <Text className="text-sm font-semibold text-teal-800">
                        Bấm để chọn phòng trọ đã đi xem
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
                  </Pressable>
                )}
              </View>

              {/* Mô tả chi tiết sự việc */}
              <TextField isRequired>
                <Label className="text-base font-bold text-slate-900 mb-1">
                  Mô tả chi tiết sự việc
                </Label>
                <TextArea
                  placeholder="Mô tả cụ thể thời gian, hành vi hoặc nội dung sai sự thật của chủ trọ..."
                  numberOfLines={4}
                  value={noiDung}
                  onChangeText={setNoiDung}
                  className="min-h-24 bg-white"
                />
              </TextField>

              {/* Đính kèm bằng chứng */}
              <View>
                <Label className="text-sm font-semibold text-slate-800 mb-1.5">
                  Hình ảnh bằng chứng (nếu có)
                </Label>
                <Pressable
                  onPress={() =>
                    Alert.alert('Đính kèm ảnh', 'Chức năng chọn ảnh từ thư viện sẽ được liên kết.')
                  }
                  className="flex-row items-center justify-center gap-2 p-4 border border-dashed border-slate-300 rounded-xl bg-slate-50 active:bg-slate-100"
                >
                  <Ionicons name="camera-outline" size={20} color={Colors.textMuted} />
                  <Text className="text-xs font-semibold text-slate-600">
                    Tải lên ảnh chụp màn hình / bằng chứng
                  </Text>
                </Pressable>
              </View>

              {/* Nút gửi */}
              <Button
                variant="danger"
                size="lg"
                isDisabled={loading}
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

      {/* Modal Chọn Phòng Trọ Đã Xem (Tải 3 phòng đầu, cuộn xuống load tiếp) */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl max-h-[80%] pt-4 pb-8 px-5">
            {/* Header Modal */}
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <View>
                <Text className="text-lg font-bold text-slate-900">
                  Chọn phòng trọ đã đi xem
                </Text>
                <Text className="text-xs text-slate-500">
                  Hiển thị lịch sử các phòng bạn đã đến xem thực tế
                </Text>
              </View>
              <Pressable
                onPress={() => setIsModalOpen(false)}
                className="p-1 rounded-full bg-slate-100 active:bg-slate-200"
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            {/* Danh sách phòng phân trang */}
            <FlatList
              data={displayedRooms}
              keyExtractor={(item) => item.maPhongTro}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.2}
              renderItem={({ item }) => {
                const isCurrent = selectedRoom?.maPhongTro === item.maPhongTro;
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
                      <Text className="text-[11px] text-slate-400">
                        Đã xem: {item.ngayXem}
                      </Text>
                      <Text className="text-xs font-bold text-teal-700">
                        {item.giaThue}
                      </Text>
                    </View>
                  </Pressable>
                );
              }}
              ListFooterComponent={() => {
                if (loadingMore) {
                  return (
                    <View className="py-4 items-center justify-center">
                      <ActivityIndicator size="small" color={Colors.primary} />
                      <Text className="text-[11px] text-slate-400 mt-1">Đang tải thêm phòng...</Text>
                    </View>
                  );
                }
                if (!hasMore && displayedRooms.length > 0) {
                  return (
                    <View className="py-3 items-center">
                      <Text className="text-[11px] text-slate-400">
                        Đã hiển thị toàn bộ phòng bạn đã xem
                      </Text>
                    </View>
                  );
                }
                return null;
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
