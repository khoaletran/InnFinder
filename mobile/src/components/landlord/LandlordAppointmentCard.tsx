import React, { useState } from 'react';
import { View, Text, Pressable, Linking, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button } from 'heroui-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { LandlordAppointmentItem } from '../../types/landlord.types';

export interface LandlordAppointmentCardProps {
  appointment: LandlordAppointmentItem;
  onConfirm: (id: string) => void | Promise<void>;
  onReject: (id: string) => void | Promise<void>;
  onComplete?: (id: string) => void | Promise<void>;
  onCancelRental?: (id: string) => void | Promise<void>;
}

export type Props = LandlordAppointmentCardProps;

const STATUS_CONFIG: Record<
  LandlordAppointmentItem['trangThai'],
  { label: string; bg: string; text: string; border: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  CHO_XAC_NHAN: {
    label: 'Chờ xác nhận',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: 'time-outline',
  },
  XAC_NHAN: {
    label: 'Đã xác nhận xem',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: 'checkmark-circle-outline',
  },
  HOAN_THANH: {
    label: 'Đã thuê phòng',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: 'ribbon-outline',
  },
  HUY: {
    label: 'Đã hủy',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: 'close-circle-outline',
  },
};

export const LandlordAppointmentCard: React.FC<Props> = ({
  appointment,
  onConfirm,
  onReject,
  onComplete,
  onCancelRental,
}) => {
  const [detailVisible, setDetailVisible] = useState<boolean>(false);
  const statusInfo = STATUS_CONFIG[appointment.trangThai] || STATUS_CONFIG.CHO_XAC_NHAN;

  const handleCall = () => {
    if (appointment.sdt) {
      Linking.openURL(`tel:${appointment.sdt}`);
    }
  };

  const handleSms = () => {
    if (appointment.sdt) {
      Linking.openURL(`sms:${appointment.sdt}`);
    }
  };

  const handleViewRoom = () => {
    if (appointment.maPhongTro) {
      setDetailVisible(false);
      router.push(`/room/${appointment.maPhongTro}` as any);
    }
  };

  const cocAmount = appointment.coc || 0;
  const phiThuAmount = appointment.phiThu || 0;
  const thucNhanAmount = Math.max(0, cocAmount - phiThuAmount);

  return (
    <>
      {/* 1. THẺ HIỂN THỊ TÓM TẮT TRONG DANH SÁCH (BẤM ĐỂ XEM CHI TIẾT) */}
      <Pressable onPress={() => setDetailVisible(true)} className="active:opacity-95">
        <Card className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm mb-3">
          {/* Header thẻ: Khách hàng & Badge trạng thái */}
          <View className="flex-row items-center justify-between mb-3 pb-3 border-b border-gray-100">
            <View className="flex-row items-center gap-2.5 flex-1 mr-2">
              <View className="w-10 h-10 rounded-full bg-teal-100 items-center justify-center">
                <Text className="text-xs font-bold text-teal-800">
                  {appointment.khachHangTen ? appointment.khachHangTen.slice(0, 2).toUpperCase() : 'KH'}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
                  {appointment.khachHangTen}
                </Text>
                <Pressable onPress={handleCall} className="flex-row items-center gap-1 mt-0.5">
                  <Ionicons name="call-outline" size={12} color="#0D9488" />
                  <Text className="text-xs text-teal-700 font-medium">{appointment.sdt}</Text>
                </Pressable>
              </View>
            </View>

            {/* Badge trạng thái */}
            <View className={`px-2.5 py-1 rounded-full border flex-row items-center gap-1 ${statusInfo.bg} ${statusInfo.border}`}>
              <Ionicons name={statusInfo.icon} size={12} color={statusInfo.text.replace('text-', '#')} />
              <Text className={`text-[11px] font-bold ${statusInfo.text}`}>{statusInfo.label}</Text>
            </View>
          </View>

          {/* Thông tin phòng & Giờ hẹn */}
          <View className="flex-row items-center gap-3 bg-slate-50 p-3 rounded-xl mb-3">
            {appointment.hinhAnh ? (
              <Image
                source={{ uri: appointment.hinhAnh }}
                style={{ width: 56, height: 56, borderRadius: 10 }}
                contentFit="cover"
              />
            ) : (
              <View className="w-14 h-14 rounded-xl bg-slate-200 items-center justify-center">
                <Ionicons name="home-outline" size={24} color="#64748B" />
              </View>
            )}

            <View className="flex-1">
              <Text className="text-xs font-bold text-gray-900 mb-1" numberOfLines={1}>
                {appointment.phongTen}
              </Text>
              <View className="flex-row items-center gap-2">
                <View className="flex-row items-center gap-1">
                  <Ionicons name="calendar-outline" size={12} color="#0D9488" />
                  <Text className="text-xs text-gray-600 font-medium">{appointment.ngayHen}</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Ionicons name="time-outline" size={12} color="#0D9488" />
                  <Text className="text-xs text-teal-700 font-semibold">{appointment.thoiGian}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Dòng tóm tắt cọc & nút bấm hành động nhanh */}
          <View className="flex-row items-center justify-between pt-1">
            <View className="flex-row items-center gap-1">
              <Ionicons name="information-circle-outline" size={14} color="#64748B" />
              <Text className="text-xs text-teal-700 font-semibold">Chạm để xem chi tiết</Text>
            </View>

            {cocAmount > 0 ? (
              <Text className="text-xs font-bold text-amber-700">
                Cọc: {cocAmount.toLocaleString('vi-VN')} đ
              </Text>
            ) : null}
          </View>

          {/* Các nút hành động chính */}
          {appointment.trangThai === 'CHO_XAC_NHAN' && (
            <View className="flex-row gap-2 mt-3 pt-2.5 border-t border-gray-100">
              <View className="flex-1">
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => onReject(appointment.id)}
                  className="w-full border-rose-200 active:bg-rose-50"
                >
                  <Button.Label className="text-rose-600 text-xs font-medium">Từ chối</Button.Label>
                </Button>
              </View>

              <View className="flex-1">
                <Button
                  variant="primary"
                  size="sm"
                  onPress={() => onConfirm(appointment.id)}
                  className="w-full bg-teal-700"
                >
                  <Button.Label className="text-white text-xs font-bold">Xác nhận lịch xem</Button.Label>
                </Button>
              </View>
            </View>
          )}

          {appointment.trangThai === 'XAC_NHAN' && (
            <View className="flex-row gap-2 mt-3 pt-2.5 border-t border-gray-100">
              <View className="flex-1">
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => onCancelRental?.(appointment.id)}
                  className="w-full border-gray-300 active:bg-gray-50"
                >
                  <Button.Label className="text-gray-700 text-xs font-medium">Không thuê</Button.Label>
                </Button>
              </View>

              <View className="flex-1">
                <Button
                  variant="primary"
                  size="sm"
                  onPress={() => onComplete?.(appointment.id)}
                  className="w-full bg-emerald-700"
                >
                  <Button.Label className="text-white text-xs font-bold">Xác nhận thuê</Button.Label>
                </Button>
              </View>
            </View>
          )}
        </Card>
      </Pressable>

      {/* 2. MODAL CHI TIẾT ĐƠN HẸN XEM PHÒNG & THÔNG TIN NGƯỜI HẸN */}
      <Modal
        visible={detailVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailVisible(false)}
      >
        <SafeAreaView style={{ flex: 1 }} className="bg-slate-50">
          {/* Header Modal */}
          <View className="px-4 py-3.5 bg-white border-b border-gray-100 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Pressable onPress={() => setDetailVisible(false)} className="p-1 -ml-1 active:opacity-70">
                <Ionicons name="close" size={24} color="#1E293B" />
              </Pressable>
              <View>
                <Text className="text-base font-bold text-gray-900">Chi tiết đơn hẹn xem</Text>
                <Text className="text-[11px] text-gray-400">#{appointment.id}</Text>
              </View>
            </View>

            <View className={`px-2.5 py-1 rounded-full border flex-row items-center gap-1 ${statusInfo.bg} ${statusInfo.border}`}>
              <Ionicons name={statusInfo.icon} size={12} color={statusInfo.text.replace('text-', '#')} />
              <Text className={`text-xs font-bold ${statusInfo.text}`}>{statusInfo.label}</Text>
            </View>
          </View>

          {/* Nội dung chi tiết */}
          <ScrollView
            style={{ flex: 1 }}
            className="px-4 py-4"
            contentContainerStyle={{ paddingBottom: 60 }}
            showsVerticalScrollIndicator={false}
          >
            {/* KHỐI 1: THÔNG TIN NGƯỜI HẸN XEM PHÒNG */}
            <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs mb-3">
              <Text className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-3">
                1. Thông tin người hẹn xem
              </Text>

              <View className="flex-row items-center gap-3 pb-3 border-b border-gray-100">
                <View className="w-14 h-14 rounded-full bg-teal-100 items-center justify-center border border-teal-200">
                  <Text className="text-lg font-bold text-teal-800">
                    {appointment.khachHangTen ? appointment.khachHangTen.slice(0, 2).toUpperCase() : 'KH'}
                  </Text>
                </View>

                <View className="flex-1">
                  <Text className="text-base font-bold text-gray-900">{appointment.khachHangTen}</Text>
                  {appointment.maKhachHang ? (
                    <Text className="text-xs text-gray-400">Mã KH: {appointment.maKhachHang}</Text>
                  ) : null}
                  <Text className="text-xs text-teal-700 font-semibold mt-0.5">Khách tìm thuê phòng</Text>
                </View>
              </View>

              {/* Số điện thoại & Nút gọi / nhắn tin */}
              <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="call-outline" size={18} color="#0D9488" />
                  <View>
                    <Text className="text-xs text-gray-400">Số điện thoại liên hệ</Text>
                    <Text className="text-sm font-bold text-gray-900">{appointment.sdt}</Text>
                  </View>
                </View>

                <View className="flex-row gap-2">
                  <Pressable
                    onPress={handleCall}
                    className="px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 flex-row items-center gap-1 active:bg-teal-100"
                  >
                    <Ionicons name="call" size={13} color="#0D9488" />
                    <Text className="text-xs font-bold text-teal-700">Gọi</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleSms}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 flex-row items-center gap-1 active:bg-blue-100"
                  >
                    <Ionicons name="chatbubble-ellipses" size={13} color="#2563EB" />
                    <Text className="text-xs font-bold text-blue-700">Nhắn tin</Text>
                  </Pressable>
                </View>
              </View>

              {/* Email nếu có */}
              {appointment.emailKhachHang ? (
                <View className="flex-row items-center gap-2 pt-3">
                  <Ionicons name="mail-outline" size={18} color="#64748B" />
                  <View>
                    <Text className="text-xs text-gray-400">Email khách hàng</Text>
                    <Text className="text-xs font-semibold text-gray-700">{appointment.emailKhachHang}</Text>
                  </View>
                </View>
              ) : null}
            </View>

            {/* KHỐI 2: THỜI GIAN HẸN & GHI CHÚ */}
            <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs mb-3">
              <Text className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-3">
                2. Lịch hẹn xem trực tiếp
              </Text>

              <View className="flex-row items-center justify-between bg-slate-50 p-3 rounded-xl mb-3">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="calendar-outline" size={20} color="#0D9488" />
                  <View>
                    <Text className="text-xs text-gray-500">Ngày hẹn gặp</Text>
                    <Text className="text-sm font-bold text-gray-900">{appointment.ngayHen}</Text>
                  </View>
                </View>

                <View className="flex-row items-center gap-2">
                  <Ionicons name="time-outline" size={20} color="#0D9488" />
                  <View>
                    <Text className="text-xs text-gray-500">Khung giờ</Text>
                    <Text className="text-sm font-bold text-teal-700">{appointment.thoiGian}</Text>
                  </View>
                </View>
              </View>

              {appointment.ghiChu ? (
                <View className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/60">
                  <Text className="text-xs font-semibold text-amber-900 mb-0.5">Lời nhắn từ khách hàng:</Text>
                  <Text className="text-xs text-amber-800 italic leading-4">"{appointment.ghiChu}"</Text>
                </View>
              ) : null}
            </View>

            {/* KHỐI 3: THÔNG TIN PHÒNG TRỌ ĐƯỢC HẸN */}
            <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs mb-3">
              <Text className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-3">
                3. Thông tin phòng trọ
              </Text>

              <View className="flex-row gap-3 items-center mb-3">
                {appointment.hinhAnh ? (
                  <Image
                    source={{ uri: appointment.hinhAnh }}
                    style={{ width: 68, height: 68, borderRadius: 12 }}
                    contentFit="cover"
                  />
                ) : (
                  <View className="w-16 h-16 rounded-xl bg-slate-200 items-center justify-center">
                    <Ionicons name="home-outline" size={28} color="#64748B" />
                  </View>
                )}

                <View className="flex-1">
                  <Text className="text-sm font-bold text-gray-900 mb-1" numberOfLines={1}>
                    {appointment.phongTen}
                  </Text>
                  <Text className="text-xs text-gray-500 mb-1" numberOfLines={2}>
                    {appointment.diaChiPhong || 'Địa chỉ đang cập nhật'}
                  </Text>
                  {appointment.giaThue ? (
                    <Text className="text-xs font-bold text-teal-700">
                      Giá thuê: {appointment.giaThue.toLocaleString('vi-VN')} đ/tháng
                    </Text>
                  ) : null}
                </View>
              </View>

              {appointment.maPhongTro ? (
                <Pressable
                  onPress={handleViewRoom}
                  className="w-full py-2.5 rounded-xl bg-teal-50 border border-teal-200 flex-row items-center justify-center gap-1.5 active:bg-teal-100"
                >
                  <Ionicons name="open-outline" size={16} color="#0D9488" />
                  <Text className="text-xs font-bold text-teal-700">Xem chi tiết bài đăng phòng này</Text>
                </Pressable>
              ) : null}
            </View>

            {/* KHỐI 4: TÀI CHÍNH & TIỀN CỌC GIỮ CHÂN */}
            <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs mb-3">
              <Text className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-3">
                4. Cọc giữ chân & Thu phí sàn
              </Text>

              <View className="space-y-2">
                <View className="flex-row items-center justify-between py-1.5 border-b border-gray-100">
                  <Text className="text-xs text-gray-600">Tiền cọc khách đã thanh toán:</Text>
                  <Text className="text-xs font-bold text-gray-900">{cocAmount.toLocaleString('vi-VN')} đ</Text>
                </View>

                <View className="flex-row items-center justify-between py-1.5 border-b border-gray-100">
                  <Text className="text-xs text-gray-600">Phí hoa hồng sàn InnFinder:</Text>
                  <Text className="text-xs font-semibold text-rose-600">- {phiThuAmount.toLocaleString('vi-VN')} đ</Text>
                </View>

                <View className="flex-row items-center justify-between py-2 bg-emerald-50/70 px-3 rounded-xl border border-emerald-200/60 mt-1">
                  <Text className="text-xs font-bold text-emerald-900">Chủ trọ thực nhận khi chốt thuê:</Text>
                  <Text className="text-sm font-extrabold text-emerald-700">{thucNhanAmount.toLocaleString('vi-VN')} đ</Text>
                </View>
              </View>
            </View>

            {/* Khối nếu có lý do hủy */}
            {appointment.trangThai === 'HUY' && (
              <View className="bg-rose-50 p-4 rounded-2xl border border-rose-200 mb-3">
                <View className="flex-row items-center gap-2 mb-1">
                  <Ionicons name="alert-circle" size={18} color="#E11D48" />
                  <Text className="text-xs font-bold text-rose-800">Lịch hẹn đã hủy / Không thuê</Text>
                </View>
                <Text className="text-xs text-rose-700 leading-4">
                  Lý do: {appointment.ghiChu || 'Chủ trọ hoặc khách hàng đã hủy lịch hẹn.'}
                </Text>
                <Text className="text-[11px] text-gray-500 mt-2">
                  * 100% tiền cọc giữ chân đã được hoàn trả lại cho khách hàng.
                </Text>
              </View>
            )}

            {/* Các nút hành động bên trong modal */}
            {appointment.trangThai === 'CHO_XAC_NHAN' && (
              <View className="flex-row gap-2 mt-2">
                <View className="flex-1">
                  <Button
                    variant="outline"
                    size="md"
                    onPress={() => {
                      setDetailVisible(false);
                      onReject(appointment.id);
                    }}
                    className="w-full border-rose-200 active:bg-rose-50"
                  >
                    <Button.Label className="text-rose-600 text-xs font-bold">Từ chối lịch</Button.Label>
                  </Button>
                </View>

                <View className="flex-1">
                  <Button
                    variant="primary"
                    size="md"
                    onPress={() => {
                      setDetailVisible(false);
                      onConfirm(appointment.id);
                    }}
                    className="w-full bg-teal-700"
                  >
                    <Button.Label className="text-white text-xs font-bold">Xác nhận lịch xem</Button.Label>
                  </Button>
                </View>
              </View>
            )}

            {appointment.trangThai === 'XAC_NHAN' && (
              <View className="flex-row gap-2 mt-2">
                <View className="flex-1">
                  <Button
                    variant="outline"
                    size="md"
                    onPress={() => {
                      setDetailVisible(false);
                      onCancelRental?.(appointment.id);
                    }}
                    className="w-full border-gray-300 active:bg-gray-50"
                  >
                    <Button.Label className="text-gray-700 text-xs font-bold">Không thuê</Button.Label>
                  </Button>
                </View>

                <View className="flex-1">
                  <Button
                    variant="primary"
                    size="md"
                    onPress={() => {
                      setDetailVisible(false);
                      onComplete?.(appointment.id);
                    }}
                    className="w-full bg-emerald-700"
                  >
                    <Button.Label className="text-white text-xs font-bold">Xác nhận thuê</Button.Label>
                  </Button>
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
};

export default LandlordAppointmentCard;
