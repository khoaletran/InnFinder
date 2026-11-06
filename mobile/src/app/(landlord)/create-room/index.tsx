import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Button } from 'heroui-native';
import { WizardStepIndicator } from '../../../components/landlord/WizardStepIndicator';
import { useCreateRoomStore } from '../../../store/useCreateRoomStore';

export default function CreateRoomStep1Screen() {
  const router = useRouter();
  const { step1, updateStep1 } = useCreateRoomStore();

  const [tenPhong, setTenPhong] = useState(step1.tenPhong || '');
  const [loaiPhong, setLoaiPhong] = useState('Căn hộ khép kín');
  const [giaThue, setGiaThue] = useState(step1.giaThue ? step1.giaThue.toString() : '3500000');
  const [cocPhong, setCocPhong] = useState(step1.cocPhong ? step1.cocPhong.toString() : '3500000');
  const [dienTich, setDienTich] = useState(step1.dienTich ? step1.dienTich.toString() : '24');
  const [soNguoi, setSoNguoi] = useState(step1.soNguoi || 2);

  const handleNext = () => {
    if (!tenPhong.trim()) {
      alert('Vui lòng nhập tên phòng trọ.');
      return;
    }

    updateStep1({
      tenPhong,
      giaThue: Number(giaThue) || 3500000,
      cocPhong: Number(cocPhong) || 3500000,
      dienTich: Number(dienTich) || 24,
      soNguoi,
    });

    router.push('/(landlord)/create-room/images');
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-gray-100">
        <Pressable onPress={() => router.back()} className="p-1 -ml-1">
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </Pressable>
        <Text className="text-base font-bold text-gray-900">Đăng phòng mới</Text>
        <View className="w-6" />
      </View>

      {/* Stepper Indicator */}
      <WizardStepIndicator currentStep={1} />

      {/* Form Fields */}
      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
        {/* Tên phòng */}
        <View className="mb-4">
          <Text className="text-xs font-semibold text-gray-700 mb-1.5">Tên phòng *</Text>
          <TextInput
            placeholder="Ví dụ: Phòng gác lửng studio tiện nghi"
            value={tenPhong}
            onChangeText={setTenPhong}
            className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-gray-50/50"
          />
        </View>

        {/* Loại phòng */}
        <View className="mb-4">
          <Text className="text-xs font-semibold text-gray-700 mb-1.5">Loại phòng *</Text>
          <View className="border border-gray-200 rounded-xl px-3.5 py-2.5 flex-row items-center justify-between bg-gray-50/50">
            <Text className="text-sm text-gray-900">{loaiPhong}</Text>
            <Ionicons name="chevron-down" size={16} color="#6b7280" />
          </View>
        </View>

        {/* Giá thuê */}
        <View className="mb-4">
          <Text className="text-xs font-semibold text-gray-700 mb-1.5">Giá thuê (VNĐ/tháng) *</Text>
          <View className="relative">
            <TextInput
              keyboardType="numeric"
              value={giaThue}
              onChangeText={setGiaThue}
              className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-gray-50/50 pr-24"
            />
            <Text className="absolute right-3.5 top-3 text-xs text-gray-400 font-medium">
              triệu/tháng
            </Text>
          </View>
        </View>

        {/* Tiền cọc */}
        <View className="mb-4">
          <Text className="text-xs font-semibold text-gray-700 mb-1.5">Tiền cọc (VNĐ) *</Text>
          <TextInput
            keyboardType="numeric"
            value={cocPhong}
            onChangeText={setCocPhong}
            className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-gray-50/50"
          />
        </View>

        {/* Grid 2 cột: Diện tích & Số người */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1">
            <Text className="text-xs font-semibold text-gray-700 mb-1.5">Diện tích *</Text>
            <View className="relative">
              <TextInput
                keyboardType="numeric"
                value={dienTich}
                onChangeText={setDienTich}
                className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-gray-50/50 pr-8"
              />
              <Text className="absolute right-3 top-3 text-xs text-gray-400">m²</Text>
            </View>
          </View>

          <View className="flex-1">
            <Text className="text-xs font-semibold text-gray-700 mb-1.5">Số người tối đa *</Text>
            <View className="border border-gray-200 rounded-xl px-2 py-1.5 flex-row items-center justify-between bg-gray-50/50">
              <Pressable
                onPress={() => setSoNguoi(Math.max(1, soNguoi - 1))}
                className="w-7 h-7 rounded-lg bg-white border border-gray-200 items-center justify-center active:bg-gray-100"
              >
                <Ionicons name="remove" size={14} color="#374151" />
              </Pressable>
              <Text className="text-sm font-bold text-gray-900">{soNguoi}</Text>
              <Pressable
                onPress={() => setSoNguoi(soNguoi + 1)}
                className="w-7 h-7 rounded-lg bg-white border border-gray-200 items-center justify-center active:bg-gray-100"
              >
                <Ionicons name="add" size={14} color="#374151" />
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer 2 Nút */}
      <View className="px-4 py-3 bg-white border-t border-gray-100 flex-row gap-3">
        <View className="flex-1">
          <Button
            variant="outline"
            onPress={() => alert('Đã lưu bản nháp thành công!')}
            className="w-full border-gray-200 py-2.5"
          >
            <Button.Label className="text-gray-700 font-semibold text-sm">Lưu nháp</Button.Label>
          </Button>
        </View>

        <View className="flex-1">
          <Button
            variant="primary"
            onPress={handleNext}
            className="w-full bg-teal-700 py-2.5"
          >
            <Button.Label className="text-white font-bold text-sm">Tiếp tục</Button.Label>
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
