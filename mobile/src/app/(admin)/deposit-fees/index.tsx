import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from 'heroui-native';
import { adminService } from '../../../services/admin.service';
import { RoomTypeDepositFee } from '../../../types/room.types';

export default function AdminDepositFeesScreen() {
  const [list, setList] = useState<RoomTypeDepositFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal edit state
  const [selectedItem, setSelectedItem] = useState<RoomTypeDepositFee | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editCoc, setEditCoc] = useState('');
  const [editPhi, setEditPhi] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await adminService.getRoomTypeDepositFees();
      setList(data);
    } catch (e) {
      console.warn('Lỗi tải danh sách biểu phí:', e);
      Alert.alert('Lỗi', 'Không thể tải biểu phí cọc & sàn');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleOpenEdit = (item: RoomTypeDepositFee) => {
    setSelectedItem(item);
    setEditCoc(item.soTienCoc ? item.soTienCoc.toString() : '0');
    setEditPhi(item.phiThu ? item.phiThu.toString() : '0');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!selectedItem) return;

    const cocNum = parseInt(editCoc.replace(/\D/g, ''), 10);
    const phiNum = parseInt(editPhi.replace(/\D/g, ''), 10);

    if (isNaN(cocNum) || cocNum < 1000) {
      Alert.alert('Không hợp lệ', 'Số tiền cọc tối thiểu phải từ 1.000 VNĐ');
      return;
    }

    if (isNaN(phiNum) || phiNum < 0) {
      Alert.alert('Không hợp lệ', 'Mức phí thu sàn không được âm');
      return;
    }

    if (phiNum >= cocNum) {
      Alert.alert('Ràng buộc nghiệp vụ', 'Mức phí thu sàn phải nhỏ hơn số tiền cọc');
      return;
    }

    try {
      setSubmitting(true);
      await adminService.updateRoomTypeDepositFee(selectedItem.maLpt, {
        soTienCoc: cocNum,
        phiThu: phiNum,
      });

      Alert.alert('Thành công', `Đã cập nhật biểu phí cho loại phòng "${selectedItem.tenLoaiPhongTro}"`);
      setModalVisible(false);
      await loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể lưu biểu phí';
      Alert.alert('Lỗi cập nhật', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Preview calculations in modal
  const cocVal = parseInt(editCoc.replace(/\D/g, ''), 10) || 0;
  const phiVal = parseInt(editPhi.replace(/\D/g, ''), 10) || 0;
  const thucNhanVal = Math.max(0, cocVal - phiVal);
  const isInvalidFee = phiVal >= cocVal && cocVal > 0;

  return (
    <View style={{ flex: 1 }} className="pt-safe bg-slate-50">
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-slate-200/80 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </Pressable>
          <View>
            <Text className="text-lg font-bold text-slate-900">Quản lý biểu phí cọc & sàn</Text>
            <Text className="text-xs text-slate-500">Mức cọc xem phòng & phí thu theo loại phòng</Text>
          </View>
        </View>

        <Pressable
          onPress={loadData}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="w-9 h-9 rounded-full bg-teal-50 items-center justify-center active:bg-teal-100"
        >
          <Ionicons name="reload" size={18} color="#0D9488" />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading && !refreshing ? (
          <View className="py-16 items-center justify-center">
            <ActivityIndicator size="small" color="#0D9488" />
            <Text className="text-xs text-slate-400 mt-2">Đang tải biểu phí loại phòng...</Text>
          </View>
        ) : list.length === 0 ? (
          <View className="items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
            <Ionicons name="pricetag-outline" size={40} color="#94A3B8" />
            <Text className="text-sm font-semibold text-slate-600 mt-2">Chưa có loại phòng nào</Text>
          </View>
        ) : (
          list.map((item) => (
            <Card
              key={item.maLpt}
              className="bg-white rounded-2xl p-4 mb-3 border border-slate-200/90 shadow-xs"
            >
              {/* Tiêu đề loại phòng */}
              <View className="flex-row items-center justify-between pb-2.5 border-b border-slate-100">
                <View className="flex-row items-center gap-2 flex-1">
                  <View className="w-8 h-8 rounded-lg bg-teal-50 items-center justify-center border border-teal-200">
                    <Ionicons name="home-outline" size={16} color="#0D9488" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
                      {item.tenLoaiPhongTro}
                    </Text>
                    <Text className="text-[10px] text-slate-400 font-mono">
                      {item.maLpt}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => handleOpenEdit(item)}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 flex-row items-center gap-1 active:bg-teal-700"
                >
                  <Ionicons name="create-outline" size={14} color="#FFFFFF" />
                  <Text className="text-xs font-bold text-white">Chỉnh sửa</Text>
                </Pressable>
              </View>

              {item.moTa ? (
                <Text className="text-xs text-slate-500 mt-2 leading-relaxed" numberOfLines={2}>
                  {item.moTa}
                </Text>
              ) : null}

              {/* 3 chỉ số tài chính */}
              <View className="flex-row items-center justify-between bg-slate-50 rounded-xl p-3 mt-3 border border-slate-100">
                {/* 1. Tiền cọc */}
                <View className="flex-1">
                  <Text className="text-[10px] font-medium text-slate-500">Tiền cọc giữ chân</Text>
                  <Text className="text-sm font-black text-slate-900 mt-0.5">
                    {item.soTienCoc?.toLocaleString('vi-VN')} đ
                  </Text>
                </View>

                <View className="w-px h-7 bg-slate-200 mx-1" />

                {/* 2. Phí sàn */}
                <View className="flex-1 px-1">
                  <Text className="text-[10px] font-medium text-amber-700">Phí thu sàn</Text>
                  <Text className="text-sm font-black text-amber-700 mt-0.5">
                    {item.phiThu?.toLocaleString('vi-VN')} đ
                  </Text>
                </View>

                <View className="w-px h-7 bg-slate-200 mx-1" />

                {/* 3. Chủ trọ thực nhận */}
                <View className="flex-1 items-end">
                  <Text className="text-[10px] font-medium text-emerald-700">Chủ trọ nhận</Text>
                  <Text className="text-sm font-black text-emerald-700 mt-0.5">
                    {item.thucNhanChuTro?.toLocaleString('vi-VN')} đ
                  </Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Modal Chỉnh sửa mức cọc & phí sàn */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          className="bg-black/60 items-center justify-center px-4"
        >
          <View className="w-full bg-white rounded-3xl p-5 border border-slate-200 shadow-xl max-w-sm">
            {/* Header modal */}
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
              <View className="flex-1 pr-2">
                <Text className="text-base font-bold text-slate-900">
                  Điều chỉnh biểu phí
                </Text>
                <Text className="text-xs text-teal-700 font-semibold mt-0.5" numberOfLines={1}>
                  {selectedItem?.tenLoaiPhongTro} ({selectedItem?.maLpt})
                </Text>
              </View>
              <Pressable
                onPress={() => setModalVisible(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </Pressable>
            </View>

            {/* Input Tiền cọc */}
            <View className="mt-4">
              <Text className="text-xs font-bold text-slate-700 mb-1">
                Tiền cọc giữ chân (VNĐ) <Text className="text-rose-500">*</Text>
              </Text>
              <TextInput
                keyboardType="numeric"
                value={editCoc}
                onChangeText={setEditCoc}
                placeholder="Ví dụ: 200000"
                className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 bg-slate-50 font-semibold"
              />
            </View>

            {/* Input Phí thu hoa hồng sàn */}
            <View className="mt-3.5">
              <Text className="text-xs font-bold text-slate-700 mb-1">
                Phí thu sàn (VNĐ) <Text className="text-rose-500">*</Text>
              </Text>
              <TextInput
                keyboardType="numeric"
                value={editPhi}
                onChangeText={setEditPhi}
                placeholder="Ví dụ: 20000"
                className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 bg-slate-50 font-semibold"
              />
            </View>

            {/* Cảnh báo lỗi nếu phí >= cọc */}
            {isInvalidFee ? (
              <View className="mt-3 p-2.5 bg-rose-50 rounded-xl border border-rose-200 flex-row items-center gap-1.5">
                <Ionicons name="alert-circle" size={16} color="#E11D48" />
                <Text className="text-xs text-rose-700 font-semibold flex-1">
                  Mức phí thu sàn phải nhỏ hơn số tiền cọc!
                </Text>
              </View>
            ) : null}

            {/* Box xem trước chủ trọ nhận */}
            <View className="mt-3.5 p-3 bg-teal-50 rounded-xl border border-teal-100">
              <View className="flex-row items-center justify-between text-xs">
                <Text className="text-xs text-slate-600">Chủ trọ nhận vào ví:</Text>
                <Text className="text-xs font-bold text-emerald-700">
                  {thucNhanVal.toLocaleString('vi-VN')} đ
                </Text>
              </View>
            </View>

            {/* Nút thao tác */}
            <View className="flex-row items-center gap-2.5 mt-5">
              <Pressable
                onPress={() => setModalVisible(false)}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl border border-slate-200 bg-white items-center justify-center active:bg-slate-50"
              >
                <Text className="text-xs font-bold text-slate-700">Hủy</Text>
              </Pressable>

              <Pressable
                onPress={handleSave}
                disabled={submitting || isInvalidFee}
                className={`flex-1 py-3 rounded-xl items-center justify-center ${
                  isInvalidFee || submitting
                    ? 'bg-teal-400 opacity-60'
                    : 'bg-teal-700 active:bg-teal-800'
                }`}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-xs font-bold text-white">Lưu thay đổi</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
